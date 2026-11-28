# Changelog

All notable changes to The Naughty List. The format follows [Keep a Changelog](https://keepachangelog.com/), and versions follow [Semantic Versioning](https://semver.org/): see [Developer notes](docs/DEVELOPER_NOTES.md#releasing) for what each kind of bump means and how to cut a release.

Each version's section is also the text of its GitHub Release, so write it for players: what changed in the game, not how.

## [Unreleased]

## [1.0.3] - 2026-11-28

A small patch release.

### Fixes
- More > What's new has a button to show the latest notes popup again, and the popup now follows your save instead of only checking when the page loads.

## [1.0.2] - 2026-11-28

A small patch release.

### Fixes
- Checking the What's new popup: this version has fresh release notes, so the popup shows once when you open the game and is also under More > What's new.

## [1.0.1] - 2026-11-28

A balance and fixes release.

### Fixes
- If the game is updated while you have it open, a popup now asks you to refresh your browser so you get the new version. It also checks when you come back to an idle tab.
- The admin "always catch" switch now works on bosses that are immune to your armed trap type.
- The Cheer Meter now resets when you travel to another area.
- Fixed leftover quiet-hunt wording in hints and badges, and the Carol Loft hint now says Carol Horn needs 5 Hymn Reeds.

### Balance
- **Cinderhoof** is much harder: about 25% to catch even with the best gear.
- **Carol Horn** needs luck 1 instead of 10, and luck now only counts when your trap type matches the elf's weakness.
- Commons and General Grimbolt were tuned to the balance bands, with gold and points raised to keep pace. Recommended gear is now clearly needed for each local boss.
- Small gear buffs: Wind-up Key Charm, Yule Log Base and Gingerbread Cottage.

## [1.0.0] - 2026-11-27

The first full release. The big change since the earlier builds: **there are no quiet hunts any more. Every hunt now meets an elf.**

### Every hunt attracts an elf (Allure)
- Before, a hunt first rolled your bait's attraction, and a miss was a quiet hunt where nothing happened and no bait was used. That roll is gone: **every hunt now attracts an elf and uses your bait.**
- Attraction is now called **Allure**. It no longer decides whether an elf turns up; it decides how strongly your bait pulls the rarer ones. A higher Allure means more rare elves, mini bosses and bosses, and a slightly smaller share of commons.
- The Silent Night badge now asks for 4 escapes in a row, because quiet hunts no longer exist.
- The game moves faster as a result: about 1,200 hunts to reach rank 5 (it was about 1,650).

### Cheer Meter, boons and Overcharge
- Catches fill your **Cheer Meter** (more for rare or better elves) and escapes drain it. When it is full you pick 1 of 3 **boons**, short-lived effects from a pool of 14 (common, rare and legendary).
- Hold on past full and the meter **Overcharges**: you get two rare-or-better cards to choose from, plus one perk first: a second pick, boons that last 50% longer, or two Santa's Blessings.
- Three new **Cheer charms** fill the meter faster.
- The Cheer card shows every buff you have running and how many hunts it has left, and the pips and bars are animated.

### Santa and Mrs. Claus
- After a hunt, Santa or Mrs. Claus may now step in with a boon, and sometimes a free rare **Grand Gift**. A new **Santa's favour** bar tracks how well you are doing with him.
- Scrinch's random events (threats, tolls and fights) were tried and cut. Scrinch stays the villain of the story, but he won't bother you in the middle of a hunt.

### Toy Workshop and other locations
- **Parallel Toy Workshop orders:** three standing orders (Clockwork, Starlight, Frost) fill at the same time, and every catch counts toward the order for the type of trap you have armed. You no longer have to swap traps almost every hunt. Finish all three for a Triple Crate.
- **Madame Shredwell** is much tougher without a Carol trap, and about 30% to catch with the Carol Horn at rank 2 gear. Prepare before you face her.
- Thieves often find no bait to steal, and crafted bait is almost safe. The "no bait left" message is fixed, and every hunt log entry shows the bait you have left.
- Reindeer Stables bosses are tougher, and Cinderhoof only attacks the sleigh after your second launch.
- Rank 5 now needs 217,000 points.
- The **Cookie Pantry** has a goals panel to point new hunters at the next step.

### The Naughty List and interface
- The **Naughty List** opens on the tab for the area you are hunting in, and has an **All** tab showing every elf from every area, rarest first.
- Elves you have not caught yet now show their **name and weakness**; only the portrait, stats and description stay locked.
- The Wrapping Room bait ladder lets you browse every tier, equip or craft from it, and jump straight to the right Workshop recipe.
- Hunt no longer scrolls the page down to the log, so your Cheer Meter stays in view.
- Rare, mini boss and boss catches glow and shimmer in the hunt log, boons have auras, and new hunt log rows slide in.
- **Feedback:** More > Feedback lets you send notes to the admin. Your notes are never wiped by Start over.

### For admins and the curious
- **Release notes in the game:** the first time you open the game after an update you see **What's new**, and you can read every version's notes any time under **More > What's new**.
- A strategy **walkthrough** (docs/WIKI.md) takes you from the Cookie Pantry to the last boss.
- The simulator now reports how many hunts it takes to reach rank 5 **and** to catch every elf (about 1,250 hunts for a full collection).

[Unreleased]: https://github.com/cheesezilla/naughty-list/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/cheesezilla/naughty-list/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cheesezilla/naughty-list/releases/tag/v1.0.0
