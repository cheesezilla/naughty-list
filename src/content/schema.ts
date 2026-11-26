import { z } from 'zod';

export const powerTypes = ['clockwork', 'starlight', 'frost'] as const;
export const PowerType = z.enum(powerTypes);
export const ImpTier = z.enum(['common', 'rare', 'miniboss', 'boss']);

const id = z.string().regex(/^[a-z0-9_]+$/, 'ids are lowercase letters, digits and underscores');
const chance = z.number().min(0).max(1);
const price = z.number().int().positive().nullable();

/** Text shown on item and imp detail screens. Limits match the UI layout's text slots. */
export const Flavour = z.object({
  tagline: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
  backstory: z.string().min(1).max(400),
});
/** Imps also get a one-line rumour, shown before the first catch instead of the rest. */
export const ImpFlavour = Flavour.extend({ rumour: z.string().min(1).max(100) });
/** content/flavour.json: text keyed by item id and imp id, merged onto each entry at load. */
export const FlavourFile = z.object({
  items: z.record(id, Flavour),
  imps: z.record(id, ImpFlavour),
});

export const Imp = z.object({
  id,
  name: z.string(),
  tier: ImpTier,
  power: z.number().positive(),
  gold: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  baitWeights: z.record(id, z.number().nonnegative()).optional(),
  effectiveness: z.partialRecord(PowerType, z.number().nonnegative()).optional(),
  loot: z.array(z.object({ item: id, chance, amount: z.number().int().positive().optional() })).optional(),
  stealsBait: z.boolean().optional(),
  flavour: ImpFlavour.optional(),
});

export const Location = z.object({
  id,
  name: z.string(),
  description: z.string(),
  rank: z.number().int().positive(),
  unlockCost: z.number().int().nonnegative(),
  preferredBait: id.optional(),
  otherBaitPenalty: chance.optional(),
  imps: z.array(Imp).min(1),
});

export const Trap = z.object({
  id, name: z.string(), type: PowerType,
  power: z.number().nonnegative(), luck: z.number().nonnegative(),
  attraction: z.number().optional(), rank: z.number().int().positive(), price,
  flavour: Flavour.optional(),
});
export const Base = z.object({
  id, name: z.string(),
  power: z.number().nonnegative(), luck: z.number().nonnegative(),
  attraction: z.number().optional(), rank: z.number().int().positive(), price,
  flavour: Flavour.optional(),
});
export const Bait = z.object({
  id, name: z.string(), attraction: chance,
  rareMultiplier: z.number().positive().optional(), rank: z.number().int().positive(), price,
  flavour: Flavour.optional(),
});
export const Charm = z.object({
  id, name: z.string(),
  power: z.number().optional(), powerBonus: z.number().optional(), luck: z.number().optional(), attraction: z.number().optional(),
  rank: z.number().int().positive(), price,
  flavour: Flavour.optional(),
});
export const Material = z.object({ id, name: z.string(), sellPrice: z.number().int().nonnegative(), flavour: Flavour.optional() });

export const Items = z.object({
  traps: z.array(Trap), bases: z.array(Base), baits: z.array(Bait), charms: z.array(Charm), materials: z.array(Material),
});

export const Recipe = z.object({
  id,
  output: z.object({ item: id, amount: z.number().int().positive() }),
  ingredients: z.record(id, z.number().int().positive()),
  gold: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
});

export const Rank = z.object({ rank: z.number().int().positive(), name: z.string(), points: z.number().int().nonnegative() });

export const Constants = z.object({
  startingGold: z.number().int().nonnegative(),
  startingItems: z.record(id, z.number().int().nonnegative()),
  startingSetup: z.object({ trap: id, base: id, bait: id.nullable(), charm: id.nullable() }),
  startingLocation: id,
  attractionCap: chance,
  catchCap: chance,
  sellBackRate: chance,
  rescue: z.object({ maxGold: z.number().int().nonnegative(), item: id, amount: z.number().int().positive() }),
  maxHuntsPerSecond: z.number().positive(),
  stamina: z.object({
    enabled: z.boolean(), name: z.string(), max: z.number().int().positive(), costPerHunt: z.number().int().nonnegative(),
    refillPerMinute: z.number().nonnegative(), buyPrice: z.number().int().nonnegative(),
  }),
});

/** content/story.json: the intro letter shown in the hunt log when a game starts, and on How to play. */
export const Story = z.object({
  intro: z.object({
    title: z.string().min(1).max(60),
    paragraphs: z.array(z.string().min(1).max(500)).min(1).max(8),
    signoff: z.string().min(1).max(40),
  }),
});

export const Content = z.object({
  constants: Constants,
  story: Story.optional(),
  ranks: z.array(Rank).min(1),
  locations: z.array(Location).min(1),
  items: Items,
  recipes: z.array(Recipe),
});

export type PowerType = z.infer<typeof PowerType>;
export type ImpTier = z.infer<typeof ImpTier>;
export type Flavour = z.infer<typeof Flavour>;
export type ImpFlavour = z.infer<typeof ImpFlavour>;
export type FlavourFile = z.infer<typeof FlavourFile>;
export type Imp = z.infer<typeof Imp>;
export type Location = z.infer<typeof Location>;
export type Trap = z.infer<typeof Trap>;
export type Base = z.infer<typeof Base>;
export type Bait = z.infer<typeof Bait>;
export type Charm = z.infer<typeof Charm>;
export type Material = z.infer<typeof Material>;
export type Recipe = z.infer<typeof Recipe>;
export type Rank = z.infer<typeof Rank>;
export type Constants = z.infer<typeof Constants>;
export type Content = z.infer<typeof Content>;
export type Story = z.infer<typeof Story>;
