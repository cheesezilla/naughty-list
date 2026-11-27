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

## Latest findings (27 Nov 2026, `integration` at PR 75)

**Result: 19 open flags on `integration` (PR 76 not included). With PR 76 (Carol Horn luck 10 to 1) applied the same check gives 13.** Nothing was changed in `content/` by this PR; these are for eddy to decide.

1. **Carol Horn is the cheese trap (fixed by PR 76).** With luck 10 it catches Wrapping Room commons 98% (intended gear 79%), Toy Workshop commons 61.5% (Nutcracker Jaws 57.3%) and Stables commons 76.8% (Snow Globe Prison 77.1%), for 600 gold and a few Loft drops. It is also the best trap for 6 of 28 elves at endgame and makes Star Lantern, Icicle Jar and Wreath look worthless. With luck 1 all three cheese flags and the Wreath, Snapper and Wishbone Plinth low-value flags disappear.
2. **Commons are easier than the targets in PLAN.md.** Pantry 88% (target 60 to 70), Wrapping Room 79% (55 to 65), Stables 77% (45 to 55); only the Toy Workshop (57%) is in band. This matches the simulator (Wrapping Room 86% in Report 7), so either the bands are stale (they date from before Allure and hexed elves) or three areas are too easy. Retarget the bands or raise elf power; the sim's rank pace is already on target, so retargeting is probably right.
3. **General Grimbolt is too easy with endgame gear: 73% (Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm) against a 60% boss ceiling.** A fresh player catches him 41%, which is fine. Madame Shredwell (30% with Carol, 12.7% off-type, 54.8% endgame) and Cinderhoof (17.8% fresh, 25.0% endgame) are on their targets. No boss is near impossible: the lowest endgame rate is Cinderhoof's 25%.
4. **Star Lantern (1,200 gold) is dominated.** The Icicle Jar (500 power, frost) beats it even against Starlight-weak elves (500 vs 300 x 1.5 = 450), and Carol Horn beats both for most elves. It is never the best trap of its tier.
5. **Core-line gear is dominated by optional gear.** Candy Cane Platform (power 200) is never used: Toffee Anvil (300) and Wishbone Plinth (luck 4) beat it. Ice Block adds 0 over the other rank 3 options. Icicle Jar and Nutcracker Jaws add under 1.5 points on arrival.
6. **Optional crafts with little benefit:** Sleigh-Bell Snapper (15,000 gold + 5 materials) adds +0.7 points on arrival at the Stables, because Snow Globe Prison (frost, x1.5 against Cinderhoof and the Stables elves) matches its power. It is only the best trap for General Grimbolt, who is not in the Stables. Gingerbread Cottage (8,000 + 6 materials) adds +1.1 on bosses, Chestnut Brazier 0, Toffee Anvil +1.2, Wishbone Plinth +0.5 (their value is attraction, bait cost or luck, which this check does not price). Sleigh Runner (+5.2 bosses) and Wishing Star Pedestal (+3.9 overall) are worth their cost.
7. **Charms are fine:** Mistletoe adds 3.5 points on commons, Wind-up Key 3.4 on mini bosses and bosses.

Known limits: "no value" for a base with an attraction or bait-cost job (Brazier, Cottage) means no catch-rate value, not no value at all; add it to `accepted` with that reason if that is the intent.

<!-- balance:generated:start -->
Generated by `npm run balance` from `content/*.json` and `balance/thresholds.json`. Do not edit by hand; run `npm run balance -- --write`.

### Flags (19)

- **commons-band** · Cookie Pantry: commons are caught 88.1% with Jack-in-the-Box + Gingerbread Slab, target 60.0% to 70.0% (too easy).
- **commons-band** · Wrapping Room: commons are caught 79.2% with Star Lantern + Candy Cane Platform, target 55.0% to 65.0% (too easy).
- **commons-band** · Reindeer Stables: commons are caught 77.1% with Snow Globe Prison + Yule Log Base, target 45.0% to 55.0% (too easy).
- **too-easy-endgame** · General Grimbolt: boss is caught 73.3% with endgame gear (Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm); ceiling 60.0%.
- **cheese** · Carol Horn in Wrapping Room: Carol Horn (rank 2, carol, luck 10) on Candy Cane Platform: commons 98.0% (+18.8 pts over the intended gear). Intended gear gets 79.2% on commons.
- **cheese** · Carol Horn in Toy Workshop: Carol Horn (rank 2, carol, luck 10) on Ice Block: commons 61.5% (+4.2 pts vs the intended gear, but it is a rank 2 trap in a rank 3 area). Intended gear gets 57.3% on commons.
- **cheese** · Carol Horn in Reindeer Stables: Carol Horn (rank 2, carol, luck 10) on Yule Log Base: commons 76.8% (-0.2 pts vs the intended gear, but it is a rank 2 trap in a rank 4 area). Intended gear gets 77.1% on commons.
- **obsolete-trap** · Star Lantern: Star Lantern (starlight, rank 2) is not the best trap of its own tier for any elf at or above its rank; it is dominated.
- **low-value-gear** · Star Lantern: Star Lantern costs 1,200 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Icicle Jar: Icicle Jar costs 3,000 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Nutcracker Jaws: Nutcracker Jaws costs 9,000 gold and adds +1.4 pts (bosses) / +0.5 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Constellation Wreath: Constellation Wreath costs 6,000 gold + 5 materials and adds +2.8 pts (bosses) / +0.9 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Sleigh-Bell Snapper: Sleigh-Bell Snapper costs 15,000 gold + 5 materials and adds +0.0 pts (bosses) / +0.7 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Candy Cane Platform: Candy Cane Platform costs 2,500 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Ice Block: Ice Block costs 8,000 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Toffee Anvil: Toffee Anvil costs 3,500 gold and adds +1.2 pts (bosses) / +0.3 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Chestnut Brazier: Chestnut Brazier costs 3,500 gold and adds +0.0 pts (bosses) / +0.0 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Wishbone Plinth: Wishbone Plinth costs 4,500 gold and adds +0.5 pts (bosses) / +0.8 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).
- **low-value-gear** · Gingerbread Cottage: Gingerbread Cottage costs 8,000 gold + 6 materials and adds +1.1 pts (bosses) / +0.5 pts (all elves) on arrival and +0.0 / +0.0 over the long run (no value).

### 1. Areas: commons catch rate with the intended gear

| Area | Intended gear | Commons caught | Target band | Status | Best possible (any gear) |
| --- | --- | --- | --- | --- | --- |
| Cookie Pantry | Jack-in-the-Box + Gingerbread Slab | 88.1% | 60.0% to 70.0% | too easy | 98.0% |
| Wrapping Room | Star Lantern + Candy Cane Platform | 79.2% | 55.0% to 65.0% | too easy | 98.0% |
| Toy Workshop | Nutcracker Jaws + Ice Block | 57.3% | 55.0% to 65.0% | ok | 96.0% |
| Reindeer Stables | Snow Globe Prison + Yule Log Base | 77.1% | 45.0% to 55.0% | too easy | 98.0% |
| Carol Loft | Icicle Jar + Candy Cane Platform | 78.6% | - | n/a | 98.0% |

### 2. Rare, mini boss and boss catch rates: fresh player vs endgame gear

Fresh = the best trap the player could own on entering the area, on the area's base, no charm. Endgame = best trap, base and charm of everything in the game. Best setup per elf.

| Elf | Area | Tier | Power | Fresh player | Endgame gear | Targets |
| --- | --- | --- | --- | --- | --- | --- |
| Gingerbread Rascal | Cookie Pantry | rare | 160 | 60.5% (Jack-in-the-Box + Gingerbread Slab) | 98.0% (Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm) | - |
| Glitterbug | Wrapping Room | rare | 350 | 85.3% (Carol Horn + Candy Cane Platform) | 98.0% (Star Lantern + Wishing Star Pedestal + Mistletoe Charm) | - |
| Spoolwick | Wrapping Room | miniboss | 600 | 63.6% (Carol Horn + Candy Cane Platform) | 89.7% (Constellation Wreath + Sleigh Runner + Wind-up Key Charm) | - |
| Madame Shredwell | Wrapping Room | boss | 2900 | 30.2% (Carol Horn + Candy Cane Platform) | 54.8% (Carol Horn + Sleigh Runner + Wind-up Key Charm) | fresh not:carol: 12.7% vs target 10.0% ok; fresh only:carol: 30.2% vs target 30.0% ok |
| Wind-up Elf | Toy Workshop | rare | 900 | 70.3% (Nutcracker Jaws + Ice Block) | 94.4% (Carol Horn + Wishing Star Pedestal + Mistletoe Charm) | - |
| Hammerhand | Toy Workshop | miniboss | 1600 | 46.4% (Icicle Jar + Ice Block) | 78.1% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |
| General Grimbolt | Toy Workshop | boss | 2800 | 41.3% (Nutcracker Jaws + Ice Block) | 73.3% (Sleigh-Bell Snapper + Sleigh Runner + Wind-up Key Charm) | - |
| Carrot Crook | Reindeer Stables | rare | 2000 | 66.5% (Snow Globe Prison + Yule Log Base) | 74.3% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |
| Antler Ripper | Reindeer Stables | miniboss | 4100 | 47.5% (Snow Globe Prison + Yule Log Base) | 57.9% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | - |
| Cinderhoof | Reindeer Stables | boss | 16800 | 17.8% (Snow Globe Prison + Yule Log Base) | 25.0% (Snow Globe Prison + Sleigh Runner + Wind-up Key Charm) | endgame: 25.0% vs target 25.0% ok |
| Silver Piper | Carol Loft | rare | 500 | 59.5% (Icicle Jar + Candy Cane Platform) | 98.0% (Carol Horn + Yule Log Base + Mistletoe Charm) | - |
| Choirmaster Hollowvoice | Carol Loft | miniboss | 1000 | 41.6% (Icicle Jar + Candy Cane Platform) | 79.8% (Carol Horn + Sleigh Runner + Wind-up Key Charm) | - |

### 3. Cheese check: fresh gear that outclasses the area's intended gear

| Area | Other trap the player may own | Commons caught | vs intended gear (pts) | Status |
| --- | --- | --- | --- | --- |
| Cookie Pantry | Starlit Stocking (starlight) | 74.6% | -13.5 | ok |
| Wrapping Room | Starlit Stocking (starlight) | 62.7% | -16.5 | ok |
| Wrapping Room | Jack-in-the-Box (clockwork) | 60.9% | -18.3 | ok |
| Wrapping Room | Icicle Jar (frost) | 81.9% | +2.7 | ok |
| Wrapping Room | Carol Horn (carol) | 98.0% | +18.8 | FLAG |
| Toy Workshop | Starlit Stocking (starlight) | 28.2% | -29.1 | ok |
| Toy Workshop | Jack-in-the-Box (clockwork) | 35.6% | -21.7 | ok |
| Toy Workshop | Star Lantern (starlight) | 39.0% | -18.3 | ok |
| Toy Workshop | Icicle Jar (frost) | 38.0% | -19.3 | ok |
| Toy Workshop | Carol Horn (carol) | 61.5% | +4.2 | FLAG |
| Reindeer Stables | Jack-in-the-Box (clockwork) | 45.6% | -31.4 | ok |
| Reindeer Stables | Star Lantern (starlight) | 41.0% | -36.0 | ok |
| Reindeer Stables | Icicle Jar (frost) | 59.6% | -17.5 | ok |
| Reindeer Stables | Carol Horn (carol) | 76.8% | -0.2 | FLAG |
| Reindeer Stables | Nutcracker Jaws (clockwork) | 64.1% | -12.9 | ok |
| Reindeer Stables | Constellation Wreath (starlight) | 62.7% | -14.4 | ok |
| Carol Loft | Starlit Stocking (starlight) | 54.5% | -24.1 | ok |

### 4. Traps: does each one have a niche?

Niche = elves it catches best of all traps of its own rank or lower, using the best base of that rank or lower. A trap with no niche is dominated by something cheaper or earlier.

| Trap | Type | Rank | Price | Elves where best of its tier | Elves where best at endgame | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Starlit Stocking | starlight | 1 | crafted/start | 4 of 28 | 0 of 28 | starter |
| Jack-in-the-Box | clockwork | 1 | 300 | 24 of 28 | 0 of 28 | ok |
| Star Lantern | starlight | 2 | 1200 | 0 of 23 | 0 of 28 | FLAG |
| Carol Horn | carol | 2 | crafted/start | 19 of 23 | 6 of 28 | ok |
| Icicle Jar | frost | 2 | 3000 | 4 of 23 | 0 of 28 | ok |
| Nutcracker Jaws | clockwork | 3 | 9000 | 1 of 12 | 0 of 28 | ok |
| Constellation Wreath | starlight | 3 | crafted/start | 2 of 12 | 1 of 28 | ok |
| Snow Globe Prison | frost | 4 | 25000 | 3 of 6 | 4 of 28 | ok |
| Sleigh-Bell Snapper | clockwork | 4 | crafted/start | 1 of 6 | 1 of 28 | ok |

### 5. Gear value: how much does each trap and base add, and what does it cost?

Gain = mean change in catch rate (best setup per elf) from owning the item, over **mini bosses and bosses** and over **all elves**, in areas of the item's rank or higher. "On arrival" counts only gear of its own rank or lower; "lasting" counts everything in the game. Cost = gold plus crafting materials.

| Item | Kind | Rank | Cost | On arrival: bosses / all (pts) | Lasting: bosses / all (pts) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Jack-in-the-Box | trap | 1 | 300 gold | +0.0 / +7.8 | +0.0 / +0.0 | replaced later |
| Star Lantern | trap | 2 | 1,200 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Carol Horn | trap | 2 | 600 gold + 6 materials | +15.3 / +8.9 | +0.5 / +1.1 | replaced later |
| Icicle Jar | trap | 2 | 3,000 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Nutcracker Jaws | trap | 3 | 9,000 gold | +1.4 / +0.5 | +0.0 / +0.0 | FLAG: no value |
| Constellation Wreath | trap | 3 | 6,000 gold + 5 materials | +2.8 / +0.9 | +0.0 / +0.0 | FLAG: no value |
| Snow Globe Prison | trap | 4 | 25,000 gold | +14.4 / +7.4 | +1.9 / +0.8 | replaced later |
| Sleigh-Bell Snapper | trap | 4 | 15,000 gold + 5 materials | +0.0 / +0.7 | +0.0 / +0.0 | FLAG: no value |
| Gingerbread Slab | base | 1 | 500 gold | +0.0 / +5.5 | +0.0 / +0.0 | replaced later |
| Candy Cane Platform | base | 2 | 2,500 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Ice Block | base | 3 | 8,000 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Yule Log Base | base | 3 | 4,000 gold + 6 materials | +3.4 / +6.7 | +0.0 / +0.0 | replaced later |
| Toffee Anvil (Bosses and mini bosses) | base | 2 | 3,500 gold | +1.2 / +0.3 | +0.0 / +0.0 | FLAG: no value |
| Chestnut Brazier (Cheap bait) | base | 2 | 3,500 gold | +0.0 / +0.0 | +0.0 / +0.0 | FLAG: no value |
| Wishbone Plinth (Farming common elves) | base | 2 | 4,500 gold | +0.5 / +0.8 | +0.0 / +0.0 | FLAG: no value |
| Sleigh Runner (Bosses, best with Clockwork traps) | base | 4 | 12,000 gold + 4 materials | +5.2 / +2.4 | +4.0 / +1.9 | ok |
| Gingerbread Cottage (Cheap bait, best with Frost traps) | base | 4 | 8,000 gold + 6 materials | +1.1 / +0.5 | +0.0 / +0.0 | FLAG: no value |
| Wishing Star Pedestal (Elves that resist your trap, best with Starlight and Carol traps) | base | 4 | 12,000 gold + 7 materials | +0.0 / +3.9 | +0.0 / +3.2 | ok |

### 6. Charms: what a catch charm adds on top of the best setup

| Charm | Stats | Price | Commons (pts) | Mini bosses and bosses (pts) | All elves (pts) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Mistletoe Charm | 0 power / 0% / 4 luck | 30 | +3.5 | +0.9 | +2.2 | ok |
| Wind-up Key Charm | 0 power / +20% / 0 luck | 60 | +0.5 | +3.4 | +1.3 | ok |

Attraction and Cheer charms (Jingle Bell, Cheer charms) do not change catch chance and are not measured here.

### 7. Top setups in each area (commons, every trap x base x charm)

| Area | Top 3 for commons |
| --- | --- |
| Cookie Pantry | Starlit Stocking + Gingerbread Slab + Mistletoe Charm 98.0%<br>Starlit Stocking + Candy Cane Platform + Mistletoe Charm 98.0%<br>Starlit Stocking + Ice Block + Mistletoe Charm 98.0% |
| Wrapping Room | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Yule Log Base + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Wishing Star Pedestal 98.0% |
| Toy Workshop | Carol Horn + Wishing Star Pedestal + Mistletoe Charm 96.0%<br>Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm 92.6%<br>Sleigh-Bell Snapper + Wishing Star Pedestal + Wind-up Key Charm 86.7% |
| Reindeer Stables | Carol Horn + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Sleigh-Bell Snapper + Wishing Star Pedestal + Mistletoe Charm 95.1%<br>Carol Horn + Yule Log Base + Mistletoe Charm 91.3% |
| Carol Loft | Starlit Stocking + Wishing Star Pedestal + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Yule Log Base + Mistletoe Charm 98.0%<br>Jack-in-the-Box + Wishing Star Pedestal + Mistletoe Charm 98.0% |
<!-- balance:generated:end -->
