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

- **imps** (10 of 25): `crumb_imp`, `gingerbread_imp`, `baron_crumblewick`, `glitter_imp`, `madame_shredwell`, `windup_imp`, `foreman_grimbolt`, `carrot_crook`, `grizzlewick`, `_locked` — PR #13
- **traps** (5 of 8): `jack_in_the_box`, `icicle_jar`, `nutcracker_jaws`, `snow_globe_prison`, `sleigh_bell_snapper` — PR #14. (The three Holly traps from PR #14 were retired in PR #17 when Holly became Starlight; their replacements are queued below.)
- **bases** (4 of 5): `cardboard_box`, `gingerbread_slab`, `candy_cane_platform`, `ice_block` — PR #14

## Still queued

- **traps** (3, new in PR #17, simple generated SVG for now): `starlit_stocking`, `star_lantern`, `constellation_wreath`
- **bases** (1): `yule_log_base`
- **baits** (5): `stale_cookie`, `sugar_cookie`, `peppermint_bark`, `fruitcake`, `hot_cocoa`
- **charms** (3): `mistletoe_charm`, `jingle_bell_charm`, `windup_key_charm`
- **materials** (10): `candied_peel`, `sugar_glass`, `cookie_tin`, `brass_spring`, `golden_ribbon`, `enchanted_wrapping`, `toymakers_gear`, `clockwork_heart`, `silver_sleighbell`, `brimstone_coal`
- **trap_types** (3): `clockwork`, `starlight`, `frost` (`starlight` replaced `holly` in PR #17)
- **brand** (2): `icon`, `key_art`
- **locations** (4): `cookie_pantry`, `wrapping_room`, `toy_workshop`, `reindeer_stables`
- **map** (1): `lair_map`
- **imps** (15 of 25): `sprinkle_snatcher`, `chimney_soot_imp`, `jarbelly`, `ribbon_tangler`, `tape_biter`, `bow_burglar`, `spoolwick`, `cog_pincher`, `paint_smudger`, `stuffing_ripper`, `hammerhand`, `hay_hoarder`, `bell_thief`, `harness_snipper`, `antler_ripper`
- **ranks** (5): `rank_1`, `rank_2`, `rank_3`, `rank_4`, `rank_5`
- **howto** (7): `hunt`, `attraction`, `power`, `luck`, `trap_types`, `loot`, `ranks`

59 pictures left (excluding icons). Each asset's `prompt` for regenerating it is in `art/manifest.json`.
