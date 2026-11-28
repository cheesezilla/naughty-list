# Balance notes

`npm run balance` computes the catch rate of every trap x base x charm setup against every elf in every area with the real engine formula (`setupStats`, `catchChance`, `luckFactor`), then flags anything outside the thresholds in `balance/thresholds.json`. It is the gear-only baseline: it ignores boons, events, Cheer and encounter mix, and it answers "is the gear curve sane?", while `npm run simulate` answers "is the pace sane?". Use both in a balance PR.

This is the one doc for balance decisions: the gear balance check (generated, below) and the pace simulations (history at the end). Part of the three-doc set: [Developer notes](DEVELOPER_NOTES.md), Balance notes, [Wiki](WIKI.md).

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

**Result: 9 open flags (13 before). Update: small gear buffs close the recommended-gap flags (see item 4). The three commons-band flags and the Grimbolt endgame flag are fixed; this PR also adds the Recommended gear tier (section 1b) and a boss-gap flag.**

1. **Commons are in their bands.** Elf power was raised in the Pantry (about x2.2), Wrapping Room (about x2.0) and Stables (about x2.55); Workshop commons (57%) were already in band. Beginner-gear commons: Pantry 74% (band 60 to 70, inside the 5 point tolerance), Wrapping Room 64% (55 to 65), Workshop 57% (55 to 65), Stables 54% (45 to 55). The three that moved sit at the easy end of their bands on purpose: raising them to the band middle slowed rank pace badly (the first attempt at the middle took a median 2,258 hunts to rank 5 and only 30% of 60 test players finished). Rares, uncommons and mini bosses in those rooms were raised with them so they stay harder than the commons. Gold and points per elf in the three rooms were raised x1.35 (Pantry, Wrapping Room) and x1.45 (Stables) so each rank takes the same number of hunts as before.
2. **General Grimbolt is capped.** Power 2,800 to 5,900: 59.1% with endgame gear (ceiling 60%), 25% with arrival gear, 37% with the walkthrough's gear. Shredwell is unchanged for a player on the walkthrough (9.5% off-type, 32% with Carol; her endgame gear rate rose from 54% to 60% because of the buffs in item 4) and Cinderhoof is 26% with the best gear (target about 25%).
3. **New: Recommended tier.** Section 1b now shows every elf with 1. Beginner gear (what you arrive with), 2. Recommended gear (what docs/WALKTHROUGH.md has you farm for, including optional crafts) and 3. Endgame gear (over-ranked player with traps and bases from later areas). The Recommended gear is configured in `recommended` in thresholds.json.
4. **New flag: recommended gap, closed with small gear buffs.** eddy: recommended gear should almost always be needed to catch the local boss at a reasonable rate. A boss must be at least 10 points easier with Recommended than Beginner gear. Buffs (eddy 28 Nov): Wind-up Key Charm +20% to +35% power, Yule Log Base power 600 to 800, Gingerbread Cottage power 550 to 1,550 (so the Stables recommended build is Snow Globe Prison + Cottage + Wind-up Key), with Grimbolt 5,200 to 5,900 and Cinderhoof 16,800 to 20,500 to hold their ceilings. Result: Grimbolt 25% to 37% (+12), Cinderhoof 16% to 26% (+10), Shredwell +22. The Cottage flag (no value) is gone too.
5. **Other flags are unchanged and are gear-value findings** (Star Lantern dominated, optional bases and traps adding little). Wishing Star Pedestal is newly flagged on arrival because the Stables elves are now so strong that luck 9 matters less there; the Gingerbread Cottage flag is fixed by its buff.

Known limits: "no value" for a base with an attraction or bait-cost job (Brazier, Cottage) means no catch-rate value, not no value at all; add it to `accepted` with that reason if that is the intent.

<!-- balance:generated:start -->
Generated by `npm run balance` from `content/*.json` and `balance/thresholds.json`. Do not edit by hand; run `npm run balance -- --write`.

### Flags (9)

- **obsolete-trap** · Star Lantern: Star Lantern (starlight, rank 2) is not the best trap of its own tier for any elf at or above its rank; it is dominated.
- **low-value-gear** · Star Lantern: Star Lantern costs 1,200 gold and adds +0.2 pts (bosses) / +0.1 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Icicle Jar: Icicle Jar costs 3,000 gold and adds +0.0 pts (bosses) / +0.1 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Nutcracker Jaws: Nutcracker Jaws costs 9,000 gold and adds +1.6 pts (bosses) / +0.7 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Candy Cane Platform: Candy Cane Platform costs 2,500 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Ice Block: Ice Block costs 8,000 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Toffee Anvil: Toffee Anvil costs 3,500 gold and adds +2.6 pts (bosses) / +1.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Chestnut Brazier: Chestnut Brazier costs 3,500 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Wishing Star Pedestal: Wishing Star Pedestal costs 12,000 gold + 7 materials and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).

### 1. Areas: commons catch rate with the intended gear

| Area | Intended gear | Commons caught | Target band | Status | Best possible (any gear) |
| --- | --- | --- | --- | --- | --- |
| Cookie Pantry | Jack-in-the-Box + Gingerbread Slab | 74.1% | 60.0% to 70.0% | ok | 98.0% |
| Wrapping Room | Star Lantern + Candy Cane Platform | 63.9% | 55.0% to 65.0% | ok | 98.0% |
| Toy Workshop | Nutcracker Jaws + Ice Block | 57.3% | 55.0% to 65.0% | ok | 92.6% |
| Reindeer Stables | Snow Globe Prison + Yule Log Base | 56.0% | 45.0% to 55.0% | ok | 69.6% |
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
| Wrapping Room | Spoolwick | miniboss | 48.8% | 77.9% (Constellation Wreath + Toffee Anvil) | 89.1% | Constellation Wreath + Gingerbread Cottage + Wind-up Key Charm |
| Wrapping Room | Madame Shredwell | boss | 9.5% | 31.9% (Carol Horn + Toffee Anvil) | 60.1% | Carol Horn + Gingerbread Cottage + Wind-up Key Charm |
| **Toy Workshop** | **Commons (all)** | common | **57.3%** | **76.0%** | **92.6%** | best setup per elf, see below |
| Toy Workshop | Cog Pincher | common | 65.3% | 78.4% (Constellation Wreath + Yule Log Base) | 97.9% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Paint Smudger | common | 50.3% | 79.8% (Constellation Wreath + Yule Log Base) | 90.5% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Stuffing Ripper | common | 54.2% | 68.7% (Nutcracker Jaws + Yule Log Base) | 87.6% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Wind-up Elf | rare | 70.3% | 81.5% (Nutcracker Jaws + Yule Log Base) | 93.2% | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm |
| Toy Workshop | Hammerhand | miniboss | 45.8% | 66.6% (Constellation Wreath + Yule Log Base) | 82.5% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |
| Toy Workshop | General Grimbolt | boss | 25.0% | 37.1% (Nutcracker Jaws + Yule Log Base) | 59.1% | Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm |
| **Reindeer Stables** | **Commons (all)** | common | **56.0%** | **69.6%** | **72.5%** | best setup per elf, see below |
| Reindeer Stables | Hay Hoarder | common | 64.2% | 76.0% (Snow Globe Prison + Gingerbread Cottage) | 76.0% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |
| Reindeer Stables | Bell Thief | common | 57.5% | 70.6% (Snow Globe Prison + Gingerbread Cottage) | 70.6% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |
| Reindeer Stables | Harness Snipper | common | 42.4% | 69.6% (Sleigh-Bell Snapper + Gingerbread Cottage) | 69.6% | Sleigh-Bell Snapper + Gingerbread Cottage + Wind-up Key Charm |
| Reindeer Stables | Carrot Crook | rare | 60.9% | 73.9% (Snow Globe Prison + Gingerbread Cottage) | 73.9% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |
| Reindeer Stables | Antler Ripper | miniboss | 44.5% | 59.7% (Snow Globe Prison + Gingerbread Cottage) | 59.7% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |
| Reindeer Stables | Cinderhoof | boss | 16.1% | 26.3% (Snow Globe Prison + Gingerbread Cottage) | 26.3% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |
| **Carol Loft** | **Commons (all)** | common | **78.6%** | **90.2%** | **98.0%** | best setup per elf, see below |
| Carol Loft | Tin Whistler | common | 80.8% | 94.1% (Icicle Jar + Candy Cane Platform) | 98.0% | Starlit Stocking + Yule Log Base + Mistletoe Charm |
| Carol Loft | Hoarse Caroller | common | 82.2% | 91.4% (Icicle Jar + Candy Cane Platform) | 98.0% | Starlit Stocking + Yule Log Base + Mistletoe Charm |
| Carol Loft | Mistletoe Mumbler | common | 72.6% | 83.8% (Star Lantern + Candy Cane Platform) | 98.0% | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm |
| Carol Loft | Silver Piper | rare | 59.5% | 73.8% (Carol Horn + Candy Cane Platform) | 98.0% | Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm |
| Carol Loft | Choirmaster Hollowvoice | miniboss | 41.6% | 55.8% (Carol Horn + Candy Cane Platform) | 83.7% | Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm |

Recommended gear per area: Cookie Pantry: Jack-in-the-Box / Starlit Stocking on Gingerbread Slab + Mistletoe Charm; Wrapping Room: Carol Horn / Star Lantern / Icicle Jar / Constellation Wreath on Candy Cane Platform / Toffee Anvil + Mistletoe Charm; Toy Workshop: Nutcracker Jaws / Constellation Wreath / Carol Horn on Ice Block / Yule Log Base + Wind-up Key Charm; Reindeer Stables: Snow Globe Prison / Sleigh-Bell Snapper on Gingerbread Cottage / Sleigh Runner / Yule Log Base + Wind-up Key Charm; Carol Loft: Star Lantern / Icicle Jar / Carol Horn on Candy Cane Platform + Mistletoe Charm.

Beginner gear per area: Cookie Pantry: Jack-in-the-Box + Gingerbread Slab; Wrapping Room: Star Lantern + Candy Cane Platform; Toy Workshop: Nutcracker Jaws + Ice Block; Reindeer Stables: Snow Globe Prison + Yule Log Base; Carol Loft: Star Lantern or Icicle Jar or Jack-in-the-Box + Candy Cane Platform. Madame Shredwell is weak to Carol, so a beginner with a Carol Horn catches her much more often than the Star Lantern figure (see section 2).

### 2. Rare, mini boss and boss catch rates: fresh player vs endgame gear

Fresh = the best trap the player could own on entering the area, on the area's base, no charm. Endgame = best trap, base and charm of everything in the game. Best setup per elf.

| Elf | Area | Tier | Power | Fresh player | Endgame gear | Targets |
| --- | --- | --- | --- | --- | --- | --- |
| Gingerbread Rascal | Cookie Pantry | rare | 350 | 40.7% (Jack-in-the-Box + Gingerbread Slab) | 98.0% (Star Lantern + Wishing Star Pedestal + Mistletoe Charm) | - |
| Glitterbug | Wrapping Room | rare | 700 | 53.7% (Carol Horn + Candy Cane Platform) | 93.9% (Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm) | - |
| Spoolwick | Wrapping Room | miniboss | 800 | 50.2% (Carol Horn + Candy Cane Platform) | 89.1% (Constellation Wreath + Gingerbread Cottage + Wind-up Key Charm) | - |
| Madame Shredwell | Wrapping Room | boss | 2900 | 29.3% (Carol Horn + Candy Cane Platform) | 60.1% (Carol Horn + Gingerbread Cottage + Wind-up Key Charm) | fresh not:carol: 12.7% vs target 10.0% ok; fresh only:carol: 29.3% vs target 30.0% ok |
| Wind-up Elf | Toy Workshop | rare | 900 | 70.3% (Nutcracker Jaws + Ice Block) | 93.2% (Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm) | - |
| Hammerhand | Toy Workshop | miniboss | 1600 | 46.4% (Icicle Jar + Ice Block) | 82.5% (Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm) | - |
| General Grimbolt | Toy Workshop | boss | 5900 | 25.0% (Nutcracker Jaws + Ice Block) | 59.1% (Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm) | - |
| Carrot Crook | Reindeer Stables | rare | 2700 | 60.9% (Snow Globe Prison + Yule Log Base) | 73.9% (Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm) | - |
| Antler Ripper | Reindeer Stables | miniboss | 5000 | 44.5% (Snow Globe Prison + Yule Log Base) | 59.7% (Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm) | - |
| Cinderhoof | Reindeer Stables | boss | 20500 | 16.1% (Snow Globe Prison + Yule Log Base) | 26.3% (Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm) | endgame: 26.3% vs target 25.0% ok |
| Silver Piper | Carol Loft | rare | 500 | 59.5% (Icicle Jar + Candy Cane Platform) | 98.0% (Constellation Wreath + Wishing Star Pedestal + Mistletoe Charm) | - |
| Choirmaster Hollowvoice | Carol Loft | miniboss | 1000 | 41.6% (Icicle Jar + Candy Cane Platform) | 83.7% (Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm) | - |

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
| Reindeer Stables | Jack-in-the-Box (clockwork) | 27.8% | -28.2 | ok |
| Reindeer Stables | Star Lantern (starlight) | 23.6% | -32.4 | ok |
| Reindeer Stables | Icicle Jar (frost) | 39.0% | -17.1 | ok |
| Reindeer Stables | Carol Horn (carol) | 33.2% | -22.8 | ok |
| Reindeer Stables | Nutcracker Jaws (clockwork) | 41.4% | -14.6 | ok |
| Reindeer Stables | Constellation Wreath (starlight) | 38.7% | -17.3 | ok |
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
| Constellation Wreath | starlight | 3 | crafted/start | 3 of 12 | 2 of 28 | ok |
| Snow Globe Prison | frost | 4 | 25000 | 5 of 6 | 7 of 28 | ok |
| Sleigh-Bell Snapper | clockwork | 4 | crafted/start | 1 of 6 | 6 of 28 | ok |

### 5. Gear value: how much does each trap and base add, and what does it cost?

Gain = mean change in catch rate (best setup per elf) from owning the item, over **mini bosses and bosses** and over **all elves**, in areas of the item's rank or higher. "On arrival" counts only gear of its own rank or lower; "lasting" counts everything in the game. Cost = gold plus crafting materials.

| Item | Kind | Rank | Cost | On arrival: bosses / all (pts) | Lasting: bosses / all (pts) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Jack-in-the-Box | trap | 1 | 300 gold | +0.0 / +12.9 | +0.0 / +0.0 | replaced later |
| Star Lantern | trap | 2 | 1,200 gold | +0.2 / +0.1 | +0.0 / +0.0 | FLAG: no value |
| Carol Horn | trap | 2 | 600 gold + 6 materials | +9.9 / +3.5 | +0.8 / +0.3 | replaced later |
| Icicle Jar | trap | 2 | 3,000 gold | +0.0 / +0.1 | +0.0 / +0.0 | FLAG: no value |
| Nutcracker Jaws | trap | 3 | 9,000 gold | +1.6 / +0.7 | +0.0 / +0.0 | FLAG: no value |
| Constellation Wreath | trap | 3 | 6,000 gold + 5 materials | +1.8 / +3.4 | +0.0 / +0.0 | replaced later |
| Snow Globe Prison | trap | 4 | 25,000 gold | +13.0 / +12.1 | +5.4 / +3.8 | ok |
| Sleigh-Bell Snapper | trap | 4 | 15,000 gold + 5 materials | +0.0 / +2.8 | +0.0 / +2.2 | ok |
| Gingerbread Slab | base | 1 | 500 gold | +0.0 / +9.1 | +0.0 / +0.0 | replaced later |
| Candy Cane Platform | base | 2 | 2,500 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Ice Block | base | 3 | 8,000 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Yule Log Base | base | 3 | 4,000 gold + 6 materials | +5.6 / +6.4 | +0.0 / +0.0 | replaced later |
| Toffee Anvil (Bosses and mini bosses) | base | 2 | 3,500 gold | +2.6 / +1.0 | +0.0 / +0.0 | FLAG: no value |
| Chestnut Brazier (Cheap bait) | base | 2 | 3,500 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Wishbone Plinth (Farming common elves) | base | 2 | 4,500 gold | +0.0 / +4.7 | +0.0 / +0.0 | replaced later |
| Sleigh Runner (Bosses, best with Clockwork traps) | base | 4 | 12,000 gold + 4 materials | +3.5 / +3.2 | +0.0 / +0.0 | replaced later |
| Gingerbread Cottage (Cheap bait, best with Frost traps) | base | 4 | 8,000 gold + 6 materials | +6.8 / +6.5 | +3.3 / +2.9 | ok |
| Wishing Star Pedestal (Elves that resist your trap, best with Starlight and Carol traps) | base | 4 | 12,000 gold + 7 materials | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |

### 6. Charms: what a catch charm adds on top of the best setup

| Charm | Stats | Price | Commons (pts) | Mini bosses and bosses (pts) | All elves (pts) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Mistletoe Charm | 0 power / 0% / 4 luck | 30 | +2.3 | +0.6 | +1.8 | ok |
| Wind-up Key Charm | 0 power / +35% / 0 luck | 60 | +1.9 | +5.4 | +2.7 | ok |

Attraction and Cheer charms (Jingle Bell, Cheer charms) do not change catch chance and are not measured here.

### 7. Top setups in each area (commons, every trap x base x charm)

| Area | Top 3 for commons |
| --- | --- |
| Cookie Pantry | Starlit Stocking + Ice Block + Mistletoe Charm 98.0%<br>Starlit Stocking + Yule Log Base + Mistletoe Charm 98.0%<br>Starlit Stocking + Wishbone Plinth + Mistletoe Charm 98.0% |
| Wrapping Room | Jack-in-the-Box + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Star Lantern + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Carol Horn + Wishing Star Pedestal + Mistletoe Charm 98.0% |
| Toy Workshop | Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm 92.6%<br>Sleigh-Bell Snapper + Wishing Star Pedestal + Wind-up Key Charm 87.9%<br>Sleigh-Bell Snapper + Gingerbread Cottage + Mistletoe Charm 87.1% |
| Reindeer Stables | Sleigh-Bell Snapper + Gingerbread Cottage + Wind-up Key Charm 69.6%<br>Snow Globe Prison + Gingerbread Cottage + Wind-up Key Charm 68.9%<br>Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm 68.7% |
| Carol Loft | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Yule Log Base + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Wishing Star Pedestal + Mistletoe Charm 98.0% |
<!-- balance:generated:end -->

# Simulation history

Written for eddy. Findings and recommendations first, numbers second. Report 1 used `npm run simulate -- --players 1000 --seeds 5` (5,000 virtual hunters). Report 2 uses 1,000 players, seed 1 per scenario (eddy asked to cut the run time); the baseline there is 1,286 against 1,291 above, so the two agree within 0.5%. Tuning is a separate task: nothing in `content/` changed.

**Standard game-length metrics (eddy, 27 Nov): every report states both.** (1) Median hunts to rank 5. (2) Hunts to catch every elf, 100% of the Naughty List portraits, Carol Loft and bosses included. The simulator prints both at the top of every run, with the mean, p10, p90 and the share of players who finish (cap 20,000 hunts, `--max-collect-hunts`).

### Report 1: baseline (Allure built, no Cheer Meter or events yet)

#### Conclusions

1. **The pace is stable and lands close to target, except rank 4.** Median 1,291 hunts to rank 5 (seeds 1 to 5: 1,286 to 1,297, so a 1,000-player run is trustworthy). Ranks 1 to 3 are within the 25% band (121, 269, 475 against 150, 250, 400). Rank 4 takes a median 400 hunts against a target of 600, so it is flagged too fast; its p90 is 883, so some players are far slower (the ones who miss gear). Recommendation: slow rank 4 (more points per rank or lower elf points in the Stables) only after Cheer and events are measured, since they will speed it up further.
2. **The Toy Workshop is the rough patch.** Players spend a median 553 hunts there with a catch rate of 39% (commons 42%, bosses 9%, mini bosses 20%), and pillages eat 45% of the gold earned there (3 to 17% elsewhere). The Stables by contrast catch at 76%. Recommendation: lift Workshop commons a little, and cap pillage gold there; it is the one area where escapes dominate the feel.
3. **Completion goals are not yet a real target.** The Pantry portrait is complete by hunt 57, long before the rank-up (121). In the Stables, the median player has caught every elf 173 hunts before they rank up; the Toy Workshop completes exactly at rank-up. Only the Wrapping Room asks for extra hunts after the rank-up (87). The plan's target is 20 to 40% extra hunts; today the rare and mini boss are not a long tail. Recommendation: make the optional goal need more (lower Allure weight for rares and mini bosses in the Stables and Workshop, or a goal reward worth chasing).
4. **Bait is the clock only in the first area.** Bait cost is 65% of gold earned in the Pantry, 36% in the Carol Loft, then 13%, 11% and 3%. By rank 4 players hold a median 23,650 gold and 83,858 at the end, so gold has nothing to buy. If Cheer and events add gold, this gets looser. Recommendation: later gold sinks, or higher late bait prices.
5. **Bad luck is long.** The longest escape streak is a median 13 hunts, p90 20, max 40. Much of that is in the Workshop.
6. **Short-term progress mostly works.** A catch or milestone happens every 1 hunt (median), p90 3, p99 8. Counting only milestones (first catch, loot, rank-up, key, objective step, badge, purchase) the p90 gap is 5 hunts, p99 16, and the median player has a dry spell of 30 hunts at their worst. Passing the plan's target (median 3 or less, p90 under 10), but the 30-hunt dry spell is where pips and event ticks should help. Loot drops on only 6% of hunts.
7. **Two craftable traps and one base are almost never made:** Constellation Wreath 0%, Gingerbread Cottage 0%, Toffee Anvil 27%, Star Lantern 42%. Not a bug, but nobody picks the Starlight route.

#### Numbers (5,000 players)

| Rank | Hunts in rank (p10 / median / p90) | Target | Status |
| --- | --- | --- | --- |
| 1 | 107 / 121 / 137 | 150 | ok |
| 2 | 190 / 269 / 348 | 250 | ok |
| 3 | 396 / 475 / 573 | 400 | ok |
| 4 | 347 / 400 / 883 | 600 | too fast |

| Area | Hunts per player | Catch rate | Bait cost / gold | Pillages per player | Pillage cost / gold |
| --- | --- | --- | --- | --- | --- |
| Cookie Pantry | 133 | 65% | 65% | 9 | 6% |
| Wrapping Room | 168 | 83% | 13% | 10 | 3% |
| Toy Workshop | 553 | 39% | 11% | 22 | 45% |
| Reindeer Stables | 333 | 76% | 3% | 28 | 17% |
| Carol Loft | 212 | 54% | 36% | 6 | 4% |

Encounter share / catch rate by tier (all areas): common 89% / 61%, uncommon 2% / 53%, rare 4% / 39%, mini boss 3% / 31%, boss 2% / 21%. Median 48 of 55 badges. Boss and mini boss catches per player: Spoolwick 3.2, Madame Shredwell 1.3, Hammerhand 2.9, General Grimbolt 1.2, Antler Ripper 3.7, Cinderhoof 2.7, Choirmaster Hollowvoice 1.6.

Median hunt of first catch: Wrapping Room rare Glitterbug 382, Spoolwick 420, Shredwell 484; Toy Workshop Wind-up Elf 565, Hammerhand 640, Grimbolt 836; Stables Carrot Crook 1,016, Antler Ripper 1,053, Cinderhoof 1,089; Loft Silver Piper 224, Choirmaster 335. Share of players who ever catch Hammerhand: 91%, Cinderhoof 95%.

Gold: players earn a median 148,707 from catches, spend 10,048 on bait (7%) and lose 27,300 to pillage. Gold in hand at rank-up: R2 598, R3 2,019, R4 23,650, R5 83,858.

### Report 2: with the Cheer Meter and random events (PR 50)

Scenarios: everything off; Cheer only with three boon policies (`greedy` value table, `random`, `hold` = Overcharge to 15 pips); events only with `safe` (boon card option a, fight Scrinch), `big` (option b) and `skip` (pay every Scrinch toll); and both on (greedy, safe). `fight` is the same as `safe` in the simulator because it never pays the toll. 1,000 players each. Nothing in `content/` changed.

#### Conclusions

1. **The Cheer Meter only works in one area.** A catch gives +1 pip (+2 for a rare or better) and an escape takes -3, so the meter only rises when the catch rate is above about 75%. Fills per 100 hunts by area: Wrapping Room 7.0, Reindeer Stables 3.1, Cookie Pantry 1.3, Carol Loft 0.9, **Toy Workshop 0.2** (one boon per 500 hunts). Overall the median fill takes 14 hunts (target 15 to 25) but the p90 is 103 (target under 45), and 70% of pips earned are lost to escapes (target under 40%). Elves hit hardest, bosses, are exactly where the meter drains. Recommendation: cut the escape loss to -1 (or -1 for commons, 0 against rare and above), and give the Workshop and Loft a way to earn pips (for example, order board steps or Readiness).
2. **Cheer is a nicety, not an engine.** It cuts total hunts to rank 5 by only 1.9% (1,262 against 1,286 with greedy picks, 1.2% random, 1.6% hold), under the plan's 5% "decoration" line, though a boon hunt clearly feels strong (catch rate 86% under a boon against 55% outside, gold per hunt 192 against 103). Boons are active in only 8% of hunts. That is a safe place to be; there is room to make it stronger once the meter fills more often.
3. **Three boons are dead and a few are too good.** Pick rate when offered: Free Bait 0%, Cosy Mittens 0%, Full Sack 4%. At the top: Santa's Blessing 100%, Cocoa Rush 90%, Points Parade 89%, Starfall 65%, Mulligan 66% (the 40% "too strong" line is crude with three cards on offer, but the gap between 0% and 100% is the point). The three policies finish within 1% of each other, so there is no solved game. Recommendation: rework Free Bait, Cosy Mittens and Full Sack, and trim the top rares.
4. **Overcharge is not a real choice yet.** Holding to 15 pips finishes the game at the same pace (1,265 against 1,262) but halves boons (0.9 against 1.8 draws per 100 hunts); every held draw shows a rare or better (against 68%), and 68% show a legendary (18%). It is a fine "save for a big one" option, but the p90 wait is 372 hunts, and the escape penalty (-5 while held) plus low catch rates makes holding in most areas a trap. It works as a risk choice only in the Wrapping Room.
5. **Events are slightly too frequent, and Scrinch is half grudge.** 2.0 events per 100 hunts (target 1.5 to 1.8): boon cards 0.6, Grand Gifts 0.27, Scrinch 1.15. About 49% of Scrinch events (28% of all events) come from the boss-escape grudge, under the one-third line overall but high for Scrinch. Gaps between events: min 10, median 39, p90 88, max 330 to 440. Grand Gifts: 3.5 to 3.7 per player per game, which fits "a handful".
6. **Scrinch bites too little and fighting is worth it.** Fighting wins 52% of challenges (target 60 to 80%). Paying every toll (`skip`) costs 16 tolls and about 10,100 gold per player, 7% of gold earned, so the toll is cheap. The pace still favours fighting: safe 1,244 hunts, skip 1,253, big 1,266. The toll could cost more.
7. **Event and Cheer gold is small, but the pace gain stacks.** Boon-card gold is 1 to 2% of gold earned, well under the 15% line. Events alone speed the game by 3.3% (1,244, `safe`); both together 5.1% (1,221), against the plan's goal of 10 to 20%. Rank 2 and 3 stay inside the band (242 and 450); rank 4 is still too fast (377 against 600).
8. **Boon card option a beats option b by about 2% (1,244 against 1,266).** The "big" option is not worth more than the "safe" one in pace terms. Worth a look at what option b offers, since a choice that is never worth taking is not a choice.
9. **The earlier findings still hold:** the Toy Workshop is the rough patch (catch rate 40%, 43% of gold earned lost to pillage), gold piles up (about 23,000 at rank 4, 89,000 at the end), and the portrait goal is not a real target (Pantry done at hunt 57, Stables 170 hunts before the rank-up). Events and boons do not change these.
10. **Progress feel is fine, and Cheer helps only a little.** Any good thing (catch or milestone, now including a full meter or an event): median gap 1, p90 3, p99 7. Counting milestones only, p90 4 to 5 and the median player's worst dry spell is 25 hunts, against 26 with no Cheer or events. The long dry spells are in the Workshop, which is exactly where the meter never fills; fixing finding 1 is the most direct fix for them.

#### Numbers (1,000 players each)

| Scenario | Hunts to rank 5 (median) | Change | Ranks 1 to 4 (median) |
| --- | --- | --- | --- |
| Everything off | 1,286 | | 121, 267, 472, 402 |
| Cheer, greedy picks | 1,262 | -1.9% | 119, 266, 480, 385 |
| Cheer, random picks | 1,271 | -1.2% | 120, 265, 479, 388 |
| Cheer, hold (Overcharge) | 1,265 | -1.6% | 121, 263, 478, 390 |
| Events, safe (a, fight) | 1,244 | -3.3% | 119, 250, 453, 391 |
| Events, big (b, fight) | 1,266 | -1.6% | 120, 258, 464, 396 |
| Events, skip (pay toll) | 1,253 | -2.6% | 119, 259, 455, 393 |
| Cheer greedy + events safe | 1,221 | -5.1% | 118, 242, 450, 377 |

Cheer (greedy): 1.8 draws per 100 hunts, 0.60 pips per hunt, 8% of hunts under a boon, rare or better in 68% of draws and a legendary in 18%, pity forces 6% of draws. Pick rates (greedy): Double Haul 47%, Steady Hands 47%, Lucky Stocking 16%, Sweet Tooth 16%, Free Bait 0%, Cosy Mittens 0%, Starfall 65%, Full Sack 4%, Cocoa Rush 90%, Points Parade 89%, Mulligan 66%, Santa's Blessing 100%, Boss Bell 70%, Cheer Surge 44%.

Not measured: whether the cards and event text read clearly and whether a choice is interesting; that needs the human playtest on `:integration`. Event gold is only counted for boon cards (Grand Gift and Scrinch rewards are inside hunt()).

### Report 3: tweak suggestions and what they do (1,000 players each, all systems on, greedy boons, safe events)

Reference run (before any tweak): 1,221 hunts to rank 5; ranks 118, 242, 450, 377; Cheer fills per 100 hunts Pantry 1.5, Wrapping Room 7.2, Toy Workshop 0.2, Stables 3.2, Loft 1.1. The variants below were run on copies of `content/` (`--content <dir>`).

**Tried and reverted (eddy: the meter filled too fast): Cheer escape penalty 3 to 2 (held stays 5).** Median 1,205 hunts (-1.3%), hunts per fill median 13 (p90 73, was 98), pips lost to escapes 62% (was 70%). Fills per 100 hunts: Pantry 2.1, Wrapping Room 7.6, Toy Workshop 0.2, Stables 4.3, Loft 1.4. It helps the Stables most, but the Toy Workshop stays at 0.2 (one boon per 500 hunts) because a 42% catch rate cannot beat a -2 penalty at +1 a catch.

| Issue | Suggestion | Simulated effect |
| --- | --- | --- |
| Rank 4 too fast | Raise the Yule Marshal (rank 5) point requirement from 160,000 to 217,000. Same effect as cutting every Stables elf's points by a third (rank 4 median 569), but one number, and it leaves Stables gold and loot alone. | Rank 4 median 377 to 561 (target 600), total 1,221 to 1,402; other ranks unchanged |
| Cheer in every area | Beyond -2: escape -1 and held -2 gives Pantry 3.7, Wrapping Room 8.0, Toy Workshop 0.5, Stables 6.1, Loft 2.5 fills per 100 hunts and p90 per fill 45 (target under 45), total 1,197 hunts. The Toy Workshop still gets only about one boon per 200 hunts. To make it fill "occasionally" there, give the Workshop pips from its own loop (an order-board step gives +2 pips), or a Workshop-only meter size of 7. Both need code. | See left |
| Overcharge payoff | Holding to 15 pips already gives a rare or better card in 100% of draws (68% for a normal cash-in) and a legendary in 68% (18%), yet finishes at the same pace (1,265 against 1,262), with half as many boons. Making the top draw even richer (Blazing 0/50/50) moved nothing (hold 1,224 against 1,221). Letting a Blazing draw keep **two** of the cards helped a little (hold 1,217, 0.3% faster than normal cash-in). With the escape cut to -1 (held -2) and two picks it is 1,194 against 1,197 for cash-in: roughly equal. Suggestion: two picks plus boon length +50% on an Overcharged draw, or make Overcharge a pure bragging/risk tool and accept equal pace. | Hold is never more than 0.3% ahead; a payoff needs to be worth about 3 to 5% to feel like a gamble that pays |
| Scrinch toll | Triple the toll (percent tolls 9 to 12% of gold, flat tolls 6 to 12 H). Paying every toll then costs about 27,000 gold per player (18% of gold earned, was 10,100) and finishes 2.9% slower than fighting (1,256 against 1,221); at six times it is 47,800 gold (1,279) and too harsh. | Recommend x3; skipping stops being the free choice |
| Boons | Left as is (decided). | |

**Why the Toy Workshop is rough.** Three things stack. (1) The elves are tough for the gear on hand: commons have 450 to 750 power and the trap at that point is the 900-power Nutcracker Jaws or a weaker one, so a typical common is caught 42% of the time (the Wrapping Room 86%, Stables 78%), and bosses only 9% (mini bosses 20%). (2) Escapes are expensive there: mini bosses and bosses are 6% of encounters but pillage on 35% and 60% of escapes, and their pillage takes a percentage of gold you are carrying (5% and 8%, capped at 10 and 15 times the elf's gold, up to about 10,000 gold), while the Workshop pays only about 70 gold a hunt. So 43% of the gold earned there is lost to pillage (3 to 18% elsewhere). (3) It is the longest stay: a median 553 hunts, with a longest escape streak around 12 and a dry spell of 25 hunts at the worst, and Cheer never fills there. Suggestions: lift the commons' catch rate to about 55% by lowering their power a little (about -15%) or adding a Workshop trap or base at the start; cap the pillage gold in the Workshop at about 5 times the elf's gold; and give the area some pips.

**Portrait goal and a harder boss.** Making the rare elves rarer does nothing useful: with every rare weight at 40% the Stables portrait finishes 146 hunts before the rank-up (171 before), and the Pantry and Stables portraits drop to a 65 to 78% completion rate. Making mini bosses and bosses 40% stronger (together with the 217,000 threshold) does push the Toy Workshop portrait to 56 hunts after the rank-up and the Wrapping Room to 96 after, but the Stables portrait is still done 329 hunts before the rank-up (hunt 1,162 against 1,484), and the Workshop pillage cost rises to 53% and the Stables to 30%. Reason: the rank-up threshold, not the boss, is the long pole in the Stables. Raising the threshold alone makes the portrait goal even easier. So a harder boss only works where the boss is the last thing a player needs: suggestion is a medium rise (+15 to 20% power on Antler Ripper and Cinderhoof only, not Workshop bosses, which already hurt), and to treat the portrait as a bonus that is finished "about 20 to 40% of hunts after the rank-up" by moving the boss to the end of the area's loop (for example the sleigh run launching only after 60 hunts), not by making catches rarer.

### Report 4: the tuning round that was built (1,000 players, Cheer and events on, greedy boons, safe events)

eddy approved: rank 5 at 217,000 points; Scrinch tolls x3; Toy Workshop commons 15% weaker, a pillage cap and Cheer pips from the order board; an Overcharged draw keeps two boons; Antler Ripper and Cinderhoof stronger and Cinderhoof only after the second sleigh launch; escape penalty back to 3. An Overcharged draw is two cards, both rare or better, and you pick one (eddy's wording; first tried as keep-two-of-four, which was 0.7% faster than cashing in).

| Measure | Before | After |
| --- | --- | --- |
| Hunts to rank 5 (median) | 1,221 | 1,342 |
| Hunts in ranks 1 to 4 | 118, 242, 450, 377 | 118, 242, 409, 568 |
| Cheer fills per 100 hunts: Pantry, Wrapping Room, Workshop, Stables, Loft | 1.5, 7.2, 0.2, 3.2, 1.1 | 1.5, 7.2, 4.1, 3.3, 1.1 |
| Hunts per fill (p10 / median / p90) | 9 / 14 / 98 | 7 / 15 / 63 |
| Toy Workshop catch rate (commons) | 40% (42%) | 45% (48%) |
| Toy Workshop pillage as share of gold earned | 43% | 29% |
| Scrinch fight win rate | 52% | 59% |
| Paying every toll: gold per player, pace against fighting | 10,100 (7%), +0.7% | 39,600 (19%), +2.1% |
| Overcharge (hold, no perk) against cash-in | 0.0% | 2.3% slower (1,373 against 1,342); second pick 1.0% faster |
| Median catches per player: Antler Ripper, Cinderhoof | 3.7, 2.6 | 5.7, 4.2 |

Findings:
- **Pace is on target again.** All four ranks are within 25% of target, including rank 4 (568 against 600). Total 1,358 against the old 1,221 is the intended cost of the higher rank 5 threshold; Cheer and events still shave about 6% off (1,453 without them).
- **The Toy Workshop now fills the meter** about once per 25 hunts of order work, 4.1 per 100 hunts (was 0.2). That is close to the Stables (3.3) and not far under the Wrapping Room (7.2). If it feels like too much, `orderPips` 2 to 1 halves it.
- **The pillage cap only works at 2 times the elf's gold.** At 5 times it never binds (the 8% share of held gold is lower), and pillage stayed at 41%; at 2 times it falls to 29%. The Stables boss pillage (30% of gold earned there) is now the highest.
- **The portrait goal still finishes well before the rank-up in the Stables:** Cinderhoof first caught around hunt 1,004, rank-up about 1,358, so 323 hunts early. Requiring five launches moves Cinderhoof to 1,094 (255 early). The Stables are 512 hunts long now, so the portrait cannot be the long pole unless the boss gate is much later or the area's loop is made longer. Suggestions: a 5-launch gate, or Cinderhoof only at a higher Readiness run (for example a Rush run), or accept the portrait as a bonus for the first half of the area.
- **Overcharge perks (one per held draw, you choose):** against cashing in at 10 (1,342 hunts), holding with no perk is 2.3% slower (1,373); with a second pick 1.0% faster (1,329); with boons 50% longer 0.4% slower (1,347); with two Santa's Blessings back to back (they do not stack, so six hunts of x2.5 power) 0.4% slower (1,348; one Blessing was 2.5% slower at 1,375). Only the second pick makes Overcharge pay, because a held draw is rare, so the perk needs to beat three times as many cash-ins. Longer boons and the double Blessing are close to even; if you want them to tempt, raise them (boons 100% longer, or three Blessings).
- **Bait pillage cut:** a thief going for bait now finds none 50% of the time for bought bait and 85% for crafted bait. Gold lost to pillage over a game is 51,000 per player (52,400 before) and pillage cost as a share of gold earned in the Pantry falls from 5% to 3%; bait theft was a small part of the loss, so the change is mostly about feel (crafted ladder bait, which is hard to rebuy, is now almost safe).
- **Gold:** earned per player rises to about 205,600 (from 149,000) because the game is longer; pillage losses 52,400. Gold still piles up late.
- **Progress feel:** any good thing gap p90 2, milestones p90 3, worst dry spell for the median player 25 hunts (11 counting catches).

### Report 5: parallel Toy Workshop orders (1,000 players, seed 42, Cheer and events on, greedy boons, safe events)

eddy found the Order Board too fiddly: the three slots had to be filled in order with a given trap type, so almost every hunt wanted a swap. The board now has three standing orders (Clockwork, Starlight, Frost); every catch fills the order for the armed trap's type. See the Toy Workshop section of `docs/PLAN.md`.

- **The simulated player no longer swaps for the board.** It stays on its best trap, buys the cheapest trap of any type it lacks, and only brings the best trap for an inspecting Hammerhand or General Grimbolt. That is why its old Workshop catch rate (46%) was artificially low: it kept swapping to traps that matched the slot, not the elf.
- **First try, no rebalance:** the Workshop commons were caught about 90% of the time and rank 3 took about 210 hunts (target 400, "too fast"), so rank 5 came at about 1,090 hunts. Cheer fills in the Workshop also jumped to 9.0 per 100 hunts, so each counted catch now adds 1 pip, not 2.
- **Built:** Workshop commons power 1,200 / 1,500 / 1,850 (were 380 / 510 / 640).
- **Result:** median 1,212 hunts to rank 5 (1,359 before). Hunts in ranks 1 to 4: 118, 237, 324, 532 (targets 150, 250, 400, 600, all ok). Toy Workshop: 256 hunts, catch rate 54% (commons 88% of encounters at 55%, rare 50%, mini boss 45%, boss 26%), bait 8% of gold, pillage 15% of gold earned there. About 30 orders finished per player, Hammerhand 4.3 and General Grimbolt 2.5 catches, Cheer fills 3.6 per 100 hunts in the Workshop (4.1 before), 3.4 per 100 overall, median 16 hunts per fill.
- **Not simulated:** the Triple Crate, because the bot never swaps for it. It adds 800 gold and every crate reward per 9 catches if you cycle all three types, which is about one extra crate per three orders; watch it in play and retune `tripleGold` if it feels too strong or too weak.

### Report 6: Scrinch's random events removed (1,000 players, seed 42, Cheer and events on, greedy boons, safe events)

Scrinch challenges, tolls and the boss-escape grudge are gone; random events are now only Santa and Mrs. Claus boons and Grand Gifts. The chance per hunt went from 2.5% to 1.5% so the boon rate stays the same (it was 60% of 2.5%). The Grand Gift pity bar now grows only by +5% per boon.

- **Pace unchanged:** median 1,208 hunts to rank 5 (1,212 in Report 5). Hunts in ranks 1 to 4: 117, 236, 325, 533 (targets 150, 250, 400, 600, all ok).
- **Events:** 1.15 per 100 hunts (boon cards 0.92, Grand Gifts 0.23), median 63 hunts between events (p90 163), 14 events per player, 2.8 Grand Gifts per player. Boon-card gold is 3,837 per player, 2% of gold earned. Report 2's 2.0 per 100 hunts is now about 1.15, with no more grudge-driven events.
- **Gone from the report:** Scrinch fight win rate, tolls paid and the `skip` and `fight` policies (Reports 2 to 4 keep their old numbers as history).

### Report 7: the full-collection benchmark (1,000 players, seed 42, Cheer and events on, greedy boons, safe events)

New standard metric: hunts until every one of the 28 elves has been caught. The simulated player used to stop at rank 5. It now carries on, hunting only rooms that still hold an uncaught elf, until the collection is complete or it hits 20,000 hunts. All other stats in the report are still frozen at the moment of rank 5. Run on `integration` with PR 66 (the Shredwell retune) included.

| Metric | Result |
| --- | --- |
| Players reaching rank 5 | 1,000 of 1,000 |
| Hunts to rank 5 | median 1,226 |
| Players catching all 28 elves | 1,000 of 1,000 (100%) |
| Hunts to catch all elves | **mean 1,252**, median 1,240, p10 1,123, p90 1,400 |
| Extra hunts after rank 5 | p10 0, median 0, p90 41 |

- **Reading it:** the collection is essentially complete by the time rank 5 is reached, so the two benchmarks differ by only about 14 hunts at the median. Boss keys, the Loft detour and the Pantry-to-Stables chain mean a player who ranks up has already met nearly every elf. The Naughty List does not add a long tail for this bot.
- **Caveat:** the bot hunts to rank up and keep catching bosses, so it is a fairly thorough collector. A human who skips the Carol Loft or the mini bosses would take longer, because rank 5 does not need the Loft side area. If eddy wants collection to be a real second goal, the elves to watch are the rare ones and the Loft elves (see the first-catch tail table in the full run).

### Report 8: Cheer Meter resets on travel (200 players, seed 42)

Travelling now clears pips, Overcharge, carry-over, an open draw and active boons. The simulated player cashes in a full meter right away and rarely holds a charge across a move, so nothing shifted: median **1,234 hunts to rank 5**, and **1,243 hunts to catch every elf** (100% of players; mean 1,253, p10 1,134, p90 1,374). Cheer tempo is unchanged: median 16 hunts per fill (p10 9, p90 65), 3.3 draws per 100 hunts. The reset closes the loophole of stockpiling a meter in an easy area and cashing it at a harder one; the simulator does not play that exploit, so it cannot measure what the reset prevents.

### Report 9: Cinderhoof harder with maxed gear (1,000 players, seed 42, Cheer and events on, greedy boons, safe events)

eddy: Cinderhoof's catch rate with maxed gear was too high for a boss. The best Stables build (Snow Globe Prison, Sleigh Runner base, Wind-up Key Charm, power 3,720, luck 6, Frost) caught him 44% of the time; the Sleigh-Bell Snapper build 42%. His power went from 7,000 to **16,800**, which puts the best build at about 25% and the Snapper build at about 23% (Madame Shredwell is about 30% at her rank). Luck barely counts against a boss (x0.1), so only power moves the number.

| Metric | Before (7,000) | After (16,800) |
| --- | --- | --- |
| Best-gear catch rate vs Cinderhoof | 44% | about 25% |
| Hunts to rank 5 | median 1,226 | median 1,266 |
| Hunts to catch all 28 elves | mean 1,252, median 1,240, p10 1,123, p90 1,400 | mean 1,301, median 1,279, p10 1,162, p90 1,461 |
| Ranks 1 to 4 (median hunts) | 117, 237, 333, 538 | 117, 237, 333, 577 |
| Stables hunts, catch rate | 521, 77% | 558, 77% |
| Stables boss catch rate (bot) | 35% | 19% |
| Cinderhoof catches per player | 5.0 | 2.9 |
| Players who ever catch Cinderhoof | 100% | 94% |

- **Reading it:** rank 4 takes about 40 hunts longer (538 to 577), since the sleigh launch needs Cinderhoof to come and go, and the full collection about 40 more (3%). Both stay inside the rank targets (rank 4: 577 against 600). The 6% who never catch him reach rank 5 without it, because rank 5 needs points, not the boss.
- **Not retuned:** gear that is not maxed now catches him well under 25% (for example a Frost trap with 3,000 power is about 13%), so most players need several sleigh launches and the crafted gear; that is the intent.

### Report 10: Carol Horn luck 10 to 1 (1,000 players, seed 42, Cheer and events on, greedy boons, safe events)

eddy: the Carol Horn (a rank 2 Carol trap) caught Stables commons 98% with the best build, beating on-type Frost and Clockwork gear. Luck 10 to 1, power left at 600, and Shredwell with Carol must stay around 30%.

| Metric | Before (luck 10) | After (luck 1) |
| --- | --- | --- |
| Hunts to rank 5 | median 1,264 | median 1,355 |
| Hunts to catch all 28 elves | mean 1,300, median 1,277, p10 1,161, p90 1,439 | mean 1,384, median 1,366, p10 1,236, p90 1,556 |
| Ranks 1 to 4 (median hunts) | 117, 237, 333, 575 | 117, 248, 405, 581 |
| Commons catch rate: Wrapping Room / Toy Workshop / Stables / Carol Loft | 88% / 56% / 80% / 61% | 77% / 44% / 78% / 58% |
| Madame Shredwell catches per player | 1.3 | 1.2 |

**Stables commons, same Yule Log Base and Mistletoe Charm (Hay Hoarder / Bell Thief / Harness Snipper, average):**

| Trap | Type there | Catch | Average |
| --- | --- | --- | --- |
| Jack-in-the-Box (rank 1) | Clockwork | 60 / 51 / 52% | 55% |
| Star Lantern (rank 2) | Starlight | 66 / 46 / 40% | 51% |
| Carol Horn (rank 2) | Carol, weak to none | 69 / 61 / 54% | 61% |
| Icicle Jar (rank 2) | Frost, on-type | 76 / 68 / 54% | 66% |
| Nutcracker Jaws (rank 3) | Clockwork | 77 / 69 / 70% | 72% |

- **Reading it:** the Horn now sits 6 points above the rank 1 trap, 10 above the Star Lantern and 5 below an on-type rank 2 Frost trap. It no longer outshines the on-type traps. The best Carol build (Wishing Star Pedestal) is about 70%; before it was 98%.
- **Shredwell:** Carol Horn on a Candy Cane Platform with a Mistletoe Charm is 30% (31% before), 35% with a Wind-up Key. Power was not raised: luck cannot be traded for power here without lifting Shredwell (+2 points per 50 power).
- **Cost:** the game is 7% longer, because the Horn also made the Wrapping Room and Carol Loft quicker. Rank 3 is 405 against 400. The Toy Workshop commons (44%, target 55 to 65%) were already below target before this change and are not retuned.
