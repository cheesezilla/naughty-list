# The Naughty List: full-game walkthrough

From sign-up to a full Naughty List (all 28 elves, rank 5). Built from `content/*.json` and the engine, 27 Nov 2026. Catch odds are worked out with the game's formula for the setup shown (no Cheer boon, no gift) and are rough. Each area has a table with trap 1 (what you arrive with) and trap 2 (what you farm for, and what you bring back to beat the local boss); recommended gear is almost always needed to catch the boss at a reasonable rate. Tables are generated from `content/*.json` with the engine's formula (28 Nov 2026 tuning). Numbers are draft and change when tuning lands, so update this page with any PR that changes them.

## Rules that decide everything

- **Catch** = (Power x weakness + luck bonus) / (Power x weakness + elf power). Weak to your trap type is x1.5, resists x0.5, immune 0.
- **Luck** helps most against commons and uncommons. Power helps against bosses (luck counts a tenth as much there).
- Ranks come from points only. A new room needs the rank, its gold fee and the previous boss's key (the Pantry has no boss, so the Wrapping Room needs only rank 2 and 250 gold).
- Allure (bait) mostly changes how often rare elves show up. Bosses and mini bosses come only through each room's objective.

## 1. Cookie Pantry (rank 1, 0 to 2,500 points)

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

## 2. Wrapping Room (rank 2, to 12,000 points)

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
| Bait tier 1 | Any shop bait. Commons drop Sugar Twist and Candied Peel. |
| Bait tier 2 | 2 Sugar Twist + 1 Candied Peel + 30 g = 3 **Ribbon Candy**. Draws Glitterbug (Sugar Glass 50%) and Spoolwick (always a Golden Ribbon). |
| Bait tier 3 | 1 Sugar Glass + 1 Golden Ribbon + 100 g = 2 **Golden Bow Bonbons**. The only bait that draws Shredwell (half of visits). Craft 4 to 6, because she steals bait when she escapes. |
| Boss gear | Madame Shredwell is tough without Carol. With the rank 2 setup (Star Lantern or Icicle Jar on a Candy Cane Platform) she is about 10 to 13%. A Carol Horn on the same platform gives about 30%, 31% with a Mistletoe Charm; a Toffee Anvil base adds a couple of points. Use a Cheer boon (Santa's Blessing, Boss Bell) and craft plenty of Bonbons, because she steals bait when she escapes.
## 3. Toy Workshop (rank 3)

Commons: Cog Pincher and Stuffing Ripper (weak Clockwork), Paint Smudger (weak Starlight). Rare Wind-up Elf (weak Clockwork, immune to Frost). Mini boss Hammerhand and boss General Grimbolt come through the order board.

**Steps.** 1) Travel here with the Wrapping Room's key and equip trap 1: **Nutcracker Jaws + Ice Block** (Nutcracker Jaws 9,000 g, Ice Block 8,000 g). 2) Hunt, clear the order board and craft the Yule Log Base from Toymaker's Gear. Trap 2 is **Nutcracker Jaws + Yule Log Base + Wind-up Key Charm**. 3) Come back with trap 2 for General Grimbolt. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Cog Pincher | common | 1,200 | clockwork | 65% | 74% |
| Paint Smudger | common | 1,500 | starlight | 50% | 60% |
| Stuffing Ripper | common | 1,850 | clockwork | 54% | 64% |
| Wind-up Elf | rare | 900 | clockwork | 70% | 78% |
| Hammerhand | miniboss | 1,600 | frost | 46% | 54% |
| General Grimbolt | boss | 5,200 | clockwork | 27% | 34% |

- Also craft the **Constellation Wreath** (3 Enchanted Wrapping + 2 Brass Spring + 6,000 g; Brass Spring drops from the Rascal at 15%). A Starlight trap that takes Paint Smudger to about 76%.

## 4. Reindeer Stables (rank 4, to 217,000 points; 5,000 g + Cog Key)

Commons: Hay Hoarder and Bell Thief (weak Frost), Harness Snipper (weak Clockwork). Rare Carrot Crook (weak Frost). They all resist Starlight, so leave those traps at home. Use **Hot Cocoa** (90 g): other bait halves Allure.

**Steps.** 1) Travel here with the Workshop's key and equip trap 1: **Snow Globe Prison + Yule Log Base** (Snow Globe Prison 25,000 g). 2) Hunt and run sleigh runs until you can craft the Sleigh Runner from Silver Sleighbells. Trap 2 is **Snow Globe Prison + Sleigh Runner + Wind-up Key Charm**. 3) Return with trap 2 for Cinderhoof. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Hay Hoarder | common | 2,550 | frost | 62% | 70% |
| Bell Thief | common | 3,300 | frost | 56% | 64% |
| Harness Snipper | common | 4,100 | clockwork | 41% | 49% |
| Carrot Crook | rare | 2,700 | frost | 59% | 68% |
| Antler Ripper | miniboss | 5,000 | frost | 43% | 53% |
| Cinderhoof | boss | 16,800 | frost | 18% | 25% |


- **Frost build:** Snow Globe Prison (25,000 g, Frost 1,800), Gingerbread Cottage base (3 Cookie Tin, 2 Golden Ribbon, 1 Candy Cane Platform + 8,000 g; Frost affinity +10%), Wind-up Key Charm. See the table above: about 70% Hay Hoarder, 64% Bell Thief, 49% Harness Snipper, 68% Carrot Crook with trap 2.
- **Sleigh Run:** start a run (free) and reach 100 readiness within 40 hunts. Commons add 5, Carrot Crook 12, Antler Ripper 20 (it appears only above 50 readiness). A Bell Thief escape costs 8, a Harness Snipper escape 5. Launching pays 2,000 g and a Silver Sleighbell, then Cinderhoof ambushes the next hunt.
- **Antler Ripper** (5,000 power, weak Frost) is about 53%. **Cinderhoof** (16,800 power, weak Frost, immune to Starlight) is about 25% with trap 2 (18% with trap 1 alone), so expect several tries. Escapes never cost rank.
- Optional: Sleigh Runner base (2 Silver Sleighbell + 2 Toymaker's Gear + 12,000 g) and Sleigh-Bell Snapper trap (3 Silver Sleighbell + Clockwork Heart + Nutcracker Jaws + 15,000 g): about 25% on Cinderhoof with the Sleigh Runner, the same as the Frost build. The Wishing Star Pedestal (1 Clockwork Heart, 2 Enchanted Wrapping, 4 Sugar Glass, 12,000 g) adds luck 9.

## Carol Loft (optional side area)

**Steps.** Optional side trip inside rank 2. Trap 1: **Icicle Jar + Candy Cane Platform**. Farm Hymn Reed and the Songsheet, craft the Carol Horn, and trap 2 is **Carol Horn + Candy Cane Platform + Mistletoe Charm**. Catch rates:

| Elf | Tier | Power | Weak | Trap 1 | Trap 2 |
| --- | --- | --- | --- | --- | --- |
| Tin Whistler | common | 200 | clockwork | 81% | 91% |
| Hoarse Caroller | common | 260 | frost | 82% | 86% |
| Mistletoe Mumbler | common | 320 | starlight | 71% | 81% |
| Silver Piper | rare | 500 | carol | 59% | 74% |
| Choirmaster Hollowvoice | miniboss | 1,000 | carol | 42% | 56% |

## Cheer Meter and Overcharge

- Catches fill pips (1 each, 2 for a rare, mini boss or boss). An escape costs 3. At 10 pips, cash in: pick 1 of 3 boons.
- **Usually cash in at 10.** Lucky Stocking, Sweet Tooth, Double Haul and Free Bait suit farming.
- **Hold only just before a boss attempt.** Hold to 13 or more, then cash in right before Shredwell, Grimbolt or Cinderhoof. Hot and Blazing draws favour rares and legendaries (Santa's Blessing x2.5 power for 3 hunts, Cocoa Rush x1.5, Boss Bell). At 15 you get 2 rare or legendary cards, a reroll and a perk such as two Santa's Blessings back to back (six boss hunts at x2.5). While held above 10, an escape costs 5, so do not hold while farming hard commons.
- **Boss Bell** makes the next hunt the room's boss. It skips the Bonbon ladder, the Rush order and the Sleigh Run, so save it for a boss and pair it with a Blessing.
- Cheer charms (Cheer Bauble, Tinsel, Gold Star) fill the meter faster but use the charm slot: wear one while farming, then swap back to the Wind-up Key Charm for bosses.

## The last elves

- **Pantry (5):** the Rascal is the rare. Use Sugar Cookie, or a Fruitcake (5 for 3 Candied Peel + 1 Cookie Tin + 100 g; doubles every tier above common).
- **Wrapping Room (6):** Glitterbug, Spoolwick and Shredwell need Ribbon Candy or Bonbons.
- **Carol Loft (5):** Silver Piper (rare) and Choirmaster (mini boss) are slow; use the Carol Horn once you have it.
- **Toy Workshop (6):** Wind-up Elf (keep Jaws on, never Frost), then Hammerhand and Grimbolt through the order board.
- **Stables (6):** Carrot Crook, Antler Ripper and Cinderhoof through the sleigh run. Cinderhoof is the last elf. At 217,000 points you are a Yule Marshal.

Pacing: the latest simulator run (Report 5 in `docs/SIMULATION_REPORT.md`) has a median of about 1,200 hunts to rank 5. The Carol Loft is a detour inside rank 2, so it adds hunts there.
