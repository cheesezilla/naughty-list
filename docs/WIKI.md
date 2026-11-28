# The Naughty List: wiki

Everything about the game for players: every area, elf, item and rule, with a full-game walkthrough at the end. Numbers come from `content/*.json`; this page is one of the four tracked docs (three in `docs/`, plus the UI design canvas, which lives only as an artifact) (see [Developer notes](DEVELOPER_NOTES.md) for design discussion and [Balance notes](BALANCE.md) for catch-rate and pace analysis). Update it in any PR that changes what a player can see or do.


## Contents

- [Overview](#overview)
- [Locations](#locations)
  - [Cookie Pantry](#cookie-pantry)
  - [Wrapping Room](#wrapping-room)
  - [Toy Workshop](#toy-workshop)
  - [Reindeer Stables](#reindeer-stables)
  - [Carol Loft](#carol-loft)
- [Elves and bosses](#elves-and-bosses)
- [Ranks](#ranks)
- [Traps](#traps)
- [Bases](#bases)
- [Baits](#baits)
- [Charms](#charms)
- [Power types](#power-types)
- [Crafting and materials](#crafting-and-materials)
- [Hunting](#hunting)
- [Allure](#allure)
- [Luck, power and catch odds](#luck-power-and-catch-odds)
- [Pillage](#pillage)
- [Area objectives](#area-objectives)
- [Keys and unlocks](#keys-and-unlocks)
- [Cheer Meter](#cheer-meter)
- [Random events](#random-events)
- [Scrinch](#scrinch)
- [Achievements](#achievements)
- [Goals and tips](#goals-and-tips)
- [Glossary](#glossary)
- [Walkthrough](#walkthrough)
  - [Rules that decide everything](#rules-that-decide-everything)
  - [1. Cookie Pantry (rank 1, 0 to 2,500 points)](#1-cookie-pantry-rank-1-0-to-2500-points)
  - [2. Wrapping Room (rank 2, to 12,000 points)](#2-wrapping-room-rank-2-to-12000-points)
  - [3. Toy Workshop (rank 3)](#3-toy-workshop-rank-3)
  - [4. Reindeer Stables (rank 4, to 217,000 points; 5,000 g + Cog Key)](#4-reindeer-stables-rank-4-to-217000-points-5000-g--cog-key)
  - [Carol Loft (optional side area)](#carol-loft-optional-side-area)
  - [Cheer Meter and Overcharge](#cheer-meter-and-overcharge)
  - [The last elves](#the-last-elves)

## Overview

**The Naughty List** is an original Christmas trap-and-catch browser game for eddy and friends. **Scrinch**, a horned devil, has taken over Santa's secret lair at the North Pole and **hexed Santa's own elves** with brimstone soot. Santa hires you as an elf hunter. Catch a hexed elf and it goes on **The Naughty List**; Mrs. Claus's cocoa then brings it round.

You arm a **trap**, a **base**, a **bait** and optionally a **charm**, then press **Hunt**. **There is no wait timer**: every press is a hunt, and bait (gold) is the only pacing. Gold buys better gear, points raise your rank, and each area's boss drops a key and crafting parts for the next step. The first release covers ranks 1 to 5 and four main areas plus one side area.

Shops: the **Elf Emporium** sells gear and bait. **Santa's Workshop** crafts what bosses and elves drop. The **Naughty List** screen is the collection of every elf you have caught.

## Locations

Areas of Santa's lair. Unlocking needs the rank, a gold fee and the previous area's boss key (see [Keys and unlocks](#keys-and-unlocks)). Travel between unlocked areas is free.

### Cookie Pantry

Rank 1 · starting area · Weak to: Clockwork Starlight

Santa's pantry, stacked with cookie jars and milk churns. The hexed baker elves never left.

Elves: Crumb Elf, Sprinkle Snatcher, Sootcap, Jarbelly the Glutton, Gingerbread Rascal

### Wrapping Room

Rank 2 · unlock 250 gold · Weak to: Starlight

Miles of ribbon and paper. The hexed wrappers still can't resist anything that shines.

**Key:** Gift-Tag Key, dropped by the local boss. A brass key on a gift tag, dropped by Madame Shredwell. It opens the Toy Workshop.

Elves: Ribbon Tangler, Tape Biter, Bow Burglar, Glitterbug, Spoolwick, Madame Shredwell

### Toy Workshop

Rank 3 · unlock 1,500 gold · Weak to: Clockwork

Benches, gears and paint pots. The hexed toymakers can't keep their hands off a wind-up.

**Key:** Cog Key, dropped by the local boss. A key cut from a clockwork gear, dropped by General Grimbolt. It opens the Reindeer Stables.

Elves: Cog Pincher, Paint Smudger, Stuffing Ripper, Wind-up Elf, Hammerhand, General Grimbolt

### Reindeer Stables

Rank 4 · unlock 5,000 gold · Weak to: Frost

Warm stalls, jingling harnesses and a sleigh that must be ready by Christmas Eve. The hexed stable hands crave the warmth and bolt from the cold.

Elves: Hay Hoarder, Bell Thief, Harness Snipper, Carrot Crook, Antler Ripper, Cinderhoof

### Carol Loft

Rank 2 · unlock 600 gold · side area · Weak to: Clockwork Frost Starlight

The draughty attic above the Wrapping Room, where hexed carollers sing flat on purpose. A side trip: nothing here is needed to move on, but it is where Carol traps are made.

Elves: Tin Whistler, Hoarse Caroller, Mistletoe Mumbler, Silver Piper, Choirmaster Hollowvoice

## Elves and bosses

Tiers: **common** and **uncommon** fill most hunts, **rare** elves are about 5%, **mini bosses** and **bosses** only appear through each area's objective (or Boss Bell). Effectiveness: weak ×1.5, resists ×0.5, immune ×0 (cannot be caught by that type); unlisted types are normal.

### Cookie Pantry

| Elf                                                            | Tier     | Power | Gold | Points | Effectiveness  | Loot                                  |
|----------------------------------------------------------------|----------|-------|------|--------|----------------|---------------------------------------|
| **Crumb Elf**                   | Common   | 40    | 12   | 20     | —              | —                                     |
| **Sprinkle Snatcher**   | Common   | 70    | 18   | 30     | Clockwork weak | Candied Peel (10%)                    |
| **Sootcap**                       | Uncommon | 100   | 25   | 45     | Starlight weak | —                                     |
| **Jarbelly the Glutton**         | Uncommon | 180   | 40   | 70     | Clockwork weak | Cookie Tin (30%)                      |
| **Gingerbread Rascal** | Rare     | 160   | 60   | 100    | Frost weak     | Sugar Glass (50%), Brass Spring (15%) |

### Wrapping Room

| Elf                                                        | Tier      | Power | Gold | Points | Effectiveness                     | Loot                                               |
|------------------------------------------------------------|-----------|-------|------|--------|-----------------------------------|----------------------------------------------------|
| **Ribbon Tangler**     | Common    | 150   | 40   | 60     | Frost weak                        | Sugar Twist (25%), Ribbon Candy (2%)               |
| **Tape Biter**             | Common    | 220   | 55   | 85     | Starlight weak                    | Sugar Twist (20%), Ribbon Candy (2%)               |
| **Bow Burglar**           | Common    | 280   | 70   | 100    | Starlight weak, Clockwork resists | Candied Peel (30%), Ribbon Candy (2%)              |
| **Glitterbug**             | Rare      | 350   | 110  | 160    | Starlight weak, Clockwork resists | Sugar Glass (50%)                                  |
| **Spoolwick**               | Mini boss | 600   | 160  | 300    | Starlight weak, Clockwork resists | Golden Ribbon (100%)                               |
| **Madame Shredwell** | Boss      | 1,100 | 300  | 550    | Carol weak, Clockwork resists     | Enchanted Wrapping (100%), Jingle Bell Charm (25%) |

### Toy Workshop

| Elf                                                        | Tier      | Power | Gold | Points | Effectiveness                 | Loot                   |
|------------------------------------------------------------|-----------|-------|------|--------|-------------------------------|------------------------|
| **Cog Pincher**           | Common    | 450   | 140  | 150    | Clockwork weak                | —                      |
| **Paint Smudger**       | Common    | 600   | 180  | 190    | Starlight weak                | —                      |
| **Stuffing Ripper**   | Common    | 750   | 220  | 230    | Clockwork weak, Frost resists | —                      |
| **Wind-up Elf**            | Rare      | 900   | 300  | 320    | Clockwork weak, Frost immune  | Sugar Glass (50%)      |
| **Hammerhand**             | Mini boss | 1,600 | 400  | 650    | Frost weak                    | Toymaker's Gear (100%) |
| **General Grimbolt** | Boss      | 2,800 | 700  | 1,300  | Clockwork weak, Frost resists | Clockwork Heart (100%) |

### Reindeer Stables

| Elf                                                      | Tier      | Power | Gold  | Points | Effectiveness                     | Loot                     |
|----------------------------------------------------------|-----------|-------|-------|--------|-----------------------------------|--------------------------|
| **Hay Hoarder**         | Common    | 1,000 | 300   | 350    | Frost weak                        | —                        |
| **Bell Thief**           | Common    | 1,300 | 380   | 420    | Frost weak, Starlight resists     | —                        |
| **Harness Snipper** | Common    | 1,600 | 450   | 480    | Clockwork weak, Starlight resists | —                        |
| **Carrot Crook**       | Rare      | 2,000 | 600   | 650    | Frost weak, Starlight resists     | Sugar Glass (50%)        |
| **Antler Ripper**     | Mini boss | 3,500 | 800   | 1,200  | Frost weak, Starlight resists     | Silver Sleighbell (100%) |
| **Cinderhoof**           | Boss      | 6,000 | 1,500 | 3,000  | Frost weak, Starlight immune      | Brimstone Coal (100%)    |

### Carol Loft

| Elf                                                                      | Tier      | Power | Gold | Points | Effectiveness                 | Loot                   |
|--------------------------------------------------------------------------|-----------|-------|------|--------|-------------------------------|------------------------|
| **Tin Whistler**                       | Common    | 200   | 30   | 42     | Clockwork weak                | Hymn Reed (20%)        |
| **Hoarse Caroller**                 | Common    | 260   | 38   | 55     | Frost weak                    | Hymn Reed (20%)        |
| **Mistletoe Mumbler**             | Common    | 320   | 48   | 70     | Starlight weak                | Hymn Reed (20%)        |
| **Silver Piper**                       | Rare      | 500   | 85   | 130    | Carol weak                    | Hymn Reed (100%)       |
| **Choirmaster Hollowvoice** | Mini boss | 1,000 | 180  | 250    | Carol weak, Clockwork resists | Carol Songsheet (100%) |

## Ranks

Rank depends on points only (earned from catches). Points needed grow about 4× per rank. Rank 5 is the end of the first release.

| Rank | Title            | Points needed |
|------|------------------|---------------|
| 1    | **Snow Scout**   | 0             |
| 2    | **Elf Deputy**   | 2,500         |
| 3    | **Hex Tracker**  | 12,000        |
| 4    | **Frost Warden** | 46,000        |
| 5    | **Yule Marshal** | 160,000       |

## Traps

The main source of power and the only slot with a power type. Never consumed.

| Trap                     | Type                                        | Power | Luck | Allure bonus | Rank | Price                                                                                         |
|--------------------------|---------------------------------------------|-------|------|--------------|------|-----------------------------------------------------------------------------------------------|
| **Starlit Stocking**     | Starlight | 60    | 0    | —            | 1    | Crafted / reward                                                                              |
| **Jack-in-the-Box**      | Clockwork | 150   | 1    | —            | 1    | 300 gold                                                                                      |
| **Star Lantern**         | Starlight | 300   | 2    | —            | 2    | 1,200 gold                                                                                    |
| **Carol Horn**           | Carol         | 600   | 10   | —            | 2    | Crafted / reward (5× Hymn Reed, 1× Carol Songsheet + 600 gold)                                |
| **Icicle Jar**           | Frost         | 500   | 2    | +5%          | 2    | 3,000 gold                                                                                    |
| **Nutcracker Jaws**      | Clockwork | 900   | 3    | —            | 3    | 9,000 gold                                                                                    |
| **Constellation Wreath** | Starlight | 1400  | 5    | +5%          | 3    | Crafted / reward (3× Enchanted Wrapping, 2× Brass Spring + 6,000 gold)                        |
| **Snow Globe Prison**    | Frost         | 1800  | 4    | —            | 4    | 25,000 gold                                                                                   |
| **Sleigh-Bell Snapper**  | Clockwork | 2600  | 6    | +5%          | 4    | Crafted / reward (3× Silver Sleighbell, 1× Clockwork Heart, 1× Nutcracker Jaws + 15,000 gold) |

## Bases

Add power, luck and Allure, and the later ones have a **type affinity** bonus to power when paired with the matching trap type.

| Base                      | Power | Luck | Allure bonus | Rank | Price                                                                                      | Good for                                                                                          |
|---------------------------|-------|------|--------------|------|--------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **Cardboard Box**         | 20    | 0    | —            | 1    | Crafted / reward                                                                           | —                                                                                                 |
| **Gingerbread Slab**      | 80    | 1    | —            | 1    | 500 gold                                                                                   | —                                                                                                 |
| **Candy Cane Platform**   | 200   | 1    | +5%          | 2    | 2,500 gold                                                                                 | —                                                                                                 |
| **Ice Block**             | 400   | 3    | —            | 3    | 8,000 gold                                                                                 | —                                                                                                 |
| **Yule Log Base**         | 600   | 5    | +10%         | 3    | Crafted / reward (3× Toymaker's Gear, 1× Golden Ribbon, 2× Sugar Glass + 4,000 gold)       | —                                                                                                 |
| **Toffee Anvil**          | 300   | 0    | —            | 2    | 3,500 gold                                                                                 | Bosses and mini bosses                                                                            |
| **Chestnut Brazier**      | 100   | 1    | +15%         | 2    | 3,500 gold                                                                                 | Cheap bait                                                                                        |
| **Wishbone Plinth**       | 50    | 4    | —            | 2    | 4,500 gold                                                                                 | Catching common elves                                                                              |
| **Sleigh Runner**         | 1300  | 2    | —            | 4    | Crafted / reward (2× Silver Sleighbell, 2× Toymaker's Gear + 12,000 gold)                  | Bosses, best with Clockwork traps; +10% power with Clockwork                                      |
| **Gingerbread Cottage**   | 550   | 4    | +30%         | 4    | Crafted / reward (3× Cookie Tin, 2× Golden Ribbon, 1× Candy Cane Platform + 8,000 gold)    | Cheap bait, best with Frost traps; +10% power with Frost                                          |
| **Wishing Star Pedestal** | 300   | 9    | —            | 4    | Crafted / reward (1× Clockwork Heart, 2× Enchanted Wrapping, 4× Sugar Glass + 12,000 gold) | Elves that resist your trap, best with Starlight and Carol traps; +10% power with Starlight/Carol |

## Baits

One bait is used on every hunt, whether it catches or not. Higher Allure pulls rarer elves more often. **Each area has its own bait**: a bait from another area still gets used up, but the catch always fails (a red warning on the Hunt screen, in the bait picker and on the Travel map tells you, and arriving with the wrong bait armed shows a notice). Cookie Pantry: Pantry Crumbs, Stale Cookie, Sugar Cookie, Fruitcake. Wrapping Room: Glitter Gumdrop, Ribbon Candy, Golden Bow Bonbon. Carol Loft: Honey Lozenge, Spiced Honey Drop. Toy Workshop: Gingersnap, Peppermint Bark. Reindeer Stables: Hay Biscuit, Hot Cocoa, Gilded Cocoa. If you run out of bait in the Cookie Pantry you sweep up free Pantry Crumbs (weak, home area only), so you can always rebuild. Elsewhere, with no bait and under 50 gold, Mrs. Claus slips you 10 of the cheapest bait that works where you are.

**Gold and bait.** Every area has cheap bait that earns gold and pricey bait that draws rare elves, mini bosses and bosses (the bait sheet calls them Budget bait and Premium bait). Every area pays far more gold per catch than the one before, and its bait costs more too, so you move on: arrive with your old trap, hunt at a low catch rate, save for the area's own trap, then go for the boss. Rare **jackpot elves** (Gingerbread Rascal, Glitterbug, Wind-up Elf, Carrot Crook, Silver Piper) pay a big pile of gold; catch one and you get a head start on the next area. Each log row shows its net gold.

| Bait                  | Allure | Rank | Price                                                          | Notes                                                                         |
|-----------------------|--------|------|----------------------------------------------------------------|-------------------------------------------------------------------------------|
| **Stale Cookie**      | 70%    | 1    | 8 gold                                                         | Cookie Pantry bait.                                                           |
| **Sugar Cookie**      | 78%    | 1    | 20 gold                                                        | Draws more Sootcaps in the Pantry.                                            |
| **Peppermint Bark**   | 86%    | 3    | 450 gold                                                       | Toy Workshop bait.                                                            |
| **Fruitcake**         | 85%    | 2    | Crafted / reward (3× Candied Peel, 1× Cookie Tin + 100 gold)   | Doubles rare, mini boss and boss odds (cannot skip the Wrapping Room ladder). |
| **Ribbon Candy**      | 82%    | 2    | Crafted / reward (2× Sugar Twist, 1× Candied Peel + 90 gold)   | Wrapping Room ladder tier 2.                                                  |
| **Golden Bow Bonbon** | 86%    | 2    | Crafted / reward (1× Sugar Glass, 1× Golden Ribbon + 200 gold) | Wrapping Room ladder tier 3: the bait Madame Shredwell takes.                 |
| **Hot Cocoa**         | 92%    | 4    | 1,200 gold                                                       | Reindeer Stables bait.                                                        |
| **Glitter Gumdrop**   | 80%    | 2    | 24 gold                                                        | Wrapping Room shop bait (ladder tier 1).                                      |
| **Honey Lozenge**     | 78%    | 2    | 24 gold                                                        | Carol Loft bait.                                                              |
| **Pantry Crumbs**     | 55%    | 1    | Free fallback (Cookie Pantry only)                             | Used automatically when you run out of bait in the Pantry.                    |
| **Gingersnap**        | 78%    | 3    | 150 gold                                                       | Toy Workshop budget bait.                                                       |
| **Hay Biscuit**       | 78%    | 4    | 450 gold                                                       | Reindeer Stables budget bait.                                                   |
| **Spiced Honey Drop** | 86%    | 2    | 75 gold                                                        | Carol Loft premium bait: rarer singers show up more.                             |
| **Gilded Cocoa**      | 95%    | 4    | Crafted (1× Brimstone Coal, 4× Hot Cocoa + 2,000 gold, makes 10) | Reindeer Stables premium bait: the strongest, and a big gold sink.            |

## Charms

Optional fourth slot; one is used up per hunt. Cheer charms only fill the [Cheer Meter](#cheer-meter) faster.

| Charm                     | Effect                                   | Rank | Price    |
|---------------------------|------------------------------------------|------|----------|
| **Mistletoe Charm**       | +4 luck                                  | 1    | 30 gold  |
| **Jingle Bell Charm**     | +15% Allure                              | 2    | 25 gold  |
| **Wind-up Key Charm**     | +20% power                               | 3    | 60 gold  |
| **Cheer Bauble**          | Meter: +1 pip on rare catches            | 2    | 40 gold  |
| **Tinsel Cheer Charm**    | Meter: +1 pip on every catch             | 3    | 90 gold  |
| **Gold Star Cheer Charm** | Meter: +1 pip every catch, +1 on escapes | 4    | 180 gold |

## Power types

Clockwork  
Toy machines and springs. Home type of the Toy Workshop.

Starlight  
Christmas-star magic, strong against shadowy elves. Home type of the Wrapping Room. (Used to be called Holly.)

Frost  
Ice magic. Home type of the Reindeer Stables.

Carol  
A fourth type made only from Carol Loft drops. It is weak-point for Madame Shredwell, the one off-type boss.

From the Wrapping Room on, each area has a **home type** most of its elves are weak to and a **rival type** they resist (Wrapping Room: Starlight beats, Clockwork resists. Toy Workshop: Clockwork beats, Frost resists. Reindeer Stables: Frost beats, Starlight resists). Each area has one or two exceptions, and every elf's description hints at its weakness. The Cookie Pantry is a teaching room with no home type. Power-type medals on the Hunt screen show the best traps for the current area.

## Crafting and materials

Done in **Santa's Workshop** with gold plus materials. Materials can also be sold for gold; sold gear pays back 40% of its price.

#### Recipes

| Recipe                    | Makes                    | Ingredients                                                  | Gold   | Rank |
|---------------------------|--------------------------|--------------------------------------------------------------|--------|------|
| **Mistletoe Charm**       | 10× Mistletoe Charm      | 1× Sugar Glass                                               | 150    | 1    |
| **Fruitcake**             | 5× Fruitcake             | 3× Candied Peel, 1× Cookie Tin                               | 100    | 2    |
| **Ribbon Candy**          | 3× Ribbon Candy          | 2× Sugar Twist, 1× Candied Peel                              | 90     | 2    |
| **Golden Bow Bonbon**     | 2× Golden Bow Bonbon     | 1× Sugar Glass, 1× Golden Ribbon                             | 200    | 2    |
| **Carol Horn**            | 1× Carol Horn            | 5× Hymn Reed, 1× Carol Songsheet                             | 600    | 2    |
| **Constellation Wreath**  | 1× Constellation Wreath  | 3× Enchanted Wrapping, 2× Brass Spring                       | 6,000  | 3    |
| **Yule Log Base**         | 1× Yule Log Base         | 3× Toymaker's Gear, 1× Golden Ribbon, 2× Sugar Glass         | 4,000  | 3    |
| **Sleigh Runner**         | 1× Sleigh Runner         | 2× Silver Sleighbell, 2× Toymaker's Gear                     | 12,000 | 4    |
| **Gingerbread Cottage**   | 1× Gingerbread Cottage   | 3× Cookie Tin, 2× Golden Ribbon, 1× Candy Cane Platform      | 8,000  | 4    |
| **Wishing Star Pedestal** | 1× Wishing Star Pedestal | 1× Clockwork Heart, 2× Enchanted Wrapping, 4× Sugar Glass    | 12,000 | 4    |
| **Sleigh-Bell Snapper**   | 1× Sleigh-Bell Snapper   | 3× Silver Sleighbell, 1× Clockwork Heart, 1× Nutcracker Jaws | 15,000 | 4    |

#### Materials

| Material               | Sells for | Dropped by                                                                                                                                             |
|------------------------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Candied Peel**       | 5 gold    | Sprinkle Snatcher, Bow Burglar                                                                             |
| **Sugar Twist**        | 8 gold    | Ribbon Tangler, Tape Biter                                                                                     |
| **Sugar Glass**        | 20 gold   | Gingerbread Rascal, Glitterbug, Wind-up Elf, Carrot Crook            |
| **Cookie Tin**         | 30 gold   | Jarbelly the Glutton                                                                                                                   |
| **Brass Spring**       | 50 gold   | Gingerbread Rascal                                                                                                           |
| **Golden Ribbon**      | 60 gold   | Spoolwick                                                                                                                             |
| **Enchanted Wrapping** | 100 gold  | Madame Shredwell                                                                                                               |
| **Toymaker's Gear**    | 120 gold  | Hammerhand                                                                                                                           |
| **Clockwork Heart**    | 200 gold  | General Grimbolt                                                                                                               |
| **Silver Sleighbell**  | 200 gold  | Antler Ripper                                                                                                                     |
| **Brimstone Coal**     | 200 gold  | Cinderhoof                                                                                                                           |
| **Hymn Reed**          | 25 gold   | Tin Whistler, Hoarse Caroller, Mistletoe Mumbler, Silver Piper |
| **Carol Songsheet**    | 150 gold  | Choirmaster Hollowvoice                                                                                                 |

## Hunting

1.  **Elf pick.** Every hunt meets an elf from the area's table, weighted by your bait and Allure. There are no empty hunts.
2.  **Bait** is used on every hunt.
3.  **Catch roll** compares your power and luck to the elf's power.
4.  **Catch**: gold, points and a loot roll. **Escape**: nothing gained, and a chance of [pillage](#pillage).

Every hunt goes into the **hunt log**, which also records buys, crafts, travel, keys, events and achievements. The server rolls every hunt with a secure random source and allows at most 2 hunts per second. If you have no bait and under 50 gold, Mrs. Claus gives you 10 free Stale Cookies. New hunters start with 200 gold and 100 Stale Cookies in the Cookie Pantry. An optional stamina meter (Cocoa) exists but is off.

## Allure

Your bait and gear set an attraction rate (capped at 95%). **Allure factor = attraction ÷ 0.8.** It multiplies the odds of **rare, mini boss and boss** elves; commons and uncommons are unchanged, so higher Allure means more rare visits. Stale Cookie is about 0.88×, the best gear around 1.2×. In the Reindeer Stables, any bait except Hot Cocoa halves attraction. The Hunt screen shows Allure as a five-step bar (Very weak to Very strong) instead of exact numbers.

## Luck, power and catch odds

- **Power** = (trap + base + charm power) × (1 + charm power bonus). **Luck** = trap + base + charm luck.
- **Catch chance** = (Power × Effectiveness + luck bonus) ÷ (Power × Effectiveness + elf power), at most 98%.
- **Luck bonus** = 3 × luck² × tier weight: common and uncommon 1, rare 0.5, mini boss 0.25, boss 0.1. So **luck is best for minions and power is best for bosses.** Luck does not count against an immune elf.
- Weak elves (×1.5) are much easier; resistant ones (×0.5) can need a different trap.

Example: a 150 power trap on a 20 power base with luck 2 against a 90 power common: (170 + 12) ÷ (170 + 90) ≈ 70%.

## Pillage

When an elf escapes, it may steal something. Chance by tier: common 3%, uncommon 5%, rare 8%, mini boss 35%, boss 60%. Elves take gold and bait; mini bosses and bosses also take a few rank points. A few elves (Jarbelly, Bow Burglar, Bell Thief) always steal a little bait. Safety rails: gold never drops below 100, you never lose a rank, only the bait you have armed can be taken, and gear, keys and cards are never touched.

## Area objectives

Mini bosses and bosses only come through each area's own objective. The Cookie Pantry has none and no boss. Every objective counts hunts and catches, never minutes.

### Wrapping Room: Bait Ladder

Three bait tiers, each crafted from the last tier's drops. Shop bait draws common wrappers who drop Sugar Twist; **Ribbon Candy** draws the Glitterbug and Spoolwick (mini boss, drops Golden Ribbon); **Golden Bow Bonbon** is the only bait that draws **Madame Shredwell**.

### Toy Workshop: Order Board

Each order is 3 slots, each asking for a trap type. A catch with the right type fills the next slot. A finished order pays a Toy Crate (1,000 gold plus a reward). Every 3rd finished order triggers an Inspection: **Hammerhand** (mini boss) comes next. After that you can take a 5-slot Rush order; finishing it brings **General Grimbolt**. This makes you own traps of every type.

### Reindeer Stables: Sleigh Run

Start a run and get Readiness to 100 within 40 hunts. Common catches add 5, rares 12, the Antler Ripper (mini boss, appears from 50 readiness) 20. Escapes from the Bell Thief (−8) or Harness Snipper (−5) set you back. Launching pays 8,000 gold and a Silver Sleighbell, then **Cinderhoof** ambushes the sleigh. A run costs gold: **300 gold upkeep every hunt** on top of bait, and catches pay only a quarter of their gold, so a run is a net loss until it launches. A failed run pays 30 gold per readiness. You can **abandon a run at any time** (Readiness goes back to 0, launches already made stay) and start again. Earn gold with the run off, then pay for the run.

### Carol Loft

An optional side area off the Wrapping Room with no boss key. Choirmaster Hollowvoice drops the Carol Songsheet; with Hymn Reeds it crafts the Carol Horn.

## Keys and unlocks

To enter a new area you need **rank, gold fee and the boss key** of the area before it. The first catch of a local boss drops its key (shown as a "Key found" log entry). Keys are never spent and unlocked areas stay open. The key does not skip the rank: if you beat a boss early, keep hunting until you reach the next area's rank (Travel shows how many points you still need).

| Area             | Boss             | Key                   | Opens                                 |
|------------------|------------------|-----------------------|---------------------------------------|
| Cookie Pantry    | none             | none                  | Wrapping Room (rank 2, 250 gold)      |
| Wrapping Room    | Madame Shredwell | Gift-Tag Key          | Toy Workshop (rank 3, 1,500 gold)     |
| Toy Workshop     | General Grimbolt | Cog Key               | Reindeer Stables (rank 4, 5,000 gold) |
| Reindeer Stables | Cinderhoof       | none (end of release) | later areas                           |

## Cheer Meter

A streak meter on the Hunt screen. When it fills, you pick **1 of 3 random boons**.

- **Fills:** +1 pip per catch, +2 for a rare, mini boss or boss. **Escape:** −3 pips (never below 0).
- **Full at 10:** press **Cash in** to draw 3 boons (Common 70%, Rare 25%, Legendary 5%). Boons last a number of *hunts* and different boons stack. The boon you just took cannot appear next time.
- **Pity:** after 3 draws with no rare or better one is guaranteed; after 8 draws with no legendary one is guaranteed.
- **Overcharge:** instead of cashing in, **Hold** the charge up to 15 pips for a better draw (Warm 11-12, Hot 13-14, Blazing 15 with 4 cards and a reroll). While held, an escape costs −5.
- **Cheer charms** (Cheer Bauble, Tinsel, Gold Star) fill the meter faster.
- **Bait matters:** boons are built for your big hunts. With **premium bait** armed their bonuses count at **150%** and catches fill the meter **twice as fast**; with budget bait they count at **50%**. A boon you pick with premium bait armed has a **25% chance to Surge** and last twice as many hunts. A full meter waits for you, so you can bank it and cash in as you start using premium bait. Boons that just switch something on (Free Bait, Cosy Mittens, Mulligan, Boss Bell) are not scaled. The table shows the base values: a +30% boon is +45% with premium bait and +15% with budget bait.

| Boon                 | Rarity    | Lasts   | Effect                                                                             |
|----------------------|-----------|---------|------------------------------------------------------------------------------------|
| **Double Haul**      | Common    | 5 hunts | Gold from catches x2.                                                              |
| **Free Bait**        | Common    | 6 hunts | Your armed bait is not used up. Its Allure still counts.                           |
| **Steady Hands**     | Common    | 5 hunts | +30% trap power.                                                                   |
| **Lucky Stocking**   | Common    | 5 hunts | +6 luck.                                                                           |
| **Sweet Tooth**      | Common    | 6 hunts | +25% Allure, so rarer elves show up more.                                          |
| **Cosy Mittens**     | Common    | 8 hunts | No pillage on an escape: nothing is stolen.                                        |
| **Starfall**         | Rare      | 4 hunts | Rare elves, mini bosses and bosses are twice as likely to show up.                 |
| **Full Sack**        | Rare      | 4 hunts | Loot drops x2 and every catch drops at least one material.                         |
| **Cocoa Rush**       | Rare      | 3 hunts | +50% trap power.                                                                   |
| **Points Parade**    | Rare      | 5 hunts | Rank points from catches x2.                                                       |
| **Mulligan**         | Rare      | 5 hunts | An escape is rolled again once; the better result counts.                          |
| **Santa's Blessing** | Legendary | 3 hunts | A huge trap power boost (x2.5). Strong gear and the right power type still matter. |
| **Boss Bell**        | Legendary | 1 hunts | The next hunt meets this area's boss (or its strongest mini boss).                 |
| **Cheer Surge**      | Legendary | 5 hunts | Meter pips from catches x2 and escapes cost nothing.                               |

## Random events

After a hunt there is a 2.5% chance of an event (none in the first 30 hunts, at least 20 hunts apart). 60% are a gift from **Santa or Mrs. Claus**, 40% are a [Scrinch](#scrinch) challenge. Rewards scale with **H**, the average gold of the area's commons, so they matter everywhere. Events never touch Cheer pips.

#### Gifts (pick one of two)

| Event                         | From      | Choice A                                  | Choice B                          |
|-------------------------------|-----------|-------------------------------------------|-----------------------------------|
| **Mrs. Claus's Cookie Tin**   | Mrs Claus | Gold (8 H)                                | 5 of the best bait you can use    |
| **Santa's Gift Sack**         | Santa     | A random charm                            | Gold (4 H) and 2 bait             |
| **Mrs. Claus's Warm Mittens** | Mrs Claus | +10% power for 10 hunts                   | Luck x1.1 for 10 hunts            |
| **Santa's Naughty Check**     | Santa     | Allure x1.5 for 5 hunts                   | Gold (3 H)                        |
| **Mrs. Claus's Cocoa Break**  | Mrs Claus | +4 luck for 30 hunts (three Cocoa Flasks) | Your next escape pillages nothing |

#### Grand Gifts (rare, free, no choice)

Each gift has a 10% chance to be a Grand Gift instead. That chance goes up 15% for each Scrinch challenge you beat and 5% for each gift without one. The **Santa's favour** bar shows it.

| Grand Gift                      | From      | Effect                                                                     |
|---------------------------------|-----------|----------------------------------------------------------------------------|
| **Santa's Sleigh Delivery**     | Santa     | A sleigh lands with a sack of gold and bait.                               |
| **Mrs. Claus's Heirloom Charm** | Mrs Claus | A family charm that strengthens every trap.                                |
| **Santa's Golden Ticket**       | Santa     | The next 5 catches pay triple gold and points.                             |
| **Winter Wonder**               | Mrs Claus | The lair glitters and rare elves come out to look.                         |
| **Sparkling Snow Globe**        | Santa     | The next mini boss or boss you meet cannot pillage and is easier to catch. |

## Scrinch

**Scrinch** is the horned devil who rules the hexed elves. Beside random events, his grudge also strikes: when a mini boss or boss escapes there is a 25% chance of a challenge (not after the same boss escapes twice in a row). Each shows a live counter above the Hunt button. Beat it and the threat is cancelled, you get a prize and Santa's favour. Fail and the penalty lands once. You can also pay a gold **skip toll** at any time.

| Event               | What Scrinch does                                                                      | Beat it by                                                       | Prize                         | Skip toll |
|---------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------|-------------------------------|-----------|
| **Soot Snatch**     | Scrinch's hounds are after your gold! The hounds steal some gold.                      | Catch 5 of the next 8 elves                                      | Keep your gold, plus 3 H gold | 3% gold   |
| **Bait Bandits**    | Scrinch's bandits are eyeing your bait. The bandits make off with your bait.           | Catch 3 in a row within 10 hunts                                 | Keep your bait, plus 3 bait   | 2 H gold  |
| **Hex on the Trap** | Scrinch hexes your trap! Your trap is hexed: -25% power for 30 hunts.                  | Catch one rare elf or better within 30 hunts                     | The hex lifts, plus a charm   | 4 H gold  |
| **Toll Booth**      | Scrinch has set up a toll booth on your path. You pay the toll.                        | Catch 8 of the next 12 elves                                     | 4 H gold                      | 4% gold   |
| **Frosted Footing** | Scrinch freezes the floor and your bait slips away. Each hunt uses 2 bait for 8 hunts. | Catch an elf with a trap of this area's home type within 8 hunts | Normal bait use, plus 2 bait  | 3 H gold  |

## Achievements

55 badges in Bronze, Silver, Gold and Secret frames. Each earns a popup or banner and free items (Bronze: Mistletoe Charm and 5 Sugar Cookies; Silver: Jingle Bell Charm and 8 Peppermint Bark; Gold: Wind-up Key Charm and 10 Hot Cocoa). They are listed in your profile: earned in colour, unearned greyed with progress, secrets as "?". Start over wipes them.

First steps (6)

- **Caught One!** bronze: Catch your first elf.
- **Slippery Little Thing** bronze: An elf escapes your trap for the first time.
- **Elf Emporium Regular** bronze: Buy your first item in the Elf Emporium.
- **New Trap Smell** bronze: Equip a trap other than the starter Starlit Stocking.
- **Workshop Apprentice** bronze: Craft your first item in Santa's Workshop.
- **Deeper into the Lair** bronze: Unlock and travel to a second location.

Hunting (12)

- **Warming Up** bronze: Hunt 100 times.
- **Night Shift** silver: Hunt 500 times.
- **Tireless Hunter** silver: Hunt 1,500 times.
- **Never Sleeps** gold: Hunt 5,000 times.
- **Pocketful of Elves** bronze: Catch 50 elves.
- **Sackful of Elves** silver: Catch 250 elves.
- **Sleighload of Elves** gold: Catch 1,000 elves.
- **On a Roll** silver: Catch 10 elves in a row (quiet hunts don't break the run, escapes do).
- **Unstoppable** gold: Catch 25 elves in a row.
- **Pocket Money** bronze: Earn 1,000 gold from catches.
- **Stocking Stuffed** silver: Earn 25,000 gold from catches.
- **Santa's Treasurer** gold: Earn 250,000 gold from catches.

Ranks (4)

- **Deputised** bronze: Reach Elf Deputy (rank 2).
- **On the Trail** bronze: Reach Hex Tracker (rank 3).
- **Keeper of the Cold** silver: Reach Frost Warden (rank 4).
- **Marshal of Yule** gold: Reach Yule Marshal (rank 5, end of v1).

The Naughty List (8)

- **A Bit Unusual** bronze: Catch your first uncommon elf.
- **Rare Find** bronze: Catch your first rare elf.
- **Rare Collector** silver: Catch every rare elf in v1.
- **Pantry Swept Clean** bronze: Catch every Cookie Pantry elf at least once.
- **All Wrapped Up** silver: Catch every Wrapping Room elf at least once.
- **Every Last Cog** silver: Catch every Toy Workshop elf at least once.
- **Stable Hand** silver: Catch every Reindeer Stables elf at least once.
- **Checked Every Name** gold: Catch every elf in v1 at least once (a full Naughty List).

Bosses (6)

- **Big Trouble** bronze: Catch your first mini boss.
- **Boss Hunter** silver: Catch your first local boss.
- **Unwrapped** silver: Catch Madame Shredwell.
- **At Ease** silver: Catch General Grimbolt.
- **Grounded** gold: Catch Cinderhoof.
- **Bigger They Come** gold: Catch 10 mini bosses or bosses in total.

Gear (6)

- **Tick-Tock Trapper** bronze: Catch 25 elves with a Clockwork trap.
- **Wish Upon a Trap** bronze: Catch 25 elves with a Starlight trap.
- **Cold Snap** bronze: Catch 25 elves with a Frost trap.
- **Three of a Kind** silver: Own a trap of every power type at once.
- **Know Thy Elf** silver: Catch 100 elves with a trap type they are weak to.
- **Ring the Bells** gold: Craft the Sleigh-Bell Snapper.

Objectives (7)

- **Sweet Tooth** bronze: Wrapping Room: craft your first Ribbon Candy.
- **Top of the Ladder** silver: Wrapping Room: attract Madame Shredwell with a Golden Bow Bonbon.
- **Order Up** bronze: Toy Workshop: finish your first order.
- **Workshop Favourite** silver: Toy Workshop: finish 10 orders.
- **Rush Job** gold: Toy Workshop: finish a Rush order.
- **Liftoff!** silver: Reindeer Stables: launch the sleigh.
- **Express Delivery** gold: Reindeer Stables: launch the sleigh with 10 or more hunts left on the countdown.

Secret (6)

- **Butterfingers** bronze: Hidden until earned.
- **Silent Night** bronze: Hidden until earned.
- **Robbed Blind** bronze: Hidden until earned.
- **Lucky Stocking** gold: Hidden until earned.
- **Top of the List** silver: Hidden until earned.
- **Grounded Again** bronze: Hidden until earned.

## Goals and tips

- **Cookie Pantry goals panel:** a main goal ("Rank up and move on", ticked at the next area's rank) and an optional one (catch every portrait, shown as caught/total).
- Match the trap type to the area: the home-type medals on the Hunt screen show what is best.
- Use luck gear (and Wishbone Plinth) for commons, power gear (and Toffee Anvil) for bosses.
- Bait is your cost, and every area has its own: buy the area's bait when you arrive, since a bait from another area never catches anything.
- The Naughty List screen shows each elf's weakness once you have its card.
- Beginner tips appear once each as a small card above your gear. Start over resets your save but keeps your feedback.

## Glossary

Allure  
How strongly your bait and gear pull rare elves.

Boon  
A timed bonus, from the Cheer Meter or from Santa and Mrs. Claus.

Boss key  
Dropped by a local boss; needed to open the next area.

Cheer Meter  
Streak meter that gives a 1-of-3 boon pick when full.

Effectiveness  
How your trap's type fares against an elf: weak ×1.5, resists ×0.5, immune ×0.

Elf Emporium  
The shop.

Grand Gift  
A rare, free, powerful reward from Santa or Mrs. Claus.

H  
Average gold of an area's commons; the unit events pay in.

Hexed elf  
One of Santa's elves under Scrinch's brimstone spell. What you hunt.

Home type  
The power type an area's elves are mostly weak to.

Hunt log  
The running record of everything that happens.

Naughty List  
Both the collection of caught elves and a top-tier gear name.

Overcharge  
Holding a full Cheer Meter to 15 pips for a better draw.

Pillage  
What an escaping elf may steal.

Santa's favour  
Bar that raises the chance that the next gift is a Grand Gift.

Santa's Workshop  
Where gear and bait are crafted.

Scrinch  
The devil who rules the hexed elves.

Skip toll  
Gold you pay to dismiss a Scrinch challenge.

Yule Marshal  
Rank 5, the top rank for now.

## Walkthrough

From sign-up to a full Naughty List (all 28 elves, rank 5). Built from `content/*.json` and the engine, 27 Nov 2026. Catch odds are worked out with the game's formula for the setup shown (no Cheer boon, no gift) and are rough. Each area has a table with trap 1 (what you arrive with) and trap 2 (what you hunt for, and what you bring back to beat the local boss); recommended gear is almost always needed to catch the boss at a reasonable rate. Tables are generated from `content/*.json` with the engine's formula (28 Nov 2026 tuning). Numbers are draft and change when tuning lands, so update this page with any PR that changes them.

### Rules that decide everything

- **Catch** = (Power x weakness + luck bonus) / (Power x weakness + elf power). Weak to your trap type is x1.5, resists x0.5, immune 0.
- **Luck** helps most against commons and uncommons. Power helps against bosses (luck counts a tenth as much there).
- Ranks come from points only. A new room needs the rank, its gold fee and the previous boss's key (the Pantry has no boss, so the Wrapping Room needs only rank 2 and 250 gold).
- Allure (bait) mostly changes how often rare elves show up. Bosses and mini bosses come only through each room's objective.

### 1. Cookie Pantry (rank 1, 0 to 2,500 points)

Start: 200 gold, 100 Stale Cookies, a Starlit Stocking. Elves: Crumb Elf, Sprinkle Snatcher (weak Clockwork), Sootcap (weak Starlight), Jarbelly (uncommon, weak Clockwork, steals bait), rare Gingerbread Rascal (weak Frost). No boss.

**Steps.** 1) You start here with trap 1: **Starlit Stocking + Cardboard Box**. 2) Hunt with Stale Cookie until you have 300 gold, then buy the Jack-in-the-Box, then the Gingerbread Slab (500 g) and a Mistletoe Charm. 3) Trap 2: **Jack-in-the-Box + Gingerbread Slab + Mistletoe Charm**. There is no boss, so trap 2 is simply what you hunt the rest of the room with. Catch rates below (best weakness, no Cheer boon):

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Crumb Elf | common | 90 | - | 47% | 98% |
| Sprinkle Snatcher | common | 150 | clockwork | 35% | 92% |
| Sootcap | uncommon | 220 | starlight | 35% | 75% |
| Jarbelly the Glutton | uncommon | 400 | clockwork | 17% | 61% |
| Gingerbread Rascal | rare | 350 | frost | 19% | 49% |


- Hunt with Stale Cookie until you have 300 gold, then buy the **Jack-in-the-Box** (Clockwork 150). Then the **Gingerbread Slab** (500 g) and a Mistletoe Charm for luck.
- Move to **Sugar Cookie** once affordable: more uncommons and rares. Badge rewards give free Sugar Cookies and charms early.
- Catch the Rascal for Sugar Glass (10 Mistletoe Charms for 1 Sugar Glass + 150 g). Keep the Candied Peel from Sprinkle Snatchers.
- At 2,500 points you are an Elf Deputy. Keep 250 gold for the Wrapping Room.

### 2. Wrapping Room (rank 2, to 12,000 points)

Commons: Ribbon Tangler (weak Frost), Tape Biter and Bow Burglar (weak Starlight; Bow Burglar resists Clockwork and steals bait). Rare Glitterbug, mini boss Spoolwick and boss Madame Shredwell come only for ladder baits. Shredwell is weak to Carol (x1.5) and resists every other type (x0.6).

**Steps.** 1) Travel here from the Pantry and equip trap 1: **Star Lantern + Candy Cane Platform** (about 4,000 gold in total). 2) Hunt the commons until you can make trap 2: **Carol Horn + Toffee Anvil + Mistletoe Charm** (Carol Horn: 5 Hymn Reed + 1 Carol Songsheet + 600 g from the Carol Loft; Toffee Anvil 3,500 g). 3) Come back with trap 2 and hunt Madame Shredwell with Golden Bow Bonbons. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Ribbon Tangler | common | 300 | frost | 66% | 81% |
| Tape Biter | common | 440 | starlight | 65% | 73% |
| Bow Burglar | common | 560 | starlight | 59% | 67% |
| Glitterbug | rare | 700 | starlight | 53% | 59% |
| Spoolwick | miniboss | 800 | starlight | 49% | 54% |
| Madame Shredwell | boss | 2,900 | carol | 9% | 32% |


| Step | What to do |
| --- | --- |
| Gear | **Star Lantern** (1,200 g, Starlight 300) and **Candy Cane Platform** (2,500 g): about 55 to 64% on the commons. Later the **Icicle Jar** (3,000 g, Frost) for Ribbon Tanglers and Hammerhand. |
| Bait tier 1 | Glitter Gumdrop (16 g), the Wrapping Room's shop bait. Commons drop Sugar Twist and Candied Peel. |
| Bait tier 2 | 2 Sugar Twist + 1 Candied Peel + 30 g = 3 **Ribbon Candy**. Draws Glitterbug (Sugar Glass 50%) and Spoolwick (always a Golden Ribbon). |
| Bait tier 3 | 1 Sugar Glass + 1 Golden Ribbon + 100 g = 2 **Golden Bow Bonbons**. The only bait that draws Shredwell (half of visits). Craft 4 to 6, because she steals bait when she escapes. |
| Boss gear | Madame Shredwell is tough without Carol. With the rank 2 setup (Star Lantern or Icicle Jar on a Candy Cane Platform) she is about 10 to 13%. A Carol Horn on the same platform gives about 30%, 31% with a Mistletoe Charm; a Toffee Anvil base adds a couple of points. Use a Cheer boon (Santa's Blessing, Boss Bell) and craft plenty of Bonbons, because she steals bait when she escapes.
### 3. Toy Workshop (rank 3)

Commons: Cog Pincher and Stuffing Ripper (weak Clockwork), Paint Smudger (weak Starlight). Rare Wind-up Elf (weak Clockwork, immune to Frost). Mini boss Hammerhand and boss General Grimbolt come through the order board.

**Steps.** 1) Travel here with the Wrapping Room's key and equip trap 1: **Nutcracker Jaws + Ice Block** (Nutcracker Jaws 9,000 g, Ice Block 8,000 g). 2) Hunt, clear the order board and craft the Yule Log Base from Toymaker's Gear. Trap 2 is **Nutcracker Jaws + Yule Log Base + Wind-up Key Charm**. 3) Come back with trap 2 for General Grimbolt. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Cog Pincher | common | 1,200 | clockwork | 65% | 78% |
| Paint Smudger | common | 1,500 | starlight | 50% | 66% |
| Stuffing Ripper | common | 1,850 | clockwork | 54% | 69% |
| Wind-up Elf | rare | 900 | clockwork | 70% | 81% |
| Hammerhand | miniboss | 1,600 | frost | 46% | 60% |
| General Grimbolt | boss | 5,900 | clockwork | 25% | 37% |

- Also craft the **Constellation Wreath** (3 Enchanted Wrapping + 2 Brass Spring + 6,000 g; Brass Spring drops from the Rascal at 15%). A Starlight trap that takes Paint Smudger to about 76%.

### 4. Reindeer Stables (rank 4, to 217,000 points; 5,000 g + Cog Key)

Commons: Hay Hoarder and Bell Thief (weak Frost), Harness Snipper (weak Clockwork). Rare Carrot Crook (weak Frost). They all resist Starlight, so leave those traps at home. Use **Hot Cocoa** (90 g): other bait halves Allure.

**Steps.** 1) Travel here with the Workshop's key and equip trap 1: **Snow Globe Prison + Yule Log Base** (Snow Globe Prison 25,000 g). 2) Hunt and run sleigh runs; craft the Gingerbread Cottage (3 Cookie Tin + 2 Golden Ribbon + 1 Candy Cane Platform + 8,000 g) and wear the Wind-up Key Charm. Trap 2 is **Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm**. 3) Return with trap 2 for Cinderhoof. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Hay Hoarder | common | 2,550 | frost | 64% | 76% |
| Bell Thief | common | 3,300 | frost | 58% | 71% |
| Harness Snipper | common | 4,100 | clockwork | 42% | 56% |
| Carrot Crook | rare | 2,700 | frost | 61% | 74% |
| Antler Ripper | miniboss | 5,000 | frost | 45% | 60% |
| Cinderhoof | boss | 20,500 | frost | 16% | 26% |


- **Frost build (trap 2):** Snow Globe Prison (25,000 g, Frost 1,800), Gingerbread Cottage base (power 1,550, Frost affinity +10%, more Allure), Wind-up Key Charm (+35% power). See the table above: Cinderhoof about 26% (16% with trap 1).
- **Sleigh Run:** start a run (it costs 100 gold per hunt while it is on, so bring about 6,000 gold; hunt with the run off first) and reach 100 readiness within 40 hunts. Commons add 5, Carrot Crook 12, Antler Ripper 20 (it appears only above 50 readiness). A Bell Thief escape costs 8, a Harness Snipper escape 5. Launching pays 2,000 g and a Silver Sleighbell, then Cinderhoof ambushes the next hunt.
- **Antler Ripper** (5,000 power, weak Frost) is about 60% with trap 2. **Cinderhoof** (20,500 power, weak Frost, immune to Starlight) is about 26% with trap 2 (16% with trap 1), so expect several tries. Escapes never cost rank.
- Optional: Sleigh Runner base (2 Silver Sleighbell + 2 Toymaker's Gear + 12,000 g) and Sleigh-Bell Snapper trap (3 Silver Sleighbell + Clockwork Heart + Nutcracker Jaws + 15,000 g) are for the Workshop and Wrapping Room bosses and for completionists; against Cinderhoof the Frost build above is just as good. The Wishing Star Pedestal (1 Clockwork Heart, 2 Enchanted Wrapping, 4 Sugar Glass, 12,000 g) adds luck 9.

### Carol Loft (optional side area)

**Steps.** Optional side trip inside rank 2. Trap 1: **Icicle Jar + Candy Cane Platform**. Hunt for Hymn Reed and the Songsheet, craft the Carol Horn, and trap 2 is **Carol Horn + Candy Cane Platform + Mistletoe Charm**. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Tin Whistler | common | 200 | clockwork | 81% | 91% |
| Hoarse Caroller | common | 260 | frost | 82% | 86% |
| Mistletoe Mumbler | common | 320 | starlight | 71% | 81% |
| Silver Piper | rare | 500 | carol | 59% | 74% |
| Choirmaster Hollowvoice | miniboss | 1,000 | carol | 42% | 56% |

### Cheer Meter and Overcharge

- Catches fill pips (1 each, 2 for a rare, mini boss or boss). An escape costs 3. At 10 pips, cash in: pick 1 of 3 boons.
- **Usually cash in at 10.** Lucky Stocking, Sweet Tooth, Double Haul and Free Bait suit steady gold hunting.
- **Hold only just before a boss attempt.** Hold to 13 or more, then cash in right before Shredwell, Grimbolt or Cinderhoof. Hot and Blazing draws favour rares and legendaries (Santa's Blessing x2.5 power for 3 hunts, Cocoa Rush x1.5, Boss Bell). At 15 you get 2 rare or legendary cards, a reroll and a perk such as two Santa's Blessings back to back (six boss hunts at x2.5). While held above 10, an escape costs 5, so do not hold while farming hard commons.
- **Boss Bell** makes the next hunt the room's boss. It skips the Bonbon ladder, the Rush order and the Sleigh Run, so save it for a boss and pair it with a Blessing.
- Cheer charms (Cheer Bauble, Tinsel, Gold Star) fill the meter faster but use the charm slot: wear one for everyday hunting, then swap back to the Wind-up Key Charm for bosses.

### The last elves

- **Pantry (5):** the Rascal is the rare. Use Sugar Cookie, or a Fruitcake (5 for 3 Candied Peel + 1 Cookie Tin + 100 g; doubles every tier above common).
- **Wrapping Room (6):** Glitterbug, Spoolwick and Shredwell need Ribbon Candy or Bonbons.
- **Carol Loft (5):** Silver Piper (rare) and Choirmaster (mini boss) are slow; use the Carol Horn once you have it.
- **Toy Workshop (6):** Wind-up Elf (keep Jaws on, never Frost), then Hammerhand and Grimbolt through the order board.
- **Stables (6):** Carrot Crook, Antler Ripper and Cinderhoof through the sleigh run. Cinderhoof is the last elf. At 217,000 points you are a Yule Marshal.

Pacing: the latest simulator run (Report 5 in `docs/BALANCE.md`) has a median of about 1,200 hunts to rank 5. The Carol Loft is a detour inside rank 2, so it adds hunts there.

