/**
 * Shared drawing helpers for the generated game art.
 * Every asset is plain SVG built from these helpers so the whole set keeps one style:
 * flat storybook shapes, a dark brown outline, and the palette below.
 */

/** The art palette. Matches the D2 mockup colours (ink, cream, pine, berry red, gold). */
export const P = {
  ink: '#2b1d14',
  cream: '#fdf8ef',
  paper: '#f3e6cc',
  parchment: '#e3d5bd',
  pine: '#0f3d2e',
  pineMid: '#24584a',
  pineLight: '#3d7262',
  sage: '#cfe3d9',
  holly: '#2f7d4f',
  hollyLight: '#4fa36b',
  red: '#b3261e',
  redDark: '#8a2b22',
  redLight: '#d9483c',
  gold: '#e9c46a',
  goldBright: '#ffd76a',
  goldDark: '#b8862b',
  brass: '#d4a24a',
  cocoa: '#7a4a2b',
  cocoaLight: '#a8703f',
  cookie: '#d9a25e',
  cookieLight: '#ebc07f',
  frost: '#9fd8ee',
  frostLight: '#d8f1fa',
  frostDark: '#4a8fb8',
  night: '#16213f',
  nightMid: '#24335e',
  nightLight: '#3a4c80',
  silver: '#c9ccd6',
  silverDark: '#8d92a3',
  pink: '#f2a3b8',
  purple: '#7d4f9e',
  purpleLight: '#a77cc4',
  orange: '#e8873a',
  coal: '#3a3436',
  white: '#ffffff',
} as const;

/** Outline width for a 512-unit canvas. Other canvases scale it with `ow()`. */
export const OUTLINE = 10;

/** Outline width scaled to a canvas whose short side is `size` units. */
export const ow = (size: number) => Math.max(2, Math.round((OUTLINE * size) / 512));

type Attrs = Record<string, string | number | undefined | null | false>;

/** Builds one SVG element. Attributes with null/undefined/false values are dropped. */
export function el(tag: string, attrs: Attrs = {}, ...children: (string | false | null | undefined)[]): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${String(v)}"`)
    .join('');
  const inner = children.filter(Boolean).join('');
  return inner ? `<${tag}${a}>${inner}</${tag}>` : `<${tag}${a}/>`;
}

/** Group with a shared outline style: filled shapes inside get the ink outline. */
export const g = (attrs: Attrs, ...children: (string | false | null | undefined)[]) => el('g', attrs, ...children);

/** Standard outlined style attributes. */
export const ol = (fill: string, width = OUTLINE): Attrs => ({
  fill,
  stroke: P.ink,
  'stroke-width': width,
  'stroke-linejoin': 'round',
  'stroke-linecap': 'round',
});

/** A stroke-only line in ink (or another colour). */
export const line = (width = OUTLINE, color: string = P.ink): Attrs => ({
  fill: 'none',
  stroke: color,
  'stroke-width': width,
  'stroke-linejoin': 'round',
  'stroke-linecap': 'round',
});

export const circle = (cx: number, cy: number, r: number, attrs: Attrs) => el('circle', { cx, cy, r, ...attrs });
export const ellipse = (cx: number, cy: number, rx: number, ry: number, attrs: Attrs) => el('ellipse', { cx, cy, rx, ry, ...attrs });
export const rect = (x: number, y: number, width: number, height: number, attrs: Attrs, rx = 0) =>
  el('rect', { x, y, width, height, rx: rx || undefined, ...attrs });
export const path = (d: string, attrs: Attrs) => el('path', { d, ...attrs });
export const poly = (points: [number, number][], attrs: Attrs) =>
  el('polygon', { points: points.map((p) => p.join(',')).join(' '), ...attrs });

/** Soft ground shadow under an object. */
export const shadow = (cx: number, cy: number, rx: number, ry = rx * 0.18) =>
  ellipse(cx, cy, rx, ry, { fill: P.ink, opacity: 0.18 });

/** A white glint used as a highlight on shiny things. */
export const glint = (x: number, y: number, s = 1) =>
  path(`M${x} ${y - 14 * s} L${x + 4 * s} ${y - 4 * s} L${x + 14 * s} ${y} L${x + 4 * s} ${y + 4 * s} L${x} ${y + 14 * s} L${x - 4 * s} ${y + 4 * s} L${x - 14 * s} ${y} L${x - 4 * s} ${y - 4 * s} Z`, {
    fill: P.white,
  });

/** A small four-point sparkle in a colour. */
export const sparkle = (x: number, y: number, s: number, color: string = P.goldBright) =>
  path(`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`, {
    fill: color,
  });

/** One holly leaf centred at (x, y), pointing at `angle` degrees. */
export function hollyLeaf(x: number, y: number, len: number, angle: number, fill: string = P.holly, width = OUTLINE) {
  const h = len / 2;
  const w = len * 0.32;
  const d = `M${-h} 0 Q${-h * 0.75} ${-w * 0.9} ${-h * 0.5} ${-w * 0.55} Q${-h * 0.3} ${-w * 1.2} 0 ${-w * 0.7} Q${h * 0.3} ${-w * 1.2} ${h * 0.5} ${-w * 0.55} Q${h * 0.75} ${-w * 0.9} ${h} 0 Q${h * 0.75} ${w * 0.9} ${h * 0.5} ${w * 0.55} Q${h * 0.3} ${w * 1.2} 0 ${w * 0.7} Q${-h * 0.3} ${w * 1.2} ${-h * 0.5} ${w * 0.55} Q${-h * 0.75} ${w * 0.9} ${-h} 0 Z`;
  return g(
    { transform: `translate(${x} ${y}) rotate(${angle})` },
    path(d, ol(fill, width)),
    path(`M${-h * 0.8} 0 L${h * 0.8} 0`, line(width * 0.5, P.pine)),
  );
}

/** A cluster of holly berries. */
export function berries(x: number, y: number, r: number, width = OUTLINE) {
  return g(
    {},
    circle(x - r * 0.9, y + r * 0.3, r, ol(P.red, width)),
    circle(x + r * 0.9, y + r * 0.3, r, ol(P.red, width)),
    circle(x, y - r * 0.6, r, ol(P.redLight, width)),
    circle(x - r * 0.3, y - r * 0.9, r * 0.25, { fill: P.white, opacity: 0.8 }),
  );
}

/** A spoked gear centred at (cx, cy). */
export function gear(cx: number, cy: number, r: number, teeth: number, fill: string, width = OUTLINE, hole = 0.35) {
  const pts: string[] = [];
  const inner = r * 0.8;
  const step = (Math.PI * 2) / teeth;
  const at = (a: number, rr: number) => `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    pts.push(at(a0, inner), at(a0 + step * 0.18, r), at(a0 + step * 0.45, r), at(a0 + step * 0.63, inner));
  }
  return g(
    {},
    el('polygon', { points: pts.join(' '), ...ol(fill, width) }),
    hole > 0 ? circle(cx, cy, r * hole, ol(P.ink === fill ? P.cream : shade(fill, -0.25), width)) : '',
  );
}

/** A six-armed snowflake. */
export function snowflake(cx: number, cy: number, r: number, color: string = P.white, width = 6) {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    d += `M${cx} ${cy} L${x.toFixed(1)} ${y.toFixed(1)} `;
    const bx = cx + Math.cos(a) * r * 0.6;
    const by = cy + Math.sin(a) * r * 0.6;
    for (const s of [-1, 1]) {
      const b = a + (s * Math.PI) / 4;
      d += `M${bx.toFixed(1)} ${by.toFixed(1)} L${(bx + Math.cos(b) * r * 0.3).toFixed(1)} ${(by + Math.sin(b) * r * 0.3).toFixed(1)} `;
    }
  }
  return path(d, line(width, color));
}

/** A simple five-point star polygon. */
export function star(cx: number, cy: number, r: number, attrs: Attrs, inner = 0.45) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push([+(cx + Math.cos(a) * rr).toFixed(1), +(cy + Math.sin(a) * rr).toFixed(1)]);
  }
  return poly(pts, attrs);
}

/** Lightens (amt > 0) or darkens (amt < 0) a hex colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

/** Deterministic pseudo-random numbers so regenerating gives the same picture. */
export function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Marker in every generated file. The generator only overwrites SVGs that still carry it. */
export const GENERATED_MARKER = 'generated-by: scripts/art';

/** Wraps drawing code in a complete SVG document. */
export function svg(width: number, height: number, title: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">` +
    `<!-- ${GENERATED_MARKER} (npm run art). Replace this file freely; see docs/DEVELOPER_NOTES.md, Art reference -->` +
    `<title>${esc(title)}</title>${body}</svg>\n`
  );
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One finished asset, before it is written to disk. */
export type Asset = {
  /** Game-data id (or a fixed name for UI art). Also the file stem. */
  id: string;
  /** Slot group; also the folder under public/art/. */
  slot: string;
  width: number;
  height: number;
  /** Short human description of what the picture shows. */
  description: string;
  /** Prompt for regenerating the picture with an image tool. */
  prompt: string;
  /** Transparent background (sprites and thumbnails) or a full scene. */
  transparent: boolean;
  /** Extra data the UI may need, e.g. map pin positions or layer order. */
  extra?: Record<string, unknown>;
  svg: string;
};
