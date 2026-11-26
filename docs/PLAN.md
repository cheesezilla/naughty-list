# The Naughty List: design and v1 plan

Living design document. It is updated in every pull request that changes the game, so it always matches `main`.
Original review copy: https://claude.ai/artifact/VRKBh16CBkcZuN8FiqeWn9 (this file is now the source of truth).

## Implementation status

| Milestone | Status | PR |
| --- | --- | --- |
| 1. Skeleton: server, client, Docker image, CI | Done | #1 |
| 2. Hunt engine, content files, tests, balance simulator | Done | #1 |
| 3. Playable client on the server: accounts, invites, server-side hunts, SQLite saves | Done | #2 |
| 4a. NAS deploy: compose file, Cloudflare Tunnel option, deploy guide, image smoke test | Done | #3 |
| 4b. Friends: leaderboard and catch feed | Done | #11 |
| Flavour text for every item and elf | Done | #9 (shown in the UI since #11) |
| Art for every UI slot: 97 original SVGs + manifest, named by game id | Done | #10 (shown in the UI since #11) |
| Custom PNG portraits for all 10 cookie-pantry/wrapping-room/toy-workshop/reindeer-stables elves | Done | #13 |
| Custom AI-generated PNGs for the rest of the game art (traps, bases, baits, charms, materials, trap types, brand, locations, map, how-to, remaining elves) — progress tracked in [ART_PROGRESS.md](ART_PROGRESS.md) | In progress | #14 |
| New phone-first UI (layout D2): bottom menu, hunt log with events and full history, Arsenal, Elf Emporium, Santa's Workshop, More pages, open sign-up with admin switch | Done | #11 |
| Holly power type renamed Starlight; its three traps reworked (Starlit Stocking, Star Lantern, Constellation Wreath) with new text and SVG art, old saves migrated | In review | #17 |
| Intro letter from Santa: the game's backstory as the first hunt-log entry of every new game, and on How to play | In review | #12 |
| Location objectives: a simple Cookie Pantry start, then a unique loop per location (Wrapping Room bait ladder, Toy Workshop order board, Stables sleigh run), plus first-visit intros, a hint button and a mechanic panel on each Hunt screen; see [Location objectives](#location-objectives) | Done | #16 (plan), #18 (build); panel icons, sleigh marker and last-change line in #23 |
| Pillage on escape: escaped elves may take gold, points and bait (bosses most, mini bosses less, others rarely), with safety rails; see [Pillage on escape](#pillage-on-escape) | Done | #18 |
| Hexed elves: new backstory (Scrinch hexed Santa's elves), 6 renamed elves, General Grimbolt and the new Stables boss Cinderhoof, home power types per location, simple SVG elf portraits, old saves migrated; see [Theme and setting](#theme-and-setting) and [Power types by location](#power-types-by-location) | In review | this PR |
| Welcome popup: shown once when a new game starts (sign-up and Start over); see [Theme and setting](#theme-and-setting) | Done | #19 (plan), #23 (build), #24 (shows again after Start over) |
| Achievements and badges: 55 achievements with Bronze, Silver, Gold and Secret badges, an earn popup and an Achievements tab in My profile; see [Achievements and badges](#achievements-and-badges) | Done | #19 (plan), #23 (build), #24 (design pass) |
| Hunt screen gear card in a 2x2 grid (Trap and Bait over Base and Charm) and 3D medal icons for power types and the gold coin; see [User interface](#user-interface) | Done | #19 (plan), #23 (build) |
| Frozen top header on every main screen, auto-scroll to the Hunt log when Hunt is pressed, and the New Catch popup for the first catch of each elf (with Quiet toast); achievements show as a non-blocking banner instead of a popup; see [User interface](#user-interface) | Done | #26 |
| Admin speed-run tools for testing: on the Admin page, boost rewards (x1 to x200), always attract and catch with full loot, add gold, jump to a rank, unlock every location, stock up supplies; see [Admin speed-run tools](#admin-speed-run-tools) | Done | this PR |
| 5. Tune from play-test | Planned | |

The server runs every hunt and saves each player in SQLite. To play locally, follow "Run it locally" below.

## Summary

**The Naughty List** is an original Christmas trap-and-catch browser game for eddy and friends. Scrinch, a horned devil, has taken over Santa's secret lair at the North Pole and hexed Santa's own elves, who now raid it for him. Santa hires you as an elf hunter. You arm a trap, pick a bait, press Hunt, and the game rolls attraction and catch odds against the hexed elf's power. There is no wait timer: every press is a hunt. Bait cost, not a clock, paces progress.

v1 covers 5 ranks and 4 lair locations: 23 hexed elves and bosses in all (Baron Crumblewick and Grizzlewick are parked). The Cookie Pantry is a simple start with common, uncommon and rare elves. Each later location has 3 common elves, a rare elf, a mini boss and a local boss, and its own local objective that decides when the mini boss and boss come (see [Location objectives](#location-objectives)). Bosses drop the loot used to craft stronger gear. Expect roughly 1,500 hunts, or about 1 to 1.5 hours of active play, to reach the last v1 rank.

The stack is one small Docker container (Node.js + SQLite) on the UGREEN NAS, with open sign-up (the admin can close it) and a leaderboard so friends can play. The stamina meter is built but switched off.

**Decided by eddy (25 Nov 2026):** Christmas theme and the name The Naughty List; stamina off but kept as a toggle; for eddy and friends; repository cheesezilla/naughty-list; this plan lives in the repo and is updated with each PR.

## Theme and setting

**Hexed elves (eddy, 26 Nov 2026).** Scrinch, a horned devil who wants Christmas cancelled, crept into Santa's secret lair under the North Pole on the longest night and blew brimstone soot through the vents. Every elf who breathed it turned **hexed**: sour, sneaky and loyal to Scrinch. They wreck the workshops and steal the cookies, paper, toy parts and reindeer gear Santa needs. Santa, Mrs. Claus and the few elves the soot missed (the loyal elves who run Santa's Workshop and the Elf Emporium) escaped to the old ice cellar, and Santa hires you as an elf hunter. Every hexed elf you catch goes on The Naughty List, and Mrs. Claus's cocoa slowly brings them back to their old selves, so catching is also rescuing. This replaced the first story, where Scrinch sent his own imps.

You start in the Cookie Pantry and work deeper into the lair as you rank up. Each room's elves did that room's job before the hex (bakers, wrappers, toymakers, stable hands), and each location has 3 common kinds, a rare one, a mini boss and a local boss who is one of Scrinch's lieutenants. Some bosses are dark takes on familiar Christmas figures, always in our own design: the Gingerbread Rascal (a gingerbread man the hex brought to life; a public-domain folk character), General Grimbolt (a hexed nutcracker soldier; from a public-domain story) and **Cinderhoof**, an original soot-black reindeer with ember antlers that Scrinch hexed to pull his sleigh. Cinderhoof replaces the idea of an evil Rudolph, which is a trademarked and copyrighted character, to keep the game original. Bosses drop the parts the loyal elves use to craft you stronger traps.

**Names in code.** Game data still calls them imps: the `imps` list in `content/locations.json`, the `Imp` type, the `imps` art slot and `imp` in hunt-log entries. Only player-facing text says elves. Six ids changed with their names (`crumb_imp` → `crumb_elf`, `chimney_soot_imp` → `sootcap`, `gingerbread_imp` → `gingerbread_rascal`, `glitter_imp` → `glitterbug`, `windup_imp` → `windup_elf`, `foreman_grimbolt` → `general_grimbolt`) and the Stables boss became `cinderhoof`; Grizzlewick the Horned is parked in `content/parked/grizzlewick.json` for Scrinch's own lair after v1. Saves, badges and hunt-log entries with the old ids are rewritten when the server starts (`RENAMED_ITEMS` in `src/server/db.ts`), so old catches of Grizzlewick count as Cinderhoof.

The tone is a cheeky Christmas storybook. Every elf, place, trap, bait, rank and material name is invented for this game. Art is original vector art in one storybook style, generated by `scripts/art/` and named by game id so any picture can be regenerated or swapped; see [Art](#art).

**Intro letter.** Every new game opens with "A letter from Santa" as the first entry in the hunt log: the lair, Scrinch and his elves, and the player's job as Santa's elf hunter. It is logged when an account is created and again after Start over, shows folded after the first paragraph with "Read the whole letter", and is also at the top of How to play, so players from before it was added can read it there. The text lives in `content/story.json` (title, up to 8 paragraphs of up to 500 characters, sign-off) and can be edited without code changes.

**Welcome popup (eddy 26 Nov 2026, built in #23).** A one-time popup greets the player when a new game starts: right after creating an account, and again after Start over. It sits over the Hunt screen with the key art on top, the game icon, and:

**New Catch popup (built in #26, eddy 26 Nov 2026).** The first time a player catches a particular elf, a popup appears over the Hunt screen right after the hunt, so a first catch feels like an event instead of a line in the log. It shows:

- a header ribbon "NEW ELF ON YOUR NAUGHTY LIST" in the tier's colour (common green, uncommon teal, rare purple, mini boss orange, boss gold);
- the portrait in a tier-coloured frame, with a "Portrait unlocked" pill (the "?" card turns into the real portrait here);
- the name, a tier pill and the location, then the tagline from `content/flavour.json`;
- three small tiles: power, the power type it is weak to (as a medal icon, or "No weakness" if it has none), and the points it gave;
- progress on the Naughty List: this location (for example 4 of 5) with a bar, and all locations (9 of 23).

Buttons: **Open file** closes the popup and opens the elf's file; **Keep hunting** closes it. Esc, Enter and Space also close it, and the first Space press never hunts behind it. The hunt log still gets its usual "Portrait unlocked" mark on that catch. If the same catch also earns achievements, the New Catch popup comes first and the achievement banners drop in over it without blocking it. There is no new save field: "first catch" is already known from the elf's catch count going from 0 to 1 in that hunt. The setting **New catch popups** (On by default; it replaced Achievement popups) turns this into a small toast when Off, with the portrait thumbnail and name. Mockup: the UI canvas, row "Achievements and badges", artboard "New Catch popup".

> **Welcome to The Naughty List!**
> Scrinch's elves are raiding Santa's secret lair, and Santa needs a hunter. Set your trap, catch every elf you can, and put them all on the Naughty List!

Buttons: **Start hunting** closes it; **Read Santa's letter** closes it and opens the intro letter in the hunt log. Space, Enter and Esc also close it, and the first Space press never hunts behind it. The save gets `welcomeSeen: true` once it is closed, so it shows once per game; Start over clears the flag. Old saves load with the flag set, so existing players don't see it. The text is a `welcome` block in `content/story.json` (`title` up to 40 characters, `text` up to 200, `button` up to 20) and is checked by `npm run check-content`. Mockup: the UI canvas, row "Achievements and badges", artboard "Welcome popup".

**Beyond v1:** Scrinch himself is the final boss of a later location. His loot crafts **The Naughty List**, a giant enchanted scroll trap and one of the strongest pieces of gear in the game.

## Core loop

The player spends gold on bait and gear, hunts to earn gold, points and materials, and uses points to rank up and unlock the next location.

**Trap setup** (four slots, changeable any time):

| Slot | What it gives | Consumed? |
| --- | --- | --- |
| Trap | Power, power type, luck, attraction bonus | No |
| Base | Power, luck, attraction bonus | No |
| Bait | Attraction rate, changes which elves show up | 1 per attracted hunt |
| Charm (optional) | A bonus such as +luck or +power % | 1 per attracted hunt |

**One hunt, step by step:**

1. **Attraction roll.** If nothing is attracted, no bait is used and the journal says nothing took the bait.
2. **Elf pick.** An elf is drawn from the location's table, weighted by the bait in use.
3. **Catch roll.** Trap power and luck are compared with the elf's power.
4. **Catch:** gold, points and a chance at loot. **Escape:** nothing gained. Bait is used either way.

```mermaid
flowchart LR
  H[Press Hunt] --> A{Attracted?}
  A -- no --> Q[Nothing shows up<br/>no bait used]
  A -- yes --> P[Pick elf by bait] --> C{Caught?}
  C -- yes --> W[Catch: gold, points, loot<br/>bait used]
  C -- no --> E[Elf escapes<br/>bait used, nothing gained]
```

Each hunt is written to the hunt log, the main feedback screen, together with the player's buys, sales, crafts, gear changes and travel. See [User interface](#user-interface).

## Formulas

All constants live in `content/constants.json` and the other content files, so they can be tuned without code changes. Code: `src/engine/odds.ts` and `src/engine/hunt.ts`.

- **Power** = (trap + base + charm power) x (1 + charm power bonus). **Luck** = trap + base + charm luck.
- **Attraction** = min(95%, bait attraction x (1 + trap, base and charm attraction bonuses)). In the Reindeer Stables it is halved unless the bait is Hot Cocoa.
- **Elf pick**: chance of elf i = its weight / sum of weights for that bait. A location's 3 commons share about 91%, the rare elf 5%, the mini boss 3% and the boss 1%. Fruitcake doubles the rare, mini boss and boss weights.
- **Effectiveness** E of the trap's power type against an elf: 0 (immune), 0.5 (resists), 1 (normal) or 1.5 (weak). Types: Clockwork (toy machines), Starlight (Christmas-star magic, strong against shadowy elves; called Holly before PR #17), Frost (ice magic). From the Wrapping Room on, each location has a home type and a rival type; see [Power types by location](#power-types-by-location).
- **Catch chance** = clamp((P x E + L^2) / (P x E + M), 0, 98%), where M is the elf's power. Luck only counts when E > 0.
  - Example: a 150 power Clockwork trap on a 20 power base with luck 2, against a normal 90 power elf: (170 + 4) / (170 + 90) = 67%.
- **Rewards**: a catch pays the elf's gold and points and rolls its loot list; bosses always drop their crafting part. An escape pays nothing and may pillage gold, bait and points (bosses most); see [Pillage on escape](#pillage-on-escape).
- **RNG**: the engine takes a random source, so the simulator and tests replay exactly from a seed. The server rolls every hunt with a cryptographic random source, so results can't be edited in the browser.

## Pacing without a cooldown

Bait is the clock. With no timer, progress is limited by gold: every attracted hunt burns bait, and a hunt only turns a profit when your trap suits the location.

- **Bait is a real cost.** Each location's best bait costs roughly 40 to 70% of the average gold per attracted hunt with suitable gear. Weak or wrong-type gear in a deeper location loses gold.
- **Steep rank thresholds.** Points needed grow about 4x each rank, while points per catch grow about 2x per location.
- **Bosses drive gear goals.** Mini bosses and bosses drop the parts for the next crafted item.
- **No dead ends.** With no bait and under 50 gold, Mrs. Claus hands over 10 free Stale Cookies.
- **Fair play limits.** The server accepts at most 2 hunts a second per player; the page paces rapid clicks to match.

**Optional stamina meter (built, switched off).** `constants.json` > `stamina.enabled`. When on, a Cocoa meter costs 1 per hunt, holds 100 and refills 1 per minute.

**Left out of v1:** diminishing returns per location (a hidden timer), auto-hunt and idle rewards.

## Progression

| Rank | Name | Points needed | Unlocks | Target hunts in rank |
| --- | --- | --- | --- | --- |
| 1 | Snow Scout | 0 | Cookie Pantry, starter gear | 150 |
| 2 | Elf Deputy | 2,500 | Wrapping Room (250 gold to unlock) | 250 |
| 3 | Hex Tracker | 12,000 | Toy Workshop (1,500 gold), Nutcracker Jaws trap | 400 |
| 4 | Frost Warden | 46,000 | Reindeer Stables (5,000 gold), rank 4 crafting | 600 |
| 5 | Yule Marshal | 160,000 | End of v1 | |

Ranks depend on points only. Location unlock fees are paid once; travel between unlocked locations is free.

## v1 content

The numbers below mirror `content/*.json`. Types: C = Clockwork, S = Starlight, F = Frost; unlisted types are normal (x1).

**Elves**

| Location | Elf | Tier | Power | Gold | Points | Weak (x1.5) | Resists (x0.5) / immune (x0) | Drops |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cookie Pantry | Crumb Elf | Common | 40 | 12 | 20 | | | |
| Cookie Pantry | Sprinkle Snatcher | Common | 70 | 18 | 30 | C | | Candied Peel 10% |
| Cookie Pantry | Sootcap | Uncommon | 100 | 25 | 45 | S | | |
| Cookie Pantry | Jarbelly the Glutton | Uncommon | 180 | 40 | 70 | C | | Cookie Tin 30% |
| Cookie Pantry | Gingerbread Rascal | Rare | 160 | 60 | 100 | F | | Sugar Glass 50%, Brass Spring 15% |
| Wrapping Room | Ribbon Tangler | Common | 150 | 40 | 60 | F | | Sugar Twist 25%, Ribbon Candy 2% |
| Wrapping Room | Tape Biter | Common | 220 | 55 | 85 | S | | Sugar Twist 20%, Ribbon Candy 2% |
| Wrapping Room | Bow Burglar | Common | 280 | 70 | 100 | S | C | Candied Peel 30%, Ribbon Candy 2% |
| Wrapping Room | Glitterbug | Rare | 350 | 110 | 160 | S | C | Sugar Glass 50% |
| Wrapping Room | Spoolwick | Mini boss | 600 | 160 | 300 | S | C | Golden Ribbon 100% |
| Wrapping Room | Madame Shredwell | Boss | 1,100 | 300 | 550 | S | C | Enchanted Wrapping 100%, Jingle Bell Charm x5 25% |
| Toy Workshop | Cog Pincher | Common | 450 | 140 | 150 | C | | |
| Toy Workshop | Paint Smudger | Common | 600 | 180 | 190 | S | | |
| Toy Workshop | Stuffing Ripper | Common | 750 | 220 | 230 | C | F | |
| Toy Workshop | Wind-up Elf | Rare | 900 | 300 | 320 | C | F immune | Sugar Glass 50% |
| Toy Workshop | Hammerhand | Mini boss | 1,600 | 400 | 650 | F | | Toymaker's Gear 100% |
| Toy Workshop | General Grimbolt | Boss | 2,800 | 700 | 1,300 | C | F | Clockwork Heart 100% |
| Reindeer Stables | Hay Hoarder | Common | 1,000 | 300 | 350 | F | | |
| Reindeer Stables | Bell Thief | Common | 1,300 | 380 | 420 | F | S | |
| Reindeer Stables | Harness Snipper | Common | 1,600 | 450 | 480 | C | S | |
| Reindeer Stables | Carrot Crook | Rare | 2,000 | 600 | 650 | F | S | Sugar Glass 50% |
| Reindeer Stables | Antler Ripper | Mini boss | 3,500 | 800 | 1,200 | F | S | Silver Sleighbell 100% |
| Reindeer Stables | Cinderhoof | Boss | 6,000 | 1,500 | 3,000 | F | S immune | Brimstone Coal 100% |

Baron Crumblewick, the old Pantry boss, is parked in `content/parked/baron_crumblewick.json` and Grizzlewick the Horned, the old Stables boss, in `content/parked/grizzlewick.json` (not loaded) for a later location or event. Elf weights and which elves a bait draws are in `content/locations.json`; the Wrapping Room's rare, mini boss and boss come only for ladder baits, and the Toy Workshop and Stables mini bosses and bosses only through their objective (weight 0 otherwise). Jarbelly, Bow Burglar and Bell Thief always pillage one bait when they escape; other elves pillage by tier (see [Pillage on escape](#pillage-on-escape)). Brimstone Coal has no use in v1; it is saved for later recipes, including The Naughty List.

### Power types by location

**Rule (eddy, 26 Nov 2026):** the elves you meet should suit the room, and their weaknesses should make sense from their story, so early players can reason about which trap to bring. Not a hard rule: every location keeps one or two exceptions, so players still read each elf's text, the Toy Workshop order board can fill every slot type, and the Clockwork capstone keeps a job in the Stables.

From the Wrapping Room on, each location has a **home type** most of its elves are weak to (x1.5) and a **rival type** they resist (x0.5). The three types rotate, and each home type arrives with the trap you can buy or craft at that rank.

| Location | Home type (weak) | Rival type (resists) | Why, in the story | Trap that arrives with it | Exceptions |
| --- | --- | --- | --- | --- | --- |
| Cookie Pantry | none, a teaching room | none | Each elf teaches one rule with an obvious tell, using the two types a rank 1 player can own | Starlit Stocking, Jack-in-the-Box | Gingerbread Rascal is weak to Frost (warm from the oven), a reason to come back later |
| Wrapping Room | Starlight | Clockwork | The wrappers spent years making presents shine and can't look away from a star; ribbon and scissors jam springs | Star Lantern (rank 2) | Ribbon Tangler is weak to Frost (its ribbons freeze stiff), so the Icicle Jar has a use |
| Toy Workshop | Clockwork | Frost | The toymakers can't keep their hands off a wind-up; tin, wood and wool don't feel the cold | Nutcracker Jaws (rank 3) | Paint Smudger is weak to Starlight (works in the dark); Hammerhand is weak to Frost (forge-hot) |
| Reindeer Stables | Frost | Starlight | The hex left the stable hands craving warmth, so they bolt from the cold; they squint away the snow glare | Snow Globe Prison (rank 4) | Harness Snipper is weak to Clockwork (its shears snag in springs) |

Each elf's description in `content/flavour.json` names its weakness, and each location's hint sheet in `content/story.json` names the room's home type and exceptions.

**Traps**

| Trap | Type | Power | Luck | Attraction | Rank | Price |
| --- | --- | --- | --- | --- | --- | --- |
| Starlit Stocking | S | 60 | 0 | | 1 | Starter |
| Jack-in-the-Box | C | 150 | 1 | | 1 | 300 gold |
| Star Lantern | S | 300 | 2 | | 2 | 1,200 gold |
| Icicle Jar | F | 500 | 2 | +5% | 2 | 3,000 gold |
| Nutcracker Jaws | C | 900 | 3 | | 3 | 9,000 gold |
| Constellation Wreath | S | 1,400 | 5 | +5% | 3 | Crafted |
| Snow Globe Prison | F | 1,800 | 4 | | 4 | 25,000 gold |
| Sleigh-Bell Snapper | C | 2,600 | 6 | +5% | 4 | Crafted (v1 capstone) |

**Bases**

| Base | Power | Luck | Attraction | Rank | Price |
| --- | --- | --- | --- | --- | --- |
| Cardboard Box | 20 | 0 | | 1 | Starter |
| Gingerbread Slab | 80 | 1 | | 1 | 500 gold |
| Candy Cane Platform | 200 | 1 | +5% | 2 | 2,500 gold |
| Ice Block | 400 | 3 | | 3 | 8,000 gold |
| Yule Log Base | 600 | 5 | +10% | 3 | Crafted |

**Baits**

| Bait | Attraction | Effect | Rank | Price |
| --- | --- | --- | --- | --- |
| Stale Cookie | 70% | Works everywhere | 1 | 8 gold |
| Sugar Cookie | 78% | Draws more Sootcaps in the Pantry | 1 | 20 gold |
| Peppermint Bark | 82% | | 3 | 50 gold |
| Fruitcake | 85% | Doubles uncommon, rare, mini boss and boss odds (cannot skip the Wrapping Room ladder) | 2 | Crafted |
| Hot Cocoa | 88% | Stable elves show up at half rate with any other bait | 4 | 90 gold |
| Ribbon Candy | 82% | Wrapping Room tier 2: draws the Glitterbug and Spoolwick | 2 | Crafted |
| Golden Bow Bonbon | 86% | Wrapping Room tier 3: the only bait Madame Shredwell takes | 2 | Crafted |

**Charms** (one used per attracted hunt)

| Charm | Effect | Rank | Price |
| --- | --- | --- | --- |
| Mistletoe Charm | +4 luck | 1 | 30 gold |
| Jingle Bell Charm | +15% attraction | 2 | 25 gold |
| Wind-up Key Charm | +20% power | 3 | 60 gold |

## Location objectives

**Rules (eddy, 25 and 26 Nov 2026):** the first location, the Cookie Pantry, is a simple start with no special objective. From the second location on, every location has its own local objective, a loop that only exists there, and the tiered bait ladder starts in the second location. **Built in #18.** Code: `src/engine/objectives.ts` (state, weight hook, after-hunt hook, `objectiveAction`), `POST /api/objective`, the `objective` block per location in `content/locations.json`, text in `content/story.json` > `locations`, and the panels in `src/client/screens/objective.tsx`. The numbers below are the built ones, tuned with the simulator. Every loop counts hunts and catches, never minutes, so it works with no wait timer and behaves the same with the stamina meter on or off (stamina only changes how fast a player can press Hunt in real time).

| Location | Rank | Local objective | Boss comes when |
| --- | --- | --- | --- |
| Cookie Pantry | 1 | None: hunt for gold, buy better gear and bait, rank up | No boss here |
| Wrapping Room | 2 | Bait ladder: three bait tiers, each crafted from the last tier's drops | Tier 3 bait is armed |
| Toy Workshop | 3 | Order board: catch with the trap type each order asks for | A Rush order is finished |
| Reindeer Stables | 4 | Sleigh run: 40 hunts to make the sleigh ready | The sleigh launches |

The Tangle Meter, first planned for the Wrapping Room, is kept as a spare loop for a later location.

**What the engine did before #18 (checked on `main`, kept for reference):**

| Piece | Status | Where |
| --- | --- | --- |
| Per-elf loot list with a chance and amount; loot can name any item, including a bait | Built | `imps[].loot`, `src/engine/hunt.ts` |
| Bait changes which elves show up: `baitWeights` overrides an elf's weight for one bait, and a weight of 0 is allowed, so an elf can be locked behind a bait | Built, only used for Sugar Cookie → Sootcap | `imps[].baitWeights`, `impWeights()` in `src/engine/odds.ts` |
| Bait that raises rare, mini boss and boss odds | Built (Fruitcake, x2) | `baits[].rareMultiplier` |
| Location that prefers one bait | Built (Reindeer Stables halves attraction without Hot Cocoa) | `preferredBait`, `otherBaitPenalty` |
| Crafting a bait from drops | Built, one recipe (Fruitcake from Candied Peel and Cookie Tin) | `content/recipes.json` |
| A chain of bait tiers where each tier's elves drop the next tier's ingredients and only the top tier draws the boss | Not built | |
| Any per-player, per-location progress (meters, orders, countdowns) | Not built: the save has no place for it | `src/engine/player.ts` |
| A location panel on the Hunt screen showing that progress | Not built | |

So the bait ladder is mostly content (new materials, baits, recipes and `baitWeights`); the order board and sleigh run need a small objective system in the engine.

**Shared engine design (built).** Each location in `content/locations.json` gets an optional `objective` block with a `type` (`bait_ladder`, `order_board`, `sleigh_run`, and later `tangle_meter`) and its numbers. The save gets `objectives: { [locationId]: state }`, created lazily on the first hunt or action there, so old saves load unchanged. The hunt runs two hooks: `objectiveWeights()` adjusts elf weights before the elf is picked (a forced next elf, and elves that only come at certain moments), and `afterHunt()` updates the state after a quiet hunt, catch or escape and pays rewards. Objective changes go into the hunt's journal entry (for example "Readiness 58 → 62"), and the Hunt screen shows a small panel for the current location under the banner. Gear swaps stay free, as now. The simulator gets a strategy per objective so balance can be checked.

### Cookie Pantry: a simple start (no local objective)

The first location teaches the basic loop and nothing else: catch elves, earn gold, buy a better trap, base and bait in the Elf Emporium, rank up and unlock the Wrapping Room. It has common, uncommon and rare elves and no mini boss or boss.

| Elf | Tier | Power | Weight (Stale Cookie) | Weight (Sugar Cookie) | Drops |
| --- | --- | --- | --- | --- | --- |
| `crumb_elf` | Common | 40 | 40 | 40 | |
| `sprinkle_snatcher` | Common | 70 | 30 | 30 | Candied Peel 10% (as now) |
| `sootcap` | Uncommon (was common) | 100 | 15 | 22 | |
| `jarbelly` | Uncommon (was mini boss) | 180 (was 300) | 10 | 10 | Cookie Tin 30% (was 100%); gold 40 and points 70; always pillages a bait on escape |
| `gingerbread_rascal` | Rare | 160 | 5 | 8 | Sugar Glass 50% (as now), Brass Spring 15% (new) |

- **New tier, uncommon.** The engine, the content schema, the hunt log and the Naughty List gain an `uncommon` tier between common and rare, with its own portrait frame. Fruitcake doubles every tier above common.
- **Baron Crumblewick leaves the Pantry** and is parked for a later location or event; his art and text stay. His Brass Spring now comes from the Gingerbread Rascal, so Constellation Wreath can still be crafted.
- **Sugar Cookie** is the "better bait" step: more uncommon and rare elves for 20 gold instead of 8.
- No panel on the Hunt screen. The hint and first-visit intro still apply.
- Rank 1 took a median 166 hunts in the simulator (target 150, within 25%).

### Wrapping Room: the Bait Ladder (bait tiers)

eddy's loop, starting in the second location: common bait catches common elves, who drop tier 2 ingredients; tier 2 bait draws new elves, who drop tier 3 ingredients; tier 3 bait draws the boss, who drops trap parts and a little general help. It reuses the Wrapping Room's existing drops where it can.

| Tier | Bait (how you get it) | Elves it draws (weight) | What they drop toward the next tier |
| --- | --- | --- | --- |
| 1 | Any shop bait (Stale Cookie, Sugar Cookie, later Peppermint Bark) | `ribbon_tangler` 36, `tape_biter` 30, `bow_burglar` 25. `glitterbug`, `spoolwick` and `madame_shredwell` 0 | `ribbon_tangler`: Sugar Twist 25%. `tape_biter`: Sugar Twist 20%. `bow_burglar`: Candied Peel 30% (was 10%). Any common: 2% for 1 Ribbon Candy outright |
| 2 | **Ribbon Candy** (new bait, 82% attraction, not sold). Recipe: 2 Sugar Twist + 1 Candied Peel + 30 gold → 3 Ribbon Candy | commons 50 in total, `glitterbug` 30, `spoolwick` 20, `madame_shredwell` 0 | `glitterbug`: Sugar Glass 50% (as now). `spoolwick`: Golden Ribbon 100% (as now) |
| 3 | **Golden Bow Bonbon** (new bait, 86% attraction, not sold). Recipe: 1 Sugar Glass + 1 Golden Ribbon + 100 gold → 2 Bonbons | commons 30, `glitterbug` 10, `spoolwick` 10, `madame_shredwell` 50 | `madame_shredwell`: Enchanted Wrapping 100% (trap part for Constellation Wreath, as now) and 25% for 5 Jingle Bell Charms |

- New ids: material `sugar_twist`; baits `ribbon_candy`, `golden_bow_bonbon`; recipes `ribbon_candy_x3`, `golden_bow_bonbon_x2`.
- Fruitcake uses the tier 1 weights here, so it can't skip the ladder (2 x 0 is still 0).
- Candied Peel and Golden Ribbon are also used by Fruitcake and the Yule Log Base, so players choose between bait and gear.
- Simulator: a simulated player catches Spoolwick 1.8 times and Madame Shredwell 0.3 times on average before moving on; most players rank up before reaching the top of the ladder.
- Panel: three bait tiers with what you own of each, and the next recipe's have / need.

### Toy Workshop: the Order Board (trap-type puzzle)

The elves pin toy orders to a board. Each order lists parts that must be caught with a given trap type, in order. It makes the player own and swap traps of all three types, which is the known gap from the simulator (nobody bought Snow Globe Prison or Constellation Wreath).

- **Order:** 3 slots, each a trap type (Clockwork, Starlight or Frost), rolled by the server when the last order finishes. A catch with the trap type of the next slot fills it. Catches with another type don't count; escapes don't undo filled slots.
- The puzzle is matching type to elf: most Workshop elves are weak to Clockwork and resist Frost (the Wind-up Elf is immune), so Clockwork slots are easy, Starlight slots go best on Paint Smudgers, and Frost slots on Cog Pinchers or Paint Smudgers. Owning a trap of each type is part of the job here.
- **Order done:** a Toy Crate: 400 gold and one of Peppermint Bark x5, Wind-up Key Charm x3 or Sugar Glass x1.
- **Inspection:** every 3rd finished order, the next attracted hunt is Hammerhand (mini boss; weight 0 otherwise). He drops Toymaker's Gear as now.
- **Rush order:** after an Inspection, the player can take a 5-slot Rush order instead of a normal one. Finishing it makes the next attracted hunt General Grimbolt (boss; weight 0 otherwise), who drops Clockwork Heart as now.
- Panel: the order slots as type badges, filled or empty, and orders until the next Inspection.
- Simulator: about 35 orders per player, 3.9 Hammerhand and 2.2 General Grimbolt catches. The simulated player buys the cheapest trap of any type it lacks before hunting here.

### Reindeer Stables: the Sleigh Run (countdown in hunts)

Get the sleigh ready before the countdown runs out, while thieves undo your work. The countdown is a number of hunts, not a clock.

- **Start a run** from the panel (free). The run lasts 40 hunts; every hunt counts, including quiet ones, so Hot Cocoa's better attraction matters more here.
- **Readiness** 0 to 100: a common catch adds 5, the rare adds 12, Antler Ripper adds 20 (first pass was 4 and 10; tuned in the simulator). A Bell Thief escape takes 8 (it runs off with the bells); a Harness Snipper escape takes 5.
- Antler Ripper's weight is 0 below 50 Readiness and 6 from 50 up.
- **Launch:** reaching 100 before the countdown ends launches the sleigh: 2,000 gold and 1 Silver Sleighbell, and Cinderhoof ambushes it, so the next attracted hunt is Cinderhoof (weight 0 otherwise). It drops Brimstone Coal as now.
- **Run fails** when the countdown ends below 100: the player gets Readiness x 10 gold and can start another run straight away.
- Outside a run the Stables hunt as now, without the mini boss and boss.
- Panel: Readiness bar, hunts left, and a Start run button when no run is active.
- Simulator: about 13 runs per player, 3.7 of them launched; 2.4 Antler Ripper and 1.4 Cinderhoof catches.

### Spare loop for a later location: the Tangle Meter (push your luck)

Parked on 26 Nov 2026, when the Cookie Pantry became a simple start and the bait ladder moved to the Wrapping Room. It is still written with the Wrapping Room's elves, as a ready design to re-skin for a later location and its own elves and boss.

The room gets messier the longer you hunt, and a messy room pays better but is harder. The player chooses when to tidy up.

- **Tangle** runs 0 to 100 and starts at 0. Each attracted hunt adds 5; an escape adds 5 more; catching a Ribbon Tangler adds 10.
- **Tidying:** catching a Tape Biter cuts 15 (it chews through the knots; it is weak to Starlight). New charm **Sharp Shears** (`sharp_shears_charm`, shop, 35 gold, rank 2) cuts 25 on each attracted hunt it is used. Catching Madame Shredwell resets Tangle to 0.

| Band | Tangle | Elf power | Gold and points | Rare and mini boss weight | Madame Shredwell |
| --- | --- | --- | --- | --- | --- |
| Tidy | 0–39 | x1 | x1 | x1 | weight 0 |
| Messy | 40–79 | x1.15 | x1.25 | x2 | weight 0 |
| Knotted | 80–100 | x1.3 | x1.5 | x2 | weight 6 |

- The choice: stay tidy for safe catches, or let it knot up for richer hunts and a chance at the boss, then cut back down with Starlight or Shears.
- Spoolwick (mini boss) drops Golden Ribbon as now; Madame Shredwell drops Enchanted Wrapping as now.
- Panel: Tangle bar with the band name and what the band does.

### Location screens (UI plan)

eddy (25 Nov 2026): each location's Hunt screen should feel different. Three additions, all in the phone-first layout D2. **Status: built in #18.** An audit against this plan and the canvas in #23 added what was missing: each panel's icon in its title (Ribbon Candy, Toymaker's Gear, Silver Sleighbell), the small sleigh moving along the Readiness bar, and the "Last: Bell Thief escaped −8" line under it.

**1. First-visit intro in the hunt log.** The first time a player arrives in a location, the hunt log gets an "Arrived: <location>" entry with a short intro to the area: what the room is, which elves raid it and what's different here. It shows folded after the first sentence, like Santa's letter. The Cookie Pantry intro is logged right after Santa's letter when a game starts (sign-up and Start over); the others are logged the first time the player travels there. It is a new journal event, `arrival`, logged when a location is first unlocked by travel, so old saves get intros only for new places. Changes from the panel (start a sleigh run, take a Rush order) are logged as an `objective` event. The Full history "Events" filter includes it.

**2. Hint button.** A round "?" button next to Travel, opens a bottom sheet "How to clear <location>" with 2 to 5 short steps, the location's intro again (for players who skipped it) and a Close button. The hint never shows exact odds.

**3. Mechanic panel.** From the second location on, a card between the gear stats and the hunt log, styled per location (its own colour and icon), showing the local objective's state. Its "How does this work?" link opens the same sheet as the hint button. It updates after every hunt, and a hunt that changes the objective gets a one-line note in its log entry (for example "Readiness 58 → 62").

Text lives in a new `locations` block in `content/story.json`, keyed by location id: `intro` (up to 400 characters) and `hint` (up to 5 steps of up to 120 characters). `npm run check-content` fails if a location has no intro or hint, or names an unknown location. Texts as first drafted (the built text is in `story.json`):

| Location | Intro (first visit) | Hint steps |
| --- | --- | --- |
| Cookie Pantry | Santa's pantry: jars to the ceiling and crumbs on every shelf. The hexed baker elves raid it all night. Catch them, earn your pay, and kit yourself out before heading deeper into the lair. | 1. Hunt here to earn gold and points. 2. Each elf's description hints at the trap type it is weak to. Sootcap hides in shadow; Jarbelly can't resist a box. 3. Buy a better trap and base in the Elf Emporium as soon as you can afford them. 4. Sugar Cookies draw more uncommon and rare elves. 5. Reach Elf Deputy to unlock the Wrapping Room. |
| Wrapping Room | Miles of ribbon and paper. The hexed wrappers still can't resist anything that shines, so Starlight traps work best here. The commons grab anything, but Glitterbug and Spoolwick only come for proper sweets, and Madame Shredwell only for the finest. Bake your way up. | 1. Most elves here are weak to Starlight and dodge Clockwork. Ribbon Tanglers freeze stiff in Frost. 2. Catch commons with shop bait to collect Sugar Twists and Candied Peel. 3. Make Ribbon Candy in Santa's Workshop. 4. Ribbon Candy draws Glitterbug and Spoolwick. Their drops make Golden Bow Bonbons. 5. Bonbons are the only bait Madame Shredwell will take. |
| Toy Workshop | The hexed toymakers can't keep their hands off a wind-up, so Clockwork traps work best here. The loyal elves pin toy orders to the board, and each part must be caught with the right kind of trap. Finish enough orders and the bosses come to inspect. | 1. Most elves here are weak to Clockwork and shrug off Frost. Paint Smudgers fear Starlight; Hammerhand is forge-hot. 2. Check the order board: each slot needs a catch with that trap type, in order. 3. Swap traps to match, and pick elves that aren't immune to that type. 4. Every 3rd order brings Hammerhand. Then take a Rush order to bring General Grimbolt. |
| Reindeer Stables | The sleigh must be ready by Christmas Eve, and the hexed stable hands keep pinching the bells and snipping the harness. They crave warmth and bolt from the cold, so Frost traps work best here. Load the sleigh in time and Cinderhoof will try to stop the launch. | 1. Most elves here are weak to Frost and squint away Starlight. Harness Snippers snag in Clockwork. 2. Start a sleigh run: you have 40 hunts, quiet ones included. 3. Catches build Readiness. Escaped Bell Thieves and Harness Snippers take it away. 4. Hot Cocoa keeps elves coming, so fewer hunts are wasted. 5. Reach 100 to launch the sleigh and face Cinderhoof. |

**Hunt screen with the new parts (all locations):**

```
┌──────────────────────────────────┐
│ [banner art]          [?] [Travel]│  ← "?" opens the hint sheet
│ rank · name · points · gold       │
├──────────────────────────────────┤
│   trap on base     [bait] [charm] │
│   Power 230 · Luck 3 · Attr 78%   │
├──────────────────────────────────┤
│ ┌ MECHANIC PANEL (per location) ┐ │  ← tap = hint sheet
│ └────────────────────────────────┘ │
├──────────────────────────────────┤
│ Hunt log …                        │
│  ★ Arrived: Wrapping Room  (more) │  ← first-visit intro entry
├──────────────────────────────────┤
│           [   HUNT   ]            │
└──────────────────────────────────┘
```

**Mechanic panels, one per location:**

Cookie Pantry: no panel. The gear card is followed straight by the hunt log.

Wrapping Room, ribbon red with a candy icon. Three tier steps; the armed tier is highlighted, and the next recipe shows have / need. A "Make" link goes to that recipe in the Workshop.
```
┌ Bait Ladder ───────────────────────┐
│ ① Shop bait ▸ ② Ribbon Candy ▸ ③ Bonbon
│   owned 84       owned 2     owned 0│
│ Next: Golden Bow Bonbon            │
│ Sugar Glass 1/1 ✓ Golden Ribbon 0/1 ✗
│ Madame Shredwell: Bonbons only [Make]
└────────────────────────────────────┘
```

Toy Workshop, workshop green. Order slots as trap-type badges in a row; the next slot glows, filled slots are ticked. Shows the armed trap's type and whether it matches.
```
┌ Order Board ─────── Order 2 of 3 ──┐
│ [⚙ ✓] [🌿 ▸] [❄  ]                 │
│ Next: Starlight · your trap: Clockwork ✗│
│ Inspection after this order        │
└────────────────────────────────────┘
```

Reindeer Stables, frosty blue. Before a run: a "Start sleigh run" button. During a run: a Readiness bar and hunts left, with a small sleigh moving along the bar.
```
┌ Sleigh Run ──────── 23 hunts left ─┐
│ Readiness [■■■■■■■■■■■■░░░░] 62/100 │
│ Antler Ripper is about (50+)       │
│ Last: Bell Thief escaped −8        │
└────────────────────────────────────┘
```

The Cookie Pantry, and any future location without a local objective, shows no panel; the hint and intro are still required.

**Visual mockups** of these screens are on the UI canvas (https://claude.ai/artifact/7A6Y6w37aCDXneVGDSDCDs), in the row "Location screens".

### Build order

All five steps were built in #18.

1. Location intros, hint button and the empty panel slot (shared by all locations).
2. Cookie Pantry simple start: the uncommon tier and the new elf table.
3. Objective system in the engine and save, and the Wrapping Room bait ladder (content plus `baitWeights`).
4. Toy Workshop order board.
5. Reindeer Stables sleigh run.

Each step re-runs `npm run simulate` and updates the balance numbers in this file.

## Pillage on escape

**Rule (eddy, 26 Nov 2026):** an elf that escapes may pillage the player, taking gold, points and/or bait. Bosses pillage more than mini bosses, and regular elves only rarely. Built in #18. Code: `rollPillage()` in `src/engine/hunt.ts`; numbers in `content/constants.json` > `pillage`.

**When it happens.** Only after an escape: an elf was attracted, the bait was used, and the catch roll failed. Quiet hunts and catches never pillage. The server rolls a pillage chance for the elf's tier; on a hit it rolls what is taken. Like everything else it counts hunts, not time, so it works the same with the stamina meter on or off.

| Tier | Chance on escape | What it takes |
| --- | --- | --- |
| Common | 3% | One of: 1 of the armed bait, or gold equal to the elf's gold reward |
| Uncommon | 5% | One of: 1 to 2 of the armed bait, or gold equal to 1.5 x the elf's gold reward (added with the uncommon tier) |
| Rare | 8% | One of: 1 to 2 of the armed bait, or gold equal to 2 x the elf's gold reward |
| Mini boss | 35% | Two of: 5% of your gold (at most 10 x its gold reward), 2 to 3 of the armed bait, 1% of your points (at most 2 x its points reward) |
| Boss | 60% | All three: 8% of your gold (at most 15 x its gold reward), 3 to 5 of the armed bait, 2% of your points (at most 3 x its points reward) |

Example: Madame Shredwell (gold 300, points 550) escapes from a player with 6,000 gold, 20 Golden Bow Bonbons and 9,000 points. If she pillages: −480 gold (8%, under the 4,500 cap), −4 Bonbons, −180 points (2%, under the 1,650 cap).

**Bait thieves.** The old rule "some elves steal one extra bait when they escape" becomes part of pillage: Jarbelly, Bow Burglar and Bell Thief keep a guaranteed 1-bait pillage on every escape (`pillage: { chance: 1, bait: [1, 1] }` on the elf), shown and logged the same way as any other pillage. That rule replaces their tier's roll.

**Safety rails** (so it stings but never dead-ends a player):
- Gold never drops below 100 from a pillage.
- Points never drop below the current rank's threshold, so a pillage can't take a rank away. Rank 1 players lose no points.
- When a rail stops a loss the elf still counts as having pillaged, and the log says what was safe.
- Only the armed bait is taken, never more than is owned. Charms, gear and materials are never taken.
- Mrs. Claus's free Stale Cookies (no bait and under 50 gold) are unchanged and still catch anyone who runs dry.
- With the gold floor at 100, a player can always buy bait again (Stale Cookie is 8 gold).

**Content.** `content/constants.json` > `pillage` has `goldFloor` (100) and one rule per tier: `chance`, `takes` (the kinds it picks from), `kinds` (how many it takes), `goldPct` and `goldCap` (gold = goldPct of the player's gold, at most goldCap x the elf's gold; without goldPct, goldCap x the elf's gold), `bait` ([min, max]), `pointsPct` and `pointsCap`. An elf's own `pillage` field replaces its tier rule; `stealsBait` is gone. The player's `stats.pillaged` counts pillages. The simulator reports pillages and the gold and bait they cost per location (see Economy).

**Hunt log.** An escape that pillages gets a red border, a "Pillaged" pill and the losses on one line:
- Common: "Bow Burglar escaped and pillaged you: −1 Sugar Cookie."
- Boss: "Madame Shredwell escaped and pillaged you: −480 gold, −4 Golden Bow Bonbons, −180 points."
- When a safety rail stops a loss, the line says so: "… −0 points (your rank is safe)."
The Full history gets a **Pillaged** filter. The Hunters catch feed adds boss pillages ("Madame Shredwell escaped and pillaged eddy") next to boss catches, without the amounts.

**On screen.**
- The gold and points in the player bar flash red when a pillage lands, the Hunt button shakes once (not with reduced motion) and the phone buzzes if vibration is on.
- Caught elves' files show a "Pillage risk" line: Rarely, Sometimes, Often or Very often with the chance, or "always steals a bait" for the three thieves.
- How to play has a "Pillage" section with its own diagram (`howto/pillage.svg`, queued for a custom picture).

**Fits with the location objectives.** Pillaged bait counts against the bait ladder (losing crafted Ribbon Candy or Bonbons hurts, which makes a stronger trap worth it before trying for Madame Shredwell). In the Sleigh Run, Bell Thief and Harness Snipper escapes still take Readiness as planned, separately from pillage.

## Achievements and badges

**Rules (eddy, 26 Nov 2026):** players earn achievements, each with its own badge. When one is earned, a popup shows the achievement's name, description and badge. Every achievement is listed on an Achievements screen in the player's profile: earned badges in colour, unearned badges greyed out. **Built in #23** (eddy, 26 Nov 2026: "include the achievements with game logic integrated"). The list lives in `content/achievements.json` and can be edited without code changes.

**Principles.**

- Achievements are for fun and bragging rights. In v1 they give a badge only, no gold or items, so they can't change the balance or the simulator results. A small one-off reward per achievement can be added later as a single field per entry if eddy wants it.
- Every condition counts hunts, catches, gold, ranks or crafted items, never minutes, so it works with no wait timer and the same with the Cocoa (stamina) meter on or off.
- Each badge has a frame by difficulty: **Bronze** (comes with normal play in the first hour or so), **Silver** (takes a full play-through of v1 or a deliberate effort), **Gold** (hard, or past the end of v1). **Secret** achievements show as "?" until earned; their frame is shown once they are.
- The location objectives and pillage on escape were built in #18, so all 55 achievements can be earned as soon as achievements ship. Achievements for any later feature stay hidden until that feature is built, rather than shown greyed.
- Start over wipes achievements with the rest of the save, like everything else.

### Earnable achievements

Ids are proposed. Badge concepts are briefs for the badge art (emblem only; the client draws the frame).

**First steps**

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `first_catch` | Caught One! | Catch your first elf | Bronze | A jingle-bell net with one small pointed elf hat poking out |
| `first_escape` | Slippery Little Thing | An elf escapes your trap for the first time | Bronze | Tiny pointed-boot footprints running off the edge of the badge through snow |
| `first_purchase` | Elf Emporium Regular | Buy your first item in the Elf Emporium | Bronze | A red-and-white striped shopping bag with an elf hat on top |
| `first_upgrade` | New Trap Smell | Equip a trap other than the starter Starlit Stocking | Bronze | A trap with a gift tag and a little sparkle |
| `first_craft` | Workshop Apprentice | Craft your first item in Santa's Workshop | Bronze | A small mallet resting on a half-wrapped present |
| `first_travel` | Deeper into the Lair | Unlock and travel to a second location | Bronze | A lantern-lit arched door in an ice wall, slightly open |

**Hunting**

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `hunts_100` | Warming Up | Hunt 100 times | Bronze | A mitten with "100" stitched on it |
| `hunts_500` | Night Shift | Hunt 500 times | Silver | A crescent moon over a frosted workshop window |
| `hunts_1500` | Tireless Hunter | Hunt 1,500 times | Silver | A steaming cocoa mug with a tally of marks on the side |
| `hunts_5000` | Never Sleeps | Hunt 5,000 times | Gold | An alarm clock buried in snow, ringing, with a nightcap hung on it |
| `catches_50` | Pocketful of Elves | Catch 50 elves | Bronze | A coat pocket bulging, three pointed elf hats sticking out |
| `catches_250` | Sackful of Elves | Catch 250 elves | Silver | A drawstring sack wriggling with hexed elves |
| `catches_1000` | Sleighload of Elves | Catch 1,000 elves | Gold | A small sleigh piled high with a tied-down, wriggling sack |
| `streak_10` | On a Roll | Catch 10 elves in a row (quiet hunts don't break the run, escapes do) | Silver | A snowball rolling downhill, growing, with "10" on it |
| `streak_25` | Unstoppable | Catch 25 elves in a row | Gold | A huge snowball flattening a fence, "25" on it |
| `gold_1000` | Pocket Money | Earn 1,000 gold from catches | Bronze | Three gold coins with holly on them |
| `gold_25000` | Stocking Stuffed | Earn 25,000 gold from catches | Silver | A stocking overflowing with gold coins |
| `gold_250000` | Santa's Treasurer | Earn 250,000 gold from catches | Gold | A brass-bound treasure chest with a candy-cane lock |

**Ranks**

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `rank_2` | Deputised | Reach Elf Deputy (rank 2) | Bronze | The rank 2 badge art on a red ribbon |
| `rank_3` | On the Trail | Reach Hex Tracker (rank 3) | Bronze | The rank 3 badge art on a green ribbon |
| `rank_4` | Keeper of the Cold | Reach Frost Warden (rank 4) | Silver | The rank 4 badge art on an icy blue ribbon |
| `rank_5` | Marshal of Yule | Reach Yule Marshal (rank 5, end of v1) | Gold | The rank 5 badge art on a gold ribbon with a star |

**Naughty List (collection)**

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `first_uncommon` | A Bit Unusual | Catch your first uncommon elf | Bronze | A magnifying glass over a single odd-coloured footprint |
| `first_rare` | Rare Find | Catch your first rare elf | Bronze | A glass bauble with a tiny hexed elf trapped inside |
| `all_rares` | Rare Collector | Catch every rare elf in v1 | Silver | A shelf of four baubles, each with a hexed elf inside |
| `list_cookie_pantry` | Pantry Swept Clean | Catch every Cookie Pantry elf at least once | Bronze | A cookie jar with a lid and a tick mark |
| `list_wrapping_room` | All Wrapped Up | Catch every Wrapping Room elf at least once | Silver | A tied ribbon bow with a tick mark in the knot |
| `list_toy_workshop` | Every Last Cog | Catch every Toy Workshop elf at least once | Silver | A brass cog with a tick mark cut out of its centre |
| `list_reindeer_stables` | Stable Hand | Catch every Reindeer Stables elf at least once | Silver | A horseshoe hung over a stable door, with a tick |
| `list_all` | Checked Every Name | Catch every elf in v1 at least once (a full Naughty List) | Gold | A long scroll unrolled, every line ticked, a wax seal at the bottom |

**Bosses**

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `first_miniboss` | Big Trouble | Catch your first mini boss | Bronze | A cracked cage with one big pointed boot showing |
| `first_boss` | Boss Hunter | Catch your first local boss | Silver | A small crown with horns, lying in a trap |
| `boss_madame_shredwell` | Unwrapped | Catch Madame Shredwell | Silver | A pair of shears snapped in half over torn wrapping paper |
| `boss_general_grimbolt` | At Ease | Catch General Grimbolt | Silver | A nutcracker soldier's shako hat knocked off, with a dent in it |
| `boss_cinderhoof` | Grounded | Catch Cinderhoof | Gold | An ember antler doused in a puff of frost, tied with sleigh-bell harness |
| `bosses_10` | Bigger They Come | Catch 10 mini bosses or bosses in total | Gold | A stack of three tiny horned crowns |

**Power types and gear**

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `type_clockwork_25` | Tick-Tock Trapper | Catch 25 elves with a Clockwork trap | Bronze | A brass gear with a key in its side |
| `type_starlight_25` | Wish Upon a Trap | Catch 25 elves with a Starlight trap | Bronze | A five-pointed star with a soft glow and a tiny net |
| `type_frost_25` | Cold Snap | Catch 25 elves with a Frost trap | Bronze | A snowflake with an icicle hanging from each point |
| `type_all_owned` | Three of a Kind | Own a trap of every power type at once | Silver | The three power-type symbols in a triangle |
| `weakness_100` | Know Thy Elf | Catch 100 elves with a trap type they are weak to | Silver | An open field guide with a pointing finger on one entry |
| `craft_capstone` | Ring the Bells | Craft the Sleigh-Bell Snapper | Gold | Two crossed sleigh bells with a brass jaw beneath |

**Location objectives** (see [Location objectives](#location-objectives))

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `ladder_tier_2` | Sweet Tooth | Wrapping Room: craft your first Ribbon Candy | Bronze | A twisted ribbon candy on a stick |
| `ladder_tier_3` | Top of the Ladder | Wrapping Room: attract Madame Shredwell with a Golden Bow Bonbon | Silver | A little ladder with a bonbon on the top rung |
| `order_first` | Order Up | Toy Workshop: finish your first order | Bronze | A paper toy order pinned to a cork board, all boxes ticked |
| `orders_10` | Workshop Favourite | Toy Workshop: finish 10 orders | Silver | A full cork board with ten pinned orders |
| `rush_order` | Rush Job | Toy Workshop: finish a Rush order | Gold | A toy order with a red "RUSH" stamp and speed lines |
| `sleigh_launch` | Liftoff! | Reindeer Stables: launch the sleigh | Silver | A sleigh lifting off a snowy runway with a trail of sparkles |
| `sleigh_express` | Express Delivery | Reindeer Stables: launch the sleigh with 10 or more hunts left on the countdown | Gold | A sleigh with motion streaks and a stopwatch |

**Secret** (shown as "?" until earned; the hint on the screen is only "Secret achievement")

| Id | Name | How to earn | Frame | Badge concept |
| --- | --- | --- | --- | --- |
| `secret_butterfingers` | Butterfingers | 5 escapes in a row | Bronze | A slippery bar of soap with a hexed elf riding on it |
| `secret_silent_night` | Silent Night | 4 hunts in a row with nothing attracted | Bronze | A sleeping trap with a nightcap and "zzz" |
| `secret_robbed` | Robbed Blind | Be pillaged by an escaping elf for the first time (see [Pillage on escape](#pillage-on-escape)) | Bronze | An empty sack turned inside out, one coin falling |
| `secret_boss_starter` | Lucky Stocking | Catch a mini boss or boss with the starter Starlit Stocking | Gold | A worn old stocking with a big boot sticking out of it |
| `secret_top_hunter` | Top of the List | Be first on the Hunters leaderboard by points after a hunt | Silver | A podium with a candy-cane "1" |
| `secret_sleigh_fail` | Grounded Again | Reindeer Stables: let the countdown run out on a sleigh run | Bronze | A sleigh nose-down in a snowdrift |

That is 55 achievements: 24 Bronze, 19 Silver and 12 Gold, including 6 secret and 7 for the location objectives. With today's content, a player who reaches rank 5 (a median 1,503 hunts in the latest simulator run) should hold roughly 30 to 35 of them; the rest are for completionists. The simulator will report how many each strategy earns when this is built.

### Earn banner (eddy, 26 Nov 2026: too many popups at the start)

Early in a game the first catch, the New Catch popup and a handful of easy Bronze badges all land in the first few hunts, so achievements no longer open a popup. Each one shows a **banner** instead: it drops in under the pinned header on whatever screen the player is on, never dims or blocks the screen, and leaves by itself after 4 seconds (a thin bar runs down). Hunt, Space and every button keep working while it shows; the first Space press is no longer swallowed. It shows the badge (48 px, in its frame), "ACHIEVEMENT EARNED", the name and the frame, and tapping it opens that badge. Several at once show the first with a "+2 more" pill, then the rest follow one after another. Sound and vibration still play if on. The old full-card popup, described below, now appears only as the one-time **Welcome back** for old saves.

### Earn popup (Welcome back only)

Shown on whatever screen the player is on, as soon as the server says an achievement was earned (after the hunt result, purchase, craft or travel that earned it).

```
┌────────────────────────────────────┐
│       ✦  ACHIEVEMENT EARNED  ✦     │
│                                    │
│           ╭────────────╮           │
│           │   (badge   │  ← 128 px badge in its frame,
│           │    art)    │    pops in with a shine sweep
│           ╰────────────╯           │
│            Caught One!             │  ← name, Lilita One
│      Catch your first elf.         │  ← description
│        Bronze · First steps        │
│                                    │
│   [ View badges ]     [ Nice! ]    │
│              1 of 2  ›             │  ← only when several at once
└────────────────────────────────────┘
```

- A centred card over a dimmed screen, with a short confetti burst in the frame's colour, the achievement sound and a vibration if those settings are on.
- **Nice!** (or tapping outside, Enter, Esc or Space) closes it. **View badges** opens the Achievements screen with that badge's detail open.
- Several achievements at once (for example a first catch that is also a first rare) queue in one card with "1 of 2 ›"; Nice! moves to the next.
- Space bar hunting: the first Space press closes the popup instead of hunting. Banners do not do this.
- Setting: the old **Achievement popups** toggle is now **New catch popups** in Settings (On = popup, Off = small note); achievements have no setting because the banner is already non-blocking.
- Every earned achievement is also a hunt-log event, "🏅 Achievement: Caught One!" with the badge thumbnail, so nothing is lost if the popup is closed fast. Silver, Gold and Secret achievements also go into the Hunters feed ("eddy earned Grounded").

### Achievements screen (player profile)

The More menu's **My stats** becomes **My profile**, with two tabs: **Stats** (today's stats page) and **Achievements**. Tapping your own rank badge or username in the player bar also opens My profile.

```
┌────────────────────────────────────┐
│ ‹ My profile                       │
│   [ Stats ]  [ Achievements ]      │
│  13 of 55 badges  ███░░░░░░░░░ 24% │
│  Bronze 13/24 · Silver 0/19 · Gold 0/12
│ (All)(First steps)(Hunting)(Ranks) │ ← filter chips, scroll sideways
│ (Naughty List)(Bosses)(Gear)(Secret)
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │ 🏅   │ │ 🏅   │ │ grey │         │ ← 3 per row
│ │colour│ │colour│ │ 40%  │         │
│ └──────┘ └──────┘ └──────┘         │
│ Caught   Elf Emp. New Trap         │
│ One!     Regular  Smell            │
│                   0 / 1            │ ← progress under unearned
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │ grey │ │  ?   │ │ grey │         │
│ └──────┘ └──────┘ └──────┘         │
│ Night    Secret   Sackful          │
│ Shift             of Elves          │
│ 312/500           188/250          │
└────────────────────────────────────┘
```

- **Earned** badges are in full colour in their Bronze, Silver or Gold frame, with the name underneath.
- **Unearned** badges are greyed out (greyscale at 40% opacity) with the name and, where the goal is a count, progress such as "312 / 500".
- **Secret** unearned badges show a "?" badge and the text "Secret achievement"; earned ones look like any other earned badge.
- Badges keep the catalogue order above, grouped under small category headings in the All view. A toggle **Earned first** lifts earned badges to the top.
- **Tap a badge** for a bottom sheet: large badge, name, description, frame and category, the earned date and time (in the viewer's time zone) or a progress bar, and "Earned by 2 of 5 hunters".
- Achievements for a feature that isn't built yet are left out until it ships, so the totals only count what can be earned (today that is all 55).
- Later: tapping a hunter on the Hunters page opens their profile with the same Achievements tab (their earned badges in colour, the rest greyed, their secrets still "?").

**Visual mockups** of the Welcome back popup, the banner, the Achievements screen and the badge detail sheet are on the UI canvas (https://claude.ai/artifact/7A6Y6w37aCDXneVGDSDCDs), in the row "Achievements and badges" (popup, quiet toast, Achievements tab, badge detail not earned and earned).

### How it is built (#23)

- **Content:** `content/achievements.json`, one entry per achievement: `id`, `name`, `description`, `category`, `frame` (`bronze`, `silver`, `gold`), `secret`, `badge` (the art brief) and a `when` rule. `npm run check-content` checks ids and names (unique, names at most 30 characters, descriptions at most 100) and that each rule names real elves, items, ranks and locations.
- **Rules** are a small set of types, so new achievements need no code: `stat` (a stat reaches `n`: `hunts`, `caught`, `escapes`, `goldEarned`, `bossesCaught`, `weaknessCatches`, `bought`, `crafted`, `newTrap`, `unlocked`, `pillaged`, `ordersDone`, `rushOrders`, `launches`, `expressLaunches`, `sleighFails`, `ladderBoss`, `starterBoss`, `catches_<type>` and the best `bestCatchStreak`, `bestEscapeStreak`, `bestQuietStreak`), `rank`, `catch` (an elf id or a tier), `collection` (every elf in a location, of a tier, or in the game), `craft` (an item id), `own_all_types` and `leaderboard`. Code: `src/engine/achievements.ts` (`checkAchievements`, `achievementProgress`, `statValue`).
- **Save:** `achievements: { [id]: earnedAtMs }`, `achievementHunts: { [id]: huntNumber }` for badges a hunt earned (the badge sheet says "Earned 4:18 AM on hunt #1") and a `tally` of counters the engine bumps (purchases, crafts, a non-starter trap equipped, catches by trap type, catches against a weakness, streaks, the ladder boss attracted, a boss caught with the starter trap, Rush orders, express launches and failed runs). Hunts, catches, gold, ranks, collections, orders, launches and pillages are read from the save itself, so old saves count them too.
- **Server:** after every hunt and every buy, sell, craft, equip, travel and objective action, the server checks achievements, writes one `achievement` row to the hunt log for whatever was earned, and returns `newAchievements`. The leaderboard rule is checked after hunts: there must be at least one other hunter, and the player must have more points than every one of them.
- **Old saves:** the first `GET /api/me` for a save without achievements awards everything it already qualifies for in one log row marked `backfill`, and the client shows "Welcome back! You've already earned N badges" in the popup.
- **Client:** the earn banner (the full popup only for Welcome back), the hunt-log row, the Hunters feed entry (Silver, Gold and Secret only), and **My profile** with Stats and Achievements tabs and the badge sheet. Code: `src/client/screens/achievements.tsx`, `src/client/lib/medal.tsx`.
- **Badge look (eddy, 26 Nov 2026): a 3D medal**, drawn in CSS: a brushed-metal rim in the frame's metal (a conic gradient in light, mid and dark bronze, silver or gold), a dashed inner ring, a recessed cream face with an inner shadow, the emblem embossed into it (a light and a dark drop shadow), a glossy highlight across the top and a drop shadow under it. Gold medals glow softly, a light sweep runs across the face in the earn popup, and unearned badges are greyscale at 45% opacity. Secret badges are a dark iron medal with an embossed "?". No WebGL, so it stays light on phones. The same medal draws the three **power type icons** (Clockwork: brass rim, gold face, gear; Starlight: blue rim, night-blue face, gold star; Frost: icy rim, pale ice face, snowflake) on the Hunt screen gear card, the trap type chips and the order board, and the **gold coin** (gold rim with a dotted edge, a star over a smile-shaped laurel) in the player bar and Santa's Workshop ingredient rows.
- **Badge emblems:** every badge has its own line emblem, embossed on the medal (#24), following the canvas mockups: a net for Caught One!, footprints for Slippery Little Thing, a shopping bag, a trap, a hammer, a door, a mitten, a moon, a mug, a basket, a sack, coins, a ledger, a shield with one, two or three chevrons for the ranks, gems, a cookie jar, a gift, a horseshoe, a crown, scissors, a wrench, a bell, a trophy, a candy, a ladder, a clipboard, a stopwatch, a sleigh and a podium. Secret badges stay "?" until earned. Painted per-badge art (`art/badges/<id>`) from the badge briefs is still to do, with the Gemini art backlog.
- **Progress text:** the grid shows `312 / 500` (streaks: `Best run 7 / 10`); the badge sheet adds the unit, `312 / 500 hunts`.
- **Simulator:** reports how many achievements players hold at the end, by frame, and with `--badges` the share of players and median hunt for each one.

**Simulator (200 players, to rank 5):** median 42 of 55 badges (p10 39, p90 47): Bronze 24 of 24, Silver 14 of 19, Gold 4 of 12. That is more than the 30 to 35 first guessed. Easy ones worth a look: Butterfingers (5 escapes in a row) and Robbed Blind come for every player in the first 70 hunts, and Rush Job (Gold) for every player at a median hunt 666. Never earned by the simulated players: Never Sleeps, Sleighload of Elves and Santa's Treasurer (past the end of v1, as meant) and Top of the List (needs other players).

## Admin speed-run tools

For eddy's own testing of later zones. A "Speed run (testing)" card on the Admin page (More > Admin), shown only to the admin account.

| Tool | What it does |
| --- | --- |
| Always attract and catch | Every hunt finds an elf, catches it (unless it is immune to the trap type) and drops all its loot. No pillage. |
| Gold and points x1 / 10 / 50 / 200 | Multiplies the gold and points of each catch (any whole number 1 to 1000 via the API). |
| +1,000 / 10,000 / 100,000 gold | Adds gold. |
| Jump to rank | Raises points to that rank's threshold; never lowers them. |
| Unlock every location | Skips rank and gold requirements. |
| Stock up | Tops every bait and charm up to 200 and every material up to 50. |

Rules: all tools change only the calling admin's own save (`POST /api/admin/speedrun`, behind the admin check, so non-admins get 403). The boost setting is stored on that save as `speedRun` and `/api/hunt` only honours it when the logged-in user is an admin. The simulator and normal balance numbers are unaffected. Start over also clears it.

## Flavour text

Every trap, base, bait, charm, material and elf has text for its detail screen, in `content/flavour.json`, keyed by id. At load the text is copied onto each entry as a `flavour` field, so `GET /api/content` already returns it. The slots and limits come from the phone-first UI layout (option D):

| Field | Who has it | Limit | Shown |
| --- | --- | --- | --- |
| `tagline` | Items and elves | 60 characters | Under the name on cards and detail screens |
| `description` | Items and elves | 160 characters, 1 to 2 sentences | Detail screens and Elf Emporium (shop) cards; says what the thing does |
| `backstory` | Items and elves | 400 characters, 3 to 4 sentences | Detail screens; for elves, only after the first catch |
| `rumour` | Elves only | 100 characters | Before the first catch, in place of the portrait text |

Elf descriptions and rumours hint at each elf's weaknesses and resistances, so players can work out the right trap type from the text. Loading fails if any item or elf has no text, if text names an unknown id, or if a field is over its limit. The text is a first pass; edit `flavour.json` freely, no numbers live there.

## Economy

Gold comes in only from catches and sales, and goes out on bait, charms, gear, location unlocks and crafting fees.

- **Sources:** 300 starting gold and 100 Stale Cookies; elf gold on each catch; selling materials (5 to 200 gold each; the new Sugar Twist sells for 8) and gear (40% of its price).
- **Sinks:** bait and charms every attracted hunt; gear; one-time unlock fees; crafting fees.

**Santa's Workshop recipes**

| Item | Ingredients | Gold fee | Rank |
| --- | --- | --- | --- |
| Mistletoe Charm x10 | 1 Sugar Glass | 150 | 1 |
| Fruitcake x5 | 3 Candied Peel, 1 Cookie Tin | 100 | 2 |
| Ribbon Candy x3 | 2 Sugar Twist, 1 Candied Peel | 30 | 2 |
| Golden Bow Bonbon x2 | 1 Sugar Glass, 1 Golden Ribbon | 100 | 2 |
| Constellation Wreath (trap) | 3 Enchanted Wrapping, 2 Brass Spring | 6,000 | 3 |
| Yule Log Base | 3 Toymaker's Gear, 1 Golden Ribbon, 2 Sugar Glass | 4,000 | 3 |
| Sleigh-Bell Snapper (trap) | 3 Silver Sleighbell, 1 Clockwork Heart, 1 Nutcracker Jaws (used up) | 15,000 | 4 |

**Balance targets per location**

| Location | Meant-for gear | Bait cost / gold per attracted hunt | Catch rate (commons) |
| --- | --- | --- | --- |
| Cookie Pantry | Jack-in-the-Box + Gingerbread Slab | about 60% | 60 to 70% |
| Wrapping Room | Star Lantern + Candy Cane Platform | about 50% | 55 to 65% |
| Toy Workshop | Nutcracker Jaws + Ice Block | about 45% | 55 to 65% |
| Reindeer Stables | Snow Globe Prison or Sleigh-Bell Snapper + Yule Log Base | about 45% | 45 to 55% |

**How we check it:** `npm run simulate` plays virtual hunters through v1 with the real engine and content, reports hunts per rank, catch rates and bait cost per location, and with `--strict` fails if a rank target is missed by more than 25%.

**Latest simulator run (hexed elves and home power types, 200 players):** all reached rank 5, median 1,403 hunts (1,503 before). Median hunts in ranks 1 to 4: 166, 288, 457, 497 (targets 150, 250, 400, 600, all within 25%, so no power or price retune was needed). Pillages per player by location: 8, 33, 13, 60, costing 5%, 6%, 14% and 10% of the gold earned there. Mini boss and boss catches per player: Spoolwick 1.8, Madame Shredwell 0.3, Hammerhand 3.9, General Grimbolt 2.2, Antler Ripper 2.4, Cinderhoof 1.4. Toy orders 34.8 per player; sleigh runs 13.3, 3.7 launched. Every player buys the Icicle Jar (for the order board) and 94% buy Snow Globe Prison, which nobody bought before; Sleigh-Bell Snapper is crafted by 81% (was 41%). Median 44 of 55 badges. Known gap: Constellation Wreath is still rarely crafted (1%). The simulated player now buys the cheapest trap of any power type it lacks before hunting at the order board.

Before the home types, with the old buying rule, the simulator never bought a Frost trap for the Workshop and finished only 0.5 toy orders per player; that was a gap in the simulated player, not in the game, and the buying rule above fixed it.

## Art

Every picture has a fixed name, `src/client/public/art/<slot>/<id>.<ext>`, where the id is the game-data id (`traps/jack_in_the_box.svg`, `imps/crumb_elf.svg`, `locations/cookie_pantry.svg`). `art/manifest.json` lists each one with its size, a description and a prompt for regenerating it with an image tool. Full rules, sizes and how to swap in a PNG: [docs/ART.md](ART.md).

| Slot | Count | Size (px) | Notes |
| --- | --- | --- | --- |
| `brand` | 2 | icon 1024², key art 1170×1290 | Game icon, login key art |
| `traps`, `bases` | 8, 5 | 600×450, transparent | Same canvas; the trap stands on the base's top line (y = 340), so the two layer |
| `baits`, `charms`, `materials` | 7, 3, 11 | 512², transparent | Thumbnails |
| `trap_types` | 3 | 256² | Clockwork, Starlight, Frost badges |
| `locations` | 4 | 1170×470 | Hunt banners; centre floor left clear for the trap |
| `map` | 1 | 1600×900 | Travel map; manifest has pin positions per location |
| `imps` | 23 + `_locked` | 512² | Hexed-elf portrait cards (the slot keeps its old name); frame shows tier (common, uncommon, rare, mini boss, boss); `_locked` is the "?" card. Since the hexed-elves story these are simple generated SVGs; the old custom imp PNGs are kept in `art-archive/imps/` and new custom portraits are in the art backlog ([ART_PROGRESS.md](ART_PROGRESS.md)) |
| `ranks` | 5 | 256², transparent | `rank_1` … `rank_5` |
| `icons` | 19 | 24², `currentColor` | Bottom nav, More menu, stat labels |
| `howto` | 8 | 640×360 | One diagram per How-to-play section |

`npm run art` regenerates the SVGs and the manifest. It never overwrites a custom file (a PNG/WebP/JPG with the same name, or an SVG without the generator's marker comment). `npm test` fails if any item, elf, location or rank has no picture. The client loads `/art/manifest.json` at start and looks every picture up by slot and id, so a PNG that replaces an SVG shows up after `npm run art` and a rebuild, with no code change.

## User interface

Phone first (layout D2, chosen by eddy on 25 Nov 2026; mockups: https://claude.ai/artifact/7A6Y6w37aCDXneVGDSDCDs). On a computer the same layout is centred in a phone-width column. Fonts are Lilita One (titles) and Nunito (text), bundled with the page.

**Frame.** Every main screen starts with one **frozen top header** (eddy, 26 Nov 2026) that stays pinned while the page scrolls under it: the game icon on the left; beside it, "The Naughty List" on the first line with the gold ("3,412 Gold" and the medal-style gold coin) on the right; the rank badge, username, rank and points on the second line; and the rank progress bar along the bottom edge. Everything below it scrolls; on the Hunt screen the location banner is the first thing under the header. A bottom menu with icon and text: **Hunt**, **Naughty List**, **Emporium**, **Workshop**, **More**. Pages have their own address (`#/emporium/bait`), so the phone's back button works.

| Screen | What it shows |
| --- | --- |
| Hunt | Location banner under the frozen header, with the location name, the "?" hint button and Travel. Trap art drawn standing on its base, centred at the top of the gear card with no names on the art (tap for the Arsenal). Under it, four boxes in a 2x2 grid, Trap and Bait on the top row and Base and Charm below: **Trap** (icon is the trap's power type, Clockwork, Starlight or Frost, with the type and trap name), **Bait** (thumbnail, name and amount), **Base** (base thumbnail and name) and **Charm** (thumbnail, name and amount). Trap and Base open the Arsenal; Bait and Charm open the quick sheet. Power, luck, attraction and catch chance under the gear. The hunt log, then a sticky Hunt button. Space bar hunts on a computer |
| Hunt log | Starts with Santa's intro letter. Then the last 50 hunts plus the events between them: buy, sell, craft, gear change (equip or swap), travel and unlock, and rank-ups. Hunts show their number and time, events their time, in the viewer's own time zone. Uncaught elves show the "?" card; a first catch is marked "Portrait unlocked". Tapping an elf opens its file |
| Full history | Every saved row, newest first, grouped by day, with filters All, Catches, Escapes, Events, Bosses, and Load older |
| Quick bait and charm sheet | Owned bait or charms as picture cards, a preview of catch chance and attraction before and after, Use. Crafted bait asks once more if the setting is on |
| Arsenal | Full screen with Trap, Base, Bait, Charm tabs. Tap an item to preview the setup and power, luck, attraction and catch before → after, then Equip. Unowned shop items are listed with their price |
| Item details | Picture, stats, how you get it, tagline, description and backstory from `flavour.json`, Compare and Equip |
| Naughty List | Portrait grid per location with caught counts. Uncaught elves show "?" and "seen N times, never caught" |
| Elf file | Caught: portrait, power, gold, points, catches, weaknesses, drops, first-catch time, tagline, description, backstory. Not caught: "?", only the rumour and "File sealed" |
| Elf Emporium | Traps, Bases, Bait, Charms, Sell tabs. Cards with thumbnail, stats, description, price and amount owned. Bait and charms have an amount picker and "Buy for N"; gear is bought once. Next-rank items are greyed with the rank that unlocks them |
| Santa's Workshop | Type filters with counts and "Only show what I can craft now". Each recipe: result, amount, owned, rank needed, ingredient thumbnails with have / need (green or red), gold fee, and a button that says what is missing or "Craft ×N" |
| More | Travel map (lair map with pins, unlock and go), Hunters (leaderboard by points or Naughty List size, and a feed of rare and boss catches and rank-ups; elves the viewer hasn't caught stay "?"), My profile (Stats and Achievements tabs; tapping your rank badge or name in the player bar opens it too), How to play (one picture per topic), Settings, Admin (admin only), Account, Log out |
| Settings | Kept on the device: sound effects (synthesised, no sound files), vibrate on a catch, ask before using rare bait, 24-hour clock, Space bar hunts. Shows whether the Cocoa meter is on |
| Admin | Players with rank, hunts, points and last active; **Allow new accounts** switch; Cocoa meter (shown, kept off: it is set in `constants.json`); restart log |
| Account | Change password, Start over (with the confirmation dialog), Log out |
| Login | Full-bleed key art, large game icon and title, a form card. "Create account" asks for a username and the password twice. The first account on a new server becomes the admin |

## Tech stack and architecture

| Part | Choice |
| --- | --- |
| Language | TypeScript everywhere; the engine is shared by server, client, tests and simulator |
| Server | Node.js 22 + Fastify, serving the API and the built page |
| Database | SQLite (Node's built-in `node:sqlite`) in the mounted `/data` folder |
| Web client | Vite + Preact, plain CSS, phone first (about 24 KB of script and 10 KB of CSS gzipped, plus the bundled fonts and the SVG art) |
| Game content | JSON in `content/` (numbers in the per-kind files, player-facing text in `flavour.json` and `story.json`), validated against a schema and cross-checked at startup |
| Accounts | First account is the admin; anyone with the address can create an account while the admin's **Allow new accounts** switch is on; username + password and a session cookie |
| Tests | Vitest for engine and server; the simulator for balance |

**API:**

| Call | What it does |
| --- | --- |
| `GET /api/health`, `GET /api/content`, `GET /api/setup-status` | Public: health, game content, whether the admin account exists yet and whether sign-up is open |
| `POST /api/auth/signup` | Create an account. The very first account becomes the admin; later ones are refused while the admin has closed sign-up |
| `POST /api/auth/login`, `POST /api/auth/logout` | Session cookie, 30 days, token stored hashed |
| `GET /api/me` | User, player state and the hunt log: the last 50 hunts plus the events between them |
| `GET /api/history?filter=&before=&limit=` | One page (up to 200 rows) of the full history, newest first; filter `all`, `catches`, `escapes`, `events`, `bosses` or `pillaged`; `before` is a row id |
| `GET /api/stats` | Join date, rank-up times and first-catch times still in the log |
| `GET /api/achievements` | How many hunters have earned each achievement, for "Earned by 2 of 5 hunters" |
| `POST /api/welcome` | The welcome popup of a new game was closed: sets `welcomeSeen` |
| `GET /api/hunters` | Leaderboard (username, rank, points, Naughty List size) and the latest 20 rare or boss catches and rank-ups from everyone |
| `POST /api/account/password` | Change password; needs the current one |
| `POST /api/hunt` | One hunt, rolled on the server; limited to `maxHuntsPerSecond` (2) per player |
| `POST /api/setup`, `/api/buy`, `/api/sell`, `/api/craft`, `/api/travel` | Engine actions on the saved player; each also writes an event to the hunt log and returns it (`log`, plus `logs` when one action writes more than one row, such as travel and a first-visit arrival) |
| `POST /api/objective` with `{"action": "start_run" \| "rush_order"}` | Start a sleigh run in the Stables or take a Rush order in the Toy Workshop; logged as an `objective` event |
| `POST /api/restart` with `{"confirm": true}` | Start over: wipes this player's progress and journal, keeps the account, logs the restart |
| `GET /api/restarts` | This player's own restart log |
| `GET /api/admin/players` | Admin only: every player with rank, points, hunts and last active time |
| `GET/POST /api/admin/settings` | Admin only: read or set `allowSignups` |
| `GET /api/admin/restarts` | Admin only: every player's restart log |

**Storage:** one SQLite file, `naughty-list.db`, in `DATA_DIR` (`/data` in Docker, `./data` locally), using Node's built-in `node:sqlite` so there are no native modules to compile. Tables: users, sessions, settings (`allowSignups`), players (state as JSON), journal (the hunt log: hunts and events, marked by a `kind` column, up to 10,000 rows per player, pruned every 100 hunts), restarts (one row per Start over, with the player's gold, points, rank, hunts, catches and Naughty List count at that moment; never deleted). Passwords are hashed with scrypt. The old invites table is left in place, unused, so saves from earlier versions open unchanged; the server adds the journal's `kind` column to old saves on start.

**Data stored per player:** gold, points, rank, current location, unlocked locations, setup, inventory counts, the hunt log, lifetime catch counts per elf (the Naughty List), lifetime encounters per elf (`seen`, for "seen, never caught") and gold earned from catches, progress on each location's objective (`objectives`) a pillage count (`stats.pillaged`), earned achievements with their times (`achievements`), the counters they read (`tally`: purchases, crafts, catches by trap type, weakness catches, streaks, Rush orders, express launches and failed runs) and `welcomeSeen`. `seen` and gold earned start counting from this version for older saves.

**Start over:** any player can wipe their own run from **More > Account > Start over**. A confirmation dialog lists what will be lost, and nothing is wiped unless the player confirms; the server also refuses a restart without an explicit confirm flag. The wipe replaces that player's state with a fresh one and deletes their journal in one transaction. Their account, other players and the restart log are untouched. The admin sees every restart on the Admin page.

**Playing with friends:** eddy is the admin and shares the game address privately. Anyone with it can create an account while **Allow new accounts** is on (More > Admin); eddy turns it off once everyone has joined. The Hunters page ranks players by points or Naughty List size and shows a feed of rare and boss catches and rank-ups. No trading in v1.

## Run it locally

Needs Node.js 22 or newer and git.

```sh
git clone https://github.com/cheesezilla/naughty-list
cd naughty-list
npm install
npm run play        # builds, then serves on http://localhost:8080
```

The first account you create is the admin. Friends create their own accounts from the login screen; close sign-up under More > Admin. Saves go to `./data/naughty-list.db`; deleting that file resets the whole server. For development with hot reload, use `npm run dev` and open http://localhost:5173.

## Deployment

The game ships as one Docker image (`ghcr.io/cheesezilla/naughty-list`), built and published by GitHub Actions on each push to `main`. The UGREEN DXP4800 has an Intel x86 processor, so the amd64 image works.

Step-by-step guide: [docs/DEPLOY.md](DEPLOY.md). In short:

1. Make the GitHub package public once, or log the NAS in to ghcr.io with a `read:packages` token.
2. In the UGOS Docker app, create a project from `compose.yaml`. Saves go to `/volume1/docker/naughty-list`.
3. Open `http://<nas-address>:8081` and create the admin account. The container listens on 8080; compose maps it to 8081 on the NAS.
4. Optional: uncomment the `cloudflared` service and paste a tunnel token for a public HTTPS address.

The container starts as root only to fix the save folder's ownership, then drops to the unprivileged `node` user (`docker/entrypoint.sh`). If the `node` user still can't write the folder or the save files, it keeps running as root and logs a warning. The server checks the save folder and files before opening them and prints a plain explanation (who owns what, which user the game runs as, how to fix it) instead of a raw SQLite error. Pull requests build the image and smoke-test it with a root-owned save folder: sign up, hunt, restart, and check the save survived.

**Letting friends in (chosen):** eddy uses a WireGuard VPN to the home network and plain HTTP at `http://<nas-address>:8081`. HTTPS was considered and dropped: the VPN already encrypts traffic, and a trusted certificate would need a paid domain. **Alternative:** a Cloudflare Tunnel gives the game a public HTTPS address without opening router ports, as a second small container in the same Compose project. It needs a free Cloudflare account and a domain on Cloudflare. Tailscale is the alternative if every friend installs it.

**Telegram mini app (later, optional):** needs the same public HTTPS address plus a bot from BotFather. The client is already a small mobile-first page, so it's about a day of work.

**Backups:** the save is one SQLite file (plus its `-wal` file) in the data folder; a UGOS scheduled backup of that folder is enough.

## Still to sort out

- [ ] A domain on Cloudflare for the friends' address (or choose Tailscale), needed at milestone 4.
- [ ] Make the GitHub package public, or give the NAS a read token (DEPLOY.md part 1).

## Changelog

| Date | PR | Change |
| --- | --- | --- |
| 2026-11-26 | this PR | Admin speed-run tools: reward multiplier, always attract and catch, grant gold, jump to rank, unlock all locations, stock up; admin-only on the server |
| 2026-11-26 | #27 | Achievements now show a 4-second non-blocking banner (with "+N more") instead of a popup, because early games had too many popups; the full popup stays only for Welcome back. The Achievement popups setting became New catch popups (default On). Canvas mockups updated |
| 2026-11-26 | #26 | Planned a New Catch popup for the first catch of each elf (portrait unlocked, tier colours, tiles, Naughty List progress, Open file and Keep hunting), with a canvas mockup. Design only |
| 2026-11-26 | #26 | Frozen top header (eddy): title and player bar merged into one header pinned at the top of every screen, with the rank progress bar on its bottom edge; the location banner moves below it and no longer carries the player bar. Canvas mockups updated. UI design only |
| 2026-11-26 | #26 | Built: `TopHeader` pinned outside the scrolling area on all main screens (replaces the title strip and player bar); pressing Hunt (button or Space) smooth-scrolls so the Hunt log heading sits at the top of the list (instant with reduced motion); New Catch popup (`newcatch.tsx`, tier colours, power, weaknesses, points, Naughty List progress via `listProgress`, Open file and Keep hunting; Quiet toast when achievement popups are off) shown before achievement popups. No game numbers changed |
| 2026-11-26 | this PR | **Hexed elves and home power types (eddy).** New story: Scrinch took over the lair and hexed Santa's elves, who replace the imps; catching them goes on The Naughty List and Mrs. Claus's cocoa brings them round. Renamed Crumb Elf, Sootcap, Gingerbread Rascal, Glitterbug, Wind-up Elf and General Grimbolt (a hexed nutcracker soldier), with new ids; the Stables boss is now Cinderhoof, an original hexed reindeer (no Rudolph: trademarked), and Grizzlewick is parked. Rank 3 is Hex Tracker. Power types by location: Wrapping Room weak to Starlight / resists Clockwork, Toy Workshop weak to Clockwork / resists Frost, Reindeer Stables weak to Frost / resists Starlight, Pantry a teaching room; 16 elves' weaknesses changed (table above). All elf text rewritten (flavour, letter, welcome, location intros and hints with the room's type, achievements, screens, How to play); hint sheets allow 5 steps. Simple generated SVG portraits for all 23 elves and the "?" card; the old imp PNGs moved to `art-archive/imps/`, other custom art kept; new elf portraits, the icon and key art added to the art backlog. Saves, badges and log entries with old ids are rewritten on start. Simulator: buys one trap of each type before the order board; 200/200 reach rank 5, median 1,403 hunts (was 1,503), Snow Globe Prison now bought by 94% |
| 2026-11-26 | #24 | Design pass against every phone screen on the UI canvas. Fixed: the welcome popup now shows again after Start over without a reload; each of the 55 badges has its own emblem (the feed no longer shows "?" for an earned secret); progress reads `312 / 500 hunts` and `Best run 7 / 10`; the badge sheet says which hunt earned a badge (`achievementHunts` in the save) and has a handle and a Close button; the quiet toast shows the frame and "tap to view"; the hint sheet has its title in the location's colour and Open Workshop and Close buttons. Top of the List now needs at least one other hunter, so a lone player doesn't get it on hunt #1. No game numbers changed |
| 2026-11-26 | #23 | Built achievements: 55 in `content/achievements.json` with a rules engine (`src/engine/achievements.ts`), `achievements` and `tally` in the save, one-time backfill for old saves, an `achievement` hunt-log row, Silver, Gold and Secret badges in the Hunters feed, the earn popup and quiet toast (new setting), and My profile with Stats and Achievements tabs and a badge sheet; `GET /api/achievements`. Built the welcome popup (`welcome` in `story.json`, `welcomeSeen`, `POST /api/welcome`), the 2x2 gear card, and 3D CSS medals for badges, power types and the gold coin. Audit of the location screens against the plan: added panel icons, the sleigh on the Readiness bar and the last-change line. Simulator: unchanged balance (200/200 reach rank 5, median 1,503 hunts); median 42 of 55 badges |
| 2026-11-26 | #22 | Custom PNG art for the remaining 15 imp portraits (`sprinkle_snatcher`, `chimney_soot_imp`, `jarbelly`, `ribbon_tangler`, `tape_biter`, `bow_burglar`, `spoolwick`, `cog_pincher`, `paint_smudger`, `stuffing_ripper`, `hammerhand`, `hay_hoarder`, `bell_thief`, `harness_snipper`, `antler_ripper`), generated with Gemini. All 24 imps (`baron_crumblewick` parked in the location rework) are now custom art. No game numbers changed |
| 2026-11-26 | #20 | Custom PNG art for the 3 new Starlight traps (`starlit_stocking`, `star_lantern`, `constellation_wreath`) and `yule_log_base`, generated with Gemini and cut out with `rembg`. All traps and bases are now custom art. No game numbers changed |
| 2026-11-26 | #19 | Custom PNG art for the brand slot (`icon`, `key_art`) and all 5 rank badges, generated with Gemini. No game numbers changed |
| 2026-11-26 | #18 | Custom PNG banners for all 4 locations (`cookie_pantry`, `wrapping_room`, `toy_workshop`, `reindeer_stables`), generated with Gemini. No game numbers changed |
| 2026-11-26 | #19 | Planned a one-time welcome popup for new games and Start over, with its text and a canvas mockup. Design only |
| 2026-11-26 | #19 | Player bar (eddy): gold reads "3,412 Gold" with the gold coin icon after it on every screen; canvas mockups updated. UI design only |
| 2026-11-26 | #19 | Merged main after #18: location objectives and pillage on escape are built, so their 9 achievements count from the start (screen totals now 55) |
| 2026-11-26 | #19 | Badges drawn as 3D metal medals (bevelled rim, recessed face, embossed emblem, gloss, light sweep in the popup); the same style for the power type icons on the Hunt screen and the gold coin in Santa's Workshop; canvas mockups updated. UI design only |
| 2026-11-26 | #19 | Hunt screen (eddy): trap and base names move off the art into their own boxes; the art sits on top and Trap and Bait over Base and Charm form a 2x2 grid under it; the Trap box's icon is its power type. Canvas mockups updated. UI design only |
| 2026-11-26 | #19 | Planned achievements and badges: 55 achievements in 8 groups (first steps, hunting, ranks, Naughty List, bosses, power types and gear, location objectives, secret) with names, conditions, Bronze/Silver/Gold frames and badge art briefs; the earn popup (with a quiet toast option and hunt-log event), the Achievements tab in a new My profile page (earned in colour, unearned greyed with progress, secrets as "?"), and how it would be built. Badges only, no rewards, so no numbers or simulator results changed. Design only, no code |
| 2026-11-26 | #18 | Location objectives built. Cookie Pantry simple start: new `uncommon` tier (Chimney Soot Imp, Jarbelly at power 180, gold 40, points 70, Cookie Tin 30%), Gingerbread Imp drops Brass Spring 15%, Baron Crumblewick parked. Wrapping Room bait ladder: Sugar Twist, Ribbon Candy and Golden Bow Bonbon with two recipes; rare, mini boss and boss gated behind ladder baits; Madame Shredwell also drops 5 Jingle Bell Charms 25%. Toy Workshop order board (3 slots, Inspection every 3rd order brings Hammerhand, 5-slot Rush order brings Foreman Grimbolt, Toy Crate 400 gold plus a bonus). Reindeer Stables sleigh run (40 hunts, Readiness 5/12/20 per common/rare/mini boss catch, thieves take 8/5, Antler Ripper from 50, launch pays 2,000 gold and a Silver Sleighbell and brings Grizzlewick, a failed run pays 10 gold per Readiness). `objectives` in the save, `POST /api/objective`, first-visit `arrival` log entries, intros and hints in `story.json`, hint sheet and per-location panels on the Hunt screen. Simulator: 200/200 reach rank 5, median 1,503 hunts |
| 2026-11-26 | #18 | Pillage on escape built: chance and losses per imp tier in `constants.json` (common 3%, rare 8%, mini boss 35%, boss 60%; bosses take gold, bait and points), bait thieves use a per-imp rule (`stealsBait` removed), safety rails (gold floor 100, no rank loss, rank 1 keeps points, armed bait only). Hunt log Pillaged pill and text, Pillaged history filter, boss pillages in the Hunters feed, red flash and shake, pillage risk in imp files, How to play section and diagram. Simulator: 200/200 reach rank 5, median 1,398 hunts (was 1,357) |
| 2026-11-26 | #17 | Power type Holly renamed **Starlight** (Christmas-star magic, strong against shadowy imps). Its traps reworked: Stocking Snare -> Starlit Stocking (`starlit_stocking`), Holly Noose -> Star Lantern (`star_lantern`), Wreath of Thorns -> Constellation Wreath (`constellation_wreath`, recipe id too), with new flavour text and imp weakness hints. Simple generated SVGs for the three traps and the Starlight badge replace the old Holly PNGs/SVGs and are queued for Gemini in ART_PROGRESS.md. Saves and hunt-log entries with the old ids are rewritten when the server starts. No numbers changed; simulator run unchanged apart from names (100/100 reach rank 5) |
| 2026-11-25 | #16 | Planned location objectives: Cookie Pantry becomes a simple start (common, uncommon and rare imps, no boss), Wrapping Room bait ladder (eddy's tiered bait-ingredient loop), Toy Workshop order board, Reindeer Stables sleigh run, Tangle Meter kept as a spare; first-visit intro log entries, a hint button and a mechanic panel per location (UI sketches, canvas mockups and first-draft text); recorded what the engine already supports. Design only, no code or numbers changed |
| 2026-11-25 | #15 | Added docs/ART_PROGRESS.md tracking which of the 56 remaining non-icon art assets still need custom AI-generated pictures (per slot, with ids), linked from docs/ART.md and docs/PLAN.md. No art files or game numbers changed |
| 2026-11-25 | #14 | Custom PNG art for the 8 traps and 4 of 5 bases (`cardboard_box`, `gingerbread_slab`, `candy_cane_platform`, `ice_block`; `yule_log_base` still generated SVG), generated with Gemini on a plain background then cut out locally with `rembg`. Rest of the non-icon art (baits, charms, materials, trap types, brand, locations, map, how-to, remaining 15 imps) still queued, paused on Gemini's daily image-generation limit. No game numbers changed |
| 2026-11-25 | #13 | Custom PNG portraits for all 10 cookie-pantry/wrapping-room/toy-workshop/reindeer-stables imps (`crumb_imp`, `gingerbread_imp`, `baron_crumblewick`, `glitter_imp`, `madame_shredwell`, `windup_imp`, `foreman_grimbolt`, `carrot_crook`, `grizzlewick`, `_locked`), generated with an AI image tool and dropped in per docs/ART.md; `npm run art` picked them up as custom and left the other 15 imps on generated SVG. No game numbers changed |
| 2026-11-25 | #12 | Intro letter from Santa (`content/story.json`), logged as a Story event when a game starts (sign-up and Start over) and shown on How to play. No numbers changed |
| 2026-11-25 | #11 | New phone-first UI (layout D2) with all art and flavour text wired in: bottom menu, hunt log with events and full history, Arsenal, quick bait sheet, item and imp files, Elf Emporium, Santa's Workshop, More pages (travel map, Hunters leaderboard and catch feed, stats, how to play, settings, admin, account). Open sign-up with an admin switch replaces invite codes; password change. Engine records first catches, imps seen and gold earned (no numbers changed; simulator results unchanged: 200/200 reach rank 5, median 1,357 hunts). Pull requests also publish a test image `:pr-<number>` |
| 2026-11-25 | #10 | Art: 97 original SVG assets for every UI slot (icon, key art, traps, bases, baits, charms, materials, trap types, locations, map, imp portraits and locked card, ranks, icons, How-to-play diagrams), `npm run art` generator, `art/manifest.json` with regeneration prompts, naming guide in docs/ART.md, manifest coverage test. No game numbers changed |
| 2026-11-25 | #8 | Deploy guide: playing away from home over a WireGuard VPN with plain HTTP, and a fix for Chrome switching to HTTPS; Cloudflare kept as an optional alternative |
| 2026-11-25 | #9 | Flavour text: tagline, description and backstory for all 34 items and 24 imps, plus a rumour for each imp, in `content/flavour.json` with length limits and completeness checks. No numbers changed |
| 2026-11-25 | #7 | NAS port changed to 8081 and time zone set to Asia/Singapore in compose.yaml and the guides |
| 2026-11-25 | #6 | Save-file start-up fix: entrypoint repairs root-owned save files or falls back to root, server explains save-folder problems in plain words, smoke test covers locked save files |
| 2026-11-25 | #4 | Start over: per-player wipe with a confirmation dialog, restart log (own and admin view); Invites tab renamed Admin |
| 2026-11-25 | #3 | NAS deploy: compose file with optional Cloudflare Tunnel, DEPLOY.md guide, entrypoint that fixes save-folder ownership, image smoke test in CI |
| 2026-11-25 | #2 | Milestone 3: accounts (first one is admin), invite codes, server-side hunts with rate limit, SQLite saves, login screen and Invites tab; local run steps |
| 2026-11-25 | #1 | Plan added to the repo; milestones 1 and 2 built; first simulator run recorded |
