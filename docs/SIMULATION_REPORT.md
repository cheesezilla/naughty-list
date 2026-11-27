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

## Report 3: tweak suggestions and what they do (1,000 players each, all systems on, greedy boons, safe events)

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

## Report 4: the tuning round that was built (1,000 players, Cheer and events on, greedy boons, safe events)

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
- **Overcharge perks (one per held draw, you choose):** against cashing in at 10 (1,342 hunts), holding with no perk is 2.3% slower (1,373); with a second pick 1.0% faster (1,329); with boons 50% longer 0.4% slower (1,347); with a guaranteed Santa's Blessing 2.5% slower (1,375). Only the second pick makes Overcharge pay, because a held draw is rare, so the perk needs to beat three times as many cash-ins. Longer boons and the Blessing are close to even and fine as flavour; if you want them to tempt, raise them (boons 100% longer, or Blessing plus a pick).
- **Bait pillage cut:** a thief going for bait now finds none 50% of the time for bought bait and 85% for crafted bait. Gold lost to pillage over a game is 51,000 per player (52,400 before) and pillage cost as a share of gold earned in the Pantry falls from 5% to 3%; bait theft was a small part of the loss, so the change is mostly about feel (crafted ladder bait, which is hard to rebuy, is now almost safe).
- **Gold:** earned per player rises to about 205,600 (from 149,000) because the game is longer; pillage losses 52,400. Gold still piles up late.
- **Progress feel:** any good thing gap p90 2, milestones p90 3, worst dry spell for the median player 25 hunts (11 counting catches).
