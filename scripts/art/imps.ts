/**
 * Imp portraits (512x512, square). Every imp is built from one shared head template
 * (so the set reads as one family) plus its own colours, horns, face and a signature prop.
 */
import {
  P, OUTLINE as O, g, ol, line, circle, ellipse, rect, path, poly, glint, sparkle, star, gear,
  hollyLeaf, shade, rng,
} from './lib.js';

export type Tier = 'common' | 'rare' | 'miniboss' | 'boss';

type Horns = 'nub' | 'curl' | 'long' | 'big' | 'antler';
type Eyes = 'sly' | 'wide' | 'angry' | 'squint' | 'monocle' | 'mask' | 'goggles';
type Mouth = 'grin' | 'fang' | 'smirk' | 'open' | 'chew' | 'tape' | 'lips' | 'beard' | 'straw';

type ImpLook = {
  skin: string;
  /** Head radius; bosses are bigger. */
  r?: number;
  horns: Horns;
  hornColor?: string;
  eyes: Eyes;
  mouth: Mouth;
  /** Clothing colour for the shoulders. */
  body: string;
  /** Drawn behind the head. */
  back?: () => string;
  /** Drawn over the head. */
  front?: () => string;
  /** Short art description, used in the manifest prompt. */
  look: string;
};

/** Background colour and motif for each lair location. */
const SCENES: Record<string, { bg: string; motif: (seed: string) => string; skin: string }> = {
  cookie_pantry: {
    bg: '#f1d9b0',
    skin: '#d9573d',
    motif: (seed) => {
      const r = rng(seed);
      return Array.from({ length: 7 }, () => circle(40 + r() * 432, 40 + r() * 300, 16 + r() * 22, { fill: '#e2bf8a' })).join('');
    },
  },
  wrapping_room: {
    bg: '#e7c8e6',
    skin: '#8c5bb5',
    motif: () => [0, 1, 2, 3, 4, 5, 6].map((i) => path(`M${-100 + i * 110} 0 L${80 + i * 110} 512`, line(34, '#dbb2da'))).join(''),
  },
  toy_workshop: {
    bg: '#cfe3d9',
    skin: '#5f9e4c',
    motif: (seed) => {
      const r = rng(seed);
      return Array.from({ length: 4 }, () => gear(60 + r() * 392, 50 + r() * 260, 36 + r() * 30, 9, '#b5d1c3', 0, 0)).join('');
    },
  },
  reindeer_stables: {
    bg: '#d9cfae',
    skin: '#a0483a',
    motif: () => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => path(`M${i * 64} 0 L${i * 64} 512`, line(22, '#cbbf98'))).join(''),
  },
};

const TIER_FRAME: Record<Tier, (s: number) => string> = {
  common: (s) => rect(6, 6, s - 12, s - 12, { fill: 'none', stroke: P.ink, 'stroke-width': 12 }, 40),
  rare: (s) =>
    [
      rect(6, 6, s - 12, s - 12, { fill: 'none', stroke: P.ink, 'stroke-width': 12 }, 40),
      rect(18, 18, s - 36, s - 36, { fill: 'none', stroke: P.gold, 'stroke-width': 8 }, 30),
      sparkle(56, 56, 22), sparkle(s - 56, 70, 16), sparkle(s - 64, s - 150, 14),
    ].join(''),
  miniboss: (s) =>
    [
      rect(6, 6, s - 12, s - 12, { fill: 'none', stroke: P.ink, 'stroke-width': 12 }, 40),
      rect(18, 18, s - 36, s - 36, { fill: 'none', stroke: P.silver, 'stroke-width': 10 }, 30),
      rect(30, 30, s - 60, s - 60, { fill: 'none', stroke: P.silverDark, 'stroke-width': 3 }, 22),
    ].join(''),
  boss: (s) =>
    [
      rect(6, 6, s - 12, s - 12, { fill: 'none', stroke: P.ink, 'stroke-width': 12 }, 40),
      rect(18, 18, s - 36, s - 36, { fill: 'none', stroke: P.red, 'stroke-width': 12 }, 30),
      rect(32, 32, s - 64, s - 64, { fill: 'none', stroke: P.gold, 'stroke-width': 4 }, 20),
      star(40, 40, 24, ol(P.goldBright, 5)), star(s - 40, 40, 24, ol(P.goldBright, 5)),
    ].join(''),
};

function horns(kind: Horns, cx: number, top: number, r: number, color: string) {
  const h = (side: 1 | -1, d: string) => path(d.replace(/X(-?\d+(?:\.\d+)?)/g, (_, n) => String(cx + side * Number(n))), ol(color));
  const both = (d: string) => h(-1, d) + h(1, d);
  switch (kind) {
    case 'nub':
      return both(`MX${r * 0.35} ${top + 30} LX${r * 0.55} ${top - 34} LX${r * 0.7} ${top + 40} Z`);
    case 'curl':
      return both(`MX${r * 0.3} ${top + 34} QX${r * 0.4} ${top - 60} X${r * 0.95} ${top - 50} QX${r * 0.7} ${top - 20} X${r * 0.72} ${top + 44} Z`);
    case 'long':
      return both(`MX${r * 0.3} ${top + 36} QX${r * 0.5} ${top - 40} X${r * 0.45} ${top - 100} QX${r * 0.8} ${top - 40} X${r * 0.72} ${top + 44} Z`);
    case 'big':
      return both(`MX${r * 0.25} ${top + 40} QX${r * 0.5} ${top - 70} X${r * 1.25} ${top - 90} QX${r * 0.9} ${top - 40} X${r * 0.78} ${top + 50} Z`);
    case 'antler':
      return (
        both(`MX${r * 0.4} ${top + 30} LX${r * 0.55} ${top - 70} LX${r * 0.95} ${top - 110}`).replace(/fill="[^"]*"/, 'fill="none"') +
        [-1, 1]
          .map((s) => {
            const d = `M${cx + s * r * 0.4} ${top + 30} L${cx + s * r * 0.55} ${top - 70} L${cx + s * r * 0.95} ${top - 110} M${cx + s * r * 0.55} ${top - 70} L${cx + s * r * 0.3} ${top - 120} M${cx + s * r * 0.75} ${top - 90} L${cx + s * r * 1.05} ${top - 60}`;
            return path(d, line(30, P.ink)) + path(d, line(18, color));
          })
          .join('')
      );
  }
}

function eyes(kind: Eyes, cx: number, cy: number) {
  const pair = (fn: (x: number, s: 1 | -1) => string) => fn(cx - 50, -1) + fn(cx + 50, 1);
  const pupil = (x: number, y: number, r = 11) => circle(x, y, r, { fill: P.ink }) + circle(x - 4, y - 4, 3.5, { fill: P.white });
  switch (kind) {
    case 'sly':
      return pair((x, s) => ellipse(x, cy, 30, 24, ol(P.cream, 8)) + pupil(x + s * 8, cy + 4) + path(`M${x - 34} ${cy - 30 + s * 6} L${x + 34} ${cy - 30 - s * 6}`, line(10)));
    case 'wide':
      return pair((x) => circle(x, cy, 32, ol(P.cream, 8)) + pupil(x, cy, 14));
    case 'angry':
      return pair((x, s) => ellipse(x, cy + 4, 28, 22, ol(P.goldBright, 8)) + pupil(x, cy + 6, 10) + path(`M${x - 36} ${cy - 30 - s * 12} L${x + 36} ${cy - 18 + s * 12}`, line(12)));
    case 'squint':
      return pair((x) => path(`M${x - 26} ${cy} Q${x} ${cy - 20} ${x + 26} ${cy}`, line(10)) + path(`M${x - 30} ${cy - 28} L${x + 30} ${cy - 34}`, line(8)));
    case 'monocle':
      return (
        ellipse(cx - 50, cy, 28, 22, ol(P.cream, 8)) + pupil(cx - 46, cy + 2) + path(`M${cx - 82} ${cy - 30} L${cx - 20} ${cy - 40}`, line(10)) +
        circle(cx + 50, cy, 30, ol(P.cream, 8)) + pupil(cx + 50, cy, 13) +
        circle(cx + 50, cy, 40, { fill: P.frostLight, opacity: 0.35, stroke: P.gold, 'stroke-width': 9 }) +
        path(`M${cx + 88} ${cy + 12} Q${cx + 110} ${cy + 90} ${cx + 90} ${cy + 150}`, line(4, P.gold))
      );
    case 'mask':
      return (
        path(`M${cx - 110} ${cy - 20} Q${cx} ${cy - 46} ${cx + 110} ${cy - 20} L${cx + 104} ${cy + 26} Q${cx} ${cy + 10} ${cx - 104} ${cy + 26} Z`, ol(P.ink)) +
        path(`M${cx + 104} ${cy - 10} L${cx + 150} ${cy - 30} M${cx + 104} ${cy + 6} L${cx + 146} ${cy + 20}`, line(10)) +
        pair((x) => ellipse(x, cy, 22, 15, { fill: P.cream }) + pupil(x, cy + 2, 8))
      );
    case 'goggles':
      return pair((x) => circle(x, cy, 36, ol(P.brass, 9)) + circle(x, cy, 24, ol(P.frostLight, 5)) + pupil(x, cy + 2, 10)) + path(`M${cx - 14} ${cy} L${cx + 14} ${cy}`, line(10));
  }
}

function mouth(kind: Mouth, cx: number, cy: number) {
  switch (kind) {
    case 'grin':
      return path(`M${cx - 60} ${cy} Q${cx} ${cy + 60} ${cx + 60} ${cy} Z`, ol(P.redDark, 9)) + path(`M${cx - 44} ${cy + 6} L${cx - 30} ${cy + 22} L${cx - 16} ${cy + 10} L${cx} ${cy + 26} L${cx + 16} ${cy + 10} L${cx + 30} ${cy + 22} L${cx + 44} ${cy + 6}`, ol(P.white, 5));
    case 'fang':
      return path(`M${cx - 54} ${cy} Q${cx} ${cy + 40} ${cx + 54} ${cy}`, line(10)) + poly([[cx - 30, cy + 12], [cx - 22, cy + 38], [cx - 14, cy + 16]], ol(P.white, 5)) + poly([[cx + 30, cy + 12], [cx + 22, cy + 38], [cx + 14, cy + 16]], ol(P.white, 5));
    case 'smirk':
      return path(`M${cx - 44} ${cy + 10} Q${cx + 10} ${cy + 24} ${cx + 50} ${cy - 10}`, line(10)) + poly([[cx + 20, cy + 6], [cx + 28, cy + 28], [cx + 36, cy + 2]], ol(P.white, 5));
    case 'open':
      return ellipse(cx, cy + 14, 38, 30, ol(P.redDark, 9)) + ellipse(cx, cy + 28, 20, 10, { fill: P.pink }) + poly([[cx - 22, cy - 8], [cx - 14, cy + 10], [cx - 6, cy - 8]], ol(P.white, 4));
    case 'chew':
      return path(`M${cx - 50} ${cy + 4} Q${cx} ${cy + 30} ${cx + 50} ${cy + 4}`, line(10)) + circle(cx - 66, cy - 10, 16, { fill: P.redLight, opacity: 0.6 }) + circle(cx + 66, cy - 10, 16, { fill: P.redLight, opacity: 0.6 });
    case 'tape':
      return path(`M${cx - 50} ${cy + 6} Q${cx} ${cy + 26} ${cx + 50} ${cy + 6}`, line(10)) + rect(cx - 14, cy - 2, 120, 34, { ...ol('#f4e6a6', 7), transform: `rotate(18 ${cx} ${cy})` }, 4);
    case 'lips':
      return path(`M${cx - 42} ${cy + 8} Q${cx - 20} ${cy - 10} ${cx} ${cy + 2} Q${cx + 20} ${cy - 10} ${cx + 42} ${cy + 8} Q${cx} ${cy + 40} ${cx - 42} ${cy + 8} Z`, ol(P.red, 8)) + poly([[cx + 16, cy + 14], [cx + 22, cy + 32], [cx + 28, cy + 12]], ol(P.white, 4));
    case 'beard':
      return path(`M${cx - 80} ${cy - 20} Q${cx - 70} ${cy + 110} ${cx} ${cy + 150} Q${cx + 70} ${cy + 110} ${cx + 80} ${cy - 20} Q${cx} ${cy + 30} ${cx - 80} ${cy - 20} Z`, ol(P.coal)) + path(`M${cx - 40} ${cy + 4} Q${cx} ${cy + 24} ${cx + 40} ${cy + 4}`, line(10, P.goldBright)) + poly([[cx - 26, cy + 8], [cx - 18, cy + 30], [cx - 10, cy + 12]], ol(P.white, 4)) + poly([[cx + 26, cy + 8], [cx + 18, cy + 30], [cx + 10, cy + 12]], ol(P.white, 4));
    case 'straw':
      return path(`M${cx - 44} ${cy + 8} Q${cx} ${cy + 26} ${cx + 44} ${cy + 8}`, line(10)) + path(`M${cx + 20} ${cy + 14} L${cx + 120} ${cy - 30} M${cx + 24} ${cy + 18} L${cx + 116} ${cy - 10}`, line(7, P.goldDark));
  }
}

/** Draws one imp portrait on a 512 canvas. */
function impPortrait(look: ImpLook, location: string, tier: Tier, seed: string) {
  const S = 512;
  const scene = SCENES[location]!;
  const r = look.r ?? 118;
  const cx = 256;
  const cy = 280;
  const top = cy - r * 0.9;
  const skinDark = shade(look.skin, -0.25);
  return g(
    {},
    rect(0, 0, S, S, { fill: scene.bg }, 46),
    el_clip(scene.motif(seed)),
    look.back?.() ?? '',
    // shoulders
    path(`M70 ${S} Q86 ${cy + r * 0.95} ${cx} ${cy + r * 0.9} Q${S - 86} ${cy + r * 0.95} ${S - 70} ${S} Z`, ol(look.body)),
    // ears
    path(`M${cx - r * 0.86} ${cy - 20} L${cx - r * 1.55} ${cy - 70} L${cx - r * 0.8} ${cy + 40} Z`, ol(look.skin)),
    path(`M${cx + r * 0.86} ${cy - 20} L${cx + r * 1.55} ${cy - 70} L${cx + r * 0.8} ${cy + 40} Z`, ol(look.skin)),
    path(`M${cx - r * 0.95} ${cy - 16} L${cx - r * 1.35} ${cy - 50} L${cx - r * 0.9} ${cy + 16} Z`, { fill: skinDark }),
    path(`M${cx + r * 0.95} ${cy - 16} L${cx + r * 1.35} ${cy - 50} L${cx + r * 0.9} ${cy + 16} Z`, { fill: skinDark }),
    horns(look.horns, cx, top, r, look.hornColor ?? P.cream),
    // head
    ellipse(cx, cy, r, r * 0.92, ol(look.skin)),
    ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.3, r * 0.16, { fill: P.white, opacity: 0.18, transform: `rotate(-25 ${cx - r * 0.35} ${cy - r * 0.45})` }),
    // nose
    path(`M${cx - 10} ${cy + 18} Q${cx} ${cy + 34} ${cx + 12} ${cy + 18}`, line(8, skinDark)),
    eyes(look.eyes, cx, cy - 18),
    mouth(look.mouth, cx, cy + 44),
    look.front?.() ?? '',
    TIER_FRAME[tier](S),
  );
}

/** Clips the background motif to the rounded card. */
const el_clip = (body: string) => `<g clip-path="url(#card)">${body}</g>`;
export const CARD_CLIP = '<defs><clipPath id="card"><rect x="0" y="0" width="512" height="512" rx="46"/></clipPath></defs>';

const cookie = (x: number, y: number, rr: number) =>
  circle(x, y, rr, ol(P.cookie, 8)) + circle(x - rr * 0.3, y - rr * 0.2, rr * 0.14, { fill: P.cocoa }) + circle(x + rr * 0.3, y + rr * 0.25, rr * 0.14, { fill: P.cocoa }) + circle(x + rr * 0.2, y - rr * 0.35, rr * 0.1, { fill: P.cocoa });

const LOOKS: Record<string, (skin: string) => ImpLook> = {
  // ---- Cookie Pantry
  crumb_imp: (skin) => ({
    skin, r: 108, horns: 'nub', eyes: 'wide', mouth: 'chew', body: P.cocoaLight,
    front: () => cookie(380, 430, 56) + path('M342 402 q10 -14 22 -4 q8 -16 22 -2', { fill: '#f1d9b0', stroke: 'none' }) + ([[200, 350], [300, 356], [250, 376]] as const).map(([x, y]) => circle(x, y, 6, { fill: P.cookie })).join(''),
    look: 'small round-faced red-orange imp with wide eyes, cookie crumbs on its cheeks, clutching a half-eaten chocolate-chip cookie',
  }),
  sprinkle_snatcher: (skin) => ({
    skin, r: 112, horns: 'curl', eyes: 'sly', mouth: 'grin', body: P.pink,
    back: () => ([[110, 140, P.red], [400, 120, P.holly], [140, 220, P.gold], [380, 220, P.frostDark], [90, 300, P.pink], [430, 300, P.red]] as const).map(([x, y, c], i) => rect(Number(x) - 14, Number(y) - 5, 28, 10, { fill: String(c), transform: `rotate(${i * 50} ${x} ${y})` }, 5)).join(''),
    front: () => ellipse(140, 440, 56, 40, ol(skin)) + ([[120, 420, P.red], [146, 410, P.holly], [160, 436, P.gold], [130, 446, P.frostDark]] as const).map(([x, y, c], i) => rect(Number(x) - 9, Number(y) - 3, 18, 6, { fill: String(c), transform: `rotate(${i * 45} ${x} ${y})` }, 3)).join(''),
    look: 'sly red-orange imp with curled horns and a fistful of rainbow sprinkles, sprinkles flying around its head',
  }),
  chimney_soot_imp: () => ({
    skin: '#5d5357', r: 114, horns: 'nub', hornColor: P.silver, eyes: 'wide', mouth: 'fang', body: P.coal,
    front: () => ([[190, 230, 20], [320, 330, 16], [230, 330, 12], [340, 220, 10]] as const).map(([x, y, rr]) => circle(x, y, rr, { fill: P.ink, opacity: 0.35 })).join('') + path('M390 512 L430 330', line(16, P.ink)) + path('M390 512 L430 330', line(8, P.cocoa)) + ellipse(436, 310, 34, 24, ol(P.coal, 8)) + path('M410 300 l-10 -20 M436 290 l0 -24 M460 300 l10 -20', line(7)),
    look: 'grey soot-covered imp with smudged cheeks and pale little horns, holding a chimney sweep brush',
  }),
  gingerbread_imp: () => ({
    skin: P.cookie, r: 118, horns: 'nub', hornColor: P.cream, eyes: 'wide', mouth: 'grin', body: P.cookie,
    front: () => path('M150 250 q12 10 24 0 q12 10 24 0 M314 250 q12 10 24 0 q12 10 24 0', line(7, P.white)) + circle(256, 440, 12, ol(P.red, 6)) + circle(256, 484, 12, ol(P.holly, 6)) + path('M150 420 q18 12 36 0 M326 420 q18 12 36 0', line(8, P.white)),
    look: 'rare gingerbread-skinned imp decorated with white icing squiggles and candy buttons, cheeky grin',
  }),
  jarbelly: (skin) => ({
    skin, r: 138, horns: 'nub', eyes: 'squint', mouth: 'open', body: '#c94a34',
    back: () => '',
    front: () => rect(160, 108, 192, 40, ol(P.frostLight), 14) + rect(186, 88, 140, 26, ol(P.red), 10) + path('M180 160 L180 152 M330 160 L330 152', line(4)) + cookie(122, 446, 40) + cookie(392, 450, 44),
    look: 'huge round glutton imp with a cookie-jar lid perched on its head as a hat, mouth wide open, cookies in both hands',
  }),
  baron_crumblewick: (skin) => ({
    skin, r: 132, horns: 'curl', hornColor: P.cream, eyes: 'monocle', mouth: 'smirk', body: P.pine,
    front: () =>
      // top hat
      rect(178, 40, 156, 110, ol(P.coal), 10) + rect(150, 136, 212, 26, ol(P.coal), 12) + rect(178, 112, 156, 18, { fill: P.red }) +
      // crumb moustache
      path('M200 316 Q230 296 256 312 Q282 296 312 316 Q290 332 256 322 Q222 332 200 316 Z', ol(P.cookie, 7)) +
      // cravat
      path('M226 420 L256 450 L286 420 L256 470 Z', ol(P.red, 7)) + circle(256, 446, 8, ol(P.goldBright, 4)),
    look: 'pompous boss imp in a black top hat with a red band, gold monocle, moustache made of cookie crumbs, green coat and red cravat',
  }),
  // ---- Wrapping Room
  ribbon_tangler: (skin) => ({
    skin, r: 112, horns: 'nub', eyes: 'wide', mouth: 'grin', body: P.purpleLight,
    front: () => path('M60 380 C160 300 220 470 300 360 C360 280 420 420 470 330', line(26, P.ink)) + path('M60 380 C160 300 220 470 300 360 C360 280 420 420 470 330', line(16, P.red)) + path('M140 160 C200 120 260 200 330 140 C370 110 400 150 380 190', line(20, P.ink)) + path('M140 160 C200 120 260 200 330 140 C370 110 400 150 380 190', line(11, P.goldBright)),
    look: 'purple imp hopelessly wrapped in red and gold ribbon, ribbon loops over its head and shoulders',
  }),
  tape_biter: (skin) => ({
    skin, r: 114, horns: 'curl', eyes: 'angry', mouth: 'tape', body: '#6c4592',
    front: () => circle(110, 440, 50, ol('#f4e6a6', 9)) + circle(110, 440, 20, ol(P.cocoaLight, 7)),
    look: 'grumpy purple imp chewing a long strip of sticky tape, a tape roll in hand',
  }),
  bow_burglar: (skin) => ({
    skin, r: 112, horns: 'nub', eyes: 'mask', mouth: 'smirk', body: P.nightMid,
    front: () => path('M256 124 L196 92 L200 156 Z', ol(P.red, 8)) + path('M256 124 L316 92 L312 156 Z', ol(P.red, 8)) + circle(256, 126, 16, ol(P.redDark, 8)) + path('M110 512 Q100 420 160 400 Q220 420 200 512 Z', ol(P.parchment)) + path('M130 440 L180 440', line(6, P.cocoa)),
    look: 'purple burglar imp in a black eye-mask with a stolen red bow on its head, dragging a loot sack',
  }),
  glitter_imp: () => ({
    skin: '#d27ac7', r: 116, horns: 'curl', hornColor: P.goldBright, eyes: 'wide', mouth: 'grin', body: P.purple,
    back: () => sparkle(100, 130, 26) + sparkle(420, 150, 30, P.white) + sparkle(430, 330, 20) + sparkle(80, 320, 18, P.white),
    front: () => ([[200, 220], [320, 210], [180, 330], [340, 340], [256, 380], [230, 180]] as const).map(([x, y], i) => star(x, y, 9, { fill: i % 2 ? P.goldBright : P.white })).join(''),
    look: 'rare sparkling pink-purple imp covered in glitter, golden curled horns, stars and sparkles around it',
  }),
  spoolwick: (skin) => ({
    skin, r: 126, horns: 'long', eyes: 'squint', mouth: 'fang', body: '#5b3a7a',
    front: () => rect(196, 60, 120, 90, ol(P.red), 4) + rect(180, 56, 152, 22, ol(P.cocoaLight), 8) + rect(180, 134, 152, 22, ol(P.cocoaLight), 8) + path('M206 84 L306 84 M206 104 L306 104 M206 124 L306 124', line(5, P.redDark)) + path('M392 512 L452 300', line(12, P.ink)) + path('M392 512 L452 300', line(5, P.silver)) + ellipse(450, 312, 6, 12, { fill: '#e7c8e6', stroke: P.ink, 'stroke-width': 4 }),
    look: 'tall purple mini-boss imp wearing a red thread spool as a hat, wielding a giant sewing needle',
  }),
  madame_shredwell: () => ({
    skin: '#7b4aa6', r: 130, horns: 'long', hornColor: P.silver, eyes: 'sly', mouth: 'lips', body: P.redDark,
    back: () => ellipse(256, 120, 110, 80, ol(P.coal)) + circle(256, 60, 50, ol(P.coal)),
    front: () => [0, 1].map((i) => g({ transform: `translate(${i ? 330 : 182} 70) rotate(${i ? 30 : -30})` }, circle(-14, 0, 14, ol(P.silver, 6)), circle(14, 0, 14, ol(P.silver, 6)), path('M-6 -10 L10 -60 M6 -10 L-10 -60', line(8, P.silverDark)))).join('') + circle(140, 330, 14, ol(P.goldBright, 6)) + circle(372, 330, 14, ol(P.goldBright, 6)) + path('M180 440 Q256 480 332 440', line(14, P.goldBright)),
    look: 'elegant boss imp with a towering black hair bun stuck with silver scissors, red lips, gold earrings and necklace',
  }),
  // ---- Toy Workshop
  cog_pincher: (skin) => ({
    skin, r: 112, horns: 'nub', eyes: 'sly', mouth: 'grin', body: P.cocoa,
    front: () => g({}, rect(150, 150, 212, 26, ol(P.cocoa, 8), 12), circle(206, 160, 26, ol(P.brass, 7)), circle(306, 160, 26, ol(P.brass, 7)), circle(206, 160, 14, { fill: P.frostLight }), circle(306, 160, 14, { fill: P.frostLight })) + gear(400, 430, 62, 9, P.brass, 8, 0.3),
    look: 'green imp with brass goggles pushed up on its forehead, clutching a stolen brass gear',
  }),
  paint_smudger: (skin) => ({
    skin, r: 114, horns: 'curl', eyes: 'wide', mouth: 'grin', body: P.cream,
    front: () => circle(200, 330, 20, { fill: P.red }) + circle(330, 220, 16, { fill: P.frostDark }) + circle(300, 340, 12, { fill: P.goldBright }) + path('M120 450 L170 340', line(20, P.ink)) + path('M120 450 L170 340', line(10, P.cocoaLight)) + path('M162 350 L186 320 L196 346 Z', ol(P.red, 6)) + circle(320, 450, 14, { fill: P.holly }) + circle(200, 480, 12, { fill: P.frostDark }),
    look: 'green imp splattered with red, blue and yellow paint, waving a dripping paintbrush, paint-stained smock',
  }),
  stuffing_ripper: (skin) => ({
    skin, r: 116, horns: 'long', eyes: 'angry', mouth: 'fang', body: P.pineMid,
    back: () => ([[110, 160], [410, 170], [90, 280], [430, 290]] as const).map(([x, y]) => circle(x, y, 26, ol(P.white, 6))).join(''),
    front: () => ([[120, 440], [180, 470], [380, 450]] as const).map(([x, y]) => circle(x, y, 30, ol(P.white, 7))).join('') + path('M330 470 l24 -50 M352 476 l24 -50 M374 482 l20 -44', line(9)),
    look: 'fierce green imp with long horns and claws, tufts of white toy stuffing flying everywhere',
  }),
  windup_imp: () => ({
    skin: '#8fa0a8', r: 116, horns: 'nub', hornColor: P.brass, eyes: 'goggles', mouth: 'grin', body: P.silverDark,
    back: () => g({}, rect(400, 250, 70, 24, ol(P.brass, 8), 6), path('M470 262 C520 180 420 160 450 230 M470 262 C520 340 420 360 450 290', ol(P.brass, 8))),
    front: () => ([[170, 220], [342, 220], [190, 340], [322, 340]] as const).map(([x, y]) => circle(x, y, 7, ol(P.silver, 4))).join('') + path('M150 450 L362 450', line(8, P.silver)),
    look: 'rare clockwork imp with riveted steel-grey skin, brass round goggles and a big wind-up key in its back',
  }),
  hammerhand: (skin) => ({
    skin, r: 128, horns: 'big', eyes: 'angry', mouth: 'grin', body: P.red,
    front: () => rect(150, 160, 212, 26, ol(P.red, 8), 10) + path('M354 170 L400 150 L390 190 Z', ol(P.red, 7)) + path('M400 512 L410 360', line(26, P.ink)) + path('M400 512 L410 360', line(14, P.cocoaLight)) + rect(350, 310, 130, 70, ol(P.silverDark), 10) + rect(350, 310, 130, 20, { fill: P.silver }),
    look: 'burly green mini-boss imp with big horns, red headband, and a huge steel mallet',
  }),
  foreman_grimbolt: (skin) => ({
    skin: shade(skin, -0.15), r: 134, horns: 'big', hornColor: P.silver, eyes: 'squint', mouth: 'beard', body: P.orange,
    front: () => path('M140 170 Q140 70 256 70 Q372 70 372 170 Z', ol(P.goldBright)) + rect(116, 160, 280, 24, ol(P.gold), 12) + rect(244, 70, 24, 100, { fill: P.gold }) + path('M150 480 L362 480', line(10, P.goldBright)) + path('M330 512 L340 440', line(10, P.silverDark)) + circle(342, 430, 16, ol(P.silver, 6)),
    look: 'stern boss imp foreman in a yellow hard hat, black beard, silver horns, orange hi-vis vest with a whistle',
  }),
  // ---- Reindeer Stables
  hay_hoarder: (skin) => ({
    skin, r: 112, horns: 'nub', eyes: 'sly', mouth: 'straw', body: P.cocoaLight,
    back: () => path('M100 512 Q90 360 256 330 Q422 360 412 512 Z', { fill: P.goldBright }) + Array.from({ length: 14 }, (_, i) => path(`M${110 + i * 22} 512 L${120 + i * 20} ${380 - (i % 3) * 20}`, line(5, P.goldDark))).join(''),
    front: () => path('M190 170 L170 120 M220 160 L214 110 M290 160 L300 112 M320 170 L346 124', line(6, P.goldDark)),
    look: 'brown-red imp half buried in a pile of golden hay, straw sticking out of its hair and mouth',
  }),
  bell_thief: (skin) => ({
    skin, r: 114, horns: 'curl', eyes: 'sly', mouth: 'smirk', body: P.pine,
    front: () => path('M130 400 Q256 470 382 400', line(10, P.cocoa)) + ([[160, 424], [210, 446], [256, 452], [302, 446], [352, 424]] as const).map(([x, y]) => circle(x, y + 16, 20, ol(P.gold, 7)) + path(`M${x - 8} ${y + 24} L${x + 8} ${y + 24}`, line(5))).join(''),
    look: 'sneaky brown-red imp wearing a necklace of stolen golden sleigh bells',
  }),
  harness_snipper: (skin) => ({
    skin, r: 114, horns: 'long', eyes: 'angry', mouth: 'fang', body: P.cocoa,
    front: () => path('M90 400 L200 470', line(30, P.ink)) + path('M90 400 L200 470', line(18, P.cocoaLight)) + g({ transform: 'translate(390 420) rotate(-30)' }, path('M0 0 L80 -12 L0 12 Z', ol(P.silver, 7)), path('M0 0 L80 12 L0 -12 Z', ol(P.silver, 7)), circle(-26, -16, 18, ol(P.red, 7)), circle(-26, 16, 18, ol(P.red, 7))),
    look: 'scowling brown-red imp with long horns, snipping a leather harness strap with big red-handled shears',
  }),
  carrot_crook: (skin) => ({
    skin, r: 116, horns: 'curl', hornColor: P.goldBright, eyes: 'sly', mouth: 'grin', body: P.holly,
    back: () => sparkle(96, 130, 22) + sparkle(420, 140, 18),
    front: () => g({ transform: 'translate(380 410) rotate(-35)' }, path('M-24 0 L24 0 L0 110 Z', ol(P.orange, 8)), path('M-10 30 L6 30 M-6 60 L8 60', line(5, '#b5612a')), hollyLeaf(-12, -26, 40, -100, P.hollyLight, 6), hollyLeaf(12, -26, 40, -80, P.holly, 6)),
    look: 'rare grinning imp with golden horns, sparkles around it, holding a fat stolen carrot',
  }),
  antler_ripper: (skin) => ({
    skin, r: 126, horns: 'antler', hornColor: P.cocoaLight, eyes: 'angry', mouth: 'grin', body: P.redDark,
    front: () => path('M150 470 L362 470', line(14, P.goldDark)) + circle(256, 470, 18, ol(P.gold, 6)),
    look: 'mean mini-boss imp wearing a pair of stolen reindeer antlers on its head, gold-buckled belt',
  }),
  grizzlewick: (skin) => ({
    skin: shade(skin, -0.2), r: 140, horns: 'big', hornColor: P.coal, eyes: 'angry', mouth: 'beard', body: P.coal,
    back: () => path('M60 512 L120 300 L180 512 Z M332 512 L392 300 L452 512 Z', { fill: P.orange, opacity: 0.35 }),
    front: () => path('M180 220 L214 260', line(8, P.cream)) + path('M120 512 Q256 420 392 512', line(12, P.redDark)),
    look: 'hulking boss imp with huge black curved horns, scarred brow, coal-black beard, dark cloak, ember glow behind',
  }),
};

export type ImpInfo = { id: string; name: string; tier: Tier; location: string };

/** Returns the SVG body and a description for one imp portrait. */
export function drawImp(imp: ImpInfo) {
  const scene = SCENES[imp.location];
  if (!scene) throw new Error(`No portrait scene for location ${imp.location}`);
  const make = LOOKS[imp.id];
  if (!make) throw new Error(`No portrait design for imp ${imp.id}: add one to scripts/art/imps.ts`);
  const look = make(scene.skin);
  return { body: CARD_CLIP + impPortrait(look, imp.location, imp.tier, imp.id), look: look.look };
}

/** The "?" card shown for imps the player has not caught yet. */
export function drawLockedImp() {
  const S = 512;
  return (
    CARD_CLIP +
    rect(0, 0, S, S, { fill: P.night }, 46) +
    g(
      {},
      // silhouette only: everything in one dark colour
      path(`M70 ${S} Q86 ${280 + 114} 256 ${280 + 108} Q${S - 86} ${280 + 114} ${S - 70} ${S} Z`, { fill: P.nightLight }),
      path(`M${256 - 103} 260 L${256 - 186} 210 L${256 - 96} 320 Z M${256 + 103} 260 L${256 + 186} 210 L${256 + 96} 320 Z`, { fill: P.nightLight }),
      horns('curl', 256, 280 - 108, 120, P.nightLight).replace(/stroke="[^"]*"/g, 'stroke="none"'),
      ellipse(256, 280, 120, 110, { fill: P.nightLight }),
    ) +
    el_text('?', 256, 330, 200) +
    rect(6, 6, S - 12, S - 12, { fill: 'none', stroke: P.ink, 'stroke-width': 12 }, 40)
  );
}

const el_text = (t: string, x: number, y: number, size: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${size}" fill="${P.goldBright}" stroke="${P.ink}" stroke-width="10" paint-order="stroke">${t}</text>`;

void O; void glint;
