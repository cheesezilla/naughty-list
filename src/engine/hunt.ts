import type { Content, Imp, PillageKind } from '../content/schema.js';
import { gameData, itemOfKind } from './data.js';
import { catchChance, effectiveness, impWeights, setupStats } from './odds.js';
import { addItem, bump, count, rankFor, type PlayerState } from './player.js';
import { pickWeighted, type Rng } from './rng.js';
import { afterHunt, objectiveState, objectiveWeights, type ObjectiveResult } from './objectives.js';

export interface JournalEntry {
  outcome: 'quiet' | 'catch' | 'escape';
  location: string;
  imp?: string;
  catchChance?: number;
  gold: number;
  points: number;
  loot: { item: string; amount: number }[];
  baitUsed: number;
  charmUsed: boolean;
  rankUp?: number;
  rescued?: boolean;
  /** True on the first ever catch of this imp: the Naughty List portrait unlocks. */
  firstCatch?: boolean;
  /** Set when an escaped imp pillaged the player. */
  pillage?: Pillage;
  /** What the hunt did to the location's own loop (order board, sleigh run). */
  objective?: ObjectiveResult;
}

/** What an escaped imp took. `safe` lists kinds it went for that a safety rail stopped. */
export interface Pillage {
  gold: number;
  points: number;
  bait?: { item: string; amount: number };
  safe?: PillageKind[];
}

export type HuntResult =
  | { ok: true; player: PlayerState; entry: JournalEntry }
  | { ok: false; error: string };

/** Brings stamina up to date for the current time. No-op when stamina is switched off. */
export function refreshStamina(content: Content, player: PlayerState, now: number): void {
  const s = content.constants.stamina;
  if (!s.enabled) return;
  const minutes = Math.max(0, (now - player.stamina.updatedAt) / 60000);
  const gained = Math.floor(minutes * s.refillPerMinute);
  if (gained > 0) {
    player.stamina.value = Math.min(s.max, player.stamina.value + gained);
    player.stamina.updatedAt += (gained / s.refillPerMinute) * 60000;
  }
  if (player.stamina.value >= s.max) player.stamina.updatedAt = now;
}

function hasAnyBait(content: Content, p: PlayerState): boolean {
  return content.items.baits.some((b) => count(p, b.id) > 0);
}

/** Runs one hunt. Pure apart from the random source: returns a new player state and a journal entry. */
/** Admin speed-run settings: multiplies catch rewards, and/or makes every hunt attract and catch with full loot. */
export interface HuntBoost { reward: number; odds: boolean }

export function hunt(content: Content, player: PlayerState, rng: Rng, now = 0, boost?: HuntBoost): HuntResult {
  const data = gameData(content);
  const c = content.constants;
  const p = structuredClone(player);
  const location = data.locations.get(p.location);
  if (!location) return { ok: false, error: 'You are in an unknown location.' };

  let rescued = false;
  if (!p.setup.bait || count(p, p.setup.bait) < 1) {
    if (!hasAnyBait(content, p) && p.gold < c.rescue.maxGold) {
      addItem(p, c.rescue.item, c.rescue.amount);
      p.setup.bait = c.rescue.item;
      rescued = true;
    } else {
      return { ok: false, error: 'You are out of bait. Buy some or arm a different bait.' };
    }
  }

  refreshStamina(content, p, now);
  if (c.stamina.enabled) {
    if (p.stamina.value < c.stamina.costPerHunt) return { ok: false, error: `You're out of ${c.stamina.name}.` };
    p.stamina.value -= c.stamina.costPerHunt;
  }

  p.stats.hunts += 1;
  const stats = setupStats(content, p.setup, location);
  const entry: JournalEntry = { outcome: 'quiet', location: location.id, gold: 0, points: 0, loot: [], baitUsed: 0, charmUsed: false };
  if (rescued) entry.rescued = true;

  objectiveState(p, location, rng);
  const track = (imp: Imp | undefined, caught: boolean) => {
    const o = afterHunt(content, p, location, imp, caught, stats.type, rng);
    if (o) entry.objective = o;
  };

  const streak = (kind: 'Catch' | 'Escape' | 'Quiet') => {
    const t = (p.tally ??= {});
    for (const k of ['Catch', 'Escape', 'Quiet'] as const) {
      // Quiet hunts don't break a catch or escape run; any attracted imp breaks a quiet run.
      if (k === kind) t[`streak${k}`] = (t[`streak${k}`] ?? 0) + 1;
      else if (kind !== 'Quiet') t[`streak${k}`] = 0;
      t[`best${k}Streak`] = Math.max(t[`best${k}Streak`] ?? 0, t[`streak${k}`] ?? 0);
    }
  };

  if (!boost?.odds && rng() >= stats.attraction) {
    streak('Quiet');
    track(undefined, false);
    return { ok: true, player: p, entry };
  }

  p.stats.attracted += 1;
  const idx = pickWeighted(objectiveWeights(p, location, impWeights(data, location, p.setup.bait)), rng);
  const imp = location.imps[Math.max(0, idx)]!;
  entry.imp = imp.id;
  if (location.objective?.type === 'bait_ladder' && imp.id === location.objective.boss) bump(p, 'ladderBoss');
  p.seen = { ...(p.seen ?? {}), [imp.id]: (p.seen?.[imp.id] ?? 0) + 1 };

  const bait = p.setup.bait!;
  addItem(p, bait, -1);
  entry.baitUsed = 1;
  if (p.setup.charm && count(p, p.setup.charm) > 0 && itemOfKind(data, p.setup.charm, 'charm')) {
    addItem(p, p.setup.charm, -1);
    entry.charmUsed = true;
    if (count(p, p.setup.charm) < 1) p.setup.charm = null;
  }

  const chance = boost?.odds ? (effectiveness(imp, stats.type) > 0 ? 1 : 0) : catchChance(stats, imp, c.catchCap);
  const mult = boost?.reward ?? 1;
  entry.catchChance = chance;
  if (rng() < chance) {
    entry.outcome = 'catch';
    entry.gold = imp.gold * mult;
    entry.points = imp.points * mult;
    p.gold += entry.gold;
    p.points += entry.points;
    p.stats.caught += 1;
    p.stats.goldEarned = (p.stats.goldEarned ?? 0) + entry.gold;
    if (!p.catches[imp.id]) entry.firstCatch = true;
    streak('Catch');
    if (stats.type) bump(p, `catches_${stats.type}`);
    if (effectiveness(imp, stats.type) > 1) bump(p, 'weaknessCatches');
    if ((imp.tier === 'miniboss' || imp.tier === 'boss') && p.setup.trap === c.startingSetup.trap) bump(p, 'starterBoss');
    p.catches[imp.id] = (p.catches[imp.id] ?? 0) + 1;
    for (const l of imp.loot ?? []) {
      if (boost?.odds || rng() < l.chance) {
        const amount = l.amount ?? 1;
        addItem(p, l.item, amount);
        entry.loot.push({ item: l.item, amount });
      }
    }
    track(imp, true);
    const newRank = rankFor(content, p.points);
    if (newRank > p.rank) {
      p.rank = newRank;
      entry.rankUp = newRank;
    }
  } else {
    entry.outcome = 'escape';
    streak('Escape');
    const pillage = rollPillage(content, p, imp, bait, rng);
    if (pillage) entry.pillage = pillage;
    track(imp, false);
  }
  return { ok: true, player: p, entry };
}

/**
 * Rolls whether an escaped imp pillages, and applies it. Safety rails: gold never drops below
 * `goldFloor`, points never drop below the current rank's threshold, and only the armed bait is taken.
 */
export function rollPillage(content: Content, p: PlayerState, imp: Imp, bait: string, rng: Rng): Pillage | undefined {
  const cfg = content.constants.pillage;
  const rule = imp.pillage ?? cfg.tiers[imp.tier];
  if (rng() >= rule.chance) return undefined;

  const pool = [...rule.takes];
  const kinds: PillageKind[] = [];
  while (kinds.length < rule.kinds && pool.length) kinds.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);

  const out: Pillage = { gold: 0, points: 0 };
  const safe: PillageKind[] = [];
  for (const kind of kinds) {
    if (kind === 'gold') {
      const want = rule.goldPct !== undefined
        ? Math.min(Math.round(p.gold * rule.goldPct), Math.round(imp.gold * (rule.goldCap ?? Infinity)))
        : Math.round(imp.gold * (rule.goldCap ?? 1));
      const take = Math.max(0, Math.min(want, p.gold - cfg.goldFloor));
      p.gold -= take;
      out.gold = take;
      if (take === 0 && want > 0) safe.push('gold');
    } else if (kind === 'points') {
      const want = Math.min(Math.round(p.points * (rule.pointsPct ?? 0)), Math.round(imp.points * (rule.pointsCap ?? Infinity)));
      // Never below the current rank's threshold, and rank 1 players keep all their points.
      const floor = p.rank <= 1 ? p.points : (content.ranks.find((r) => r.rank === p.rank)?.points ?? 0);
      const take = Math.max(0, Math.min(want, p.points - floor));
      p.points -= take;
      out.points = take;
      if (take === 0) safe.push('points');
    } else {
      const [min, max] = rule.bait ?? [1, 1];
      const want = min + Math.floor(rng() * (max - min + 1));
      const take = Math.min(want, count(p, bait));
      if (take > 0) {
        addItem(p, bait, -take);
        out.bait = { item: bait, amount: take };
      } else safe.push('bait');
    }
  }
  if (safe.length) out.safe = safe;
  p.stats.pillaged = (p.stats.pillaged ?? 0) + 1;
  return out;
}
