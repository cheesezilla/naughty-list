/**
 * Scene art: the game icon, login key art, one wide banner per lair location, and the travel map.
 */
import {
  P, g, ol, line, circle, ellipse, rect, path, poly, sparkle, star, gear, snowflake, hollyLeaf, berries, shade, rng,
} from './lib.js';

// ---------------------------------------------------------------- helpers

function starfield(seed: string, w: number, h: number, n: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => circle(+(r() * w).toFixed(0), +(r() * h).toFixed(0), +(1 + r() * 2.5).toFixed(1), { fill: P.white, opacity: +(0.4 + r() * 0.6).toFixed(2) })).join('');
}

function snowfall(seed: string, w: number, h: number, n: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => circle(+(r() * w).toFixed(0), +(r() * h).toFixed(0), +(2 + r() * 4).toFixed(1), { fill: P.white, opacity: 0.85 })).join('');
}

function pine(x: number, base: number, h: number, color: string = P.pine, snow = true, stroke = 6) {
  const w = h * 0.45;
  const tiers = [0, 1, 2].map((i) => {
    const top = base - h + i * h * 0.25;
    const bottom = base - h * 0.55 + i * h * 0.25;
    const ww = w * (0.55 + i * 0.25);
    return poly([[x, top], [x + ww, bottom], [x - ww, bottom]], ol(color, stroke));
  });
  const caps = snow ? [0, 1, 2].map((i) => {
    const top = base - h + i * h * 0.25;
    const ww = w * (0.55 + i * 0.25) * 0.45;
    return poly([[x, top], [x + ww, top + h * 0.13], [x - ww, top + h * 0.13]], { fill: P.white });
  }) : [];
  return g({}, rect(x - h * 0.05, base - h * 0.12, h * 0.1, h * 0.12, ol(P.cocoa, stroke)), ...tiers, ...caps);
}

function imp_silhouette(x: number, y: number, s: number, color: string, eye: string = P.goldBright) {
  return g(
    { transform: `translate(${x} ${y}) scale(${s})` },
    // body crouched, horns, tail, sack
    path('M-40 0 Q-46 -50 -10 -70 Q30 -86 44 -50 Q52 -20 40 0 Z', { fill: color }),
    circle(4, -92, 34, { fill: color }),
    path('M-20 -116 L-28 -150 L-6 -122 Z M24 -118 L34 -150 L14 -122 Z', { fill: color }),
    path('M-32 -96 L-66 -112 L-30 -82 Z M38 -96 L72 -112 L36 -82 Z', { fill: color }),
    path('M40 -10 Q90 -10 84 -50 Q80 -70 96 -74', { fill: 'none', stroke: color, 'stroke-width': 8, 'stroke-linecap': 'round' }),
    path('M92 -82 L104 -70 L90 -64 Z', { fill: color }),
    ellipse(-8, -94, 7, 5, { fill: eye }),
    ellipse(18, -94, 7, 5, { fill: eye }),
  );
}

function floor(w: number, h: number, y: number, color: string, plankColor: string) {
  const planks = Array.from({ length: Math.ceil(w / 120) + 1 }, (_, i) => path(`M${i * 120} ${y} L${i * 120 - 60} ${h}`, line(4, plankColor))).join('');
  return g({}, rect(0, y, w, h - y, { fill: color }), planks, path(`M0 ${y} L${w} ${y}`, line(8)));
}

function jar(x: number, y: number, s: number, lid: string, contents: string) {
  return g(
    { transform: `translate(${x} ${y}) scale(${s})` },
    path('M-50 -110 L50 -110 L56 -90 Q70 -80 70 -50 L70 -10 Q70 0 60 0 L-60 0 Q-70 0 -70 -10 L-70 -50 Q-70 -80 -56 -90 Z', ol(P.frostLight, 7)),
    rect(-60, -70, 120, 62, { fill: contents, opacity: 0.85 }, 8),
    rect(-56, -128, 112, 24, ol(lid, 7), 8),
    path('M-52 -80 L-52 -24', line(10, P.white)),
  );
}

function shelf(x0: number, x1: number, y: number) {
  return g({}, rect(x0, y, x1 - x0, 22, ol(P.cocoaLight, 6), 4), path(`M${x0 + 30} ${y + 22} L${x0 + 46} ${y + 60} M${x1 - 30} ${y + 22} L${x1 - 46} ${y + 60}`, line(10, P.cocoa)));
}

function window_(x: number, y: number, w: number, h: number, seed: string) {
  return g(
    {},
    rect(x, y, w, h, ol(P.night, 10), 14),
    `<g clip-path="url(#win-${seed})">${starfield(seed, 1170, 470, 60)}${snowfall(seed + 's', 1170, 470, 60)}</g>`,
    `<defs><clipPath id="win-${seed}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/></clipPath></defs>`,
    path(`M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}`, line(12, P.cocoa)),
    rect(x, y, w, h, { fill: 'none', stroke: P.cocoa, 'stroke-width': 14 }, 14),
    path(`M${x - 6} ${y + h - 10} Q${x + w / 2} ${y + h - 34} ${x + w + 6} ${y + h - 10}`, line(16, P.white)),
  );
}

function lantern(x: number, y: number, s = 1) {
  return g(
    { transform: `translate(${x} ${y}) scale(${s})` },
    circle(0, 30, 70, { fill: P.goldBright, opacity: 0.22 }),
    path('M0 -60 L0 -10', line(6)),
    rect(-26, -12, 52, 74, ol(P.goldBright, 7), 10),
    rect(-34, -20, 68, 14, ol(P.coal, 6), 4),
    rect(-34, 58, 68, 14, ol(P.coal, 6), 4),
    ellipse(0, 26, 10, 18, { fill: P.orange }),
  );
}

function garland(x0: number, x1: number, y: number, sag: number) {
  const mid = (x0 + x1) / 2;
  const d = `M${x0} ${y} Q${mid} ${y + sag} ${x1} ${y}`;
  const bulbs = Array.from({ length: 7 }, (_, i) => {
    const t = (i + 1) / 8;
    const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mid + t * t * x1;
    const by = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag) + t * t * y;
    const c = [P.red, P.goldBright, P.frost, P.hollyLight][i % 4]!;
    return circle(bx, by + 14, 9, ol(c, 4)) + circle(bx, by + 14, 18, { fill: c, opacity: 0.25 });
  });
  return g({}, path(d, line(10, P.pine)), path(d, { ...line(4, P.hollyLight), 'stroke-dasharray': '6 10' }), ...bulbs);
}

// ---------------------------------------------------------------- game icon (1024)

export function icon() {
  const S = 1024;
  return g(
    {},
    rect(0, 0, S, S, { fill: P.pine }, 200),
    circle(512, 512, 420, { fill: P.pineMid }),
    `<g opacity="0.7">${starfield('icon', S, 420, 24)}</g>`,
    // imp horns and eyes peeking over the scroll
    path('M372 330 Q360 180 300 150 Q380 170 430 300 Z M652 330 Q664 180 724 150 Q644 170 594 300 Z', ol(P.red, 18)),
    ellipse(512, 360, 170, 120, ol(P.red, 18)),
    ellipse(452, 330, 32, 26, ol(P.goldBright, 12)), ellipse(572, 330, 32, 26, ol(P.goldBright, 12)),
    circle(460, 336, 12, { fill: P.ink }), circle(564, 336, 12, { fill: P.ink }),
    path('M412 288 L486 306 M612 288 L538 306', line(16)),
    // the list: an unrolled scroll
    path('M250 400 L774 400 L774 850 L250 850 Z', ol(P.cream, 18)),
    rect(214, 370, 596, 64, ol(P.parchment, 18), 32),
    rect(214, 820, 596, 64, ol(P.parchment, 18), 32),
    // names and ticks
    ...[0, 1, 2, 3].map((i) => path(`M350 ${490 + i * 82} L690 ${490 + i * 82}`, line(18, P.parchment))),
    ...[0, 1, 2, 3].map((i) =>
      i === 1
        ? path(`M290 ${470 + i * 82} L326 ${510 + i * 82} M326 ${470 + i * 82} L290 ${510 + i * 82}`, line(16, P.red))
        : path(`M286 ${490 + i * 82} L304 ${508 + i * 82} L332 ${470 + i * 82}`, line(16, P.holly)),
    ),
    // wax seal with a holly sprig
    circle(706, 790, 76, ol(P.red, 18)),
    circle(706, 790, 50, { fill: 'none', stroke: P.redDark, 'stroke-width': 8 }),
    hollyLeaf(690, 790, 70, -30, P.holly, 10),
    hollyLeaf(726, 790, 70, 30, P.hollyLight, 10),
    berries(708, 776, 12, 8),
    sparkle(830, 220, 40), sparkle(190, 260, 28),
    rect(10, 10, S - 20, S - 20, { fill: 'none', stroke: P.gold, 'stroke-width': 20 }, 190),
  );
}

// ---------------------------------------------------------------- login key art (1170 x 1290)

export function keyArt() {
  const W = 1170;
  const H = 1290;
  return g(
    {},
    `<defs><linearGradient id="ka-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.night}"/><stop offset="0.7" stop-color="${P.nightMid}"/><stop offset="1" stop-color="${P.nightLight}"/></linearGradient></defs>`,
    rect(0, 0, W, H, { fill: 'url(#ka-sky)' }),
    starfield('keyart', W, 700, 140),
    // aurora ribbons
    path('M-50 260 C200 150 420 330 660 210 C860 110 1020 220 1220 150', { fill: 'none', stroke: P.hollyLight, 'stroke-width': 60, opacity: 0.25, 'stroke-linecap': 'round' }),
    path('M-50 320 C220 230 460 390 700 280 C900 190 1040 290 1220 230', { fill: 'none', stroke: P.frost, 'stroke-width': 34, opacity: 0.2, 'stroke-linecap': 'round' }),
    // moon
    circle(930, 170, 90, { fill: P.cream }),
    circle(960, 150, 90, { fill: P.night, opacity: 0.0 }),
    circle(900, 150, 16, { fill: P.parchment }), circle(950, 210, 22, { fill: P.parchment }),
    // Scrinch's shadow in the clouds: two great horns and glowing eyes
    path('M120 520 Q160 360 330 330 Q260 420 250 520 Z M560 520 Q520 360 350 330 Q420 420 430 520 Z', { fill: P.nightLight, opacity: 0.55 }),
    ellipse(340, 540, 200, 120, { fill: P.nightLight, opacity: 0.45 }),
    ellipse(290, 520, 26, 12, { fill: P.red, opacity: 0.9 }), ellipse(390, 520, 26, 12, { fill: P.red, opacity: 0.9 }),
    // back mountains
    path(`M0 760 L180 560 L330 700 L520 470 L720 690 L880 540 L1170 760 L1170 ${H} L0 ${H} Z`, { fill: P.nightLight }),
    path('M520 470 L470 530 L500 520 L520 545 L548 515 L575 530 Z M180 560 L150 600 L184 590 L210 600 Z M880 540 L850 580 L884 572 L910 584 Z', { fill: P.white }),
    // the lair: a snowy hill with a big round door and warm windows
    path(`M-20 900 Q300 600 585 620 Q880 600 1190 900 L1190 ${H} L-20 ${H} Z`, ol(P.frostLight, 12)),
    path('M455 900 L455 770 Q455 660 585 660 Q715 660 715 770 L715 900 Z', ol(P.red, 12)),
    path('M480 900 L480 776 Q480 690 585 690 Q690 690 690 776 L690 900 Z', { fill: P.goldBright }),
    path('M585 690 L585 900', line(10, P.goldDark)),
    circle(560, 800, 10, ol(P.gold, 5)), circle(610, 800, 10, ol(P.gold, 5)),
    // wreath over door
    circle(585, 640, 46, line(26, P.ink)), circle(585, 640, 46, line(16, P.holly)), berries(585, 690, 9),
    ...([[300, 760], [870, 760]] as const).map(([x, y]) =>
      g({}, rect(x - 50, y - 50, 100, 90, ol(P.goldBright, 10), 44), path(`M${x} ${y - 50} L${x} ${y + 40} M${x - 50} ${y - 6} L${x + 50} ${y - 6}`, line(8, P.cocoa)), path(`M${x - 56} ${y - 46} Q${x} ${y - 80} ${x + 56} ${y - 46}`, line(14, P.white))),
    ),
    // chimney with smoke
    rect(780, 560, 70, 110, ol(P.redDark, 10), 4),
    rect(770, 548, 90, 24, ol(P.white, 8), 8),
    path('M815 530 q-40 -40 0 -80 q40 -40 0 -80', { fill: 'none', stroke: P.silver, 'stroke-width': 24, opacity: 0.6, 'stroke-linecap': 'round' }),
    // garland across the door
    garland(400, 770, 900, 50),
    // pines
    pine(80, 1010, 300), pine(210, 1060, 220, P.pineMid), pine(1090, 1010, 300), pine(960, 1070, 220, P.pineMid),
    // foreground snow
    path(`M0 1080 Q300 1010 585 1060 Q880 1110 1170 1040 L1170 ${H} L0 ${H} Z`, ol(P.white, 12)),
    // imps sneaking across the snow, one carrying a sack of presents
    imp_silhouette(250, 1140, 1.3, P.ink),
    imp_silhouette(420, 1170, 1.0, P.ink),
    g({}, imp_silhouette(860, 1150, 1.5, P.ink), path('M900 1060 Q1000 980 1060 1060 Q1080 1130 980 1140 Q900 1130 900 1060 Z', ol(P.redDark, 10)), path('M930 1060 Q980 1040 1030 1060', line(8, P.gold))),
    // footprints
    ...[0, 1, 2, 3, 4, 5].map((i) => ellipse(470 + i * 60, 1210 + (i % 2) * 18, 12, 7, { fill: P.frost })),
    snowfall('keyart-snow', W, H, 90),
  );
}

// ---------------------------------------------------------------- location banners (1170 x 470)

const BW = 1170;
const BH = 470;
const FLOORY = 360;

function room(wall: string, wallDark: string, floorC: string, plank: string, seed: string, body: string[]) {
  return g(
    {},
    rect(0, 0, BW, BH, { fill: wall }),
    ...Array.from({ length: 12 }, (_, i) => rect(i * 100, 0, 50, FLOORY, { fill: wallDark, opacity: 0.25 })),
    floor(BW, BH, FLOORY, floorC, plank),
    ...body,
    // soft vignette so the middle (where the trap sits) reads first
    `<defs><radialGradient id="vig-${seed}" cx="0.5" cy="0.6" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient></defs>`,
    rect(0, 0, BW, BH, { fill: `url(#vig-${seed})` }),
  );
}

export const locations: Record<string, () => string> = {
  cookie_pantry: () =>
    room('#e9c891', '#d4ad70', '#b07a45', '#8c5a2e', 'pantry', [
      window_(500, 50, 170, 140, 'pantry'),
      garland(380, 790, 30, 40),
      shelf(40, 400, 150), shelf(770, 1130, 150),
      jar(110, 150, 0.9, P.red, P.cookie), jar(220, 150, 0.8, P.holly, P.pink), jar(330, 150, 0.9, P.gold, P.cocoaLight),
      jar(840, 150, 0.85, P.holly, P.cookieLight), jar(950, 150, 0.9, P.red, P.cocoaLight), jar(1060, 150, 0.8, P.gold, P.pink),
      shelf(40, 400, 300), shelf(770, 1130, 300),
      ...[90, 170, 250].map((x) => g({}, rect(x - 30, 214, 60, 86, ol(P.silver, 7), 10), rect(x - 20, 196, 40, 22, ol(P.silverDark, 6), 6), rect(x - 30, 240, 60, 14, { fill: P.red }))),
      ...[860, 960, 1060].map((x, i) => g({}, ellipse(x, 290, 44, 14, ol(P.cream, 6)), ...[0, 1, 2].map((k) => ellipse(x, 280 - k * 14, 34, 9, ol(i === 1 ? P.cocoaLight : P.cookie, 5))))),
      // milk churns on the floor
      ...[60, 1110].map((x) => g({}, rect(x - 40, 300, 80, 110, ol(P.silver, 8), 16), rect(x - 26, 280, 52, 26, ol(P.silverDark, 7), 8), rect(x - 40, 340, 80, 14, { fill: P.frostDark }))),
      // crumbs on the floor
      ...([[400, 420], [450, 440], [720, 430], [780, 410]] as const).map(([x, y]) => circle(x, y, 6, { fill: P.cookie })),
    ]),

  wrapping_room: () =>
    room('#b48ccc', '#9a6fb8', '#7a5a8f', '#5e4370', 'wrap', [
      garland(0, 560, 20, 50), garland(610, 1170, 20, 50),
      // tall paper rolls leaning on the wall
      ...([[60, P.red, P.gold], [130, P.holly, P.white], [200, P.frost, P.red], [980, P.gold, P.red], [1050, P.red, P.white], [1120, P.purpleLight, P.goldBright]] as const).map(([x, c, s], i) =>
        g({ transform: `rotate(${i < 3 ? -8 : 8} ${x} 360)` }, rect(Number(x) - 28, 80, 56, 290, ol(String(c), 8), 10), ...[0, 1, 2, 3, 4].map((k) => path(`M${Number(x) - 28} ${110 + k * 56} L${Number(x) + 28} ${130 + k * 56}`, line(8, String(s)))), ellipse(Number(x), 80, 28, 10, ol(shade(String(c), 0.3), 6))),
      ),
      // ribbon spools on a rack
      rect(300, 120, 570, 16, ol(P.cocoa, 6), 6),
      ...[0, 1, 2, 3, 4, 5].map((i) => g({}, circle(350 + i * 94, 128, 34, ol([P.red, P.gold, P.holly, P.pink, P.frostDark, P.redLight][i]!, 7)), circle(350 + i * 94, 128, 12, ol(P.cream, 5)), path(`M${350 + i * 94} 162 Q${360 + i * 94} 210 ${340 + i * 94} 250`, line(8, [P.red, P.gold, P.holly, P.pink, P.frostDark, P.redLight][i]!)))),
      // stacks of wrapped gifts on both sides
      ...([[250, 300, 120, 70, P.red, P.gold], [270, 240, 90, 60, P.holly, P.red], [880, 290, 130, 80, P.gold, P.red], [900, 220, 90, 70, P.frostDark, P.white]] as const).map(([x, y, w, h, c, r]) =>
        g({}, rect(Number(x), Number(y), Number(w), Number(h), ol(String(c), 7), 6), rect(Number(x) + Number(w) / 2 - 8, Number(y), 16, Number(h), { fill: String(r) }), path(`M${Number(x) + Number(w) / 2} ${y} l-22 -18 l4 22 Z M${Number(x) + Number(w) / 2} ${y} l22 -18 l-4 22 Z`, ol(String(r), 5))),
      ),
      ...([[430, 420, P.red], [700, 440, P.gold], [600, 400, P.holly]] as const).map(([x, y, c]) => path(`M${x} ${y} q30 -20 60 0 q30 20 60 0`, line(8, String(c)))),
    ]),

  toy_workshop: () =>
    room('#8fb8a8', '#77a191', '#8c6a46', '#6a4c2e', 'toys', [
      lantern(585, 40, 1),
      // gears on the wall
      gear(120, 120, 70, 10, P.brass, 7, 0.3), gear(210, 190, 44, 8, P.goldDark, 7, 0.3), gear(1050, 120, 80, 11, P.brass, 7, 0.3), gear(950, 200, 40, 8, P.silver, 7, 0.3),
      // pegboard of tools
      rect(300, 70, 190, 150, ol(P.cookieLight, 7), 8),
      path('M330 100 L330 190 M360 100 L360 170 M400 110 L440 190 M460 100 L460 190', line(10, P.silverDark)),
      rect(680, 70, 190, 150, ol(P.cookieLight, 7), 8),
      path('M720 110 L720 190 M760 100 L790 180 M820 100 L820 190 M850 110 L850 180', line(10, P.silverDark)),
      // workbenches
      rect(20, 280, 340, 30, ol(P.cocoaLight, 8), 6), path('M50 310 L50 400 M330 310 L330 400', line(16, P.cocoa)),
      rect(810, 280, 340, 30, ol(P.cocoaLight, 8), 6), path('M840 310 L840 400 M1120 310 L1120 400', line(16, P.cocoa)),
      // toys on the benches: a rocking horse, blocks, a wind-up soldier, paint pots
      g({}, path('M80 270 Q140 300 200 270', line(10, P.redDark)), rect(100, 200, 80, 50, ol(P.red, 6), 20), circle(190, 196, 22, ol(P.red, 6)), path('M110 250 L100 270 M170 250 L180 270', line(8))),
      rect(240, 240, 40, 40, ol(P.frostDark, 6), 4), rect(282, 240, 40, 40, ol(P.goldBright, 6), 4), rect(260, 200, 40, 40, ol(P.red, 6), 4),
      g({}, rect(860, 200, 40, 80, ol(P.red, 6), 6), circle(880, 186, 20, ol(P.cookieLight, 6)), rect(866, 150, 28, 24, ol(P.coal, 6), 4), rect(900, 230, 28, 10, ol(P.brass, 4))),
      ...([[980, P.red], [1030, P.frostDark], [1080, P.goldBright]] as const).map(([x, c]) => g({}, rect(Number(x) - 20, 230, 40, 50, ol(P.silver, 6), 6), ellipse(Number(x), 232, 20, 6, { fill: String(c) }), path(`M${x} 232 L${x} 252`, line(8, String(c))))),
      ...([[430, 430, P.red], [740, 420, P.frostDark]] as const).map(([x, y, c]) => ellipse(Number(x), Number(y), 30, 10, { fill: String(c), opacity: 0.7 })),
    ]),

  reindeer_stables: () =>
    room('#7a5233', '#634128', '#c9a75e', '#a8873f', 'stables', [
      // stall doors left and right
      ...[30, 920].map((x) => g({}, rect(x, 130, 220, 230, ol(P.cocoaLight, 8), 6), path(`M${x} 130 L${x + 220} 360 M${x + 220} 130 L${x} 360`, line(10, P.cocoa)), rect(x, 120, 220, 24, ol(P.cocoa, 7), 4))),
      // name plaques without names
      rect(95, 90, 90, 30, ol(P.gold, 6), 6), rect(985, 90, 90, 30, ol(P.gold, 6), 6),
      // harness with bells on the wall
      path('M330 100 Q585 220 840 100', line(26, P.ink)), path('M330 100 Q585 220 840 100', line(16, P.redDark)),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const t = (i + 1) / 8;
        const x = (1 - t) * (1 - t) * 330 + 2 * (1 - t) * t * 585 + t * t * 840;
        const y = (1 - t) * (1 - t) * 100 + 2 * (1 - t) * t * 220 + t * t * 100;
        return circle(x, y + 22, 16, ol(P.gold, 6));
      }),
      lantern(300, 170, 0.7), lantern(870, 170, 0.7),
      // hay bales
      ...([[300, 330], [870, 330], [420, 380]] as const).map(([x, y]) => g({}, rect(x - 70, y - 50, 140, 80, ol(P.goldBright, 8), 10), path(`M${x - 70} ${y - 20} L${x + 70} ${y - 20} M${x - 70} ${y + 6} L${x + 70} ${y + 6}`, line(5, P.goldDark)), path(`M${x - 40} ${y - 50} L${x - 40} ${y + 30} M${x + 40} ${y - 50} L${x + 40} ${y + 30}`, line(7, P.redDark)))),
      // loose straw
      ...Array.from({ length: 20 }, (_, i) => path(`M${100 + i * 52} ${400 + (i % 3) * 16} l${18 + (i % 4) * 4} ${-6 + (i % 2) * 10}`, line(4, P.goldDark))),
      // carrot bucket
      g({}, path('M680 420 L700 340 L780 340 L800 420 Z', ol(P.silverDark, 7)), path('M708 340 L700 300 M740 340 L746 296 M770 340 L786 304', line(14, P.orange))),
    ]),
  carol_loft: () =>
    room('#d9c3a0', '#bfa57f', '#8a6a48', '#6e5136', 'loft', [
      // rafters
      ...[0, 1, 2, 3, 4].map((i) => path(`M${-40 + i * 300} 0 L${280 + i * 300} 330`, line(18, '#6e5136'))),
      // round window with moonlight
      circle(585, 120, 74, ol('#f0e6c8', 10)), circle(585, 120, 58, { fill: P.night }), circle(600, 108, 20, { fill: P.cream }), path('M585 62 L585 178 M527 120 L643 120', line(6, '#f0e6c8')),
      // music stands with sheet music
      ...([[250, 380], [900, 370]] as const).map(([x, y]) => g({}, path(`M${x} ${y} L${x} ${y - 190} M${x - 40} ${y} L${x} ${y - 40} L${x + 40} ${y}`, line(10, P.silverDark)), rect(x - 60, y - 270, 120, 90, ol(P.cream, 6), 4), path(`M${x - 48} ${y - 250} H${x + 48} M${x - 48} ${y - 230} H${x + 48} M${x - 48} ${y - 210} H${x + 48}`, line(3, P.ink)), circle(x - 20, y - 240, 6, { fill: P.ink }), circle(x + 18, y - 220, 6, { fill: P.ink }))),
      // stack of old carol books
      g({}, rect(1010, 380, 130, 28, ol(P.red, 6), 4), rect(1020, 352, 110, 28, ol(P.holly, 6), 4), rect(1030, 324, 90, 28, ol(P.gold, 6), 4)),
      // tarnished horn on a hook
      g({}, path('M90 160 L200 200 L90 240 Z', ol(P.goldDark)), circle(84, 200, 26, ol(P.goldDark))),
      lantern(420, 110, 0.7),
    ]),
};

// ---------------------------------------------------------------- travel map (1600 x 900)

/** Pin positions on the travel map, in map pixels. The UI draws labels and lock states over these. */
export const MAP_PINS = {
  cookie_pantry: { x: 470, y: 690 },
  wrapping_room: { x: 1010, y: 650 },
  toy_workshop: { x: 640, y: 450 },
  reindeer_stables: { x: 1130, y: 380 },
  carol_loft: { x: 1260, y: 700 },
} satisfies Record<string, { x: number; y: number }>;

export function travelMap() {
  const W = 1600;
  const H = 900;
  const chamber = (x: number, y: number, rx: number, ry: number, fill: string, inner: string) =>
    g({}, ellipse(x, y, rx, ry, ol(P.nightMid, 10)), ellipse(x, y + 6, rx - 16, ry - 14, { fill }), inner);
  return g(
    {},
    rect(0, 0, W, H, { fill: P.night }),
    starfield('map', W, 360, 120),
    path('M-50 180 C300 80 600 230 900 130 C1150 50 1350 160 1650 90', { fill: 'none', stroke: P.hollyLight, 'stroke-width': 50, opacity: 0.22, 'stroke-linecap': 'round' }),
    // mountain cutaway
    path('M0 900 L0 640 L260 300 L420 410 L800 120 L1100 330 L1280 220 L1600 560 L1600 900 Z', ol(P.frostLight, 12)),
    path('M800 120 L730 210 L770 196 L800 230 L840 196 L870 210 Z M260 300 L220 360 L260 348 L290 362 Z M1280 220 L1240 280 L1280 268 L1310 282 Z', { fill: P.white }),
    path('M120 900 L120 700 L340 420 L520 480 L800 230 L1060 410 L1240 330 L1480 620 L1480 900 Z', { fill: P.nightMid, stroke: P.ink, 'stroke-width': 10, 'stroke-linejoin': 'round' }),
    // tunnels linking the rooms
    path(`M${MAP_PINS.cookie_pantry.x} ${MAP_PINS.cookie_pantry.y} Q750 720 ${MAP_PINS.wrapping_room.x} ${MAP_PINS.wrapping_room.y}`, line(40, '#121a33')),
    path(`M${MAP_PINS.cookie_pantry.x} ${MAP_PINS.cookie_pantry.y} Q520 550 ${MAP_PINS.toy_workshop.x} ${MAP_PINS.toy_workshop.y}`, line(40, '#121a33')),
    path(`M${MAP_PINS.toy_workshop.x} ${MAP_PINS.toy_workshop.y} Q900 380 ${MAP_PINS.reindeer_stables.x} ${MAP_PINS.reindeer_stables.y}`, line(40, '#121a33')),
    path(`M${MAP_PINS.wrapping_room.x} ${MAP_PINS.wrapping_room.y} Q1150 700 ${MAP_PINS.carol_loft.x} ${MAP_PINS.carol_loft.y}`, line(40, '#121a33')),
    path(`M${MAP_PINS.cookie_pantry.x} ${MAP_PINS.cookie_pantry.y} Q750 720 ${MAP_PINS.wrapping_room.x} ${MAP_PINS.wrapping_room.y} M${MAP_PINS.cookie_pantry.x} ${MAP_PINS.cookie_pantry.y} Q520 550 ${MAP_PINS.toy_workshop.x} ${MAP_PINS.toy_workshop.y} M${MAP_PINS.toy_workshop.x} ${MAP_PINS.toy_workshop.y} Q900 380 ${MAP_PINS.reindeer_stables.x} ${MAP_PINS.reindeer_stables.y}`, { ...line(6, P.goldBright), 'stroke-dasharray': '4 18', opacity: 0.8 }),
    // chambers, each hinting at its room
    chamber(MAP_PINS.cookie_pantry.x, MAP_PINS.cookie_pantry.y, 150, 90, '#e9c891',
      jar(MAP_PINS.cookie_pantry.x - 60, MAP_PINS.cookie_pantry.y + 50, 0.45, P.red, P.cookie) + jar(MAP_PINS.cookie_pantry.x + 60, MAP_PINS.cookie_pantry.y + 50, 0.45, P.holly, P.cocoaLight)),
    chamber(MAP_PINS.wrapping_room.x, MAP_PINS.wrapping_room.y, 150, 90, '#b48ccc',
      rect(MAP_PINS.wrapping_room.x - 80, MAP_PINS.wrapping_room.y + 4, 60, 44, ol(P.red, 6), 4) + rect(MAP_PINS.wrapping_room.x + 20, MAP_PINS.wrapping_room.y - 6, 60, 54, ol(P.gold, 6), 4)),
    chamber(MAP_PINS.toy_workshop.x, MAP_PINS.toy_workshop.y, 140, 84, '#8fb8a8',
      gear(MAP_PINS.toy_workshop.x - 50, MAP_PINS.toy_workshop.y + 10, 34, 9, P.brass, 6, 0.3) + gear(MAP_PINS.toy_workshop.x + 40, MAP_PINS.toy_workshop.y + 20, 26, 8, P.goldDark, 6, 0.3)),
    chamber(MAP_PINS.carol_loft.x, MAP_PINS.carol_loft.y, 120, 74, '#d9c3a0',
      path(`M${MAP_PINS.carol_loft.x - 50} ${MAP_PINS.carol_loft.y + 20} H${MAP_PINS.carol_loft.x + 50} M${MAP_PINS.carol_loft.x - 50} ${MAP_PINS.carol_loft.y + 36} H${MAP_PINS.carol_loft.x + 50}`, line(4, P.cocoa)) + circle(MAP_PINS.carol_loft.x - 14, MAP_PINS.carol_loft.y + 30, 8, { fill: P.ink })),
    chamber(MAP_PINS.reindeer_stables.x, MAP_PINS.reindeer_stables.y, 140, 84, '#7a5233',
      rect(MAP_PINS.reindeer_stables.x - 70, MAP_PINS.reindeer_stables.y + 6, 70, 40, ol(P.goldBright, 6), 6) + rect(MAP_PINS.reindeer_stables.x + 10, MAP_PINS.reindeer_stables.y + 6, 60, 40, ol(P.goldBright, 6), 6)),
    // the front door at the base
    path('M720 900 L720 830 Q720 780 780 780 Q840 780 840 830 L840 900 Z', ol(P.red, 10)),
    path('M736 900 L736 836 Q736 796 780 796 Q824 796 824 836 L824 900 Z', { fill: P.goldBright }),
    pine(60, 900, 200), pine(1540, 900, 220), pine(1420, 900, 150, P.pineMid),
    snowfall('map-snow', W, H, 60),
    // compass rose
    g({ transform: 'translate(1480 120)' }, circle(0, 0, 56, ol(P.cream, 8)), star(0, 0, 44, ol(P.red, 5), 0.3), snowflake(0, 0, 20, P.frostDark, 4)),
  );
}

void sparkle;
