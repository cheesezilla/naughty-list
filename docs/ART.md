# Game art: names, slots and how to replace a picture

Every picture in the game lives in `src/client/public/art/` and is served at `/art/...`. The first set is original vector art (SVG) drawn in code by `scripts/art/`, in one house style. Any file can be swapped for a hand-made or AI-generated image without touching game code.

A pass replacing the generated SVGs with custom AI-generated pictures is in progress, asset by asset. See [ART_PROGRESS.md](ART_PROGRESS.md) for what's done and what's still queued.

## Naming rule

```
src/client/public/art/<slot>/<id>.<ext>
```

- **slot** is the kind of picture (table below) and is also the folder name.
- **id** is the game-data id from `content/*.json` (for example `jack_in_the_box`, `crumb_imp`, `cookie_pantry`), so the game finds a picture by the same key it already uses for the thing itself. Pictures that are not game data use the fixed ids in the table.
- **ext** is `svg` for the generated art. A replacement may be `png`, `webp`, `jpg`, `avif` or `gif`.
- Ids are lower case `snake_case`. An id that starts with `_` is a special state, not game data (`imps/_locked`).

`src/client/public/art/manifest.json` lists every picture: `id`, `slot`, `file`, `width`, `height`, `transparent`, `source` (`generated` or `custom`), a one-line `description` and a `prompt` you can paste into an image tool to make a new version. Some entries carry extra fields, listed below. The UI should read paths from the manifest rather than build them, so a `png` replacement just works.

## Slots

| Slot (folder) | Ids | Size (px) | Background | Used on |
| --- | --- | --- | --- | --- |
| `brand` | `icon`, `key_art` | icon 1024×1024; key art 1170×1290 | Filled | Top strip and login (icon); login screen, full bleed (key art) |
| `traps` | trap ids | 600×450 | Transparent | Hunt screen, Arsenal, Emporium, Workshop. Drawn **on top of** the base |
| `bases` | base ids | 600×450 | Transparent | Same places, drawn **under** the trap |
| `baits` | bait ids | 512×512 | Transparent | Thumbnails everywhere |
| `charms` | charm ids | 512×512 | Transparent | Thumbnails everywhere |
| `materials` | material ids | 512×512 | Transparent | Workshop ingredients, loot lines |
| `trap_types` | `clockwork`, `starlight`, `frost` | 256×256 | Transparent corners | Trap type badges, imp weakness hints |
| `locations` | location ids | 1170×470 (5:2) | Filled | Hunt screen banner; crop with `object-fit: cover` for Travel list thumbnails |
| `map` | `lair_map` | 1600×900 (16:9) | Filled | Travel map. Entry has `pins`: `{ "<location id>": { "x", "y" } }` in map pixels |
| `imps` | imp ids, plus `_locked` | 512×512 | Filled card | Naughty List grid, imp file, hunt log. `_locked` is the "?" card for imps not caught yet. Entries have `tier` and `location` |
| `ranks` | `rank_<number>` (`rank_1` … `rank_5`) | 256×256 | Transparent | Top bar rank thumbnail, rank-up, How to play |
| `icons` | `nav_*`, `menu_*`, `stat_*` (below) | 24×24 | Transparent | Bottom nav, More menu, stat labels |
| `howto` | `hunt`, `attraction`, `power`, `luck`, `trap_types`, `loot`, `ranks` | 640×360 | Filled | How to play page, one per section |

Icons: `nav_hunt`, `nav_naughty_list`, `nav_emporium`, `nav_workshop`, `nav_more`, `menu_travel`, `menu_hunters`, `menu_stats`, `menu_howto`, `menu_settings`, `menu_admin`, `menu_account`, `menu_logout`, `stat_gold`, `stat_points`, `stat_power`, `stat_luck`, `stat_attraction`, `stat_catch`. They are line icons drawn in `currentColor`, so to colour them with the text, inline them or use them as a CSS `mask-image`; as a plain `<img>` they draw in black.

**Layering traps and bases:** both share one 600×450 canvas. The base's top surface and the trap's bottom are both at y = 340, so stacking the two images at the same size and position puts the trap on the base. Keep that line when you replace either one. Trap and base entries carry `layer` (`trap` or `base`).

## Replacing a picture

1. Make the new image at the size in the table (bigger is fine if the aspect ratio matches). The manifest `prompt` gives the subject, framing and house style.
2. Save it next to the old one with the same name and your extension, for example `art/imps/crumb_imp.png`. You can delete the old `.svg` or leave it.
3. Run `npm run art`. It sees the custom file, points the manifest at it and marks it `"source": "custom"`. It never overwrites a custom file.

You can also edit or replace an `.svg` directly: the generator only overwrites SVGs that still contain the `generated-by: scripts/art` comment, so remove that line from a hand-edited SVG to keep it.

## Regenerating the vector art

- `npm run art` writes any missing or changed generated SVGs and rebuilds the manifest.
- `npm run art -- --force` rewrites every generated SVG (custom files are still kept).
- Drawings live in `scripts/art/`: `items.ts` (traps, bases, baits, charms, materials, trap types), `imps.ts` (portraits), `world.ts` (icon, key art, locations, map), `ui.ts` (ranks, icons, How to play). Shared palette and helpers are in `lib.ts`.
- Adding a new trap, imp, location or rank to `content/` needs a drawing (or a custom file) and a manifest entry: `npm run art` stops with a message naming the missing id, and `npm test` fails until the manifest covers it.

## House style

Flat storybook shapes with a thick dark-brown outline (`#2b1d14`), the UI palette (pine `#0f3d2e`, berry red `#b3261e`, gold `#e9c46a`, cream `#fdf8ef`), small white highlights, no text in pictures except the How-to-play diagrams. Imp portraits share one head shape; each lair room has its own skin colour and background, and the frame shows tier: plain (common), gold (rare), silver (mini boss), red and gold with stars (boss). All art is original to this game.
