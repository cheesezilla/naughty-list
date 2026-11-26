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

## Done (26 Nov 2026)

All 97 pictures outside the icons are custom art, imported from eddy's downloaded set (one file per id): 29 elf portraits (`imps` slot, incl. `_locked`), 9 traps, 11 bases, 7 baits, 3 charms, 13 materials, 4 trap types, 5 ranks, 5 locations, `lair_map`, `icon`, `key_art` and 8 how-to-play pictures. They are resized to the slot sizes in [ART.md](ART.md) and saved as WebP; traps, bases, baits, charms and materials are transparent, and the trap type and rank badges had their flat background removed. The old generated SVGs for those ids were deleted.

Icons (`icons` slot, 19) stay generated SVG.

Each asset's `prompt` for regenerating it is in `art/manifest.json`. Older custom PNGs of the retired imps are in `art-archive/imps/`.
