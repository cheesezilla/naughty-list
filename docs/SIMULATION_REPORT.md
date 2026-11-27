# Simulation report

Written for eddy. Findings and recommendations first, numbers second. Report 1 used `npm run simulate -- --players 1000 --seeds 5` (5,000 virtual hunters). Report 2 uses 1,000 players, seed 1 per scenario (eddy asked to cut the run time); the baseline there is 1,286 against 1,291 above, so the two agree within 0.5%. Tuning is a separate task: nothing in `content/` changed.

## Report 1: baseline (Allure built, no Cheer Meter or events yet)

### Conclusions

1. **The pace is stable and lands close to target, except rank 4.** Median 1,291 hunts to rank 5 (seeds 1 to 5: 1,286 to 1,297, so a 1,000-player run is trustworthy). Ranks 1 to 3 are within the 25% band (121, 269, 475 against 150, 250, 400). Rank 4 takes a median 400 hunts against a target of 600, so it is flagged too fast; its p90 is 883, so some players are far slower (the ones who miss gear). Recommendation: slow rank 4 (more points per rank or lower elf points in the Stables) only after Cheer and events are measured, since they will speed it up further.
2. **The Toy Workshop is the rough patch.** Players spend a median 553 hunts there with a catch rate of 39% (commons 42%, bosses 9%, mini bosses 20%), and pillages eat 45% of the gold earned there (3 to 17% elsewhere). The Stables by contrast catch at 76%. Recommendation: lift Workshop commons a little, and cap pillage gold there; it is the one area where escapes dominate the feel.
3. **Completion goals are not yet a real target.** The Pantry portrait is complete by hunt 57, long before the rank-up (121). In the Stables, the median player has caught every elf 173 hunts before they rank up; the Toy Workshop completes exactly at rank-up. Only the Wrapping Room asks for extra hunts after the rank-up (87). The plan's target is 20 to 40% extra hunts; today the rare and mini boss are not a long tail. Recommendation: make the optional goal need more (lower Allure weight for rares and mini bosses in the Stables and Workshop, or a goal reward worth chasing).
4. **Bait is the clock only in the first area.** Bait cost is 65% of gold earned in the Pantry, 36% in the Carol Loft, then 13%, 11% and 3%. By rank 4 players hold a median 23,650 gold and 83,858 at the end, so gold has nothing to buy. If Cheer and events add gold, this gets looser. Recommendation: later gold sinks, or higher late bait prices.
5. **Bad luck is long.** The longest escape streak is a median 13 hunts, p90 20, max 40. Much of that is in the Workshop.
6. **Short-term progress mostly works.** A catch or milestone happens every 1 hunt (median), p90 3, p99 8. Counting only milestones (first catch, loot, rank-up, key, objective step, badge, purchase) the p90 gap is 5 hunts, p99 16, and the median player has a dry spell of 30 hunts at their worst. Passing the plan's target (median 3 or less, p90 under 10), but the 30-hunt dry spell is where pips and event ticks should help. Loot drops on only 6% of hunts.
7. **Two craftable traps and one base are almost never made:** Constellation Wreath 0%, Gingerbread Cottage 0%, Toffee Anvil 27%, Star Lantern 42%. Not a bug, but nobody picks the Starlight route.

### Numbers (5,000 players)

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

## Report 2: with the Cheer Meter and random events (PR 50)

Scenarios: everything off; Cheer only with three boon policies (`greedy` value table, `random`, `hold` = Overcharge to 15 pips); events only with `safe` (boon card option a, fight Scrinch), `big` (option b) and `skip` (pay every Scrinch toll); and both on (greedy, safe). `fight` is the same as `safe` in the simulator because it never pays the toll. 1,000 players each. Nothing in `content/` changed.

### Conclusions

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

### Numbers (1,000 players each)

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
