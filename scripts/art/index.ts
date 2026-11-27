/**
 * Generates every game art asset as SVG plus a manifest.
 *
 *   npm run art            write missing or still-generated files, rebuild the manifest
 *   npm run art -- --force overwrite generated SVGs even if they already exist (custom files are never touched)
 *
 * Output: src/client/public/art/<slot>/<id>.svg and src/client/public/art/manifest.json,
 * served by the game at /art/... . Naming rules and how to swap in your own art: docs/ART.md.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadContent } from '../../src/content/load.js';
import { type Asset, GENERATED_MARKER, svg } from './lib.js';
import { traps, bases, baits, charms, materials, trapTypes, SPRITE_W, SPRITE_H, FLOOR } from './items.js';
import { drawImp, drawLockedImp, type Tier } from './imps.js';
import { icon, keyArt, locations, travelMap, MAP_PINS } from './world.js';
import { ranks, icons, drawIcon, howto } from './ui.js';

export const ART_DIR = 'src/client/public/art';
const CUSTOM_EXTS = ['png', 'webp', 'jpg', 'jpeg', 'avif', 'gif'];

/** House style appended to every regeneration prompt so swapped-in art stays consistent. */
export const STYLE =
  'Original storybook Christmas game art for "The Naughty List". Flat cel-shaded shapes with a thick dark-brown outline (#2b1d14), ' +
  'warm palette of pine green (#0f3d2e), berry red (#b3261e), gold (#e9c46a) and cream (#fdf8ef), small white highlights, friendly-mischievous mood, no text, no logos.';

const SLOT_STYLE: Record<string, string> = {
  brand: '',
  traps: `Single trap sprite on a transparent background, ${SPRITE_W}x${SPRITE_H}, three-quarter front view, its bottom resting on y=${FLOOR} so it sits on top of a base sprite.`,
  bases: `Single trap base sprite on a transparent background, ${SPRITE_W}x${SPRITE_H}, three-quarter front view, top surface at y=${FLOOR} with the trap drawn on top of it.`,
  baits: 'Single item thumbnail on a transparent background, 512x512, centred, soft ground shadow.',
  charms: 'Single item thumbnail on a transparent background, 512x512, centred, soft ground shadow.',
  materials: 'Single crafting material thumbnail on a transparent background, 512x512, centred, soft ground shadow.',
  trap_types: 'Round badge icon, 256x256, transparent corners, readable at 24px.',
  locations: 'Wide interior scene banner, 1170x470 (5:2), keep the centre floor area clear because the trap is drawn over it, slight dark vignette at the edges.',
  map: 'Travel map illustration, 1600x900 (16:9), cutaway of a snowy mountain with tunnels between rooms; leave space at each pin for a label.',
  imps: 'Square character portrait card, 512x512, rounded corners, head and shoulders facing the viewer, room-coloured background, frame colour shows tier (common plain, rare gold, mini boss silver, boss red and gold).',
  ranks: 'Rank badge medal, 256x256, transparent background, readable at 32px.',
  icons: '24x24 line icon, 2px round stroke in currentColor, no fill.',
  howto: 'Explainer diagram card, 640x360, cream background, simple icons and arrows, very little text.',
};

const ITEM_LOOKS: Record<string, string> = {
  starlit_stocking: 'a red Christmas stocking with a white cuff, cinched by a drawstring strung with tiny glowing gold star-lights, a bigger star at the end',
  jack_in_the_box: 'a red and gold jack-in-the-box with a crank; a toothy golden lid springs up on a coiled spring',
  star_lantern: 'a brass lantern with open shutters holding a glowing fallen star, a cone of golden starlight shining down',
  icicle_jar: 'a frosted glass jar with icicle teeth around the rim and a snowflake on the glass',
  nutcracker_jaws: 'a wooden nutcracker head trap with a tall red hat and gold band, wide toothed jaws and a lever arm',
  constellation_wreath: 'a night-blue wreath of enchanted wrapping studded with glowing gold stars joined by faint constellation lines, standing on edge with a gold bow',
  snow_globe_prison: 'a snow globe on a wooden plinth with a tiny barred door inside the snow',
  sleigh_bell_snapper: 'a giant golden sleigh bell split into two toothed halves like jaws, red ribbon on top',
  cardboard_box: 'a flattened brown cardboard box slab with packing tape',
  gingerbread_slab: 'a thick gingerbread slab with white icing squiggles and candy buttons',
  candy_cane_platform: 'a red-and-white striped platform with candy-cane hooks at the corners',
  ice_block: 'a translucent blue ice block with cracks and icicles dripping off the edge',
  yule_log_base: 'a lying yule log with bark lines, a cut end showing rings, holly sprig and snow on top',
  toffee_anvil: 'a block of brown toffee shaped like an anvil with glossy highlights and a gold wrapper twist on the side',
  chestnut_brazier: 'a squat iron brazier full of glowing roast chestnuts with little flames and curls of smoke',
  wishbone_plinth: 'a cream-coloured giant wishbone arched over a small round stone plinth with a red ribbon',
  sleigh_runner: 'a polished red sleigh runner with a curled front and silver bells on a wooden frame',
  gingerbread_cottage: 'a small gingerbread cottage with white icing snow on the roof, candy windows and a door',
  wishing_star_pedestal: 'a night-blue pedestal topped with a glowing golden wishing star and little sparkles',
  stale_cookie: 'a cracked, slightly mouldy chocolate-chip cookie with a bite missing',
  sugar_cookie: 'a star-shaped iced sugar cookie with colourful sprinkles',
  peppermint_bark: 'a slab of chocolate peppermint bark with crushed red and white candy',
  fruitcake: 'a fruitcake loaf with candied fruit, white icing drizzle and a cherry on top',
  hot_cocoa: 'a red mug of hot cocoa with marshmallows and steam, snowflake on the mug',
  ribbon_candy: 'a wrapped boiled candy with twisted ends, striped red and green like ribbon',
  golden_bow_bonbon: 'a round chocolate bonbon tied with a shiny golden bow, sparkles',
  mistletoe_charm: 'a sprig of mistletoe with white berries hanging from a red ribbon loop',
  jingle_bell_charm: 'a shiny gold jingle bell with a red bow',
  windup_key_charm: 'a brass wind-up key with a gear at its centre',
  cheer_bauble: 'a glossy red bauble with a gold band and cap',
  tinsel_cheer_charm: 'twists of gold and red tinsel',
  gold_star_cheer_charm: 'a shining five-pointed gold star',
  candied_peel: 'curls of candied orange peel dusted with sugar',
  sugar_twist: 'a curl of pink pulled sugar with a white stripe, a little sticky',
  sugar_glass: 'shards of clear, pink and blue sugar glass',
  cookie_tin: 'a round green cookie tin with a red lid and gold star, imp tooth marks',
  brass_spring: 'a coiled brass spring',
  golden_ribbon: 'a shiny golden ribbon bow with long tails',
  enchanted_wrapping: 'a folded sheet of purple wrapping paper with gold stars and a magic sparkle trail',
  toymakers_gear: 'a large brass toymaker gear with rivets',
  clockwork_heart: 'a red heart with a window showing turning brass gears inside',
  silver_sleighbell: 'a large silver sleigh bell on a stitched leather strap',
  brimstone_coal: 'a lump of coal with glowing orange cracks and a curl of smoke',
  carol_horn: 'a flaring brass horn with a rose-pink ribbon and a gold music note rising from the bell',
  hymn_reed: 'three thin pale reeds tied with a red thread, slightly bent',
  carol_songsheet: 'a torn sheet of carol music with staff lines, a few notes in pencil and a pencilled note in the margin',
};

const TRAP_TYPE_LOOKS: Record<string, string> = {
  clockwork: 'a brass gear on a cream disc',
  starlight: 'a glowing gold five-point star with small sparkles on a night-blue disc',
  frost: 'a blue snowflake on an icy disc',
  carol: 'a gold music note on a rose-pink disc',
};

const LOCATION_LOOKS: Record<string, string> = {
  cookie_pantry: "Santa's pantry: warm wooden walls, shelves of cookie jars and stacked cookies, milk churns, a snowy night window and a garland",
  wrapping_room: 'the wrapping room: purple walls, leaning rolls of patterned wrapping paper, a rack of ribbon spools, stacks of wrapped presents',
  toy_workshop: 'the toy workshop: green walls with brass gears, pegboards of tools, workbenches with a rocking horse, blocks, a wind-up soldier and paint pots, a hanging lantern',
  carol_loft: 'the carol loft: a draughty attic with wooden rafters, a round window with moonlight, music stands with sheet music, a pile of old carol books and a tarnished brass horn',
  reindeer_stables: 'the reindeer stables: wooden stall doors, a harness of gold bells across the wall, lanterns, hay bales, loose straw and a bucket of carrots',
};

function main() {
  const force = process.argv.includes('--force');
  const content = loadContent('content');
  const assets: Asset[] = [];
  const add = (a: Omit<Asset, 'prompt' | 'svg'> & { body: string; look: string }) => {
    const prompt = [a.look.charAt(0).toUpperCase() + a.look.slice(1) + '.', SLOT_STYLE[a.slot] ?? '', STYLE].filter(Boolean).join(' ');
    assets.push({ id: a.id, slot: a.slot, width: a.width, height: a.height, description: a.description, transparent: a.transparent, extra: a.extra, prompt, svg: svg(a.width, a.height, a.description, a.body) });
  };
  const need = <T,>(table: Record<string, T>, id: string, where: string): T => {
    const v = table[id];
    if (!v) throw new Error(`No art for ${where} "${id}". Add a drawing in scripts/art/ before running again.`);
    return v;
  };

  // brand
  add({ id: 'icon', slot: 'brand', width: 1024, height: 1024, transparent: false, description: 'Game icon: an imp peeking over the Naughty List scroll', look: 'app icon: a red imp with golden eyes peeking over an unrolled parchment scroll of ticks and one red cross, red wax seal with holly, on a pine-green rounded square with a gold rim', body: icon() });
  add({ id: 'key_art', slot: 'brand', width: 1170, height: 1290, transparent: false, description: "Login key art: Santa's snowy lair at night with imps sneaking in", look: "tall login key art: night sky with aurora and moon, the shadow of the horned devil Scrinch in the clouds, a snowy hill with Santa's lair (round red door, warm windows, chimney), pine trees, and imp silhouettes with glowing eyes sneaking across the snow carrying a sack; keep the top third calm for the title", body: keyArt() });

  // items
  const itemGroups: [string, { id: string; name: string; type?: string }[], Record<string, () => string>, number, number, boolean][] = [
    ['traps', content.items.traps, traps, SPRITE_W, SPRITE_H, true],
    ['bases', content.items.bases, bases, SPRITE_W, SPRITE_H, true],
    ['baits', content.items.baits, baits, 512, 512, true],
    ['charms', content.items.charms, charms, 512, 512, true],
    ['materials', content.items.materials, materials, 512, 512, true],
  ];
  for (const [slot, list, table, w, h, transparent] of itemGroups) {
    for (const item of list) {
      const draw = need(table, item.id, slot.slice(0, -1));
      const look = need(ITEM_LOOKS, item.id, 'item description');
      add({
        id: item.id, slot, width: w, height: h, transparent,
        description: `${item.name}: ${look}`,
        look: `${item.name}${item.type ? ` (${item.type} trap)` : ''}: ${look}`,
        body: draw(),
        extra: slot === 'traps' ? { layer: 'trap', drawOver: 'bases' } : slot === 'bases' ? { layer: 'base', drawUnder: 'traps' } : undefined,
      });
    }
  }
  for (const type of Object.keys(TRAP_TYPE_LOOKS)) {
    add({ id: type, slot: 'trap_types', width: 256, height: 256, transparent: true, description: `${type[0]!.toUpperCase()}${type.slice(1)} trap type badge: ${TRAP_TYPE_LOOKS[type]}`, look: `${type} trap type badge: ${TRAP_TYPE_LOOKS[type]}`, body: need(trapTypes, type, 'trap type')() });
  }
  const usedTypes = new Set(content.items.traps.map((t) => t.type));
  for (const t of usedTypes) need(trapTypes, t, 'trap type');

  // locations and map
  for (const loc of content.locations) {
    const look = need(LOCATION_LOOKS, loc.id, 'location description');
    add({ id: loc.id, slot: 'locations', width: 1170, height: 470, transparent: false, description: `${loc.name} banner: ${look}`, look: `${loc.name} banner, ${look}`, body: need(locations, loc.id, 'location')() });
  }
  for (const loc of content.locations) need(MAP_PINS as Record<string, { x: number; y: number }>, loc.id, 'map pin');
  add({ id: 'lair_map', slot: 'map', width: 1600, height: 900, transparent: false, description: "Travel map: cutaway of Santa's mountain lair with one chamber per location", look: "travel map of Santa's secret North Pole lair: a cutaway snowy mountain at night with four chambers joined by tunnels (pantry with cookie jars, wrapping room with presents, toy workshop with gears, reindeer stables with hay), a red front door at the base, aurora, compass rose", body: travelMap(), extra: { pins: MAP_PINS } });

  // imps
  for (const loc of content.locations) {
    for (const imp of loc.imps) {
      const { body, look } = drawImp({ id: imp.id, name: imp.name, tier: imp.tier as Tier, location: loc.id });
      const tier = imp.tier === 'miniboss' ? 'mini boss' : imp.tier;
      add({ id: imp.id, slot: 'imps', width: 512, height: 512, transparent: false, description: `${imp.name} (${tier}, ${loc.name}): ${look}`, look: `portrait of ${imp.name}, a ${tier} from the ${loc.name}: ${look}`, body, extra: { tier: imp.tier, location: loc.id } });
    }
  }
  add({ id: '_locked', slot: 'imps', width: 512, height: 512, transparent: false, description: 'Uncaught elf: dark silhouette in a pointed cap with a gold question mark', look: 'locked portrait card for a hexed elf not caught yet: a dark navy elf silhouette in a pointed cap with a big gold question mark', body: drawLockedImp() });

  // ranks
  for (const r of content.ranks) {
    const badge = need(ranks, String(r.rank), 'rank badge') as unknown as (typeof ranks)[number];
    add({ id: `rank_${r.rank}`, slot: 'ranks', width: 256, height: 256, transparent: true, description: `Rank ${r.rank} badge (${r.name}): ${badge.look}`, look: `rank badge for "${r.name}" (rank ${r.rank} of ${content.ranks.length}): ${badge.look}`, body: badge.draw(), extra: { rank: r.rank } });
  }

  // icons
  for (const [id, ic] of Object.entries(icons)) {
    add({ id, slot: 'icons', width: 24, height: 24, transparent: true, description: `Icon: ${ic.look}`, look: `icon of ${ic.look}`, body: drawIcon(ic.d) });
  }

  // how to play
  for (const [id, d] of Object.entries(howto)) {
    add({ id, slot: 'howto', width: 640, height: 360, transparent: false, description: `How to play, ${id.replace('_', ' ')}: ${d.look}`, look: `diagram for "${id.replace('_', ' ')}": ${d.look}`, body: d.draw() });
  }

  // write files
  let written = 0;
  let kept = 0;
  const manifest = {
    note: 'Generated by `npm run art`. Every game picture, keyed by slot and id. See docs/ART.md.',
    base: '/art/',
    style: STYLE,
    assets: [] as Record<string, unknown>[],
  };
  const seen = new Set<string>();
  for (const a of assets) {
    const key = `${a.slot}/${a.id}`;
    if (seen.has(key)) throw new Error(`Duplicate asset ${key}`);
    seen.add(key);
    const svgPath = join(ART_DIR, a.slot, `${a.id}.svg`);
    const custom = CUSTOM_EXTS.map((e) => join(ART_DIR, a.slot, `${a.id}.${e}`)).find((p) => existsSync(p));
    let file = `${a.slot}/${a.id}.svg`;
    let source = 'generated';
    if (custom) {
      file = custom.slice(ART_DIR.length + 1);
      source = 'custom';
      kept++;
    } else if (existsSync(svgPath) && !readFileSync(svgPath, 'utf8').includes(GENERATED_MARKER)) {
      source = 'custom';
      kept++;
    } else if (force || !existsSync(svgPath) || readFileSync(svgPath, 'utf8') !== a.svg) {
      mkdirSync(dirname(svgPath), { recursive: true });
      writeFileSync(svgPath, a.svg);
      written++;
    }
    manifest.assets.push({ id: a.id, slot: a.slot, file, width: a.width, height: a.height, transparent: a.transparent, source, description: a.description, prompt: a.prompt, ...(a.extra ?? {}) });
  }
  writeFileSync(join(ART_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const slots = [...new Set(assets.map((a) => a.slot))].map((s) => `${s} ${assets.filter((a) => a.slot === s).length}`).join(', ');
  console.log(`Art: ${assets.length} assets (${slots}). Wrote ${written}, kept ${kept} custom.`);
}

main();
