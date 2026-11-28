# Balance check

`npm run balance` computes the catch rate of every trap x base x charm setup against every elf in every area with the real engine formula (`setupStats`, `catchChance`, `luckFactor`), then flags anything outside the thresholds in `balance/thresholds.json`. It is the gear-only baseline: it ignores boons, events, Cheer and encounter mix, and it answers "is the gear curve sane?", while `npm run simulate` answers "is the pace sane?". Use both in a balance PR.

## How to use it

| Command | What it does |
| --- | --- |
| `npm run balance` | Print the report and the flags |
| `npm run balance -- --write` | Rewrite the generated block at the bottom of this file (do this in every PR that changes gear, elf power, luck, effectiveness or the catch formula) |
| `npm run balance -- --check` | Warn if this file's generated block is out of date |
| `npm run balance -- --ci` | What CI runs: `::warning::` annotations, a job summary, never fails (advisory) |
| `npm run balance -- --content dir` | Run against another content folder (try a change before editing `content/`) |
| `npm run balance -- --csv out.csv` | Every trap x base x charm x elf rate (about 8,300 rows) |
| `npm run balance -- --strict` | Exit 1 when any flag is open (not used in CI) |

## What it checks

| Check | Flag | Default threshold |
| --- | --- | --- |
| Beginner vs endgame table (1b) | Not a flag: every elf's catch rate with the area's recommended trap and base, and with the best gear in the game | `fresh` |
| Commons band | Commons caught (weighted by encounter weight) with the area's intended trap and fresh base is outside the band in PLAN.md "Balance targets per location", more than 5 points off | per-area bands in `commonsBands` |
| Elf targets | An elf with a stated target (Shredwell about 10% off-type and 30% with Carol at rank-appropriate gear, Cinderhoof about 25% with the best gear) is more than its tolerance off | `elfTargets` |
| Boss and mini boss too easy | Best fresh setup above the tier's `freshMax` (boss 45%, mini boss 70%, rare 90%); best endgame setup above `endgameMax` (boss 60%, mini boss 90%) | `tiers` |
| Near impossible | Best fresh setup below `freshMin` (boss 8%) or best endgame setup below `endgameMin` (boss 20%, mini boss 40%, rare 50%) | `tiers` |
| Cheese | A trap the player may own on entering an area, other than the intended one, beats the intended gear on commons by more than 8 points, comes within 3 points of it while being a lower-rank trap, or catches a boss above `freshMax` | `cheese` |
| Obsolete trap | A trap is never the best trap of its own tier (by at least 1 point) for any elf at or above its rank | `obsolete` |
| Low-value gear | On arrival (best setup per elf, with vs without the item, using gear of its rank or lower) the item adds under 3 points on bosses and mini bosses and under 2 points over all elves, yet costs 1,000 gold or more, or any crafting material | `craftValue` |
| Charms | A stat charm adds under 1 point overall, or over 20 points on bosses | `charmValue` |

**Profiles.** *Fresh* = the player has just entered the area with the traps listed under `fresh[area].traps`, the area's base and no charm; this is the "fresh player" the plan talks about. *Endgame* = every trap, base and charm in the game, best setup per elf (a player swaps setups between elves).

**Changing a threshold.** Edit `balance/thresholds.json` and say why in the PR (for example, a new target from eddy). Do not silence a flag by editing the script. A flag that is a deliberate design choice goes under `accepted` with a reason; it stays visible in the report but stops warning in CI.

**Not measured:** attraction and Cheer charms, boons, events, bait, pillage and encounter mix (Allure). The simulator covers pace; a human playtest covers feel.

## Latest findings (28 Nov 2026, commons and Grimbolt tuned)

**Result: 12 open flags (13 before). The three commons-band flags and the Grimbolt endgame flag are fixed; this PR also adds the Recommended gear tier (section 1b) and a boss-gap flag.**

1. **Commons are in their bands.** Elf power was raised in the Pantry (about x2.2), Wrapping Room (about x2.0) and Stables (about x2.55); Workshop commons (57%) were already in band. Beginner-gear commons: Pantry 74% (band 60 to 70, inside the 5 point tolerance), Wrapping Room 64% (55 to 65), Workshop 57% (55 to 65), Stables 54% (45 to 55). The three that moved sit at the easy end of their bands on purpose: raising them to the band middle slowed rank pace badly (the first attempt at the middle took a median 2,258 hunts to rank 5 and only 30% of 60 test players finished). Rares, uncommons and mini bosses in those rooms were raised with them so they stay harder than the commons. Gold and points per elf in the three rooms were raised x1.35 (Pantry, Wrapping Room) and x1.45 (Stables) so each rank takes the same number of hunts as before.
2. **General Grimbolt is capped.** Power 2,800 to 5,200: 59.5% with endgame gear (ceiling 60%), 27% with arrival gear, 34% with the walkthrough's gear. Shredwell (9.5% off-type, 32% with Carol) and Cinderhoof (25% best gear) are on eddy's targets and were not touched.
3. **New: Recommended tier.** Section 1b now shows every elf with 1. Beginner gear (what you arrive with), 2. Recommended gear (what docs/WALKTHROUGH.md has you farm for, including optional crafts) and 3. Endgame gear (over-ranked player with traps and bases from later areas). The Recommended gear is configured in `recommended` in thresholds.json.
4. **New flag: recommended gap.** eddy: recommended gear should almost always be needed to catch the local boss at a reasonable rate. A boss must be at least 10 points easier with Recommended than Beginner gear. Open: Grimbolt (+7.0) and Cinderhoof (+7.2); Shredwell passes (+22.4). The Workshop and Stables gear steps are small (a base swap and a charm), so closing the gap is a gear tuning job (for example a stronger Yule Log Base or Sleigh Runner), not an elf power one.
5. **Other flags are unchanged and are gear-value findings** (Star Lantern dominated, optional bases and traps adding little). Wishing Star Pedestal is newly flagged on arrival because the Stables elves are now so strong that luck 9 matters less there.

Known limits: "no value" for a base with an attraction or bait-cost job (Brazier, Cottage) means no catch-rate value, not no value at all; add it to `accepted` with that reason if that is the intent.

<!-- balance:generated:start -->
Generated by `npm run balance` from `content/*.json` and `balance/thresholds.json`. Do not edit by hand; run `npm run balance -- --write`.

### Flags (12)

- **recommended-gap** · General Grimbolt: with beginner gear 27.4%, with the walkthrough's recommended gear 34.4%: only +7.0 points better (eddy: recommended gear should be almost always needed to catch the local boss at a reasonable rate; minimum gain +10.0 points).
- **recommended-gap** · Cinderhoof: with beginner gear 17.8%, with the walkthrough's recommended gear 25.0%: only +7.2 points better (eddy: recommended gear should be almost always needed to catch the local boss at a reasonable rate; minimum gain +10.0 points).
- **obsolete-trap** · Star Lantern: Star Lantern (starlight, rank 2) is not the best trap of its own tier for any elf at or above its rank; it is dominated.
- **low-value-gear** · Star Lantern: Star Lantern costs 1,200 gold and adds +0.2 pts (bosses) / +0.1 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Icicle Jar: Icicle Jar costs 3,000 gold and adds +0.0 pts (bosses) / +0.1 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Nutcracker Jaws: Nutcracker Jaws costs 9,000 gold and adds +1.2 pts (bosses) / +0.4 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Candy Cane Platform: Candy Cane Platform costs 2,500 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Ice Block: Ice Block costs 8,000 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Toffee Anvil: Toffee Anvil costs 3,500 gold and adds +2.6 pts (bosses) / +1.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Chestnut Brazier: Chestnut Brazier costs 3,500 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Gingerbread Cottage: Gingerbread Cottage costs 8,000 gold + 6 materials and adds +1.1 pts (bosses) / +0.8 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Wishing Star Pedestal: Wishing Star Pedestal costs 12,000 gold + 7 materials and adds +0.0 pts (bosses) / +1.5 pts (all elves) on arrival and +0.0 / +0.6 over the long run (no value).

### 1. Areas: commons catch rate with the intended gear

| Area | Intended gear | Commons caught | Target band | Status | Best possible (any gear) |
| --- | --- | --- | --- | --- | --- |
| Cookie Pantry | Jack-in-the-Box + Gingerbread Slab | 74.1% | 60.0% to 70.0% | ok | 98.0% |
| Wrapping Room | Star Lantern + Candy Cane Platform | 63.9% | 55.0% to 65.0% | ok | 98.0% |
| Toy Workshop | Nutcracker Jaws + Ice Block | 57.3% | 55.0% to 65.0% | ok | 92.6% |
| Reindeer Stables | Snow Globe Prison + Yule Log Base | 54.3% | 45.0% to 55.0% | ok | 67.8% |
| Carol Loft | Icicle Jar + Candy Cane Platform | 78.6% | - | n/a | 98.0% |

### 1b. Catch rate of every elf with three gear tiers: beginner, recommended, endgame

**Beginner** = a player who has just entered the area with the gear they can have by then (the area's intended trap and base, no charm). **Recommended** = a player who has farmed the area and the one before it and earned the gear meant for beating the local boss (the gear docs/WALKTHROUGH.md has players aim for, including optional crafts available at that point: best listed trap and base per elf, with the listed charm; see `recommended` in thresholds.json). **Endgame** = a player far above the area's rank who owns everything, including traps and bases from later areas that a player following the walkthrough cannot have yet: the best trap, base and charm for that elf. "Commons" rows are weighted by encounter weight.

| Area | Elf | Tier | 1. Beginner gear | 2. Recommended gear (trap used) | 3. Endgame gear | Endgame setup |
| --- | --- | --- | --- | --- | --- | --- |
| **Cookie Pantry** | **Commons (all)** | common | **74.1%** | **95.2%** | **98.0%** | best setup per elf, see below |
| Cookie Pantry | Crumb Elf | common | 75.6% | 98.0% (Jack-in-the-Box + Gingerbread Slab) | 98.0% | Starlit Stocking + Ice Block + Mistletoe Charm |
| Cookie Pantry | Sprinkle Snatcher | common | 72.1% | 91.5% (Jack-in-the-Box + Gingerbread Slab) | 98.0% | Starlit Stocking + Ice Block + Mistletoe Charm |
| Cookie Pantry | Sootcap | uncommon | 53.8% | 75.1% (Jack-in-the-Box + Gingerbread Slab) | 98.0% | Starlit Stocking + Yule Log Base + Mistletoe Charm |
| Cookie Pantry | Jarbelly the Glutton | uncommon | 47.9% | 60.8% (Jack-in-the-Box + Gingerbread Slab) | 98.0% | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm |
| Cookie Pantry | Gingerbread Rascal | rare | 40.7% | 49.0% (Jack-in-the-Box + Gingerbread Slab) | 98.0% | Star Lantern + Wishing Star Pedestal + Mistletoe Charm |
| **Wrapping Room** | **Commons (all)** | common | **63.9%** | **95.2%** | **98.0%** | best setup per elf, see below |
| Wrapping Room | Ribbon Tangler | common | 65.9% | 98.0% (Constellation Wreath + Candy Cane Platform) | 98.0% | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm |
| Wrapping Room | Tape Biter | common | 65.3% | 95.1% (Constellation Wreath + Candy Cane Platform) | 98.0% | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm |
| Wrapping Room | Bow Burglar | common | 59.3% | 91.2% (Constellation Wreath + Candy Cane Platform) | 98.0% | Jack-in-the-Box + Wishing Star Pedestal + Mistletoe Charm |
| Wrapping Room | Glitterbug | rare | 52.7% | 82.3% (Constellation Wreath + Candy Cane Platform) | 93.9% | Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm |
| Wrapping Room | Spoolwick | miniboss | 48.8% | 77.9% (Constellation Wreath + Toffee Anvil) | 86.5% | Constellation Wreath + Sleigh Runner + Wind-up Key Charm |
| Wrapping Room | Madame Shredwell | boss | 9.5% | 31.9% (Carol Horn + Toffee Anvil) | 54.2% | Carol Horn + Sleigh Runner + Wind-up Key Charm |
| **Toy Workshop** | **Commons (all)** | common | **57.3%** | **72.3%** | **92.6%** | best setup per elf, see below |
| Toy Workshop | Cog Pincher | common | 65.3% | 75.0% (Constellation Wreath + Yule Log Base) | 97.9% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Paint Smudger | common | 50.3% | 76.5% (Constellation Wreath + Yule Log Base) | 90.5% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Stuffing Ripper | common | 54.2% | 63.6% (Nutcracker Jaws + Yule Log Base) | 87.6% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Wind-up Elf | rare | 70.3% | 77.7% (Nutcracker Jaws + Yule Log Base) | 93.2% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Hammerhand | miniboss | 45.8% | 61.9% (Constellation Wreath + Yule Log Base) | 78.1% | Snow Globe Prison + Sleigh Runner + Wind-up Key Charm |
| Toy Workshop | General Grimbolt | boss | 27.4% | 34.4% (Nutcracker Jaws + Yule Log Base) | 59.5% | Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm |
| **Reindeer Stables** | **Commons (all)** | common | **54.3%** | **66.3%** | **68.4%** | best setup per elf, see below |
| Reindeer Stables | Hay Hoarder | common | 62.5% | 70.0% (Snow Globe Prison + Sleigh Runner) | 73.1% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Reindeer Stables | Bell Thief | common | 55.7% | 64.1% (Snow Globe Prison + Sleigh Runner) | 64.2% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Reindeer Stables | Harness Snipper | common | 40.7% | 66.6% (Sleigh-Bell Snapper + Sleigh Runner) | 66.6% | Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm |
| Reindeer Stables | Carrot Crook | rare | 59.1% | 68.0% (Snow Globe Prison + Sleigh Runner) | 68.0% | Snow Globe Prison + Sleigh Runner + Wind-up Key Charm |
| Reindeer Stables | Antler Ripper | miniboss | 42.6% | 53.0% (Snow Globe Prison + Sleigh Runner) | 53.0% | Snow Globe Prison + Sleigh Runner + Wind-up Key Charm |
| Reindeer Stables | Cinderhoof | boss | 17.8% | 25.0% (Snow Globe Prison + Sleigh Runner) | 25.0% | Snow Globe Prison + Sleigh Runner + Wind-up Key Charm |
| **Carol Loft** | **Commons (all)** | common | **78.6%** | **90.2%** | **98.0%** | best setup per elf, see below |
| Carol Loft | Tin Whistler | common | 80.8% | 94.1% (Icicle Jar + Candy Cane Platform) | 98.0% | Starlit Stocking + Yule Log Base + Mistletoe Charm |
| Carol Loft | Hoarse Caroller | common | 82.2% | 91.4% (Icicle Jar + Candy Cane Platform) | 98.0% | Starlit Stocking + Yule Log Base + Mistletoe Charm |
| Carol Loft | Mistletoe Mumbler | common | 72.6% | 83.8% (Star Lantern + Candy Cane Platform) | 98.0% | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm |
| Carol Loft | Silver Piper | rare | 59.5% | 73.8% (Carol Horn + Candy Cane Platform) | 98.0% | Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm |
| Carol Loft | Choirmaster Hollowvoice | miniboss | 41.6% | 55.8% (Carol Horn + Candy Cane Platform) | 79.4% | Snow Globe Prison + Sleigh Runner + Wind-up Key Charm |

Recommended gear per area: Cookie Pantry: Jack-in-the-Box / Starlit Stocking on Gingerbread Slab + Mistletoe Charm; Wrapping Room: Carol Horn / Star Lantern / Icicle Jar / Constellation Wreath on Candy Cane Platform / Toffee Anvil + Mistletoe Charm; Toy Workshop: Nutcracker Jaws / Constellation Wreath / Carol Horn on Ice Block / Yule Log Base + Wind-up Key Charm; Reindeer Stables: Snow Globe Prison / Sleigh-Bell Snapper on Gingerbread Cottage / Sleigh Runner / Yule Log Base + Wind-up Key Charm; Carol Loft: Star Lantern / Icicle Jar / Carol Horn on Candy Cane Platform + Mistletoe Charm.

Beginner gear per area: Cookie Pantry: Jack-in-the-Box + Gingerbread Slab; Wrapping Room: Star Lantern + Candy Cane Platform; Toy Workshop: Nutcracker Jaws + Ice Block; Reindeer Stables: Snow Globe Prison + Yule Log Base; Carol Loft: Star Lantern or Icicle Jar or Jack-in-the-Box + Candy Cane Platform. Madame Shredwell is weak to Carol, so a beginner with a Carol Horn catches her much more often than the Star Lantern figure (see section 2).

### 2. Rare, mini boss and boss catch rates: fresh player vs endgame gear

Fresh = the best trap the player could own on entering the area, on the area's base, no charm. Endgame = best trap, base and charm of everything in the game. Best setup per elf.

| Elf | Area | Tier | Power | Fresh player | Endgame gear | Targets |
| --- | --- | --- | --- | --- | --- | --- |
| Gingerbread Rascal | Cookie Pantry | rare | 350 | 40.7% (Jack-in-the-Box + Gingerbread Slab) | 98.0% (Star Lantern + Wishing Star Pedestal + Mistletoe Charm) | - |
| Glitterbug | Wrapping Room | rare | 700 | 53.7% (Carol Horn + Candy Cane Platform) | 93.9% (Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm) | - |
| Spoolwick | Wrapping Room | miniboss | 800 | 50.2% (Carol Horn + Candy Cane Platform) | 86.5% (Constellation Wreath + Sleigh Runner + Wind-up Key Charm) | - |
| Madame Shredwell | Wrapping Room | boss | 2900 | 29.3% (Carol Horn + Candy Cane Platform) | 54.2% (Carol Horn + Sleigh Runner + Wind-up Key Charm) | fresh not:carol: 12.7% vs target 10.0% ok; fresh only:carol: 29.3% vs target 30.0% ok |
| Wind-up Elf | Toy Workshop | rare | 900 | 70.3% (Nutcracker Jaws + Ice Block) | 93.2% (Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm) | - |
| Hammerhand | Toy Workshop | miniboss | 1600 | 46.4% (Icicle Jar + Ice Block) | 78.1% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |
| General Grimbolt | Toy Workshop | boss | 5200 | 27.4% (Nutcracker Jaws + Ice Block) | 59.5% (Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm) | - |
| Carrot Crook | Reindeer Stables | rare | 2700 | 59.1% (Snow Globe Prison + Yule Log Base) | 68.0% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |
| Antler Ripper | Reindeer Stables | miniboss | 5000 | 42.6% (Snow Globe Prison + Yule Log Base) | 53.0% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |
| Cinderhoof | Reindeer Stables | boss | 16800 | 17.8% (Snow Globe Prison + Yule Log Base) | 25.0% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | endgame: 25.0% vs target 25.0% ok |
| Silver Piper | Carol Loft | rare | 500 | 59.5% (Icicle Jar + Candy Cane Platform) | 98.0% (Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm) | - |
| Choirmaster Hollowvoice | Carol Loft | miniboss | 1000 | 41.6% (Icicle Jar + Candy Cane Platform) | 79.4% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |

### 3. Cheese check: fresh gear that outclasses the area's intended gear

| Area | Other trap the player may own | Commons caught | vs intended gear (pts) | Status |
| --- | --- | --- | --- | --- |
| Cookie Pantry | Starlit Stocking (starlight) | 56.7% | -17.5 | ok |
| Wrapping Room | Starlit Stocking (starlight) | 45.6% | -18.3 | ok |
| Wrapping Room | Jack-in-the-Box (clockwork) | 44.1% | -19.8 | ok |
| Wrapping Room | Icicle Jar (frost) | 68.4% | +4.6 | ok |
| Wrapping Room | Carol Horn (carol) | 67.2% | +3.3 | ok |
| Toy Workshop | Starlit Stocking (starlight) | 28.2% | -29.1 | ok |
| Toy Workshop | Jack-in-the-Box (clockwork) | 35.6% | -21.7 | ok |
| Toy Workshop | Star Lantern (starlight) | 39.0% | -18.3 | ok |
| Toy Workshop | Icicle Jar (frost) | 38.0% | -19.3 | ok |
| Toy Workshop | Carol Horn (carol) | 42.8% | -14.5 | ok |
| Reindeer Stables | Jack-in-the-Box (clockwork) | 23.8% | -30.5 | ok |
| Reindeer Stables | Star Lantern (starlight) | 20.9% | -33.4 | ok |
| Reindeer Stables | Icicle Jar (frost) | 35.5% | -18.8 | ok |
| Reindeer Stables | Carol Horn (carol) | 30.2% | -24.1 | ok |
| Reindeer Stables | Nutcracker Jaws (clockwork) | 38.7% | -15.5 | ok |
| Reindeer Stables | Constellation Wreath (starlight) | 37.0% | -17.3 | ok |
| Carol Loft | Starlit Stocking (starlight) | 54.5% | -24.1 | ok |

### 4. Traps: does each one have a niche?

Niche = elves it catches best of all traps of its own rank or lower, using the best base of that rank or lower. A trap with no niche is dominated by something cheaper or earlier.

| Trap | Type | Rank | Price | Elves where best of its tier | Elves where best at endgame | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Starlit Stocking | starlight | 1 | crafted/start | 4 of 28 | 0 of 28 | starter |
| Jack-in-the-Box | clockwork | 1 | 300 | 24 of 28 | 0 of 28 | ok |
| Star Lantern | starlight | 2 | 1200 | 0 of 23 | 0 of 28 | FLAG |
| Carol Horn | carol | 2 | crafted/start | 8 of 23 | 1 of 28 | ok |
| Icicle Jar | frost | 2 | 3000 | 9 of 23 | 0 of 28 | ok |
| Nutcracker Jaws | clockwork | 3 | 9000 | 2 of 12 | 0 of 28 | ok |
| Constellation Wreath | starlight | 3 | crafted/start | 4 of 12 | 2 of 28 | ok |
| Snow Globe Prison | frost | 4 | 25000 | 3 of 6 | 5 of 28 | ok |
| Sleigh-Bell Snapper | clockwork | 4 | crafted/start | 1 of 6 | 7 of 28 | ok |

### 5. Gear value: how much does each trap and base add, and what does it cost?

Gain = mean change in catch rate (best setup per elf) from owning the item, over **mini bosses and bosses** and over **all elves**, in areas of the item's rank or higher. "On arrival" counts only gear of its own rank or lower; "lasting" counts everything in the game. Cost = gold plus crafting materials.

| Item | Kind | Rank | Cost | On arrival: bosses / all (pts) | Lasting: bosses / all (pts) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Jack-in-the-Box | trap | 1 | 300 gold | +0.0 / +12.9 | +0.0 / +0.0 | replaced later |
| Star Lantern | trap | 2 | 1,200 gold | +0.2 / +0.1 | +0.0 / +0.0 | FLAG: no value |
| Carol Horn | trap | 2 | 600 gold + 6 materials | +9.9 / +3.5 | +0.4 / +0.1 | replaced later |
| Icicle Jar | trap | 2 | 3,000 gold | +0.0 / +0.1 | +0.0 / +0.0 | FLAG: no value |
| Nutcracker Jaws | trap | 3 | 9,000 gold | +1.2 / +0.4 | +0.0 / +0.0 | FLAG: no value |
| Constellation Wreath | trap | 3 | 6,000 gold + 5 materials | +2.8 / +4.4 | +0.0 / +0.0 | replaced later |
| Snow Globe Prison | trap | 4 | 25,000 gold | +14.0 / +13.1 | +1.9 / +0.9 | replaced later |
| Sleigh-Bell Snapper | trap | 4 | 15,000 gold + 5 materials | +0.0 / +3.0 | +0.0 / +2.9 | ok |
| Gingerbread Slab | base | 1 | 500 gold | +0.0 / +9.1 | +0.0 / +0.0 | replaced later |
| Candy Cane Platform | base | 2 | 2,500 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Ice Block | base | 3 | 8,000 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Yule Log Base | base | 3 | 4,000 gold + 6 materials | +3.2 / +4.8 | +0.0 / +0.0 | replaced later |
| Toffee Anvil (Bosses and mini bosses) | base | 2 | 3,500 gold | +2.6 / +1.0 | +0.0 / +0.0 | FLAG: no value |
| Chestnut Brazier (Cheap bait) | base | 2 | 3,500 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Wishbone Plinth (Farming common elves) | base | 2 | 4,500 gold | +0.0 / +4.7 | +0.0 / +0.0 | replaced later |
| Sleigh Runner (Bosses, best with Clockwork traps) | base | 4 | 12,000 gold + 4 materials | +5.2 / +5.0 | +4.1 / +2.4 | ok |
| Gingerbread Cottage (Cheap bait, best with Frost traps) | base | 4 | 8,000 gold + 6 materials | +1.1 / +0.8 | +0.0 / +0.0 | FLAG: no value |
| Wishing Star Pedestal (Elves that resist your trap, best with Starlight and Carol traps) | base | 4 | 12,000 gold + 7 materials | +0.0 / +1.5 | +0.0 / +0.6 | FLAG: no value |

### 6. Charms: what a catch charm adds on top of the best setup

| Charm | Stats | Price | Commons (pts) | Mini bosses and bosses (pts) | All elves (pts) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Mistletoe Charm | 0 power / 0% / 4 luck | 30 | +2.6 | +0.6 | +1.9 | ok |
| Wind-up Key Charm | 0 power / +20% / 0 luck | 60 | +1.3 | +3.6 | +1.8 | ok |

Attraction and Cheer charms (Jingle Bell, Cheer charms) do not change catch chance and are not measured here.

### 7. Top setups in each area (commons, every trap x base x charm)

| Area | Top 3 for commons |
| --- | --- |
| Cookie Pantry | Starlit Stocking + Ice Block + Mistletoe Charm 98.0%<br>Starlit Stocking + Yule Log Base + Mistletoe Charm 98.0%<br>Starlit Stocking + Wishbone Plinth + Mistletoe Charm 98.0% |
| Wrapping Room | Jack-in-the-Box + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Star Lantern + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Carol Horn + Wishing Star Pedestal + Mistletoe Charm 98.0% |
| Toy Workshop | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm 92.6%<br>Sleigh-Bell Snapper + Wishing Star Pedestal + Wind-up Key Charm 86.7%<br>Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm 86.5% |
| Reindeer Stables | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm 67.8%<br>Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm 66.3%<br>Sleigh-Bell Snapper + Sleigh Runner + Mistletoe Charm 65.7% |
| Carol Loft | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Yule Log Base + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Wishing Star Pedestal + Mistletoe Charm 98.0% |
<!-- balance:generated:end -->
