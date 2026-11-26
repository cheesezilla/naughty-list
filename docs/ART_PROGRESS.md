# Custom art generation progress

Tracks the pass replacing the generated SVG art (from PR #10) with custom
AI-generated pictures, asset by asset. See [ART.md](ART.md) for the naming
rule and how a replacement picture is picked up, and
[PLAN.md](PLAN.md#art) for the overall art section.

Icons (`icons` slot: `nav_*`, `menu_*`, `stat_*`, 19 total) are **not** being
regenerated — they're plain single-colour shapes the SVG generator already
does well.

How these are generated (tools, prompts, transparency via `rembg`, Gemini's
daily quota): see the `gemini-art-generation` project memory.

## Done

- ~~**imps** (24 of 24)~~: the custom imp portraits (PRs #13 and #22) were retired when the imps became hexed elves. They are kept in `art-archive/imps/` for reference and are back in the queue below as elf portraits
- **traps** (8 of 8, done): `jack_in_the_box`, `icicle_jar`, `nutcracker_jaws`, `snow_globe_prison`, `sleigh_bell_snapper` (PR #14), `starlit_stocking`, `star_lantern`, `constellation_wreath` (replacing the three retired Holly traps from PR #17)
- **bases** (5 of 5, done): `cardboard_box`, `gingerbread_slab`, `candy_cane_platform`, `ice_block` (PR #14), `yule_log_base`
- **locations** (4 of 4, done): `cookie_pantry`, `wrapping_room`, `toy_workshop`, `reindeer_stables`
- **brand** (2 of 2, done): `icon`, `key_art`. Both still show imps; redo queued below
- **ranks** (5 of 5, done): `rank_1`, `rank_2`, `rank_3`, `rank_4`, `rank_5`

## Still queued

- **imps slot: hexed-elf portraits** (24, backlog while Gemini is paused, eddy 26 Nov 2026): `crumb_elf`, `sprinkle_snatcher`, `sootcap`, `jarbelly`, `gingerbread_rascal`, `ribbon_tangler`, `tape_biter`, `bow_burglar`, `glitterbug`, `spoolwick`, `madame_shredwell`, `cog_pincher`, `paint_smudger`, `stuffing_ripper`, `windup_elf`, `hammerhand`, `general_grimbolt`, `hay_hoarder`, `bell_thief`, `harness_snipper`, `carrot_crook`, `antler_ripper`, `cinderhoof`, `_locked`. They are simple generated SVGs for now (pointed ears and caps in the room colour, a soot smudge from the hex). Keep each elf's prop and room background from the old imp portrait where it still fits; the manifest `prompt` for each has the new look. Gingerbread Rascal (a living gingerbread man), General Grimbolt (a nutcracker soldier) and Cinderhoof (a soot-black reindeer with ember antlers) are new designs; keep them our own, not copied from any film or ballet
- **brand redo** (2): `icon` and `key_art` show horned imps; redraw with hexed elves (key art: Scrinch's shadow over the lair, elf silhouettes in pointed caps)
- **baits** (5): `stale_cookie`, `sugar_cookie`, `peppermint_bark`, `fruitcake`, `hot_cocoa`
- **charms** (3): `mistletoe_charm`, `jingle_bell_charm`, `windup_key_charm`
- **materials** (10): `candied_peel`, `sugar_glass`, `cookie_tin`, `brass_spring`, `golden_ribbon`, `enchanted_wrapping`, `toymakers_gear`, `clockwork_heart`, `silver_sleighbell`, `brimstone_coal`
- **trap_types** (3): `clockwork`, `starlight`, `frost` (`starlight` replaced `holly` in PR #17)
- **map** (1): `lair_map`
- **howto** (8): `hunt`, `attraction`, `power`, `luck`, `trap_types`, `loot`, `pillage`, `ranks`

56 pictures left (excluding icons). Each asset's `prompt` for regenerating it is in `art/manifest.json`.
