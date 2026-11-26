import { z } from 'zod';

export const powerTypes = ['clockwork', 'starlight', 'frost'] as const;
export const PowerType = z.enum(powerTypes);
export const ImpTier = z.enum(['common', 'uncommon', 'rare', 'miniboss', 'boss']);

const id = z.string().regex(/^[a-z0-9_]+$/, 'ids are lowercase letters, digits and underscores');
const chance = z.number().min(0).max(1);
const price = z.number().int().positive().nullable();

/** What an escaped imp can take. */
export const pillageKinds = ['gold', 'bait', 'points'] as const;
export const PillageKind = z.enum(pillageKinds);
/** How an escaped imp pillages: the chance, which kinds it can take and how much of each. */
export const PillageRule = z.object({
  /** Chance per escape. */
  chance,
  /** Kinds it picks from; it takes `kinds` of them at random. */
  takes: z.array(PillageKind).min(1),
  kinds: z.number().int().min(1).max(3),
  /** Gold taken: goldPct of the player's gold, capped at goldCap x the imp's gold reward. Without goldPct: goldCap x the imp's gold reward. */
  goldPct: chance.optional(),
  goldCap: z.number().nonnegative().optional(),
  /** Armed bait taken, a random whole number from min to max. */
  bait: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
  /** Points taken: pointsPct of the player's points, capped at pointsCap x the imp's points reward. */
  pointsPct: chance.optional(),
  pointsCap: z.number().nonnegative().optional(),
});

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
  /** Replaces this imp's tier pillage rule, for example the bait thieves. */
  pillage: PillageRule.optional(),
  flavour: ImpFlavour.optional(),
});

/** A location's own loop. Counted in hunts, never in time. */
export const Objective = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bait_ladder'),
    /** Bait tiers in order; each tier's imps drop what crafts the next tier's bait. */
    tiers: z.array(z.object({ name: z.string(), baits: z.array(id).min(1), recipe: id.optional() })).min(2),
    boss: id,
  }),
  z.object({
    type: z.literal('order_board'),
    slots: z.number().int().positive(),
    rushSlots: z.number().int().positive(),
    /** Every this many finished orders, the mini boss inspects. */
    inspectionEvery: z.number().int().positive(),
    crateGold: z.number().int().nonnegative(),
    /** One of these is added to every Toy Crate. */
    crateRewards: z.array(z.object({ item: id, amount: z.number().int().positive() })).min(1),
    miniboss: id,
    boss: id,
  }),
  z.object({
    type: z.literal('sleigh_run'),
    hunts: z.number().int().positive(),
    /** Readiness added by a catch, by tier. */
    gain: z.partialRecord(ImpTier, z.number().int().nonnegative()),
    /** Readiness taken by these imps when they escape. */
    loss: z.record(id, z.number().int().nonnegative()),
    minibossFrom: z.number().int().nonnegative(),
    minibossWeight: z.number().nonnegative(),
    launchGold: z.number().int().nonnegative(),
    launchItems: z.record(id, z.number().int().positive()),
    failGoldPerReadiness: z.number().nonnegative(),
    miniboss: id,
    boss: id,
  }),
]);

export const Location = z.object({
  id,
  name: z.string(),
  description: z.string(),
  rank: z.number().int().positive(),
  unlockCost: z.number().int().nonnegative(),
  preferredBait: id.optional(),
  otherBaitPenalty: chance.optional(),
  objective: Objective.optional(),
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
  pillage: z.object({
    /** A pillage never takes gold below this. */
    goldFloor: z.number().int().nonnegative(),
    tiers: z.object({ common: PillageRule, uncommon: PillageRule, rare: PillageRule, miniboss: PillageRule, boss: PillageRule }),
  }),
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
  /** Per location: the first-visit intro logged on arrival, and the how-to-clear steps behind the "?" button. */
  locations: z.record(id, z.object({
    intro: z.string().min(1).max(400),
    hint: z.array(z.string().min(1).max(120)).min(1).max(4),
  })).optional(),
  /** The one-time popup when a new game starts. */
  welcome: z.object({
    title: z.string().min(1).max(40),
    text: z.string().min(1).max(200),
    button: z.string().min(1).max(20),
  }).optional(),
});

/** Stats an achievement can count. See `statValue()` in src/engine/achievements.ts. */
export const achievementStats = [
  'hunts', 'caught', 'escapes', 'goldEarned', 'bossesCaught', 'weaknessCatches', 'bought', 'crafted', 'newTrap',
  'unlocked', 'pillaged', 'ordersDone', 'rushOrders', 'launches', 'expressLaunches', 'sleighFails', 'ladderBoss', 'starterBoss',
  'catches_clockwork', 'catches_starlight', 'catches_frost', 'bestCatchStreak', 'bestEscapeStreak', 'bestQuietStreak',
] as const;
export const AchievementStat = z.enum(achievementStats);

export const AchievementRule = z.discriminatedUnion('type', [
  /** A stat reaches n. */
  z.object({ type: z.literal('stat'), stat: AchievementStat, n: z.number().int().positive() }),
  z.object({ type: z.literal('rank'), rank: z.number().int().positive() }),
  /** Catch this imp, or any imp of this tier. */
  z.object({ type: z.literal('catch'), imp: id.optional(), tier: ImpTier.optional() }),
  /** Catch every imp of a location, of a tier, or (neither given) every imp in the game. */
  z.object({ type: z.literal('collection'), location: id.optional(), tier: ImpTier.optional() }),
  /** Craft this item at least once. */
  z.object({ type: z.literal('craft'), item: id }),
  /** Own a trap of every power type at once. */
  z.object({ type: z.literal('own_all_types') }),
  /** Be first on the Hunters leaderboard by points after a hunt (the server checks this). */
  z.object({ type: z.literal('leaderboard') }),
]);

export const achievementCategories = ['first_steps', 'hunting', 'ranks', 'naughty_list', 'bosses', 'gear', 'objectives', 'secret'] as const;
export const Achievement = z.object({
  id,
  name: z.string().min(1).max(30),
  description: z.string().min(1).max(100),
  category: z.enum(achievementCategories),
  frame: z.enum(['bronze', 'silver', 'gold']),
  secret: z.boolean().optional(),
  /** Brief for the badge art (emblem only). */
  badge: z.string().max(160).optional(),
  when: AchievementRule,
});

export const Content = z.object({
  constants: Constants,
  story: Story.optional(),
  ranks: z.array(Rank).min(1),
  locations: z.array(Location).min(1),
  items: Items,
  recipes: z.array(Recipe),
  achievements: z.array(Achievement).default([]),
});

export type PowerType = z.infer<typeof PowerType>;
export type ImpTier = z.infer<typeof ImpTier>;
export type Flavour = z.infer<typeof Flavour>;
export type ImpFlavour = z.infer<typeof ImpFlavour>;
export type FlavourFile = z.infer<typeof FlavourFile>;
export type Imp = z.infer<typeof Imp>;
export type PillageRule = z.infer<typeof PillageRule>;
export type PillageKind = z.infer<typeof PillageKind>;
export type Location = z.infer<typeof Location>;
export type Objective = z.infer<typeof Objective>;
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
export type Achievement = z.infer<typeof Achievement>;
export type AchievementRule = z.infer<typeof AchievementRule>;
export type AchievementStat = z.infer<typeof AchievementStat>;
export type AchievementCategory = (typeof achievementCategories)[number];
