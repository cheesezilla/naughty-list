import type { Content } from '../content/schema.js';
import { gameData, itemOfKind, priceOf, sellValue } from './data.js';
import type { ObjectiveState } from './objectives.js';

export interface Setup {
  trap: string;
  base: string;
  bait: string | null;
  charm: string | null;
}

export interface PlayerState {
  gold: number;
  points: number;
  rank: number;
  location: string;
  unlocked: string[];
  setup: Setup;
  /** Counts of everything owned: traps, bases, baits, charms and materials. */
  inventory: Record<string, number>;
  /** Lifetime catches per imp id (The Naughty List collection). */
  catches: Record<string, number>;
  /** Lifetime encounters per imp id, caught or not. Missing in saves from before the new UI. */
  seen?: Record<string, number>;
  /** goldEarned counts gold from catches; missing in saves from before the new UI. */
  stats: { hunts: number; attracted: number; caught: number; goldEarned?: number; pillaged?: number };
  stamina: { value: number; updatedAt: number };
  /** Progress on each location's own loop, by location id. Missing in older saves. */
  objectives?: Record<string, ObjectiveState>;
  /** Earned achievements: id → time earned (ms). Missing in saves from before achievements. */
  achievements?: Record<string, number>;
  /** Counters the achievements read (purchases, crafts, streaks, catches by trap type…). Missing in older saves. */
  tally?: Record<string, number>;
  /** False until the player closes the welcome popup of a new game. Missing (seen) in older saves. */
  welcomeSeen?: boolean;
}

export type ActionResult = { ok: true; player: PlayerState } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

export function newPlayer(content: Content, now = 0): PlayerState {
  const c = content.constants;
  const inventory: Record<string, number> = { ...c.startingItems };
  inventory[c.startingSetup.trap] = (inventory[c.startingSetup.trap] ?? 0) + 1;
  inventory[c.startingSetup.base] = (inventory[c.startingSetup.base] ?? 0) + 1;
  return {
    gold: c.startingGold,
    points: 0,
    rank: 1,
    location: c.startingLocation,
    unlocked: [c.startingLocation],
    setup: { ...c.startingSetup },
    inventory,
    catches: {},
    seen: {},
    stats: { hunts: 0, attracted: 0, caught: 0, goldEarned: 0, pillaged: 0 },
    stamina: { value: c.stamina.max, updatedAt: now },
    achievements: {},
    tally: {},
    welcomeSeen: false,
  };
}

/** Adds to one of the achievement counters. */
export function bump(p: PlayerState, key: string, n = 1): void {
  const t = (p.tally ??= {});
  t[key] = (t[key] ?? 0) + n;
}

export function count(p: PlayerState, itemId: string): number {
  return p.inventory[itemId] ?? 0;
}

export function rankFor(content: Content, points: number): number {
  let rank = 1;
  for (const r of content.ranks) if (points >= r.points) rank = r.rank;
  return rank;
}

function clone(p: PlayerState): PlayerState {
  return structuredClone(p);
}

export function addItem(p: PlayerState, itemId: string, amount: number): void {
  const n = (p.inventory[itemId] ?? 0) + amount;
  if (n > 0) p.inventory[itemId] = n;
  else delete p.inventory[itemId];
}

export function buy(content: Content, player: PlayerState, itemId: string, amount = 1): ActionResult {
  const data = gameData(content);
  const item = data.items.get(itemId);
  if (!item) return fail('No such item.');
  const price = priceOf(item);
  if (price === null) return fail(`${item.name} isn't sold in the shop.`);
  if (!Number.isInteger(amount) || amount < 1) return fail('Amount must be a whole number above 0.');
  if ('rank' in item && item.rank > player.rank) return fail(`${item.name} needs rank ${item.rank}.`);
  if ((item.kind === 'trap' || item.kind === 'base') && (count(player, itemId) > 0 || amount > 1)) {
    return fail(`You can only own one ${item.name}.`);
  }
  const cost = price * amount;
  if (player.gold < cost) return fail(`Not enough gold: ${item.name} x${amount} costs ${cost}.`);
  const p = clone(player);
  p.gold -= cost;
  addItem(p, itemId, amount);
  bump(p, 'bought');
  return { ok: true, player: p };
}

export function sell(content: Content, player: PlayerState, itemId: string, amount = 1): ActionResult {
  const data = gameData(content);
  const item = data.items.get(itemId);
  if (!item) return fail('No such item.');
  if (!Number.isInteger(amount) || amount < 1) return fail('Amount must be a whole number above 0.');
  if (count(player, itemId) < amount) return fail(`You don't have ${amount} ${item.name}.`);
  const equipped = Object.values(player.setup).includes(itemId);
  if (equipped && (item.kind === 'trap' || item.kind === 'base')) return fail(`Unequip ${item.name} before selling it.`);
  const value = sellValue(data, item);
  if (value <= 0) return fail(`${item.name} can't be sold.`);
  const p = clone(player);
  p.gold += value * amount;
  addItem(p, itemId, -amount);
  return { ok: true, player: p };
}

export function craft(content: Content, player: PlayerState, recipeId: string): ActionResult {
  const data = gameData(content);
  const recipe = data.recipes.get(recipeId);
  if (!recipe) return fail('No such recipe.');
  if (recipe.rank > player.rank) return fail(`This recipe needs rank ${recipe.rank}.`);
  if (player.gold < recipe.gold) return fail(`Crafting costs ${recipe.gold} gold.`);
  for (const [itemId, n] of Object.entries(recipe.ingredients)) {
    if (count(player, itemId) < n) return fail(`Missing ingredients: need ${n} ${data.items.get(itemId)?.name ?? itemId}.`);
    if (Object.values(player.setup).includes(itemId) && count(player, itemId) <= n) {
      const kind = data.items.get(itemId)?.kind;
      if (kind === 'trap' || kind === 'base') return fail(`Unequip ${data.items.get(itemId)?.name} first; crafting uses it up.`);
    }
  }
  const out = data.items.get(recipe.output.item)!;
  if ((out.kind === 'trap' || out.kind === 'base') && count(player, out.id) > 0) return fail(`You already own ${out.name}.`);
  const p = clone(player);
  p.gold -= recipe.gold;
  for (const [itemId, n] of Object.entries(recipe.ingredients)) addItem(p, itemId, -n);
  addItem(p, recipe.output.item, recipe.output.amount);
  bump(p, 'crafted');
  bump(p, `craft:${recipe.output.item}`);
  return { ok: true, player: p };
}

export function equip(content: Content, player: PlayerState, slot: keyof Setup, itemId: string | null): ActionResult {
  const data = gameData(content);
  if (itemId === null) {
    if (slot === 'trap' || slot === 'base') return fail('A trap and a base are always needed.');
    const p = clone(player);
    p.setup[slot] = null;
    return { ok: true, player: p };
  }
  const item = itemOfKind(data, itemId, slot);
  if (!item) return fail(`That isn't a ${slot}.`);
  if (count(player, itemId) < 1) return fail(`You don't have ${item.name}.`);
  const p = clone(player);
  p.setup[slot] = itemId;
  if (slot === 'trap' && itemId !== content.constants.startingSetup.trap) bump(p, 'newTrap');
  return { ok: true, player: p };
}

export function travel(content: Content, player: PlayerState, locationId: string): ActionResult {
  const data = gameData(content);
  const loc = data.locations.get(locationId);
  if (!loc) return fail('No such location.');
  const p = clone(player);
  if (!p.unlocked.includes(locationId)) {
    if (loc.rank > p.rank) return fail(`${loc.name} opens at rank ${loc.rank}.`);
    if (p.gold < loc.unlockCost) return fail(`Unlocking ${loc.name} costs ${loc.unlockCost} gold.`);
    p.gold -= loc.unlockCost;
    p.unlocked.push(locationId);
  }
  p.location = locationId;
  return { ok: true, player: p };
}
