# Simulation report

Written for eddy. Findings and recommendations first, numbers second. Run with `npm run simulate -- --players 1000 --seeds 5` (5,000 virtual hunters, seeds 1 to 5, the real engine and content). Tuning is a separate task: nothing in `content/` changed.

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
