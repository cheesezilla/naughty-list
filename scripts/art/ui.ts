/**
 * Interface art: rank badges, line icons for tabs, menus and stats, and the How-to-play diagrams.
 */
import { P, g, ol, line, circle, ellipse, rect, path, poly, sparkle, star, gear, snowflake, hollyLeaf, berries } from './lib.js';
import { traps, bases, baits, charms, materials, trapTypes } from './items.js';

// ---------------------------------------------------------------- rank badges (256 square)

const W8 = 8;

function ribbonTails(color: string) {
  return g({}, path('M88 170 L60 246 L92 230 L108 250 L124 180 Z', ol(color, W8)), path('M168 170 L196 246 L164 230 L148 250 L132 180 Z', ol(color, W8)));
}

/** Rank badges keyed by rank number. Higher ranks get richer metal and more ornament. */
export const ranks: Record<number, { look: string; draw: () => string }> = {
  1: {
    look: 'round bronze medal with a white snowflake, red ribbon tails',
    draw: () => g({}, ribbonTails(P.red), circle(128, 112, 88, ol('#c98a4b', W8)), circle(128, 112, 66, line(5, '#9c6430')), snowflake(128, 112, 44, P.white, 9)),
  },
  2: {
    look: 'silver medal with a gold five-point star and green ribbon tails',
    draw: () => g({}, ribbonTails(P.holly), circle(128, 112, 88, ol(P.silver, W8)), circle(128, 112, 66, line(5, P.silverDark)), star(128, 114, 50, ol(P.goldBright, 6))),
  },
  3: {
    look: 'gold shield badge with a magnifying glass over an imp footprint, purple ribbon tails',
    draw: () =>
      g(
        {},
        ribbonTails(P.purple),
        path('M128 20 L210 50 L204 130 Q196 190 128 220 Q60 190 52 130 L46 50 Z', ol(P.gold, W8)),
        path('M128 40 L192 64 L188 128 Q182 176 128 200 Q74 176 68 128 L64 64 Z', line(5, P.goldDark)),
        // three-toed imp print
        ellipse(104, 150, 18, 24, { fill: P.ink }), circle(84, 116, 7, { fill: P.ink }), circle(104, 108, 7, { fill: P.ink }), circle(124, 116, 7, { fill: P.ink }),
        circle(150, 104, 30, ol(P.frostLight, 7)), path('M172 126 L196 152', line(14)),
      ),
  },
  4: {
    look: 'frosted blue shield with icicles along the bottom edge, silver rim and a snowflake crest',
    draw: () =>
      g(
        {},
        ribbonTails(P.frostDark),
        path('M128 16 L214 46 L208 132 Q200 190 128 222 Q56 190 48 132 L42 46 Z', ol(P.frost, W8)),
        path('M128 36 L196 60 L192 128 Q186 176 128 202 Q70 176 64 128 L60 60 Z', line(6, P.silver)),
        snowflake(128, 110, 52, P.white, 10),
        path('M70 170 L80 200 L90 176 L104 214 L114 186 L128 222 L142 186 L152 214 L166 176 L176 200 L186 170', ol(P.frostLight, 5)),
      ),
  },
  5: {
    look: 'grand gold star badge ringed with holly leaves and red berries, red ribbon tails, sparkles',
    draw: () =>
      g(
        {},
        ribbonTails(P.red),
        ...Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return hollyLeaf(128 + Math.cos(a) * 92, 116 + Math.sin(a) * 92, 46, (a * 180) / Math.PI + 90, i % 2 ? P.holly : P.hollyLight, 6);
        }),
        star(128, 118, 86, ol(P.goldBright, W8), 0.5),
        star(128, 118, 52, { fill: P.gold }, 0.5),
        berries(128, 200, 9, 5),
        sparkle(34, 40, 18), sparkle(222, 40, 14),
      ),
  },
};

// ---------------------------------------------------------------- line icons (24 square, currentColor)

/** Line icons for the bottom nav, More menu and stat labels. They take the text colour of their parent. */
export const icons: Record<string, { look: string; d: string }> = {
  // bottom nav
  nav_hunt: { look: 'a snapping trap: open jaws on a base', d: 'M4 18h16 M6 18v-3h12v3 M6 15l2-7 2 4 2-4 2 4 2-4 2 7' },
  nav_naughty_list: { look: 'an unrolled scroll with a tick and a cross', d: 'M6 3h12v18H6z M4 3h4 M16 21h4 M9 8l1.5 1.5L13 7 M9 13l3 3 M12 13l-3 3 M14 9h2 M14 15h2' },
  nav_emporium: { look: 'a shop front with a striped awning', d: 'M3 9l2-5h14l2 5 M3 9h18 M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3 M5 12v8h14v-8 M10 20v-5h4v5' },
  nav_workshop: { look: 'a hammer over an anvil', d: 'M4 20h16 M7 20l2-5h6l2 5 M5 11h14l-3 4H8z M14 4l4 4 M16 6l-5 5' },
  nav_more: { look: 'three dots in a row', d: 'M5 12h.01 M12 12h.01 M19 12h.01' },
  // More menu
  menu_travel: { look: 'a folded map with a pin', d: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14' },
  menu_hunters: { look: 'a trophy cup', d: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 20h8 M9 17h6v3H9z' },
  menu_stats: { look: 'a bar chart', d: 'M4 20h16 M7 20v-6 M12 20V8 M17 20v-10' },
  menu_howto: { look: 'an open book with a question mark', d: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z M15.5 9.5a1.5 1.5 0 1 1 2 1.4c-.5.2-.5.6-.5 1.1 M17 14h.01' },
  menu_settings: { look: 'a cog', d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1' },
  menu_admin: { look: 'a shield with a key', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M12 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M12 13v4 M12 15h2' },
  menu_account: { look: 'a person in a woolly hat', d: 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M8 7c0-3 8-3 8 0 M12 2v1 M4 21c0-4 3.6-6 8-6s8 2 8 6' },
  menu_logout: { look: 'a door with an arrow leaving', d: 'M10 4H5v16h5 M14 8l4 4-4 4 M8 12h10' },
  // stats
  stat_gold: { look: 'a coin with a star', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z' },
  stat_points: { look: 'a five-point star', d: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z' },
  stat_power: { look: 'a lightning bolt', d: 'M13 2L5 14h6l-1 8 8-12h-6z' },
  stat_luck: { look: 'a sparkle', d: 'M12 3c.8 4.5 2.5 6.2 7 7-4.5.8-6.2 2.5-7 7-.8-4.5-2.5-6.2-7-7 4.5-.8 6.2-2.5 7-7z M19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6z' },
  stat_attraction: { look: 'a horseshoe magnet', d: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z M6 8h4 M14 8h4' },
  stat_catch: { look: 'a target', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
};

export function drawIcon(d: string) {
  return path(d, { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
}

// ---------------------------------------------------------------- How-to-play diagrams (640 x 360)

const DW = 640;
const DH = 360;

/** Places a 512-square drawing at (x, y) with a given size. */
const place = (body: string, x: number, y: number, size: number, from = 512) => g({ transform: `translate(${x} ${y}) scale(${(size / from).toFixed(4)})` }, body);
/** Places a 600x450 trap/base sprite. */
const placeSprite = (body: string, x: number, y: number, w: number) => g({ transform: `translate(${x} ${y}) scale(${(w / 600).toFixed(4)})` }, body);

const label = (t: string, x: number, y: number, size = 26, color: string = P.ink, weight = 700) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="${weight}" font-size="${size}" fill="${color}">${t}</text>`;

const arrow = (x0: number, y: number, x1: number, color: string = P.ink) =>
  g({}, path(`M${x0} ${y} L${x1 - 6} ${y}`, line(8, color)), path(`M${x1 - 20} ${y - 14} L${x1} ${y} L${x1 - 20} ${y + 14}`, line(8, color)));

const card = (body: string) => g({}, rect(0, 0, DW, DH, { fill: P.cream }, 28), body, rect(4, 4, DW - 8, DH - 8, { fill: 'none', stroke: P.parchment, 'stroke-width': 8 }, 24));

/** Mini imp head for diagrams. */
const miniImp = (x: number, y: number, s: number, skin: string = '#d9573d') =>
  g(
    { transform: `translate(${x} ${y}) scale(${s})` },
    path('M-46 -6 L-90 -40 L-40 26 Z M46 -6 L90 -40 L40 26 Z', ol(skin, 8)),
    path('M-26 -50 L-34 -96 L-6 -58 Z M26 -50 L34 -96 L6 -58 Z', ol(P.cream, 8)),
    ellipse(0, 0, 60, 56, ol(skin, 8)),
    circle(-22, -8, 12, ol(P.cream, 5)), circle(22, -8, 12, ol(P.cream, 5)),
    circle(-20, -6, 5, { fill: P.ink }), circle(24, -6, 5, { fill: P.ink }),
    path('M-26 20 Q0 40 26 20', line(7)),
  );

const bar = (x: number, y: number, w: number, frac: number, color: string) =>
  g({}, rect(x, y, w, 26, ol(P.parchment, 6), 13), rect(x + 4, y + 4, Math.max(18, (w - 8) * frac), 18, { fill: color }, 9));

export const howto: Record<string, { look: string; draw: () => string }> = {
  hunt: {
    look: 'a big red Hunt button being tapped, an arrow to a cookie being used up, an arrow to an imp appearing at a trap',
    draw: () =>
      card(
        g(
          {},
          rect(40, 130, 170, 90, ol(P.red, 8), 22), label('HUNT', 125, 188, 34, P.white, 800),
          path('M170 250 L170 205 Q170 192 182 192 Q194 192 194 205 L194 236 L210 232 Q226 230 228 248 L228 290 L180 300 Z', ol(P.cream, 6)),
          arrow(230, 175, 290),
          place(baits.stale_cookie!(), 290, 105, 120),
          path('M396 140 L416 160 M416 140 L396 160', line(7, P.red)),
          arrow(420, 175, 470),
          placeSprite(bases.cardboard_box!() + traps.starlit_stocking!(), 450, 110, 190),
          miniImp(580, 140, 0.55),
          label('Tap Hunt. Bait is used. An imp may come.', 320, 320, 24, P.ink, 600),
        ),
      ),
  },
  attraction: {
    look: 'a cookie on a trap giving off scent waves, three imps drawn towards it, an attraction meter filling up',
    draw: () =>
      card(
        g(
          {},
          place(baits.sugar_cookie!(), 240, 90, 160),
          ...[1, 2, 3].map((i) => circle(320, 170, 70 + i * 34, { fill: 'none', stroke: P.gold, 'stroke-width': 6, 'stroke-dasharray': '10 14', opacity: 1 - i * 0.22 })),
          miniImp(80, 120, 0.55), miniImp(560, 110, 0.55, '#8c5bb5'), miniImp(110, 250, 0.45, '#5f9e4c'),
          arrow(130, 140, 200, P.goldDark), arrow(510, 130, 440, P.goldDark),
          bar(170, 290, 300, 0.78, P.gold), label('Attraction', 320, 340, 22, P.ink, 700),
        ),
      ),
  },
  power: {
    look: 'trap plus base plus charm adding up to a power bar, compared against an imp with its own power bar',
    draw: () =>
      card(
        g(
          {},
          placeSprite(bases.gingerbread_slab!() + traps.jack_in_the_box!(), 20, 4, 260), label('+', 290, 140, 50),
          place(charms.windup_key_charm!(), 300, 60, 120),
          bar(40, 230, 300, 0.7, P.red), label('Your power', 190, 290, 22),
          label('vs', 400, 250, 30, P.goldDark, 800),
          miniImp(540, 140, 0.6),
          bar(450, 230, 160, 0.5, P.purple), label('Imp power', 530, 290, 22),
        ),
      ),
  },
  luck: {
    look: 'a mistletoe charm sparkling, a small luck bonus bar stacked on top of a catch chance bar, stronger imp in the background',
    draw: () =>
      card(
        g(
          {},
          place(charms.mistletoe_charm!(), 40, 60, 200),
          sparkle(260, 80, 22), sparkle(220, 250, 16),
          rect(300, 120, 280, 26, ol(P.parchment, 6), 13), rect(304, 124, 160, 18, { fill: P.red }, 9), rect(464, 124, 60, 18, { fill: P.goldBright }, 0),
          label('Catch chance', 440, 186, 22),
          label('+ luck bonus', 494, 104, 20, P.goldDark),
          miniImp(440, 260, 0.5, '#a0483a'),
          label('Helps most against strong imps', 320, 336, 22, P.ink, 600),
        ),
      ),
  },
  trap_types: {
    look: 'the three trap-type badges (clockwork gear, starlight star, frost snowflake) with an imp showing x1.5 weakness and x0.5 resistance',
    draw: () =>
      card(
        g(
          {},
          place(trapTypes.clockwork!(), 40, 40, 120, 256), label('Clockwork', 100, 190, 22),
          place(trapTypes.starlight!(), 260, 40, 120, 256), label('Starlight', 320, 190, 22),
          place(trapTypes.frost!(), 480, 40, 120, 256), label('Frost', 540, 190, 22),
          miniImp(320, 280, 0.55),
          path('M250 270 Q160 260 120 210', line(7, P.holly)), label('×1.5', 170, 300, 28, P.holly, 800),
          path('M390 270 Q480 260 520 210', { ...line(7, P.red), 'stroke-dasharray': '10 10' }), label('×0.5', 480, 300, 28, P.red, 800),
        ),
      ),
  },
  loot: {
    look: 'a boss imp dropping a crafting material, an arrow to Santa\'s Workshop anvil, an arrow to a new trap',
    draw: () =>
      card(
        g(
          {},
          miniImp(90, 140, 0.7, '#a0483a'), star(90, 66, 22, ol(P.goldBright, 5)),
          arrow(160, 150, 210),
          place(materials.clockwork_heart!(), 210, 80, 130),
          arrow(345, 150, 395),
          g({}, rect(400, 150, 110, 40, ol(P.silverDark, 7), 8), path('M420 190 L410 230 L500 230 L490 190', ol(P.silverDark, 7)), path('M470 90 L500 120 M480 110 L440 150', line(10, P.cocoa))),
          arrow(515, 150, 545),
          placeSprite(traps.sleigh_bell_snapper!(), 520, 80, 120),
          label('Bosses drop materials. Craft them in Santa\'s Workshop.', 320, 320, 22, P.ink, 600),
        ),
      ),
  },
  ranks: {
    look: 'a staircase of five rank badges rising left to right, a door opening at the top to a new room',
    draw: () =>
      card(
        g(
          {},
          ...[1, 2, 3, 4, 5].map((n, i) =>
            g({}, rect(30 + i * 110, 290 - i * 40, 110, 40 + i * 40, ol(P.parchment, 6), 4), place(ranks[n]!.draw(), 45 + i * 110, 200 - i * 40, 80, 256)),
          ),
          path('M560 30 L560 110 L620 110 L620 30 Z', ol(P.goldBright, 6)),
          path('M560 30 L600 40 L600 120 L560 110 Z', ol(P.red, 6)),
          label('Points raise your rank and open new rooms', 300, 40, 22, P.ink, 600),
        ),
      ),
  },
};

void gear; void poly;
