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
import { baitGoldValue, gameData, priceOf } from '../src/engine/data.js';
import { hunt } from '../src/engine/hunt.js';
import { cheerAction, eventAction } from '../src/engine/index.js';
import { checkAchievements } from '../src/engine/achievements.js';
import { objectiveAction } from '../src/engine/objectives.js';
import { baitWorksHere, catchChance, huntOdds, luckFactor, setupStats } from '../src/engine/odds.js';
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
/** `--bot loop` (default): farm for gold, then push (push bait, boss keys, rares) when the savings allow. `--bot legacy`: the old bot that picks bait by best net gold and never plans a push. */
const BOT = strOpt('bot', 'loop');
const LOOP = BOT !== 'legacy';
/** Hunts of push bait a player wants in hand before starting a push, and the cheapest they will continue on. */
const PUSH_HUNTS = opt('push-hunts', 30);
const HAS_CHEER = true;
const HAS_EVENTS = true;
const traceLines: string[] = [];
/** `--without a,b` leaves those items out of the run: neither bought nor crafted (e.g. to check optional bases barely move the pace). */
const WITHOUT = new Set((args[args.indexOf('--without') + 1] ?? '').split(',').filter((x) => args.includes('--without') && x));

/** Target hunts spent in each rank, from the plan. */
const TARGET_HUNTS_IN_RANK: Record<number, number> = { 1: 150, 2: 250, 3: 500, 4: 750 };

const content: Content = loadContent(strOpt('content', 'content'));
content.constants.cheer.enabled = !NO_CHEER;
content.constants.events.enabled = !NO_EVENTS;
const data = gameData(content);
const finalRank = content.ranks.at(-1)!.rank;

function baitPrice(id: string): number {
  if (LOOP) return baitGoldValue(data, id);
  const b = data.items.get(id);
  return (b && priceOf(b)) ?? 0;
}

/** Score of a setup: points plus net gold per hunt, so both progress and profit count. */
function score(setup: Setup, location: string) {
  const o = huntOdds(content, setup, location);
  const net = o.expectedGold - baitPrice(setup.bait ?? '');
  return { odds: o, net, value: o.expectedPoints + net };
}

type BaitMode = 'any' | 'farm' | 'push';

/**
 * Best setup in a location. `mode` filters the baits: farm uses the free floor bait and cheap farm baits, push uses the dearer
 * push baits too, any is the legacy choice (everything that works). Baits are owned, bought (10 hunts' worth in hand) or the free floor bait.
 */
function bestSetup(p: PlayerState, location: string, allowBuyBait: boolean, mode: BaitMode = 'any', score2: (s: ReturnType<typeof score>, setup: Setup) => number = (s) => s.value): { setup: Setup; value: number; net: number } {
  const loc = data.locations.get(location)!;
  const traps = content.items.traps.filter((t) => count(p, t.id) > 0);
  const bases = content.items.bases.filter((b) => count(p, b.id) > 0);
  const baits = content.items.baits.filter((b) => {
    if (mode === 'farm' && b.role === 'push') return false;
    if (LOOP && !baitWorksHere(loc, b.id)) return false;
    if (LOOP && b.role === 'floor') return true;
    return count(p, b.id) > 0 || (allowBuyBait && b.price !== null && b.rank <= p.rank && p.gold >= b.price * 10);
  });
  let best = { setup: p.setup, value: -Infinity, net: -Infinity };
  for (const t of traps) for (const b of bases) for (const bait of baits.length ? baits : [null]) {
    const setup: Setup = { trap: t.id, base: b.id, bait: bait?.id ?? null, charm: null };
    const s = score(setup, location);
    const v = score2(s, setup);
    if (v > best.value) best = { setup, value: v, net: s.net };
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
  jackpotCatches: number;
  jackpotGold: number;
  /** Farm and push stages: a hunt is a push hunt when the armed bait has role `push`. */
  stage: Record<'farm' | 'push', { hunts: number; caught: number; gold: number; bait: number; upkeep: number; points: number; jackpotGold: number; firstCatches: number; draws: number; events: number; eventHunts: number }>;
  pushRuns: number;
  upkeepSpent: number;
  /** Stale stretches: 50 or more hunts in a row without a first catch, rank-up, key or gear purchase. */
  stale: { hunts: number; stretches: number; longest: number; jackpots: number; events: number; draws: number; goldJackpot: number; endedBy: Record<string, number> };
  floorHunts: number;
  /** Where the player stood when the run stopped. */
  final2?: Record<string, unknown>;
  final?: { location: string; gold: number; rank: number; points: number; bait: string | null; trap: string; unlocked: string[] };
  baitSpent: number;
  pillageLost: number;
  lootHunts: number;
  cheer: { fills: number[]; pipsGained: number; pipsLost: number; draws: number; held: number; heldPips: number[]; boonHunts: number; fullWait: number; picks: Record<string, number>; offered: Record<string, number>; rareDraws: number; legDraws: number; pityForced: number; drawsAt: Record<string, number>; goldUnder: number; goldOutside: number; huntsOutside: number; caughtUnder: number; caughtOutside: number; pointsUnder: number; pointsOutside: number };
  events: { n: number; byType: Record<string, number>; hunts: number[]; boonGold: number; boonsA: number; boonsB: number; declined: number };
}

let collecting = false;
const allElves = content.locations.flatMap((l) => l.imps.map((i) => i.id));
const uncaught = (p: PlayerState) => allElves.filter((id) => (p.catches[id] ?? 0) === 0);

function planLegacy(p: PlayerState, log: Log, huntNo: number): PlayerState {
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

// ---------- The loop bot: farm for gold, then push ----------

/** What the bot is doing now. `push` means it saved up and is spending on push bait to reach elves farm bait does not. */
interface Brain { mode: 'farm' | 'push'; replan: boolean }
let brain: Brain = { mode: 'farm', replan: false };
/** Hunts of farm bait a push always leaves in hand, so a push never leaves the player stranded on the free fallback. */
const FARM_RESERVE = opt('farm-reserve', 25);
const RUN_MIN = opt('run-min', 50);
const RANK_ITEMS = () => [...content.items.traps, ...content.items.bases];

/** Elves the player is still after: rare, mini boss and boss portraits (and keys), loot a wanted recipe needs, and in the collection phase every uncaught elf. */
function wantedElves(p: PlayerState): Map<string, number> {
  const out = new Map<string, number>();
  const add = (id: string, w: number) => out.set(id, Math.max(out.get(id) ?? 0, w));
  for (const locId of p.unlocked) {
    for (const imp of data.locations.get(locId)!.imps) {
      if ((p.catches[imp.id] ?? 0) > 0) continue;
      if (collecting) add(imp.id, imp.tier === 'boss' ? 3 : imp.tier === 'miniboss' ? 2 : 1);
      else if (imp.tier === 'boss') add(imp.id, 3);
      else if (imp.tier === 'miniboss') add(imp.id, 2);
      else if (imp.tier === 'rare') add(imp.id, 1);
    }
  }
  // Loot a recipe for gear the player does not own yet still needs.
  for (const r of content.recipes) {
    const o = data.items.get(r.output.item);
    if (!o || (o.kind !== 'trap' && o.kind !== 'base') || count(p, o.id) > 0 || WITHOUT.has(o.id) || r.rank > p.rank) continue;
    // A player only hunts for loot when the gear is a clear upgrade where they work (about 3% more value).
    const fl = frontier(p);
    if (gainOf(p, o.id, fl) <= 0.03 * Math.max(1, bestSetup(p, fl, true, 'farm').value)) continue;
    for (const [ing, need] of Object.entries(r.ingredients)) {
      if (count(p, ing) >= need || data.items.get(ing)?.kind !== 'material') continue;
      for (const locId of p.unlocked) for (const imp of data.locations.get(locId)!.imps) {
        if (imp.loot?.some((l) => l.item === ing)) add(imp.id, imp.tier === 'common' ? 0.5 : 1);
      }
    }
  }
  // A wanted elf that only comes with a crafted bait (the Wrapping Room ladder) makes the bait's materials wanted too, a step or two down the chain.
  for (let depth = 0; depth < 3; depth++) {
    for (const id of [...out.keys()]) {
      const imp = data.imps.get(id)!;
      for (const baitId of Object.keys(imp.baitWeights ?? {})) {
        if ((imp.baitWeights![baitId] ?? 0) <= 0) continue;
        const r = content.recipes.find((x) => x.output.item === baitId && x.rank <= p.rank);
        if (!r || count(p, baitId) > 0) continue;
        for (const [ing, need] of Object.entries(r.ingredients)) {
          if (count(p, ing) >= need) continue;
          for (const locId of p.unlocked) for (const m of data.locations.get(locId)!.imps) if (m.loot?.some((l) => l.item === ing)) add(m.id, 0.5);
        }
      }
    }
  }
  return out;
}

/** The deepest main area the player has opened: the one they are working towards farming, so gear that helps there counts as an upgrade. */
const frontier = (p: PlayerState) => [...content.locations].filter((l) => !l.side && p.unlocked.includes(l.id)).at(-1)?.id ?? p.location;
/** Best value gain from owning an item, at the farm area or the frontier. */
function gainOf(p: PlayerState, itemId: string, farmLoc: string): number {
  const trial = { ...p, inventory: { ...p.inventory, [itemId]: 1 } };
  let g = 0;
  for (const loc of new Set([farmLoc, frontier(p)])) g = Math.max(g, bestSetup(trial, loc, true, 'farm').value - bestSetup(p, loc, true, 'farm').value);
  return g;
}

/** Gold the bot wants to keep for gear it is saving for: the cheapest rank-open trap or base that would help where it hunts. */
function savingGoal(p: PlayerState, farmLoc: string): number {
  let goal = 0;
  for (const item of RANK_ITEMS()) {
    if (WITHOUT.has(item.id) || item.price === null || item.rank > p.rank || count(p, item.id) > 0) continue;
    if (gainOf(p, item.id, farmLoc) > 0 && (goal === 0 || item.price < goal)) goal = item.price;
  }
  return goal;
}

interface PushPlan { loc: string; setup: Setup; perHunt: number; rate: number }

/** The best push the savings allow: an area with wanted elves and a trap, base and bait that reach them (bait is owned, bought or craftable now). */
function pushPlan(p: PlayerState, want: Map<string, number>, goal: number, continuing: boolean, farmReserve: number): PushPlan | null {
  let best: (PushPlan & { score: number }) | null = null;
  const baitOk = (id: string, loc: string) => {
    const b = data.items.get(id);
    if (!b || b.kind !== 'bait' || b.role === 'floor' || !baitWorksHere(data.locations.get(loc)!, id)) return false;
    if (count(p, id) > 0) return true;
    if (b.price !== null) return b.rank <= p.rank;
    const r = content.recipes.find((x) => x.output.item === id && x.rank <= p.rank);
    return !!r && Object.entries(r.ingredients).every(([i, k]) => count(p, i) >= k) && p.gold >= r.gold;
  };
  for (const locId of p.unlocked) {
    const loc = data.locations.get(locId)!;
    if (!loc.imps.some((i) => want.has(i.id))) continue;
    for (const t of content.items.traps.filter((x) => count(p, x.id) > 0)) for (const b of content.items.bases.filter((x) => count(p, x.id) > 0)) {
      for (const bait of content.items.baits) {
        if (!baitOk(bait.id, locId)) continue;
        const setup: Setup = { trap: t.id, base: b.id, bait: bait.id, charm: null };
        const o = huntOdds(content, setup, locId);
        let rate = 0;
        for (const x of o.imps) rate += x.encounter * x.catchChance * (want.get(x.imp.id) ?? 0);
        if (rate <= 0) continue;
        const perHunt = baitPrice(bait.id);
        const need = (continuing ? 5 : PUSH_HUNTS) * perHunt + farmReserve + (continuing ? 0 : Math.min(goal, 2 * PUSH_HUNTS * perHunt));
        const have = p.gold + count(p, bait.id) * perHunt;
        if (have < need) continue;
        // Prefer the push that reaches the wanted elves fastest per gold spent.
        const sc = rate / (1 + perHunt / 100);
        if (!best || sc > best.score) best = { loc: locId, setup, perHunt, rate, score: sc };
      }
    }
  }
  return best;
}

/** Best owned setup for a sleigh run: the most expected Readiness per hunt (baits that work here, owned or bought). */
function runSetup(p: PlayerState, loc: string): { setup: Setup; ready: number } {
  const L = data.locations.get(loc)!;
  const ob = L.objective;
  let best = { setup: p.setup, ready: -Infinity };
  if (ob?.type !== 'sleigh_run') return best;
  const canCraft = (id: string) => { const r = content.recipes.find((x) => x.output.item === id && x.rank <= p.rank); return !!r && Object.entries(r.ingredients).every(([i, k]) => count(p, i) >= k) && p.gold >= r.gold; };
  const baits = content.items.baits.filter((b) => b.role !== 'floor' && baitWorksHere(L, b.id) && (count(p, b.id) > 0 || (b.price !== null && b.rank <= p.rank && p.gold >= b.price * 20) || (b.price === null && canCraft(b.id))));
  for (const t of content.items.traps.filter((x) => count(p, x.id) > 0)) for (const b of content.items.bases.filter((x) => count(p, x.id) > 0)) for (const bait of baits) {
    const setup: Setup = { trap: t.id, base: b.id, bait: bait.id, charm: null };
    let ready = 0;
    for (const x of huntOdds(content, setup, loc).imps) ready += x.encounter * (x.catchChance * (ob.gain[x.imp.tier] ?? 0) - (1 - x.catchChance) * (ob.loss[x.imp.id] ?? 0));
    // Prefer the cheaper bait when the Readiness is nearly the same.
    ready -= baitPrice(bait.id) / 20000;
    if (ready > best.ready) best = { setup, ready };
  }
  return best;
}

/** True when a sleigh run looks winnable with the armed setup: the expected Readiness over the run clears 100 with some margin. */
function worthRun(p: PlayerState): boolean {
  const ob = data.locations.get(p.location)?.objective;
  if (ob?.type !== 'sleigh_run') return false;
  return runSetup(p, p.location).ready * ob.hunts >= RUN_MIN;
}

function planLoop(p: PlayerState, log: Log, huntNo: number): PlayerState {
  brain.replan = false;
  // 1. Open the deepest area the rank and the gold allow (a failed try does not stop the next one).
  for (const loc of [...content.locations].reverse()) {
    if (p.unlocked.includes(loc.id) || loc.rank > p.rank || p.gold < loc.unlockCost * 1.5 || (loc.after && !p.unlocked.includes(loc.after))) continue;
    const r = travel(content, p, loc.id);
    if (r.ok) { p = r.player; break; }
  }
  // 2. Farm area: where the farm bait nets the most gold (the free Crumbs count), so a broke player falls back to the Pantry.
  const stay = p.objectives?.[p.location];
  const inRun = stay?.type === 'sleigh_run' && stay.active;
  let farmLoc = p.location;
  if (!inRun) {
    let bestV = -Infinity;
    const missing = collecting ? uncaught(p) : [];
    const here = (id: string) => data.locations.get(id)!.imps.some((m) => missing.includes(m.id));
    const pool = collecting && missing.length ? p.unlocked.filter((id) => here(id) && bestSetup(p, id, true, 'farm').net >= 0) : [];
    // Collecting: work the shallowest area that still holds an uncaught elf first (the run-only Stables elves come last).
    for (const id of pool.length ? pool.slice(0, 1) : p.unlocked) {
      const s = bestSetup(p, id, true, 'farm');
      const v = s.net >= 0 ? s.value : s.net - 1e6;
      if (v > bestV) { bestV = v; farmLoc = id; }
    }
  }
  if (farmLoc !== p.location) p = apply(p, travel(content, p, farmLoc));
  p = craftAndBuy(p, log, huntNo, farmLoc);
  if (inRun) {
    // Mid-run the setup stays; just keep the bait stocked.
    const bait = p.setup.bait ? data.items.get(p.setup.bait) : undefined;
    if (bait && bait.kind === 'bait' && count(p, bait.id) < 10) {
      if (bait.price !== null) p = apply(p, buy(content, p, bait.id, Math.min(30, Math.floor(p.gold / Math.max(1, bait.price)))));
      else { const rc = content.recipes.find((x) => x.output.item === bait.id); for (let i = 0; rc && i < 3 && count(p, bait.id) < 20; i++) { const c = craft(content, p, rc.id); if (!c.ok) break; p = c.player; } }
    }
    // Out of the run's bait and no way to restock it: arm the best bait left that works here.
    if (!p.setup.bait || count(p, p.setup.bait) === 0) {
      const here = data.locations.get(p.location)!;
      const any = content.items.baits.filter((b) => count(p, b.id) > 0 && baitWorksHere(here, b.id)).sort((a, b) => (b.attraction - a.attraction))[0];
      if (any) p = apply(p, equip(content, p, 'bait', any.id));
    }
    return p;
  }

  // 3. Push when the savings allow, otherwise farm.
  const want = wantedElves(p);
  const goal = savingGoal(p, farmLoc);
  const farmBait = bestSetup(p, farmLoc, true, 'farm').setup.bait;
  const push = inRun ? null : pushPlan(p, want, goal, brain.mode === 'push', FARM_RESERVE * baitPrice(farmBait ?? ''));
  if (push) {
    if (push.loc !== p.location) p = apply(p, travel(content, p, push.loc));
    const bait = push.setup.bait!;
    const item = data.items.get(bait)!;
    const target = Math.min(PUSH_HUNTS, 40);
    if (count(p, bait) < target) {
      if (item.kind === 'bait' && item.price !== null) {
        const n = Math.min(target - count(p, bait), Math.floor(p.gold / item.price));
        if (n > 0) p = apply(p, buy(content, p, bait, n));
      } else {
        const r = content.recipes.find((x) => x.output.item === bait);
        for (let i = 0; r && i < 10 && count(p, bait) < target; i++) { const c = craft(content, p, r.id); if (!c.ok) break; p = c.player; }
      }
    }
    if (count(p, bait) > 0) {
      if (brain.mode !== 'push') log.pushRuns++;
      brain.mode = 'push';
      for (const slot of ['trap', 'base', 'bait'] as const) { const id = push.setup[slot]; if (id && count(p, id) > 0) p = apply(p, equip(content, p, slot, id)); }
      return p;
    }
  }
  brain.mode = 'farm';
  const chosen = bestSetup(p, p.location, true, 'farm').setup;
  const cb = chosen.bait ? data.items.get(chosen.bait) : undefined;
  if (cb && cb.kind === 'bait' && cb.role !== 'floor' && count(p, cb.id) < 20) {
    const price = baitPrice(cb.id);
    if (price > 0 && cb.price !== null) {
      const n = Math.min(100, Math.floor(p.gold / price));
      if (n > 0) p = apply(p, buy(content, p, cb.id, n));
    }
  }
  for (const slot of ['trap', 'base', 'bait'] as const) {
    const id = chosen[slot];
    if (id && count(p, id) > 0) p = apply(p, equip(content, p, slot, id));
  }
  // The free floor bait is armed by the engine when the bait runs out; any other empty or wrong bait is swapped for one that works here.
  const here = data.locations.get(p.location)!;
  if (p.setup.bait && (count(p, p.setup.bait) === 0 || !baitWorksHere(here, p.setup.bait))) {
    const any = content.items.baits.find((b) => count(p, b.id) > 0 && baitWorksHere(here, b.id));
    if (any) p = apply(p, equip(content, p, 'bait', any.id));
  }
  return p;
}

/** Crafting gear, one trap per type for the order board, and the best affordable upgrade for the farm area. */
function craftAndBuy(p: PlayerState, log: Log, huntNo: number, loc: string): PlayerState {
  for (const r of content.recipes) {
    const out = data.items.get(r.output.item)!;
    if (WITHOUT.has(out.id) || (out.kind !== 'trap' && out.kind !== 'base') || count(p, out.id) > 0) continue;
    let q = p;
    for (const ing of Object.keys(r.ingredients)) {
      if (q.setup.trap === ing) {
        const other = content.items.traps.find((t) => t.id !== ing && count(q, t.id) > 0);
        if (other) q = apply(q, equip(content, q, 'trap', other.id));
      }
    }
    const c = craft(content, q, r.id);
    if (c.ok) { p = c.player; log.purchases.push({ hunt: huntNo, item: out.id }); }
  }
  if (data.locations.get(p.location)?.objective?.type === 'order_board') {
    for (const type of new Set(content.items.traps.map((t) => t.type))) {
      if (content.items.traps.some((t) => t.type === type && count(p, t.id) > 0)) continue;
      const cheapest = content.items.traps.filter((t) => t.type === type && t.price !== null && t.rank <= p.rank).sort((a, b) => a.price! - b.price!)[0];
      if (!cheapest) continue;
      const r = buy(content, p, cheapest.id);
      if (r.ok) { p = r.player; log.purchases.push({ hunt: huntNo, item: cheapest.id }); }
    }
  }
  const current = bestSetup(p, loc, true, 'farm');
  const reserve = 60 * Math.max(8, baitPrice(current.setup.bait ?? ''));
  let pick: { id: string; gain: number } | null = null;
  for (const item of RANK_ITEMS()) {
    if (WITHOUT.has(item.id) || item.price === null || item.rank > p.rank || count(p, item.id) > 0 || p.gold < item.price + reserve) continue;
    const gain = gainOf(p, item.id, loc);
    if (gain > 0 && (!pick || gain > pick.gain)) pick = { id: item.id, gain };
  }
  if (pick) {
    const r = buy(content, p, pick.id);
    if (r.ok) { p = r.player; log.purchases.push({ hunt: huntNo, item: pick.id }); }
  }
  return p;
}

function plan(p: PlayerState, log: Log, huntNo: number): PlayerState {
  return LOOP ? planLoop(p, log, huntNo) : planLegacy(p, log, huntNo);
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
    // The loop bot also wants a reason (an uncaught Stables mini boss or boss) and fair odds of a launch with what it has armed.
    const reason = !LOOP || loc.imps.some((i) => (i.tier === 'miniboss' || i.tier === 'boss') && (p.catches[i.id] ?? 0) === 0);
    if ((!s || (s.type === 'sleigh_run' && !s.active && !s.forced)) && p.gold >= ob.hunts * perHunt && ownsRunTrap(p) && reason && (!LOOP || worthRun(p))) {
      let q = p;
      if (LOOP) {
        const rs = runSetup(p, loc.id).setup;
        // Stock the run's bait: buy it, or craft it.
        const bid = rs.bait, bi = bid ? data.items.get(bid) : undefined;
        if (bid && bi && bi.kind === 'bait' && count(q, bid) < ob.hunts) {
          if (bi.price !== null) q = apply(q, buy(content, q, bid, Math.min(ob.hunts - count(q, bid), Math.floor(q.gold / Math.max(1, bi.price)))));
          else { const rc = content.recipes.find((x) => x.output.item === bid); for (let i = 0; rc && i < 6 && count(q, bid) < ob.hunts; i++) { const c = craft(content, q, rc.id); if (!c.ok) break; q = c.player; } }
        }
        for (const slot of ['trap', 'base', 'bait'] as const) { const id = rs[slot]; if (id && count(q, id) > 0) q = apply(q, equip(content, q, slot, id)); }
      }
      const r = objectiveAction(content, q, 'start_run', rng);
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
  const log: Log = { rankAt: { 1: 0 }, goldAtRank: {}, purchases: [], byLocation: {}, bossCatches: 0, finished: false, hunts: 0, objectives: { runs: 0, launches: 0, orders: 0 }, bosses: {}, badges: {}, tiers: {}, tiersAt: {}, worstEscapes: 0, firstCatch: {}, portraitDone: {}, goodAny: [], goodMilestone: [], goldIn: 0, stage: { farm: { hunts: 0, caught: 0, gold: 0, bait: 0, upkeep: 0, points: 0, jackpotGold: 0, firstCatches: 0, draws: 0, events: 0, eventHunts: 0 }, push: { hunts: 0, caught: 0, gold: 0, bait: 0, upkeep: 0, points: 0, jackpotGold: 0, firstCatches: 0, draws: 0, events: 0, eventHunts: 0 } }, pushRuns: 0, upkeepSpent: 0, stale: { hunts: 0, stretches: 0, longest: 0, jackpots: 0, events: 0, draws: 0, goldJackpot: 0, endedBy: {} }, floorHunts: 0, jackpotCatches: 0, jackpotGold: 0, baitSpent: 0, pillageLost: 0, lootHunts: 0, cheer: { fills: [], pipsGained: 0, pipsLost: 0, draws: 0, held: 0, heldPips: [], boonHunts: 0, fullWait: 0, picks: {}, offered: {}, rareDraws: 0, legDraws: 0, pityForced: 0, drawsAt: {}, goldUnder: 0, goldOutside: 0, huntsOutside: 0, caughtUnder: 0, caughtOutside: 0, pointsUnder: 0, pointsOutside: 0 }, events: { n: 0, byType: {}, hunts: [], boonGold: 0, boonsA: 0, boonsB: 0, declined: 0 } };
  let lastFill = 0;
  const traceMe = !!TRACE && playerNo < TRACE_PLAYERS;
  let escRun = 0;
  let badgesBefore = 0;
  let purchasesBefore = 0;
  let sinceProgress = 0;
  let staleBoosts = { jackpots: 0, events: 0, draws: 0, goldJackpot: 0 };
  for (let n = 1; n <= MAX_HUNTS; n++) {
    if (n === 1) brain = { mode: 'farm', replan: false };
    if (n === 1 || n % (LOOP && brain.mode === 'push' ? 10 : 20) === 0 || brain.replan || !p.setup.bait || count(p, p.setup.bait) === 0) p = plan(p, log, n);
    p = playObjective(p, rng, log);
    const drawsBefore = log.cheer.draws;
    p = answer(p, rng, log, n);
    const drewNow = log.cheer.draws > drawsBefore;
    const loc = p.location;
    const baitBefore = p.setup.bait;
    const underBoon = (p.cheer?.active.length ?? 0) > 0;
    const stageNow = (baitBefore && data.items.get(baitBefore)?.kind === 'bait' && (data.items.get(baitBefore) as { role?: string }).role === 'push') ? 'push' : 'farm';
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
    {
      const st = log.stage[stageNow];
      st.hunts++;
      st.bait += r.entry.baitUsed * baitPrice(baitBefore ?? '');
      st.upkeep += r.entry.upkeep ?? 0;
      if (r.entry.outcome === 'catch') { st.caught++; st.gold += r.entry.gold; st.points += r.entry.points; if (r.entry.imp && data.imps.get(r.entry.imp)?.jackpot) st.jackpotGold += r.entry.gold; }
      if (r.entry.firstCatch) { st.firstCatches++; brain.replan = true; }
      if (r.entry.cheer?.full || r.entry.events?.length) { if (r.entry.events?.length) st.events += r.entry.events.length; }
      if (underBoon) st.eventHunts++;
      log.upkeepSpent += r.entry.upkeep ?? 0;
      if (r.entry.floorBait) log.floorHunts++;
    }
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
    if (e.outcome === 'catch' && e.imp && data.imps.get(e.imp)?.jackpot) { log.jackpotCatches += 1; log.jackpotGold += e.gold; }
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
    {
      const progress = e.firstCatch ? 'first catch' : e.rankUp ? 'rank-up' : e.key ? 'boss key' : log.purchases.length > purchasesBefore ? 'gear' : '';
      const isJackpot = e.outcome === 'catch' && !!e.imp && !!data.imps.get(e.imp)?.jackpot;
      sinceProgress++;
      if (sinceProgress > 50) {
        // inside a stale stretch: count the random boosts that land
        if (isJackpot) { staleBoosts.jackpots++; staleBoosts.goldJackpot += e.gold; }
        if (e.events?.length) staleBoosts.events += e.events.length;
        if (drewNow) staleBoosts.draws++;
      }
      if (progress) {
        if (sinceProgress >= 50) {
          const st = log.stale;
          st.stretches++; st.hunts += sinceProgress; st.longest = Math.max(st.longest, sinceProgress);
          st.jackpots += staleBoosts.jackpots; st.events += staleBoosts.events; st.draws += staleBoosts.draws; st.goldJackpot += staleBoosts.goldJackpot;
          const by = progress + (isJackpot ? ' (on a jackpot catch)' : e.events?.length ? ' (on an event)' : '');
          st.endedBy[by] = (st.endedBy[by] ?? 0) + 1;
        }
        sinceProgress = 0; staleBoosts = { jackpots: 0, events: 0, draws: 0, goldJackpot: 0 };
      }
    }
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
  log.final = { location: p.location, gold: p.gold, rank: p.rank, points: p.points, bait: p.setup.bait, trap: p.setup.trap, unlocked: [...p.unlocked] };
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
    log.final2 = { location: p.location, gold: p.gold, rank: p.rank, points: p.points, bait: p.setup.bait, trap: p.setup.trap + '+' + p.setup.base, unlocked: p.unlocked.length, run: JSON.stringify(p.objectives?.reindeer_stables), inv: JSON.stringify(p.inventory), missing: log.missing };
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
console.log('Boss key vs rank gate (key from the local boss, then the next area also needs its minimum rank)');
{
  const chain = content.locations.filter((l) => !l.side);
  chain.forEach((loc, i) => {
    const boss = loc.imps.find((m) => m.tier === 'boss'); const nxt = chain[i + 1];
    if (!boss || !nxt) return;
    const rows = logs.map((l) => ({ key: l.firstCatch[boss.id], rank: l.rankAt[nxt.rank] })).filter((x): x is { key: number; rank: number } => x.key !== undefined && x.rank !== undefined);
    const early = rows.filter((x) => x.key < x.rank);
    console.log(`  ${boss.name.padEnd(18)} key -> ${nxt.name} (rank ${nxt.rank}): key before rank in ${pct(early.length / Math.max(1, rows.length))} of runs, median wait ${fmt(quant(early.map((x) => x.rank - x.key), 0.5))} hunts`);
  });
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
console.log(`  Jackpot elves: ${fmt(sumOf((l) => l.jackpotCatches) / TOTAL)} caught per player, worth ${fmt(sumOf((l) => l.jackpotGold) / TOTAL)} gold per player (${pct(sumOf((l) => l.jackpotGold) / sumOf((l) => l.goldIn))} of gold from catches)`);
console.log(`  Earned from catches ${fmt(quant(done.map((l) => l.goldIn), 0.5))}, bait used ${fmt(quant(done.map((l) => l.baitSpent), 0.5))} (${pct(sumOf((l) => l.baitSpent) / sumOf((l) => l.goldIn))} of gold earned), lost to pillage ${fmt(quant(done.map((l) => l.pillageLost), 0.5))}`);
console.log('  Gold in hand at rank-up (median): ' + content.ranks.slice(1).map((r) => `R${r.rank} ${fmt(quant(logs.map((l) => l.goldAtRank[r.rank]).filter((x): x is number => x !== undefined), 0.5))}`).join(', '));
console.log(`  Sleigh upkeep paid ${fmt(quant(done.map((l) => l.upkeepSpent), 0.5))} (median)`);
console.log(`  Hunts that dropped loot: ${pct(sumOf((l) => l.lootHunts) / sumOf((l) => l.hunts))}`);

// ---------- Farm and push stages ----------
const totalHuntsAll = logs.reduce((a, l) => a + l.hunts, 0);
{
  const ST = (k: 'farm' | 'push') => ({
    hunts: logs.reduce((a, l) => a + l.stage[k].hunts, 0), caught: logs.reduce((a, l) => a + l.stage[k].caught, 0), gold: logs.reduce((a, l) => a + l.stage[k].gold, 0),
    bait: logs.reduce((a, l) => a + l.stage[k].bait, 0), upkeep: logs.reduce((a, l) => a + l.stage[k].upkeep, 0), points: logs.reduce((a, l) => a + l.stage[k].points, 0),
    jackpot: logs.reduce((a, l) => a + l.stage[k].jackpotGold, 0), first: logs.reduce((a, l) => a + l.stage[k].firstCatches, 0), boon: logs.reduce((a, l) => a + l.stage[k].eventHunts, 0), events: logs.reduce((a, l) => a + l.stage[k].events, 0),
  });
  console.log(`\nFarm and push stages (a push hunt is one with push bait armed; bot: ${BOT})`);
  console.log('Stage   Hunts/player  Share  Catch rate  Net gold/hunt  Points/hunt  Jackpot share of gold  First catches/player  Hunts under a boon  Events/100 hunts');
  const all = ST('farm').hunts + ST('push').hunts;
  for (const k of ['farm', 'push'] as const) {
    const x = ST(k);
    console.log(`${k.padEnd(8)}${fmt(x.hunts / TOTAL).padEnd(14)}${pct(x.hunts / all).padEnd(7)}${pct(x.caught / Math.max(1, x.hunts)).padEnd(12)}${fmt((x.gold - x.bait - x.upkeep) / Math.max(1, x.hunts)).padEnd(15)}${fmt(x.points / Math.max(1, x.hunts)).padEnd(13)}${pct(x.jackpot / Math.max(1, x.gold)).padEnd(23)}${(x.first / TOTAL).toFixed(1).padEnd(22)}${pct(x.boon / Math.max(1, x.hunts)).padEnd(20)}${(x.events / Math.max(1, x.hunts) * 100).toFixed(2)}`);
  }
  console.log(`Hunts on the free Pantry Crumbs fallback per player: median ${fmt(quant(logs.map((l) => l.floorHunts), 0.5))}, p90 ${fmt(quant(logs.map((l) => l.floorHunts), 0.9))}`);
  {
    const sl = logs.map((l) => l.stale);
    const sumS = (f: (x: Log['stale']) => number) => sl.reduce((a, x) => a + f(x), 0);
    const staleHunts = sumS((x) => x.hunts);
    const by: Record<string, number> = {};
    for (const x of sl) for (const [k, v] of Object.entries(x.endedBy)) { const key = k.replace(/ \(.*\)$/, ''); by[key] = (by[key] ?? 0) + v; }
    console.log(`Stale stretches (50+ hunts with no first catch, rank-up, key or gear): ${(sumS((x) => x.stretches) / TOTAL).toFixed(1)} per player, ${pct(staleHunts / Math.max(1, totalHuntsAll))} of all hunts, longest median ${fmt(quant(sl.map((x) => x.longest), 0.5))} / p90 ${fmt(quant(sl.map((x) => x.longest), 0.9))}`);
    console.log(`  Random boosts landing inside them (per 100 stale hunts): jackpot catches ${(sumS((x) => x.jackpots) / Math.max(1, staleHunts) * 100).toFixed(1)}, event cards or Grand Gifts ${(sumS((x) => x.events) / Math.max(1, staleHunts) * 100).toFixed(1)}, Cheer draws ${(sumS((x) => x.draws) / Math.max(1, staleHunts) * 100).toFixed(1)}; jackpot gold per stale hunt ${fmt(sumS((x) => x.goldJackpot) / Math.max(1, staleHunts))}`);
    console.log(`  Stretches ended by: ${Object.entries(by).map(([k, v]) => `${k} ${pct(v / Math.max(1, sumS((x) => x.stretches)))}`).join(', ') || '-'}`);
  }
  const pushers = logs.filter((l) => l.pushRuns > 0).length;
  console.log(`Push stretches started per player: median ${fmt(quant(logs.map((l) => l.pushRuns), 0.5))}; players who ever pushed ${pct(pushers / TOTAL)}`);
  for (const l of logs.filter((x) => x.missing?.length).slice(0, 4)) console.log(`  Not collected: ${JSON.stringify(l.final2)}`);
  const stuck = logs.filter((l) => !l.finished);
  if (stuck.length) {
    console.log(`Players who did not reach rank ${finalRank} (${stuck.length}):`);
    for (const l of stuck.slice(0, 8)) console.log(`  ${JSON.stringify(l.final)}`);
  }
}

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
