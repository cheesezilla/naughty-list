/**
 * Balance simulator: plays many virtual hunters through the game with a simple, sensible strategy
 * and reports how long each rank takes, where gold goes and how often imps are caught.
 *
 *   npm run simulate                    # 200 players
 *   npm run simulate -- --players 1000 --seed 42
 *   npm run simulate -- --strict        # exit 1 when a target in the plan is missed by more than 25%
 */
import { loadContent } from '../src/content/load.js';
import type { Content } from '../src/content/schema.js';
import { gameData, priceOf } from '../src/engine/data.js';
import { hunt } from '../src/engine/hunt.js';
import { huntOdds } from '../src/engine/odds.js';
import { buy, count, craft, equip, newPlayer, travel, type PlayerState, type Setup } from '../src/engine/player.js';
import { seededRng, type Rng } from '../src/engine/rng.js';

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const PLAYERS = opt('players', 200);
const SEED = opt('seed', 1);
const MAX_HUNTS = opt('max-hunts', 20000);
const STRICT = args.includes('--strict');
const VERBOSE = args.includes('--verbose');

/** Target hunts spent in each rank, from the plan. */
const TARGET_HUNTS_IN_RANK: Record<number, number> = { 1: 150, 2: 250, 3: 400, 4: 600 };

const content: Content = loadContent('content');
const data = gameData(content);
const finalRank = content.ranks.at(-1)!.rank;

function baitPrice(id: string): number {
  const b = data.items.get(id);
  return (b && priceOf(b)) ?? 0;
}

/** Score of a setup: points plus net gold per hunt, so both progress and profit count. */
function score(setup: Setup, location: string) {
  const o = huntOdds(content, setup, location);
  const net = o.expectedGold - o.stats.attraction * baitPrice(setup.bait ?? '');
  return { odds: o, net, value: o.expectedPoints + net };
}

function bestSetup(p: PlayerState, location: string, allowBuyBait: boolean): { setup: Setup; value: number; net: number } {
  const traps = content.items.traps.filter((t) => count(p, t.id) > 0);
  const bases = content.items.bases.filter((b) => count(p, b.id) > 0);
  const baits = content.items.baits.filter(
    (b) => count(p, b.id) > 0 || (allowBuyBait && b.price !== null && b.rank <= p.rank && p.gold >= b.price * 10),
  );
  let best = { setup: p.setup, value: -Infinity, net: -Infinity };
  for (const t of traps) for (const b of bases) for (const bait of baits.length ? baits : [null]) {
    const setup: Setup = { trap: t.id, base: b.id, bait: bait?.id ?? null, charm: null };
    const s = score(setup, location);
    if (s.value > best.value) best = { setup, value: s.value, net: s.net };
  }
  return best;
}

function apply(p: PlayerState, r: ReturnType<typeof buy>): PlayerState {
  return r.ok ? r.player : p;
}

interface Log {
  rankAt: Record<number, number>;
  goldAtRank: Record<number, number>;
  purchases: { hunt: number; item: string }[];
  byLocation: Record<string, { hunts: number; attracted: number; caught: number; gold: number; baitCost: number }>;
  bossCatches: number;
  finished: boolean;
  hunts: number;
}

function plan(p: PlayerState, log: Log, huntNo: number): PlayerState {
  // 1. Unlock the deepest location the rank allows, keeping a bait reserve.
  for (const loc of [...content.locations].reverse()) {
    if (!p.unlocked.includes(loc.id) && loc.rank <= p.rank && p.gold >= loc.unlockCost * 1.5) {
      p = apply(p, travel(content, p, loc.id));
      break;
    }
  }
  // 2. Hunt where points come fastest without losing gold.
  let where = p.location;
  let bestValue = -Infinity;
  for (const id of p.unlocked) {
    const s = bestSetup(p, id, true);
    const v = s.net >= 0 ? s.value : s.net - 1e6;
    if (v > bestValue) { bestValue = v; where = id; }
  }
  if (where !== p.location) p = apply(p, travel(content, p, where));

  // 3. Craft gear whenever possible (move off a trap the recipe uses up first).
  for (const r of content.recipes) {
    const out = data.items.get(r.output.item)!;
    if ((out.kind === 'trap' || out.kind === 'base') && count(p, out.id) === 0) {
      let q = p;
      for (const ing of Object.keys(r.ingredients)) {
        if (q.setup.trap === ing) {
          const other = content.items.traps.find((t) => t.id !== ing && count(q, t.id) > 0);
          if (other) q = apply(q, equip(content, q, 'trap', other.id));
        }
      }
      const c = craft(content, q, r.id);
      if (c.ok) { p = c.player; log.purchases.push({ hunt: huntNo, item: out.id }); }
    } else if (out.kind === 'bait' && count(p, out.id) < 5) {
      const c = craft(content, p, r.id);
      if (c.ok) p = c.player;
    }
  }

  // 4. Buy the gear upgrade that helps most here, keeping enough gold for ~60 baits.
  const current = bestSetup(p, p.location, true);
  const reserve = 60 * Math.max(8, baitPrice(current.setup.bait ?? ''));
  let pick: { id: string; gain: number } | null = null;
  for (const item of [...content.items.traps, ...content.items.bases]) {
    if (item.price === null || item.rank > p.rank || count(p, item.id) > 0 || p.gold < item.price + reserve) continue;
    const trial = { ...p, inventory: { ...p.inventory, [item.id]: 1 } };
    const gain = bestSetup(trial, p.location, true).value - current.value;
    if (gain > 0 && (!pick || gain > pick.gain)) pick = { id: item.id, gain };
  }
  if (pick) {
    const r = buy(content, p, pick.id);
    if (r.ok) { p = r.player; log.purchases.push({ hunt: huntNo, item: pick.id }); }
  }

  // 5. Arm the best setup, buying bait as needed.
  const chosen = bestSetup(p, p.location, true).setup;
  if (chosen.bait && count(p, chosen.bait) < 20) {
    const price = baitPrice(chosen.bait);
    if (price > 0) {
      const n = Math.min(100, Math.floor(p.gold / price));
      if (n > 0) p = apply(p, buy(content, p, chosen.bait, n));
    }
  }
  for (const slot of ['trap', 'base', 'bait'] as const) {
    const id = chosen[slot];
    if (id && count(p, id) > 0) p = apply(p, equip(content, p, slot, id));
  }
  if (p.setup.bait && count(p, p.setup.bait) === 0) {
    const any = content.items.baits.find((b) => count(p, b.id) > 0);
    if (any) p = apply(p, equip(content, p, 'bait', any.id));
  }
  return p;
}

function play(rng: Rng): Log {
  let p = newPlayer(content);
  const log: Log = { rankAt: { 1: 0 }, goldAtRank: {}, purchases: [], byLocation: {}, bossCatches: 0, finished: false, hunts: 0 };
  for (let n = 1; n <= MAX_HUNTS; n++) {
    if (n === 1 || n % 20 === 0 || !p.setup.bait || count(p, p.setup.bait) === 0) p = plan(p, log, n);
    const loc = p.location;
    const baitBefore = p.setup.bait;
    const r = hunt(content, p, rng);
    if (!r.ok) { p = plan(p, log, n); continue; }
    p = r.player;
    const L = (log.byLocation[loc] ??= { hunts: 0, attracted: 0, caught: 0, gold: 0, baitCost: 0 });
    L.hunts++;
    if (r.entry.outcome !== 'quiet') L.attracted++;
    if (r.entry.outcome === 'catch') { L.caught++; L.gold += r.entry.gold; }
    if (r.entry.imp && data.imps.get(r.entry.imp)?.tier === 'boss' && r.entry.outcome === 'catch') log.bossCatches++;
    L.baitCost += r.entry.baitUsed * baitPrice(baitBefore ?? '');
    if (r.entry.rankUp) { log.rankAt[r.entry.rankUp] = n; log.goldAtRank[r.entry.rankUp] = p.gold; }
    log.hunts = n;
    if (p.rank >= finalRank) { log.finished = true; break; }
  }
  return log;
}

// ---------- run ----------
const quant = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};
const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '-');
const pct = (n: number) => (Number.isFinite(n) ? `${Math.round(n * 100)}%` : '-');

const logs: Log[] = [];
for (let i = 0; i < PLAYERS; i++) logs.push(play(seededRng(SEED * 100003 + i)));

console.log(`\nThe Naughty List balance run: ${PLAYERS} players, seed ${SEED}\n`);
console.log(`Reached rank ${finalRank}: ${logs.filter((l) => l.finished).length}/${PLAYERS}`);
console.log(`Total hunts to rank ${finalRank}: median ${fmt(quant(logs.filter((l) => l.finished).map((l) => l.hunts), 0.5))}\n`);

let misses = 0;
console.log('Rank  Hunts in rank (p10 / median / p90)   Target   Status');
for (const r of content.ranks.slice(0, -1)) {
  const spent = logs
    .filter((l) => l.rankAt[r.rank + 1] !== undefined)
    .map((l) => l.rankAt[r.rank + 1]! - (l.rankAt[r.rank] ?? 0));
  const med = quant(spent, 0.5);
  const target = TARGET_HUNTS_IN_RANK[r.rank];
  const off = target ? Math.abs(med - target) / target : 0;
  const status = !target ? '' : !Number.isFinite(med) ? 'NOT REACHED' : off <= 0.25 ? 'ok' : med > target ? 'TOO SLOW' : 'TOO FAST';
  if (status && status !== 'ok') misses++;
  console.log(`${String(r.rank).padEnd(6)}${`${fmt(quant(spent, 0.1))} / ${fmt(med)} / ${fmt(quant(spent, 0.9))}`.padEnd(36)}${String(target ?? '').padEnd(9)}${status}`);
}

console.log('\nLocation           Hunts    Attract  Catch/attracted  Bait cost / gold');
for (const loc of content.locations) {
  const ls = logs.map((l) => l.byLocation[loc.id]).filter(Boolean) as Log['byLocation'][string][];
  const sum = (k: keyof Log['byLocation'][string]) => ls.reduce((s, x) => s + x[k], 0);
  console.log(`${loc.name.padEnd(19)}${fmt(sum('hunts') / PLAYERS).padEnd(9)}${pct(sum('attracted') / sum('hunts')).padEnd(9)}${pct(sum('caught') / sum('attracted')).padEnd(17)}${pct(sum('baitCost') / sum('gold'))}`);
}

console.log('\nGear bought or crafted (median hunt number, share of players)');
const items = new Map<string, number[]>();
for (const l of logs) for (const pu of l.purchases) (items.get(pu.item) ?? items.set(pu.item, []).get(pu.item)!).push(pu.hunt);
for (const [item, hunts] of [...items].sort((a, b) => quant(a[1], 0.5) - quant(b[1], 0.5))) {
  console.log(`  ${(data.items.get(item)?.name ?? item).padEnd(22)} hunt ${fmt(quant(hunts, 0.5)).padEnd(8)} ${pct(hunts.length / PLAYERS)}`);
}
console.log(`\nBoss catches per player: ${(logs.reduce((s, l) => s + l.bossCatches, 0) / PLAYERS).toFixed(1)}`);

if (VERBOSE) console.log(JSON.stringify(logs[0], null, 2));
if (STRICT && misses > 0) {
  console.error(`\n${misses} target(s) missed by more than 25%.`);
  process.exit(1);
}
