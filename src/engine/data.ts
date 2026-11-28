import type { Bait, Base, Charm, Content, Imp, Location, Material, Recipe, Trap } from '../content/schema.js';

export type ItemKind = 'trap' | 'base' | 'bait' | 'charm' | 'material';
export type AnyItem =
  | (Trap & { kind: 'trap' })
  | (Base & { kind: 'base' })
  | (Bait & { kind: 'bait' })
  | (Charm & { kind: 'charm' })
  | (Material & { kind: 'material' });

export interface GameData {
  content: Content;
  items: Map<string, AnyItem>;
  locations: Map<string, Location>;
  imps: Map<string, Imp & { location: string }>;
  recipes: Map<string, Recipe>;
}

const cache = new WeakMap<Content, GameData>();

/** Builds lookup maps over the content once and caches them. */
export function gameData(content: Content): GameData {
  const hit = cache.get(content);
  if (hit) return hit;
  const items = new Map<string, AnyItem>();
  for (const t of content.items.traps) items.set(t.id, { ...t, kind: 'trap' });
  for (const b of content.items.bases) items.set(b.id, { ...b, kind: 'base' });
  for (const b of content.items.baits) items.set(b.id, { ...b, kind: 'bait' });
  for (const c of content.items.charms) items.set(c.id, { ...c, kind: 'charm' });
  for (const m of content.items.materials) items.set(m.id, { ...m, kind: 'material' });
  const locations = new Map(content.locations.map((l) => [l.id, l]));
  const imps = new Map<string, Imp & { location: string }>();
  for (const l of content.locations) for (const i of l.imps) imps.set(i.id, { ...i, location: l.id });
  const recipes = new Map(content.recipes.map((r) => [r.id, r]));
  const data = { content, items, locations, imps, recipes };
  cache.set(content, data);
  return data;
}

export function itemOfKind<K extends ItemKind>(data: GameData, id: string | null, kind: K): Extract<AnyItem, { kind: K }> | undefined {
  if (!id) return undefined;
  const item = data.items.get(id);
  return item && item.kind === kind ? (item as Extract<AnyItem, { kind: K }>) : undefined;
}

/** Shop price of an item, or null when it can't be bought. */
export function priceOf(item: AnyItem): number | null {
  return item.kind === 'material' ? null : item.price;
}

/** What the shop pays when you sell one. */
export function sellValue(data: GameData, item: AnyItem): number {
  if (item.kind === 'material') return item.sellPrice;
  if (item.price === null) return 0;
  return Math.floor(item.price * data.content.constants.sellBackRate);
}

/** What one bait costs in gold: its shop price, or for crafted bait the recipe's gold per bait, else 0. */
export function baitGoldValue(data: GameData, baitId: string): number {
  const item = data.items.get(baitId);
  if (item && item.kind === 'bait' && item.price !== null) return item.price;
  const r = data.content.recipes.find((x) => x.output.item === baitId);
  if (!r) return 0;
  // Crafted bait costs the recipe's gold plus any bait it is made from.
  const inputs = Object.entries(r.ingredients).reduce((n, [id, k]) => n + (data.items.get(id)?.kind === 'bait' ? baitGoldValue(data, id) * k : 0), 0);
  return Math.round((r.gold + inputs) / r.output.amount);
}
