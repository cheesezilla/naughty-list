/**
 * Balance simulator: plays many virtual hunters through the game with a simple, sensible strategy
 * and reports how long each rank takes, where gold goes and how often imps are caught.
 *
 *   npm run simulate                    # 200 players
 *   npm run simulate -- --players 1000 --seed 42
 *   npm run simulate -- --strict        # exit 1 when a target in the plan is missed by more than 25%
 *   npm run simulate -- --players 1000 --seeds 5   # pool seeds 1..5 (the numbers that go into docs/BALANCE.md (Simulation history))
 *   npm run simulate -- --trace out.jsonl          # one JSON line per hunt for the first player (--trace-players N for more)
 *
 * Cheer Meter and events run inside hunt(); the simulated player answers them:
 *   --no-cheer / --no-events                switch a system off (baselines)
 *   --boon-policy random|greedy|hold       which boon card to pick; hold uses Overcharge up to the max before cashing in
 *   --overcharge-perk none|second_pick|long|blessing   which perk the hold policy takes on an Overcharged draw
 *   --event-policy safe|big                boon card option a (safe) or b (big);
 */
import { writeFileSync } from 'node:fs';
import { loadContent } from '../src/content/load.js';
import type { Content } from '../src/content/schema.js';
import { gameData, priceOf } from '../src/engine/data.js';
import { hunt } from '../src/engine/hunt.js';
import { cheerAction, eventAction } from '../src/engine/index.js';
import { checkAchievements } from '../src/engine/achievements.js';
import { objectiveAction } from '../src/engine/objectives.js';
import { catchChance, huntOdds, luckFactor, setupStats } from '../src/engine/odds.js';
import { buy, count, craft, equip, newPlayer, travel, type PlayerState, type Setup } from '../src/engine/player.js';
import { seededRng, type Rng } from '../src/engine/rng.js';

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const PLAYERS = opt('players', 200);
const SEED = opt('seed', 1);
const SEEDS = opt('seeds', 0);
const MAX_HUNTS = opt('max-hunts', 20000);
const MAX_COLLECT = opt('max-collect-hunts', 20000);
const STRICT = args.includes('--strict');
const VERBOSE = args.includes('--verbose');
const strOpt = (name: string, def = '') => { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] ?? def) : def; };
const TRACE = strOpt('trace');
const TRACE_PLAYERS = opt('trace-players', 1);
const OC_PERK = strOpt('overcharge-perk', 'none');
const NO_CHEER = args.includes('--no-cheer');
const NO_EVENTS = args.includes('--no-events');
const BOON_POLICY = strOpt('boon-policy', 'greedy');
const EVENT_POLICY = strOpt('event-policy', 'safe');
const HAS_CHEER = true;
const HAS_EVENTS = true;
const traceLines: string[] = [];
/** `--without a,b` leaves those items out of the run: neither bought nor crafted (e.g. to check optional bases barely move the pace). */
const WITHOUT = new Set((args[args.indexOf('--without') + 1] ?? '').split(',').filter((x) => args.includes('--without') && x));

/** Target hunts spent in each rank, from the plan. */
const TARGET_HUNTS_IN_RANK: Record<number, number> = { 1: 150, 2: 250, 3: 400, 4: 600 };

const content: Content = loadContent(strOpt('content', 'content'));
content.constants.cheer.enabled = !NO_CHEER;
content.constants.events.enabled = !NO_EVENTS;
const data = gameData(content);
const finalRank = content.ranks.at(-1)!.rank;

function baitPrice(id: string): number {
  const b = data.items.get(id);
  return (b && priceOf(b)) ?? 0;
}

/** Score of a setup: points plus net gold per hunt, so both progress and profit count. */
function score(setup: Setup, location: string) {
  const o = huntOdds(content, setup, location);
  const net = o.expectedGold - baitPrice(setup.bait ?? '');
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
  byLocation: Record<string, { hunts: number; attracted: number; caught: number; gold: number; baitCost: number; pillages: number; pillageCost: number }>;
  bossCatches: number;
  bosses: Record<string, number>;
  objectives: { runs: number; launches: number; orders: number };
  finished: boolean;
  hunts: number;
  /** Achievement id → hunt number it was earned at. */
  badges: Record<string, number>;
  /** Encounters and catches per elf tier, overall and per location. */
  tiers: Record<string, { met: number; caught: number }>;
  tiersAt: Record<string, Record<string, { met: number; caught: number }>>;
  /** Longest run of escapes in a row. */
  worstEscapes: number;
  /** Elf id → hunt number of the first catch, and per location the hunt every elf was caught. */
  firstCatch: Record<string, number>;
  portraitDone: Record<string, number>;
  /** Hunt number when every elf in the game (bosses and the Carol Loft included) had been caught; undefined if not by the cap. */
  collectedAt?: number;
  /** Elves still uncaught when the run stopped. */
  missing?: string[];
  /** Hunt numbers where something good happened (any catch, or a milestone that is not a plain catch). */
  goodAny: number[];
  goodMilestone: number[];
  goldIn: number;
  baitSpent: number;
  pillageLost: number;
  lootHunts: number;
  cheer: { fills: number[]; pipsGained: number; pipsLost: number; draws: number; held: number; heldPips: number[]; boonHunts: number; fullWait: number; picks: Record<string, number>; offered: Record<string, number>; rareDraws: number; legDraws: number; pityForced: number; drawsAt: Record<string, number>; goldUnder: number; goldOutside: number; huntsOutside: number; caughtUnder: number; caughtOutside: number; pointsUnder: number; pointsOutside: number };
  events: { n: number; byType: Record<string, number>; hunts: number[]; boonGold: number; boonsA: number; boonsB: number; declined: number };
}

let collecting = false;
const allElves = content.locations.flatMap((l) => l.imps.map((i) => i.id));
const uncaught = (p: PlayerState) => allElves.filter((id) => (p.catches[id] ?? 0) === 0);

function plan(p: PlayerState, log: Log, huntNo: number): PlayerState {
  // 1. Unlock the deepest location the rank allows, keeping a bait reserve.
  for (const loc of [...content.locations].filter((l) => !l.side).reverse()) {
    if (!p.unlocked.includes(loc.id) && loc.rank <= p.rank && p.gold >= loc.unlockCost * 1.5) {
      p = apply(p, travel(content, p, loc.id));
      break;
    }
  }
  // 1b. Side areas: take the detour once it is affordable and its room is open.
  for (const loc of content.locations.filter((l) => l.side)) {
    if (!p.unlocked.includes(loc.id) && loc.rank <= p.rank && p.gold >= loc.unlockCost * 1.5 && (!loc.after || p.unlocked.includes(loc.after))) {
      p = apply(p, travel(content, p, loc.id));
      break;
    }
  }
  // 2. Hunt where points come fastest without losing gold. A player who has opened a side area for a
  // trap hunts there until they own it.
  let where = p.location;
  let bestValue = -Infinity;
  const detour = content.locations.find((l) => l.side && p.unlocked.includes(l.id) && content.recipes.some((r) => count(p, r.output.item) === 0 && data.items.get(r.output.item)?.kind === 'trap' && Object.keys(r.ingredients).some((i) => l.imps.some((m) => m.loot?.some((x) => x.item === i)))));
  const missing = collecting ? uncaught(p) : [];
  for (const id of p.unlocked) {
    // Collection phase (after rank 5): only hunt rooms that still hold an uncaught elf, if any is reachable.
    if (collecting && missing.length && p.unlocked.some((u) => data.locations.get(u)!.imps.some((m) => missing.includes(m.id))) && !data.locations.get(id)!.imps.some((m) => missing.includes(m.id))) continue;
    const s = bestSetup(p, id, true);
    const v = s.net >= 0 ? s.value : s.net - 1e6;
    if (v > bestValue) { bestValue = v; where = id; }
  }
  if (detour && !collecting) where = detour.id;
  if (where !== p.location) p = apply(p, travel(content, p, where));

  // 3. Craft gear whenever possible (move off a trap the recipe uses up first).
  for (const r of content.recipes) {
    const out = data.items.get(r.output.item)!;
    if (WITHOUT.has(out.id)) continue;
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

  // 4a. A Triple Crate and the bosses' weaknesses reward owning a trap of each type: before hunting at the
  // order board, buy the cheapest one of each type on sale, as a careful player would.
  if (data.locations.get(p.location)?.objective?.type === 'order_board') {
    for (const type of new Set(content.items.traps.map((t) => t.type))) {
      if (content.items.traps.some((t) => t.type === type && count(p, t.id) > 0)) continue;
      const cheapest = content.items.traps
        .filter((t) => t.type === type && t.price !== null && t.rank <= p.rank)
        .sort((a, b) => a.price! - b.price!)[0];
      if (!cheapest) continue;
      const r = buy(content, p, cheapest.id);
      if (r.ok) { p = r.player; log.purchases.push({ hunt: huntNo, item: cheapest.id }); }
    }
  }

  // 4. Buy the gear upgrade that helps most here, keeping enough gold for ~60 baits.
  const current = bestSetup(p, p.location, true);
  const reserve = 60 * Math.max(8, baitPrice(current.setup.bait ?? ''));
  let pick: { id: string; gain: number } | null = null;
  for (const item of [...content.items.traps, ...content.items.bases]) {
    if (WITHOUT.has(item.id) || item.price === null || item.rank > p.rank || count(p, item.id) > 0 || p.gold < item.price + reserve) continue;
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

/** Location goals: start sleigh runs, take Rush orders, and bring the best trap for an inspecting mini boss or boss. Orders are parallel, so the bot never swaps for the board itself. */
function playObjective(p: PlayerState, rng: Rng, log: Log): PlayerState {
  const loc = data.locations.get(p.location)!;
  const s = p.objectives?.[loc.id];
  if (loc.objective?.type === 'sleigh_run') {
    // A run costs gold every hunt, so the bot only starts one with its whole cost in hand and a trap that can win it (farming
    // ride-off hunts until then), and abandons a run it can no longer pay for.
    const ownsRunTrap = (q: PlayerState) => ['snow_globe_prison', 'sleigh_bell_snapper'].some((t) => count(q, t) > 0);
    const ob = loc.objective;
    const perHunt = ob.upkeep + baitPrice(p.setup.bait ?? '');
    if ((!s || (s.type === 'sleigh_run' && !s.active && !s.forced)) && p.gold >= ob.hunts * perHunt && ownsRunTrap(p)) {
      const r = objectiveAction(content, p, 'start_run', rng);
      if (r.ok) { p = r.player; log.objectives.runs++; }
    } else if (s?.type === 'sleigh_run' && s.active && p.gold < 3 * perHunt) {
      const r = objectiveAction(content, p, 'abandon_run', rng);
      if (r.ok) p = r.player;
    }
  }
  if (s?.type === 'order_board') {
    if (s.rushReady && s.rushLeft === 0) {
      const r = objectiveAction(content, p, 'rush_order', rng);
      if (r.ok) p = r.player;
    }
    // Orders are parallel, so the bot never swaps for the board. It only brings the best owned trap for a
    // mini boss or boss that is about to come (the one swap a careful player makes).
    const now = p.objectives![loc.id];
    const target = now?.type === 'order_board' ? loc.imps.find((i) => i.id === now.forced) : undefined;
    if (target) {
      let best: { id: string; chance: number } | undefined;
      for (const t of content.items.traps.filter((t) => count(p, t.id) > 0)) {
        const stats = setupStats(content, { ...p.setup, trap: t.id }, loc);
        const chance = catchChance(stats, target, content.constants.catchCap, luckFactor(content.constants, target));
        if (!best || chance > best.chance) best = { id: t.id, chance };
      }
      if (best && best.id !== p.setup.trap) p = apply(p, equip(content, p, 'trap', best.id));
    }
  }
  return p;
}

/** Boon value table for the greedy policy: higher is picked first. */
const BOON_VALUE: Record<string, number> = {
  santas_blessing: 9, cocoa_rush: 8, points_parade: 8, starfall: 7, mulligan: 7, boss_bell: 7, steady_hands: 6, double_haul: 6, cheer_surge: 6,
  lucky_stocking: 5, sweet_tooth: 5, full_sack: 4, free_bait: 3, cosy_mittens: 2,
};

/** The simulated player answers an open boon card, and the Cheer Meter, as the chosen policies say. */
function answer(p: PlayerState, rng: Rng, log: Log, n: number): PlayerState {
  const ev = p.events;
  if (ev?.pending) {
    const before = p.gold;
    const act = EVENT_POLICY === 'big' ? 'b' : 'a';
    const r = eventAction(content, p, act, rng);
    if (r.ok) {
      p = r.player;
      log.events.boonGold += p.gold - before;
      if (act === 'a') log.events.boonsA++; else log.events.boonsB++;
    }
  }
  const c = content.constants.cheer;
  if (!c.enabled || !p.cheer) return p;
  const s = p.cheer;
  if (s.draw?.perks?.length && OC_PERK !== 'none' && s.draw.perks.includes(OC_PERK)) {
    const r0 = cheerAction(content, p, 'perk', rng, OC_PERK);
    if (r0.ok) p = r0.player;
    return answer(p, rng, log, n);
  }
  if (p.cheer!.draw) {
    const cards = p.cheer!.draw.cards;
    const pick = BOON_POLICY === 'random' ? cards[Math.floor(rng() * cards.length)]! : [...cards].sort((a, b) => (BOON_VALUE[b] ?? 0) - (BOON_VALUE[a] ?? 0))[0]!;
    for (const id of cards) log.cheer.offered[id] = (log.cheer.offered[id] ?? 0) + 1;
    log.cheer.picks[pick] = (log.cheer.picks[pick] ?? 0) + 1;
    const r = cheerAction(content, p, 'pick', rng, pick);
    if (r.ok) {
      p = r.player;
      if (p.cheer?.draw) p = answer(p, rng, log, n);
    }
    return p;
  }
  if (s.pips >= c.full) {
    if (BOON_POLICY === 'hold' && !s.held && s.pips < c.max) {
      const r = cheerAction(content, p, 'hold', rng);
      if (r.ok) { p = r.player; log.cheer.held++; }
      return p;
    }
    if (BOON_POLICY === 'hold' && s.held && s.pips < c.max) { log.cheer.fullWait++; return p; }
    const pity = c.pity;
    const sr = s.sinceRare, sl = s.sinceLegendary;
    const pips = s.pips;
    const r = cheerAction(content, p, 'draw', rng);
    if (r.ok) {
      p = r.player;
      log.cheer.draws++;
      log.cheer.drawsAt[p.location] = (log.cheer.drawsAt[p.location] ?? 0) + 1;
      log.cheer.fills.push(n - lastFillOf(log));
      log.cheer.heldPips.push(pips);
      if (sl >= pity.legendary || sr >= pity.rare) log.cheer.pityForced++;
      const cs = p.cheer!.draw!.cards.map((id) => content.boons.find((b) => b.id === id)!);
      if (cs.some((b) => b.rarity !== 'common')) log.cheer.rareDraws++;
      if (cs.some((b) => b.rarity === 'legendary')) log.cheer.legDraws++;
      p = answer(p, rng, log, n);
    }
  }
  return p;
}
const lastFillOf = (log: Log) => log.cheer.fills.reduce((a, b) => a + b, 0);

function play(rng: Rng, playerNo: number): Log {
  let p = newPlayer(content);
  const log: Log = { rankAt: { 1: 0 }, goldAtRank: {}, purchases: [], byLocation: {}, bossCatches: 0, finished: false, hunts: 0, objectives: { runs: 0, launches: 0, orders: 0 }, bosses: {}, badges: {}, tiers: {}, tiersAt: {}, worstEscapes: 0, firstCatch: {}, portraitDone: {}, goodAny: [], goodMilestone: [], goldIn: 0, baitSpent: 0, pillageLost: 0, lootHunts: 0, cheer: { fills: [], pipsGained: 0, pipsLost: 0, draws: 0, held: 0, heldPips: [], boonHunts: 0, fullWait: 0, picks: {}, offered: {}, rareDraws: 0, legDraws: 0, pityForced: 0, drawsAt: {}, goldUnder: 0, goldOutside: 0, huntsOutside: 0, caughtUnder: 0, caughtOutside: 0, pointsUnder: 0, pointsOutside: 0 }, events: { n: 0, byType: {}, hunts: [], boonGold: 0, boonsA: 0, boonsB: 0, declined: 0 } };
  let lastFill = 0;
  const traceMe = !!TRACE && playerNo < TRACE_PLAYERS;
  let escRun = 0;
  let badgesBefore = 0;
  let purchasesBefore = 0;
  for (let n = 1; n <= MAX_HUNTS; n++) {
    if (n === 1 || n % 20 === 0 || !p.setup.bait || count(p, p.setup.bait) === 0) p = plan(p, log, n);
    p = playObjective(p, rng, log);
    p = answer(p, rng, log, n);
    const loc = p.location;
    const baitBefore = p.setup.bait;
    const underBoon = (p.cheer?.active.length ?? 0) > 0;
    const r = hunt(content, p, rng);
    if (!r.ok) { p = plan(p, log, n); continue; }
    p = r.player;
    const L = (log.byLocation[loc] ??= { hunts: 0, attracted: 0, caught: 0, gold: 0, baitCost: 0, pillages: 0, pillageCost: 0 });
    L.hunts++;
    if (r.entry.outcome !== 'quiet') L.attracted++;
    if (r.entry.outcome === 'catch') { L.caught++; L.gold += r.entry.gold; }
    const tier = r.entry.imp ? data.imps.get(r.entry.imp)?.tier : undefined;
    if (tier === 'boss' && r.entry.outcome === 'catch') log.bossCatches++;
    if ((tier === 'boss' || tier === 'miniboss') && r.entry.outcome === 'catch') log.bosses[r.entry.imp!] = (log.bosses[r.entry.imp!] ?? 0) + 1;
    for (const note of r.entry.objective?.notes ?? []) {
      if (note.startsWith('The sleigh launches')) log.objectives.launches++;
      if (/order done: a Toy Crate/.test(note)) log.objectives.orders++;
    }
    L.baitCost += r.entry.baitUsed * baitPrice(baitBefore ?? '');
    if (r.entry.pillage) {
      L.pillages++;
      L.pillageCost += r.entry.pillage.gold + (r.entry.pillage.bait ? r.entry.pillage.bait.amount * baitPrice(r.entry.pillage.bait.item) : 0);
    }
    if (r.entry.rankUp) { log.rankAt[r.entry.rankUp] = n; log.goldAtRank[r.entry.rankUp] = p.gold; }
    log.hunts = n;
    // Achievement times are hunt numbers here, so the report can say when each one is earned.
    checkAchievements(content, p, n);
    const e = r.entry;
    const t = tier ?? 'common';
    for (const bucket of [(log.tiers[t] ??= { met: 0, caught: 0 }), ((log.tiersAt[loc] ??= {})[t] ??= { met: 0, caught: 0 })]) {
      bucket.met++;
      if (e.outcome === 'catch') bucket.caught++;
    }
    escRun = e.outcome === 'escape' ? escRun + 1 : 0;
    log.worstEscapes = Math.max(log.worstEscapes, escRun);
    if (e.outcome === 'catch') log.goldIn += e.gold;
    log.baitSpent += e.baitUsed * baitPrice(baitBefore ?? '');
    if (e.pillage) log.pillageLost += e.pillage.gold;
    if (e.loot.length) log.lootHunts++;
    if (e.firstCatch && e.imp) {
      log.firstCatch[e.imp] = n;
      const here = data.locations.get(loc)!;
      if (!log.portraitDone[loc] && here.imps.every((i) => (p.catches[i.id] ?? 0) > 0)) log.portraitDone[loc] = n;
    }
    const ch = log.cheer, evs = log.events;
    if (e.cheer) {
      ch.pipsGained += e.cheer.gained;
      ch.pipsLost += e.cheer.lost;
      if (e.cheer.full && BOON_POLICY !== 'hold') ch.fullWait += 0;
    }
    if (underBoon) {
      ch.boonHunts++; ch.goldUnder += e.gold; ch.pointsUnder += e.points; if (e.outcome === 'catch') ch.caughtUnder++;
    } else {
      ch.huntsOutside++; ch.goldOutside += e.gold; ch.pointsOutside += e.points; if (e.outcome === 'catch') ch.caughtOutside++;
    }
    for (const note of e.events ?? []) {
      evs.n++;
      evs.byType[note.type] = (evs.byType[note.type] ?? 0) + 1;
      if (note.type === 'boon' || note.type === 'grand') evs.hunts.push(n);
    }
    const badgesNow = Object.keys(p.achievements ?? {}).length;
    const milestone = !!(e.firstCatch || e.rankUp || e.key || e.loot.length || e.objective?.notes?.length || badgesNow > badgesBefore || log.purchases.length > purchasesBefore || (e.events?.length ?? 0) > 0 || (e.cheer?.full ?? false));
    badgesBefore = badgesNow;
    purchasesBefore = log.purchases.length;
    if (e.outcome === 'catch' || milestone) log.goodAny.push(n);
    if (milestone) log.goodMilestone.push(n);
    if (traceMe) {
      traceLines.push(JSON.stringify({ n, location: loc, tier: t, imp: e.imp, outcome: e.outcome, chance: e.catchChance && Math.round(e.catchChance * 1000) / 1000, gold: e.gold, points: e.points, loot: e.loot.map((l) => `${l.item}x${l.amount}`), firstCatch: e.firstCatch, rankUp: e.rankUp, pillage: e.pillage?.gold, goldTotal: p.gold, good: milestone, pips: e.cheer?.pips ?? null, boons: (p.cheer?.active ?? []).map((a) => `${a.id}:${a.hunts}`), event: e.events?.map((x) => x.id) ?? null }));
    }
    if (p.rank >= finalRank) { log.finished = true; break; }
  }
  log.badges = { ...p.achievements };
  // Second benchmark: keep hunting after the last rank until every elf is caught (or the cap). Stats above are frozen.
  if (log.finished) {
    const frozen = structuredClone(log);
    collecting = true;
    let n = log.hunts;
    if (uncaught(p).length === 0) log.collectedAt = n;
    while (log.collectedAt === undefined && n < MAX_COLLECT) {
      n++;
      if (n % 20 === 0 || !p.setup.bait || count(p, p.setup.bait) === 0) p = plan(p, frozen, n);
      p = playObjective(p, rng, frozen);
      p = answer(p, rng, frozen, n);
      const r = hunt(content, p, rng);
      if (!r.ok) { p = plan(p, frozen, n); continue; }
      p = r.player;
      if (r.entry.firstCatch && uncaught(p).length === 0) log.collectedAt = n;
    }
    log.missing = uncaught(p);
    collecting = false;
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
const seedList = SEEDS > 0 ? Array.from({ length: SEEDS }, (_, k) => k + 1) : [SEED];
const perSeedMedian: number[] = [];
for (const sd of seedList) {
  const mine: Log[] = [];
  for (let i = 0; i < PLAYERS; i++) mine.push(play(seededRng(sd * 100003 + i), i + (sd === seedList[0] ? 0 : 1e9)));
  perSeedMedian.push(quant(mine.filter((l) => l.finished).map((l) => l.hunts), 0.5));
  logs.push(...mine);
}
const TOTAL = logs.length;

console.log(`\nThe Naughty List balance run: ${TOTAL} players, ${SEEDS > 0 ? `seeds 1 to ${SEEDS}` : `seed ${SEED}`}`);
console.log(`Cheer Meter: ${HAS_CHEER ? (NO_CHEER ? 'off' : `on, boon policy ${BOON_POLICY}`) : 'not in this engine'}. Events: ${HAS_EVENTS ? (NO_EVENTS ? 'off' : `on, event policy ${EVENT_POLICY}`) : 'not in this engine'}.\n`);
if (SEEDS > 0) console.log(`Median hunts to rank ${finalRank} per seed: ${perSeedMedian.map(fmt).join(', ')}`);
console.log(`Reached rank ${finalRank}: ${logs.filter((l) => l.finished).length}/${TOTAL}`);
console.log(`Total hunts to rank ${finalRank}: median ${fmt(quant(logs.filter((l) => l.finished).map((l) => l.hunts), 0.5))}`);
{
  const col = logs.filter((l) => l.collectedAt !== undefined).map((l) => l.collectedAt!);
  console.log(`Hunts to catch all ${allElves.length} elves (100% of portraits, after rank ${finalRank}, cap ${fmt(MAX_COLLECT)} hunts): reached by ${col.length}/${TOTAL} (${pct(col.length / TOTAL)}); mean ${fmt(col.reduce((a, b) => a + b, 0) / Math.max(1, col.length))}, p10 ${fmt(quant(col, 0.1))} / median ${fmt(quant(col, 0.5))} / p90 ${fmt(quant(col, 0.9))}`);
  const after = logs.filter((l) => l.collectedAt !== undefined).map((l) => l.collectedAt! - l.hunts);
  console.log(`  Extra hunts after rank ${finalRank} to finish the collection: p10 ${fmt(quant(after, 0.1))} / median ${fmt(quant(after, 0.5))} / p90 ${fmt(quant(after, 0.9))}`);
  const miss: Record<string, number> = {};
  for (const l of logs) for (const m of l.missing ?? []) miss[m] = (miss[m] ?? 0) + 1;
  const top = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length) console.log(`  Still missing at the cap: ${top.map(([id, c]) => `${id} ${c}`).join(', ')}`);
  console.log('');
}

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

console.log('\nLocation           Hunts    Catch rate  Bait cost / gold  Pillages  Pillage cost / gold');
for (const loc of content.locations) {
  const ls = logs.map((l) => l.byLocation[loc.id]).filter(Boolean) as Log['byLocation'][string][];
  const sum = (k: keyof Log['byLocation'][string]) => ls.reduce((s, x) => s + x[k], 0);
  console.log(`${loc.name.padEnd(19)}${fmt(sum('hunts') / TOTAL).padEnd(9)}${pct(sum('caught') / sum('hunts')).padEnd(12)}${pct(sum('baitCost') / sum('gold')).padEnd(18)}${fmt(sum('pillages') / TOTAL).padEnd(10)}${pct(sum('pillageCost') / sum('gold'))}`);
}

console.log('\nGear bought or crafted (median hunt number, share of players)');
const items = new Map<string, number[]>();
for (const l of logs) for (const pu of l.purchases) (items.get(pu.item) ?? items.set(pu.item, []).get(pu.item)!).push(pu.hunt);
for (const [item, hunts] of [...items].sort((a, b) => quant(a[1], 0.5) - quant(b[1], 0.5))) {
  console.log(`  ${(data.items.get(item)?.name ?? item).padEnd(22)} hunt ${fmt(quant(hunts, 0.5)).padEnd(8)} ${pct(hunts.length / TOTAL)}`);
}
console.log(`\nBoss catches per player: ${(logs.reduce((s, l) => s + l.bossCatches, 0) / TOTAL).toFixed(1)}`);
const per = (f: (l: Log) => number) => (logs.reduce((s, l) => s + f(l), 0) / TOTAL).toFixed(1);
console.log('Mini boss and boss catches per player: ' + content.locations.flatMap((l) => l.imps).filter((i) => i.tier === 'boss' || i.tier === 'miniboss').map((i) => `${i.name} ${per((l) => l.bosses[i.id] ?? 0)}`).join(', '));
console.log(`Toy orders finished: ${per((l) => l.objectives.orders)}. Sleigh runs: ${per((l) => l.objectives.runs)}, launched: ${per((l) => l.objectives.launches)}`);

const badgeCounts = logs.map((l) => Object.keys(l.badges).length);
console.log(`\nAchievements earned by the end (median ${fmt(quant(badgeCounts, 0.5))} of ${content.achievements.length}; p10 ${fmt(quant(badgeCounts, 0.1))}, p90 ${fmt(quant(badgeCounts, 0.9))})`);
for (const f of ['bronze', 'silver', 'gold'] as const) {
  const ids = content.achievements.filter((a) => a.frame === f).map((a) => a.id);
  const per = logs.map((l) => ids.filter((id) => l.badges[id] !== undefined).length);
  console.log(`  ${f.padEnd(7)} median ${fmt(quant(per, 0.5))} of ${ids.length}`);
}
if (args.includes('--badges')) {
  console.log('  Badge                     Players  Median hunt');
  for (const a of content.achievements) {
    const at = logs.map((l) => l.badges[a.id]).filter((x): x is number => x !== undefined);
    console.log(`  ${a.name.padEnd(26)}${pct(at.length / TOTAL).padEnd(9)}${fmt(quant(at, 0.5))}`);
  }
}

// ---------- Allure, goals, economy and progress feel ----------
const TIERS = ['common', 'uncommon', 'rare', 'miniboss', 'boss'];
console.log('\nEncounter mix and catch rate by elf tier (every hunt meets an elf)');
console.log('Location           ' + TIERS.map((t) => t.padEnd(16)).join(''));
for (const loc of [...content.locations, { id: '*', name: 'All areas' }]) {
  const cells = TIERS.map((t) => {
    const rows = logs.map((l) => (loc.id === '*' ? l.tiers[t] : l.tiersAt[loc.id]?.[t])).filter(Boolean) as { met: number; caught: number }[];
    const all = logs.flatMap((l) => Object.values(loc.id === '*' ? l.tiers : (l.tiersAt[loc.id] ?? {})));
    const met = rows.reduce((s, x) => s + x.met, 0), caught = rows.reduce((s, x) => s + x.caught, 0);
    const total = all.reduce((s, x) => s + x.met, 0);
    return (met ? `${pct(met / total)} / ${pct(caught / met)}` : '-').padEnd(16);
  });
  console.log(loc.name.padEnd(19) + cells.join(''));
}
console.log('(each cell: share of encounters / catch rate)');
const esc = logs.map((l) => l.worstEscapes);
console.log(`Longest escape streak: median ${fmt(quant(esc, 0.5))}, p90 ${fmt(quant(esc, 0.9))}, max ${fmt(Math.max(...esc))}`);

console.log('\nPortrait goal (every elf of an area caught) and first catches');
console.log('Location           Done by end  Median hunt done  Rank-up hunt (median)  Done minus rank-up hunt (median, negative = done before)');
for (const loc of content.locations.filter((l) => !l.side)) {
  const done = logs.map((l) => l.portraitDone[loc.id]).filter((x): x is number => x !== undefined);
  const next = content.ranks.find((r) => r.rank === (content.locations.filter((l) => !l.side).indexOf(loc) + 2));
  const rankUp = logs.map((l) => (next ? l.rankAt[next.rank] : undefined)).filter((x): x is number => x !== undefined);
  const extra = logs.map((l) => (next && l.portraitDone[loc.id] !== undefined && l.rankAt[next.rank] !== undefined ? l.portraitDone[loc.id]! - l.rankAt[next.rank]! : undefined)).filter((x): x is number => x !== undefined);
  console.log(`${loc.name.padEnd(19)}${pct(done.length / TOTAL).padEnd(13)}${fmt(quant(done, 0.5)).padEnd(18)}${fmt(quant(rankUp, 0.5)).padEnd(23)}${fmt(quant(extra, 0.5))}`);
}
console.log('Hunts to first catch (median, share of players who ever caught it): the long tail');
for (const loc of content.locations) {
  console.log('  ' + loc.name.padEnd(17) + loc.imps.filter((i) => ['rare', 'miniboss', 'boss'].includes(i.tier)).map((i) => {
    const at = logs.map((l) => l.firstCatch[i.id]).filter((x): x is number => x !== undefined);
    return `${i.name} ${fmt(quant(at, 0.5))} (${pct(at.length / TOTAL)})`;
  }).join(', '));
}

const done = logs.filter((l) => l.finished);
const sumOf = (f: (l: Log) => number) => done.reduce((s, l) => s + f(l), 0);
console.log('\nGold flow, players who reached the end (per player, median)');
console.log(`  Earned from catches ${fmt(quant(done.map((l) => l.goldIn), 0.5))}, bait used ${fmt(quant(done.map((l) => l.baitSpent), 0.5))} (${pct(sumOf((l) => l.baitSpent) / sumOf((l) => l.goldIn))} of gold earned), lost to pillage ${fmt(quant(done.map((l) => l.pillageLost), 0.5))}`);
console.log('  Gold in hand at rank-up (median): ' + content.ranks.slice(1).map((r) => `R${r.rank} ${fmt(quant(logs.map((l) => l.goldAtRank[r.rank]).filter((x): x is number => x !== undefined), 0.5))}`).join(', '));
console.log(`  Hunts that dropped loot: ${pct(sumOf((l) => l.lootHunts) / sumOf((l) => l.hunts))}`);

function gaps(xs: number[]) {
  const out: number[] = [];
  let prev = 0;
  for (const x of xs) { out.push(x - prev); prev = x; }
  return out;
}
const gapsAny = done.flatMap((l) => gaps(l.goodAny));
const gapsMile = done.flatMap((l) => gaps(l.goodMilestone));
const longest = (set: Log[], f: (l: Log) => number[]) => quant(set.map((l) => Math.max(...gaps(f(l)))), 0.5);
console.log('\nProgress feel: hunts between good things (a milestone is a first catch, loot, rank-up, key, objective step, badge or purchase)');
console.log(`  Any catch or milestone: median gap ${fmt(quant(gapsAny, 0.5))}, p90 ${fmt(quant(gapsAny, 0.9))}, p99 ${fmt(quant(gapsAny, 0.99))}, longest dry spell (median player) ${fmt(longest(done, (l) => l.goodAny))}`);
console.log(`  Milestones only (plain catches excluded): median gap ${fmt(quant(gapsMile, 0.5))}, p90 ${fmt(quant(gapsMile, 0.9))}, p99 ${fmt(quant(gapsMile, 0.99))}, longest dry spell (median player) ${fmt(longest(done, (l) => l.goodMilestone))}`);

// ---------- Cheer Meter and events ----------
const totalHunts = logs.reduce((a, l) => a + l.hunts, 0);
const sumC = (f: (c: Log['cheer']) => number) => logs.reduce((a, l) => a + f(l.cheer), 0);
if (HAS_CHEER && !NO_CHEER) {
  const fills = logs.flatMap((l) => l.cheer.fills);
  const perFill = logs.flatMap((l) => l.cheer.fills.map((_, i) => l.cheer.fills[i]!));
  void perFill;
  const draws = sumC((c) => c.draws);
  console.log(`\nCheer Meter (boon policy: ${BOON_POLICY})`);
  console.log(`  Hunts per fill: p10 ${fmt(quant(fills, 0.1))}, median ${fmt(quant(fills, 0.5))}, p90 ${fmt(quant(fills, 0.9))}. Draws per 100 hunts: ${(draws / totalHunts * 100).toFixed(1)}`);
  console.log(`  Pips earned per hunt ${(sumC((c) => c.pipsGained) / totalHunts).toFixed(2)}; pips lost to escapes ${pct(sumC((c) => c.pipsLost) / Math.max(1, sumC((c) => c.pipsGained)))} of pips earned`);
  console.log(`  Hunts under a boon: ${pct(sumC((c) => c.boonHunts) / totalHunts)}. Hunts spent holding a full meter (Overcharge): ${pct(sumC((c) => c.fullWait) / totalHunts)}. Overcharge started on ${fmt(sumC((c) => c.held))} of ${fmt(draws)} fills`);
  console.log(`  Pips at cash-in: median ${fmt(quant(logs.flatMap((l) => l.cheer.heldPips), 0.5))}, p90 ${fmt(quant(logs.flatMap((l) => l.cheer.heldPips), 0.9))}. Draws that showed a rare or better ${pct(sumC((c) => c.rareDraws) / draws)}, a legendary ${pct(sumC((c) => c.legDraws) / draws)}; pity forced ${pct(sumC((c) => c.pityForced) / draws)}`);
  const rate = (a: number, b: number) => (b ? a / b : NaN);
  console.log(`  Under a boon vs outside (per hunt): gold ${fmt(rate(sumC((c) => c.goldUnder), sumC((c) => c.boonHunts)))} vs ${fmt(rate(sumC((c) => c.goldOutside), sumC((c) => c.huntsOutside)))}, points ${fmt(rate(sumC((c) => c.pointsUnder), sumC((c) => c.boonHunts)))} vs ${fmt(rate(sumC((c) => c.pointsOutside), sumC((c) => c.huntsOutside)))}, catch rate ${pct(rate(sumC((c) => c.caughtUnder), sumC((c) => c.boonHunts)))} vs ${pct(rate(sumC((c) => c.caughtOutside), sumC((c) => c.huntsOutside)))}`);
  console.log('  Draws per 100 hunts by area: ' + content.locations.map((l) => `${l.name} ${(sumC((c) => c.drawsAt[l.id] ?? 0) / Math.max(1, logs.reduce((a, x) => a + (x.byLocation[l.id]?.hunts ?? 0), 0)) * 100).toFixed(1)}`).join(', '));
  console.log('  Boon                 Rarity     Offered   Picked   Pick rate when offered');
  for (const b of content.boons) {
    const off = sumC((c) => c.offered[b.id] ?? 0), pk = sumC((c) => c.picks[b.id] ?? 0);
    console.log(`  ${b.name.padEnd(21)}${b.rarity.padEnd(11)}${fmt(off / TOTAL).padStart(7)}${(pk / TOTAL).toFixed(1).padStart(9)}   ${pct(pk / off)}`);
  }
}
if (HAS_EVENTS && !NO_EVENTS) {
  const sumE = (f: (e: Log['events']) => number) => logs.reduce((a, l) => a + f(l.events), 0);
  const gapsE = logs.flatMap((l) => gaps(l.events.hunts));
  const started = sumE((e) => e.hunts.length);
  const count2 = (t: string) => sumE((e) => e.byType[t] ?? 0);
  console.log(`\nEvents (policy: ${EVENT_POLICY})`);
  console.log(`  Events per 100 hunts: ${(started / totalHunts * 100).toFixed(2)} (boon cards ${(count2('boon') / totalHunts * 100).toFixed(2)}, Grand Gifts ${(count2('grand') / totalHunts * 100).toFixed(2)})`);
  console.log(`  Hunts between events: min ${fmt(gapsE.reduce((a, b) => Math.min(a, b), Infinity))}, median ${fmt(quant(gapsE, 0.5))}, p90 ${fmt(quant(gapsE, 0.9))}, max ${fmt(gapsE.reduce((a, b) => Math.max(a, b), 0))}. Events per player: median ${fmt(quant(logs.map((l) => l.events.hunts.length), 0.5))}, Grand Gifts per player ${(count2('grand') / TOTAL).toFixed(1)}`);
  console.log(`  Boon cards: option a ${fmt(sumE((e) => e.boonsA) / TOTAL)}, option b ${fmt(sumE((e) => e.boonsB) / TOTAL)} per player; gold from boon cards ${fmt(sumE((e) => e.boonGold) / TOTAL)} per player (${pct(sumE((e) => e.boonGold) / Math.max(1, logs.reduce((a, l) => a + l.goldIn, 0)))} of gold earned)`);
}
if (TRACE) {
  writeFileSync(TRACE, traceLines.join('\n') + '\n');
  console.log(`\nTrace: ${traceLines.length} hunts written to ${TRACE}`);
}
if (VERBOSE) console.log(JSON.stringify(logs[0], null, 2));
if (STRICT && misses > 0) {
  console.error(`\n${misses} target(s) missed by more than 25%.`);
  process.exit(1);
}
