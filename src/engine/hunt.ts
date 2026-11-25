import type { Content } from '../content/schema.js';
import { gameData, itemOfKind } from './data.js';
import { catchChance, impWeights, setupStats } from './odds.js';
import { addItem, count, rankFor, type PlayerState } from './player.js';
import { pickWeighted, type Rng } from './rng.js';

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
export function hunt(content: Content, player: PlayerState, rng: Rng, now = 0): HuntResult {
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

  if (rng() >= stats.attraction) return { ok: true, player: p, entry };

  p.stats.attracted += 1;
  const idx = pickWeighted(impWeights(data, location, p.setup.bait), rng);
  const imp = location.imps[Math.max(0, idx)]!;
  entry.imp = imp.id;

  const bait = p.setup.bait!;
  addItem(p, bait, -1);
  entry.baitUsed = 1;
  if (p.setup.charm && count(p, p.setup.charm) > 0 && itemOfKind(data, p.setup.charm, 'charm')) {
    addItem(p, p.setup.charm, -1);
    entry.charmUsed = true;
    if (count(p, p.setup.charm) < 1) p.setup.charm = null;
  }

  const chance = catchChance(stats, imp, c.catchCap);
  entry.catchChance = chance;
  if (rng() < chance) {
    entry.outcome = 'catch';
    entry.gold = imp.gold;
    entry.points = imp.points;
    p.gold += imp.gold;
    p.points += imp.points;
    p.stats.caught += 1;
    p.catches[imp.id] = (p.catches[imp.id] ?? 0) + 1;
    for (const l of imp.loot ?? []) {
      if (rng() < l.chance) {
        const amount = l.amount ?? 1;
        addItem(p, l.item, amount);
        entry.loot.push({ item: l.item, amount });
      }
    }
    const newRank = rankFor(content, p.points);
    if (newRank > p.rank) {
      p.rank = newRank;
      entry.rankUp = newRank;
    }
  } else {
    entry.outcome = 'escape';
    if (imp.stealsBait && count(p, bait) > 0) {
      addItem(p, bait, -1);
      entry.baitUsed += 1;
    }
  }
  return { ok: true, player: p, entry };
}
