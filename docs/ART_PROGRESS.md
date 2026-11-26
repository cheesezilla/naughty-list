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

- **imps** (24 of 24, done): `crumb_imp`, `gingerbread_imp`, `glitter_imp`, `madame_shredwell`, `windup_imp`, `foreman_grimbolt`, `carrot_crook`, `grizzlewick`, `_locked` (PR #13); `sprinkle_snatcher`, `chimney_soot_imp`, `jarbelly`, `ribbon_tangler`, `tape_biter`, `bow_burglar`, `spoolwick`, `cog_pincher`, `paint_smudger`, `stuffing_ripper`, `hammerhand`, `hay_hoarder`, `bell_thief`, `harness_snipper`, `antler_ripper` (this pass). `baron_crumblewick` was parked in the location rework (PR #18) and dropped from the art manifest, so the imp roster is 24 now, not 25
- **traps** (8 of 8, done): `jack_in_the_box`, `icicle_jar`, `nutcracker_jaws`, `snow_globe_prison`, `sleigh_bell_snapper` (PR #14), `starlit_stocking`, `star_lantern`, `constellation_wreath` (replacing the three retired Holly traps from PR #17)
- **bases** (5 of 5, done): `cardboard_box`, `gingerbread_slab`, `candy_cane_platform`, `ice_block` (PR #14), `yule_log_base`
- **locations** (4 of 4, done): `cookie_pantry`, `wrapping_room`, `toy_workshop`, `reindeer_stables`
- **brand** (2 of 2, done): `icon`, `key_art`
- **ranks** (5 of 5, done): `rank_1`, `rank_2`, `rank_3`, `rank_4`, `rank_5`

## Still queued

- **baits** (5): `stale_cookie`, `sugar_cookie`, `peppermint_bark`, `fruitcake`, `hot_cocoa`
- **charms** (3): `mistletoe_charm`, `jingle_bell_charm`, `windup_key_charm`
- **materials** (10): `candied_peel`, `sugar_glass`, `cookie_tin`, `brass_spring`, `golden_ribbon`, `enchanted_wrapping`, `toymakers_gear`, `clockwork_heart`, `silver_sleighbell`, `brimstone_coal`
- **trap_types** (3): `clockwork`, `starlight`, `frost` (`starlight` replaced `holly` in PR #17)
- **map** (1): `lair_map`
- **howto** (8): `hunt`, `attraction`, `power`, `luck`, `trap_types`, `loot`, `pillage`, `ranks`

30 pictures left (excluding icons). Each asset's `prompt` for regenerating it is in `art/manifest.json`.
