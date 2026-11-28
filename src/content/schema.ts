import { z } from 'zod';

/** The three core types: the order board asks for these and "own every type" counts them. */
export const powerTypes = ['clockwork', 'starlight', 'frost'] as const;
/** Every type. Carol is the side-area type (the Carol Loft) and is kept out of the core three. */
export const PowerType = z.enum([...powerTypes, 'carol']);
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
  /** A jackpot elf: a rare that is seldom met (low weight, more with push bait) and pays far more gold than its area's usual catch. */
  jackpot: z.boolean().optional(),
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
    /** Extra gold when all three type orders have been finished since the last Triple Crate (it also gives every crate reward). */
    tripleGold: z.number().int().nonnegative(),
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
    /** Sleigh launches needed before the boss attacks the sleigh (default 1). */
    bossAfterLaunches: z.number().int().positive().default(1),
    minibossFrom: z.number().int().nonnegative(),
    minibossWeight: z.number().nonnegative(),
    launchGold: z.number().int().nonnegative(),
    launchItems: z.record(id, z.number().int().positive()),
    failGoldPerReadiness: z.number().nonnegative(),
    /** While a run is going, catches pay this share of their gold (the rest goes into the sleigh). */
    catchGoldMult: z.number().min(0).max(1).default(1),
    /** Gold the run costs per hunt on top of bait, taken from what the player has. */
    upkeep: z.number().int().nonnegative().default(0),
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
  /** A side area is off the boss-key chain: it needs no key and opens no later location. */
  side: z.boolean().optional(),
  /** Another location that must be unlocked first (side areas). */
  after: id.optional(),
  /** Power types recommended here, shown on the location banner. */
  homeTypes: z.array(PowerType).default([]),
  /** `farm` areas are where gold is earned (cheap bait); `sink` areas are where it is spent to push a boss or progress. Every area has both a farm segment (cheap bait) and a push segment (pricey bait). */
  role: z.enum(['farm', 'sink']).optional(),
  /** The only baits that work here. Any other bait is used up and the catch always fails. Missing: every bait works. */
  baits: z.array(id).min(1).optional(),
  objective: Objective.optional(),
  /** Dropped on the first catch of this location's boss. The next location in the list needs it to unlock. */
  key: z.object({ id, name: z.string(), description: z.string() }).optional(),
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
  /** Extra power (a fraction of total power) when the trap's power type is one of `types`. */
  affinity: z.object({ types: z.array(PowerType).min(1), powerBonus: z.number().positive() }).optional(),
  /** One line on the item card saying what the base is for. */
  goodFor: z.string().optional(),
  flavour: Flavour.optional(),
});
export const Bait = z.object({
  id, name: z.string(), attraction: chance,
  rareMultiplier: z.number().positive().optional(), rank: z.number().int().positive(), price,
  /** The bait's job in the farm-then-push loop: `floor` is the free fallback, `farm` the cheap bait that earns gold, `push` the pricey bait that raises rare, mini boss and boss odds. */
  role: z.enum(['floor', 'farm', 'push']).optional(),
  flavour: Flavour.optional(),
});
export const Charm = z.object({
  id, name: z.string(),
  power: z.number().optional(), powerBonus: z.number().optional(), luck: z.number().optional(), attraction: z.number().optional(),
  /** Cheer charm: extra meter pips on every catch (`all`), on rare-or-better catches (`rare`), and pips an escape costs less (`escape`). At most +1 pip a catch. */
  cheer: z.object({ all: z.number().int().min(0).max(1).optional(), rare: z.number().int().min(0).max(1).optional(), escape: z.number().int().min(0).optional() }).optional(),
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
  /** Free items for each badge frame (item id → amount), granted when a badge is earned unless the badge sets its own `reward`. */
  achievementRewards: z.object({ bronze: z.record(id, z.number().int().positive()), silver: z.record(id, z.number().int().positive()), gold: z.record(id, z.number().int().positive()) }),
  attractionCap: chance,
  /** Allure: attraction no longer decides whether an elf shows up; it scales the rare, mini boss and boss weights by attraction / baseline. */
  allure: z.object({ baseline: z.number().positive() }),
  catchCap: chance,
  /** Luck: its bonus is `scale` x luck squared x the weight of the elf's tier, so luck helps most against common elves and least against bosses. */
  luck: z.object({ scale: z.number().nonnegative(), tierWeight: z.object({ common: z.number(), uncommon: z.number(), rare: z.number(), miniboss: z.number(), boss: z.number() }) }),
  sellBackRate: chance,
  rescue: z.object({ maxGold: z.number().int().nonnegative(), item: id, amount: z.number().int().positive() }),
  maxHuntsPerSecond: z.number().positive(),
  pillage: z.object({
    /** A pillage never takes gold below this. */
    goldFloor: z.number().int().nonnegative(),
    /** Chance a thief that goes for bait finds none to take: for bought bait and for bait the player crafted. */
    baitSave: z.object({ bought: z.number().min(0).max(1), crafted: z.number().min(0).max(1) }).default({ bought: 0, crafted: 0 }),
    tiers: z.object({ common: PillageRule, uncommon: PillageRule, rare: PillageRule, miniboss: PillageRule, boss: PillageRule }),
  }),
  /** The Cheer Meter: a streak meter that pays out pick-1-of-3 boons. `enabled: false` switches it off (for baselines). */
  cheer: z.object({
    enabled: z.boolean(),
    /** Pips for a full meter, and the most an Overcharge can hold. */
    full: z.number().int().positive(), max: z.number().int().positive(),
    catchPips: z.number().int().nonnegative(), bigCatchPips: z.number().int().nonnegative(),
    escapePips: z.number().int().nonnegative(), heldEscapePips: z.number().int().nonnegative(),
    /** Pips a finished Toy Workshop order slot adds to the meter (the Workshop's own way to fill it). */
    orderPips: z.number().int().nonnegative().default(0),
    /** The `long` Overcharge perk makes boons last this much longer (0.5 = 50%). */
    longBoons: z.number().nonnegative().default(0.5),
    /** The `blessing` Overcharge perk grants this many Santa's Blessings back to back (they do not stack, so the boon lasts this many times as long). */
    blessingCopies: z.number().int().positive().default(1),
    /** Boon bonuses (power, luck, Allure, gold, points, loot) count at this fraction while farming and this multiple while pushing (push bait). */
    farmScale: z.number().nonnegative().default(1), pushScale: z.number().nonnegative().default(1),
    /** Picking a boon while pushing has this chance to make it a Surge: it lasts `surgeMult` times as many hunts. */
    surgeChance: chance.default(0), surgeMult: z.number().positive().default(1),
    /** Meter pips from a catch count this many times over while pushing, so a push can fill the meter. */
    pushPipMult: z.number().positive().default(1),
    /** Draws without a rare (or better) / without a legendary before one card is forced. */
    pity: z.object({ rare: z.number().int().positive(), legendary: z.number().int().positive() }),
    /** Draw table by pips: the last row whose `from` is at most the meter's pips applies. */
    tiers: z.array(z.object({
      from: z.number().int().nonnegative(), name: z.string(), cards: z.number().int().positive(), rerolls: z.number().int().nonnegative(),
      /** Boons the player keeps from this draw (an Overcharged draw keeps two). */
      picks: z.number().int().positive().default(1),
      /** Overcharge perks the player may choose once on this draw: a second pick, longer boons, or a guaranteed Santa's Blessing. */
      perks: z.array(z.enum(['second_pick', 'long', 'blessing'])).default([]),
      weights: z.object({ common: z.number().nonnegative(), rare: z.number().nonnegative(), legendary: z.number().nonnegative() }),
    })).min(1),
  }),
  /** Random events: Santa and Mrs. Claus boons and Grand Gifts. `enabled: false` switches them off. */
  events: z.object({
    enabled: z.boolean(),
    chancePerHunt: chance, minHunts: z.number().int().nonnegative(), minGap: z.number().int().nonnegative(),
    grandBase: chance, grandPerBoon: chance,
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
    hint: z.array(z.string().min(1).max(120)).min(1).max(5),
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
  'catches_clockwork', 'catches_starlight', 'catches_frost', 'catches_carol', 'bestCatchStreak', 'bestEscapeStreak', 'bestQuietStreak',
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
  /** Overrides the frame's default reward (item id → amount). */
  reward: z.record(id, z.number().int().positive()).optional(),
  when: AchievementRule,
});

/** One thing a gift, prize or penalty does. */
export const buffStats = ['powerMult', 'luckMult', 'luckAdd', 'allureMult', 'goldPointsMult', 'noPillage', 'baitCost', 'bossShield'] as const;
export const Effect = z.discriminatedUnion('type', [
  /** `h` x H gold, where H is the average gold of the location's common elves. */
  z.object({ type: z.literal('gold'), h: z.number().positive() }),
  /** The best bait the shop sells at the player's rank. */
  z.object({ type: z.literal('bait'), amount: z.number().int().positive() }),
  /** Random charms the shop sells at the player's rank. */
  z.object({ type: z.literal('charm'), amount: z.number().int().positive() }),
  /** A timed effect: lasts `hunts` hunts and/or `uses` uses. */
  z.object({
    type: z.literal('buff'), stat: z.enum(buffStats), value: z.number(), label: z.string(),
    hunts: z.number().int().positive().optional(), uses: z.number().int().positive().optional(),
  }),
]);
const Sender = z.enum(['santa', 'mrs_claus']);
export const Gift = z.object({ label: z.string(), effects: z.array(Effect).min(1) });
export const EventsFile = z.object({
  boons: z.array(z.object({ id, name: z.string(), from: Sender, a: Gift, b: Gift })),
  grandGifts: z.array(z.object({ id, name: z.string(), from: Sender, text: z.string(), effects: z.array(Effect).min(1) })),
});

/** What a boon changes while it lasts. Every field is optional; see `modsOf` in src/engine/mods.ts. */
export const BoonEffect = z.object({
  goldMult: z.number().optional(), pointsMult: z.number().optional(), freeBait: z.boolean().optional(),
  powerMult: z.number().optional(), luckAdd: z.number().optional(), attractionBonus: z.number().optional(),
  noPillage: z.boolean().optional(), rareMult: z.number().optional(), lootMult: z.number().optional(), minLoot: z.number().int().optional(),
  mulligan: z.boolean().optional(), bossBell: z.boolean().optional(), pipMult: z.number().optional(), freeEscape: z.boolean().optional(),
}).strict();
export const Boon = z.object({
  id, name: z.string(), rarity: z.enum(['common', 'rare', 'legendary']), hunts: z.number().int().positive(),
  text: z.string(), effect: BoonEffect,
});

/** content/releases.json: player-facing release notes, newest first. The first entry is the current version and must match package.json. */
export const Release = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  date: z.string().min(1).max(20),
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(300),
  sections: z.array(z.object({ heading: z.string().min(1).max(60), items: z.array(z.string().min(1).max(300)).min(1).max(10) })).min(1).max(8),
});

export const Content = z.object({
  constants: Constants,
  story: Story.optional(),
  releases: z.array(Release).default([]),
  ranks: z.array(Rank).min(1),
  locations: z.array(Location).min(1),
  items: Items,
  recipes: z.array(Recipe),
  achievements: z.array(Achievement).default([]),
  boons: z.array(Boon).default([]),
  events: EventsFile.default({ boons: [], grandGifts: [] }),
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
export type Release = z.infer<typeof Release>;
export type Boon = z.infer<typeof Boon>;
export type Effect = z.infer<typeof Effect>;
export type EventsFile = z.infer<typeof EventsFile>;
export type Achievement = z.infer<typeof Achievement>;
export type AchievementRule = z.infer<typeof AchievementRule>;
export type AchievementStat = z.infer<typeof AchievementStat>;
export type AchievementCategory = (typeof achievementCategories)[number];
