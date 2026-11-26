import type { ComponentChildren } from 'preact';
import type { Achievement, PowerType } from '../../content/schema.js';
import { TYPE_NAME } from './format.js';

/** Rim and face colours of a medal: light, mid and dark rim, then four face stops. */
type Metal = { l: string; m: string; d: string; f?: [string, string, string, string] };

const METALS: Record<string, Metal> = {
  bronze: { l: '#ffd3a1', m: '#b8733a', d: '#5e3212' },
  silver: { l: '#ffffff', m: '#b6c1cb', d: '#4f5c68' },
  gold: { l: '#fff4b8', m: '#e2b33c', d: '#7d5a08' },
  clockwork: { l: '#ffe3a0', m: '#b8862e', d: '#5a3d08', f: ['#fff3d0', '#e8c27a', '#c79a45', '#9a7026'] },
  starlight: { l: '#e6ecff', m: '#6f82d6', d: '#1d2a6b', f: ['#7d8fe8', '#3a4ca6', '#22306f', '#141c4a'] },
  frost: { l: '#ffffff', m: '#9fd3ef', d: '#2a6a90', f: ['#ffffff', '#d6eefa', '#9fd0ec', '#5fa6cf'] },
  coin: { l: '#fff4b8', m: '#e2b33c', d: '#7d5a08', f: ['#fff6c4', '#f2cf5b', '#d9a92e', '#a87a10'] },
};
const CREAM: [string, string, string, string] = ['#fffdf6', '#f7e7c8', '#e3c597', '#c9a36e'];

/**
 * A 3D metal medal drawn in CSS: bevelled conic rim, dashed inner ring, recessed face with an embossed
 * emblem, gloss and a drop shadow. Used for badges, power types and the gold coin.
 */
export function Medal({ metal, size, children, class: cls = '', label }: {
  metal: keyof typeof METALS | 'secret'; size: number; children?: ComponentChildren; class?: string; label?: string;
}) {
  const m = metal === 'secret' ? undefined : METALS[metal]!;
  const f = m?.f ?? CREAM;
  const style = m
    ? { '--l': m.l, '--m': m.m, '--d': m.d, '--f1': f[0], '--f2': f[1], '--f3': f[2], '--f4': f[3], width: `${size}px`, height: `${size}px` }
    : { width: `${size}px`, height: `${size}px` };
  return (
    <span class={`medal medal-${metal} ${cls}`} style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      <span class="face">{children}</span>
    </span>
  );
}

const icon = (size: number, stroke: string, paths: ComponentChildren, width = 2) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} stroke-width={width} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>
);

const GEAR = <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>;
const STAR = <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3l-5.2 2.8 1-5.8L3.5 9.2l5.9-.8z" />;
const FLAKE = <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2M3.3 7l.7 2.7M3.3 7l2.7-.7M20.7 17l-.7-2.7M20.7 17l-2.7.7M3.3 17l2.7.7M3.3 17l.7-2.7M20.7 7l-2.7-.7M20.7 7l-.7 2.7" />;
const TYPE_ICON: Record<PowerType, { paths: ComponentChildren; stroke: string }> = {
  clockwork: { paths: GEAR, stroke: '#5a3a08' },
  starlight: { paths: STAR, stroke: '#ffd76a' },
  frost: { paths: FLAKE, stroke: '#1d5a80' },
};

/** A power type as a medal: brass gear, blue star or icy snowflake. */
export function TypeMedal({ type, size = 38 }: { type: PowerType; size?: number }) {
  const t = TYPE_ICON[type];
  return <Medal metal={type} size={size} label={`${TYPE_NAME[type]} power type`}>{icon(Math.round(size * 0.5), t.stroke, t.paths)}</Medal>;
}

/** The gold coin: gold rim with a dotted edge, a star over a smile-shaped laurel. */
export function GoldCoin({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <Medal metal="coin" size={size} class="coin" label={label}>
      {icon(Math.round(size * 0.55), '#7d5a08', <><path d="M12 5l1.9 3.8 4.1.6-3 2.9.7 4.1L12 14.5l-3.7 1.9.7-4.1-3-2.9 4.1-.6z" /><path d="M6 19c2 1.5 10 1.5 12 0" /></>, size < 30 ? 2.4 : 2)}
    </Medal>
  );
}

/** Emblems by category: the fallback for a badge without its own. */
const EMBLEM: Record<string, ComponentChildren> = {
  first_steps: <><ellipse cx="8" cy="16" rx="2" ry="3" /><ellipse cx="15" cy="9" rx="2" ry="3" /><path d="M6 12l-.5-1.5M8 12v-1.6M10 12l.5-1.5M13 5l-.5-1.5M15 5V3.4M17 5l.5-1.5" /></>,
  hunting: <><circle cx="12" cy="11" r="7" /><path d="M5 11h14M12 4v14M7 6l10 10M17 6L7 16" /><path d="M15 18c1 2 3 2 4 1" /></>,
  ranks: <><path d="M12 2l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 7.3l5-.7z" /><path d="M8 17l-2 5 6-2 6 2-2-5" /></>,
  naughty_list: <><path d="M7 3h11v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h3V3z" /><path d="M10 7l1 1 2-2M10 12l1 1 2-2M15 8h1M15 13h1" /></>,
  bosses: <><path d="M4 18h16l-1-9-4 3-3-6-3 6-4-3-1 9z" /><path d="M3 9l2 2M21 9l-2 2" /></>,
  gear: GEAR,
  objectives: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  secret: <><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V15" /><path d="M12 19h.01" /></>,
};

const MOON = <path d="M15 4a8 8 0 1 0 5 12A7 7 0 0 1 15 4z" />;
const COINS = <><ellipse cx="9" cy="15" rx="5" ry="2.5" /><path d="M4 15v2c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-2" /><ellipse cx="15" cy="8" rx="5" ry="2.5" /><path d="M10 8v2c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8" /></>;
const SHIELD = <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />;
const SLEIGH = <><path d="M5 15l-1-6h7l3 4h4a3 3 0 0 0 3-3" /><path d="M5 15h13M3 19h15a3 3 0 0 0 3-3M7 15v4M15 15v4" /></>;
const CLIPBOARD = <><path d="M9 3h6v3H9z" /><path d="M8 4H6v17h12V4h-2" /></>;
const GEM = <><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M10 4l-2 5 4 11 4-11-2-5" /></>;

/** Each badge's own emblem, drawn to match the UI design. */
const BADGE_EMBLEM: Record<string, ComponentChildren> = {
  first_catch: EMBLEM.hunting,
  first_escape: EMBLEM.first_steps,
  first_purchase: <><path d="M5 9h14l-1 11H6L5 9z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /><path d="M8 13h8M8 16h8" /></>,
  first_upgrade: <><path d="M4 17h16M6 17l2-8h8l2 8" /><path d="M12 9V5M10 5h4" /><path d="M18 4l1 1M19 8h1" /></>,
  first_craft: <><path d="M14 4l6 6-3 3-6-6 3-3z" /><path d="M11 7L4 14v3h3l7-7" /></>,
  first_travel: <><path d="M6 21V10a6 6 0 0 1 12 0v11" /><path d="M4 21h16M13 13v2" /><path d="M12 4V2" /></>,
  hunts_100: <><path d="M8 21h8v-3l2-6a2 2 0 0 0-4-1V7a3 3 0 0 0-6 0v11z" /><path d="M8 18h8" /></>,
  hunts_500: <>{MOON}<path d="M6 6l.5 1M4 11h1" /></>,
  hunts_1500: <><path d="M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" /><path d="M16 10h2a2 2 0 0 1 0 4h-2" /><path d="M8 3v2M11 3v2M14 3v2" /></>,
  hunts_5000: <>{MOON}<path d="M15 9h4l-4 4h4M19 3h2l-2 2h2" /></>,
  catches_50: <><path d="M5 6h14v8a7 7 0 0 1-14 0V6z" /><path d="M5 9h14" /><path d="M9 6c0-2-1-3-2-3M12 6V3M15 6c0-2 1-3 2-3" /></>,
  catches_250: <><path d="M9 6h6l3 6a6 6 0 0 1-6 9 6 6 0 0 1-6-9l3-6z" /><path d="M9 6l-1-2h8l-1 2" /><path d="M10 13l1 1M14 12l-1 2" /></>,
  catches_1000: SLEIGH,
  streak_10: <><circle cx="11" cy="13" r="7" /><path d="M3 21h18M17 6l3-2" /></>,
  streak_25: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  gold_1000: COINS,
  gold_25000: <><path d="M9 3h6v9l4 4a3 3 0 0 1-4 4l-6-6V3z" /><path d="M9 6h6" /><circle cx="15" cy="16" r="1.5" /></>,
  gold_250000: EMBLEM.naughty_list,
  rank_2: <>{SHIELD}<path d="M8 12l4-3 4 3" /></>,
  rank_3: <>{SHIELD}<path d="M8 10l4-3 4 3M8 14l4-3 4 3" /></>,
  rank_4: <>{SHIELD}<path d="M12 7v10M8 9.5l8 5M8 14.5l8-5" /></>,
  rank_5: EMBLEM.ranks,
  first_uncommon: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /><path d="M12 3v1M21 12h-1" /></>,
  first_rare: GEM,
  all_rares: <>{GEM}<path d="M20 2v3M18.5 3.5h3" /></>,
  list_cookie_pantry: <><path d="M8 3h8v3H8z" /><path d="M6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" /><circle cx="10" cy="13" r="1" /><circle cx="14" cy="15" r="1" /></>,
  list_wrapping_room: <><path d="M4 9h16v4H4zM5 13h14v8H5zM12 9v12" /><path d="M12 9c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1" /></>,
  list_toy_workshop: GEAR,
  list_reindeer_stables: <><path d="M7 21v-9a5 5 0 0 1 10 0v9" /><path d="M5 21h4M15 21h4M9 9l-1-1M15 9l1-1M12 6V5" /></>,
  list_all: <>{EMBLEM.naughty_list}<path d="M20 2v3M18.5 3.5h3" /></>,
  first_miniboss: <><circle cx="12" cy="14" r="6" /><path d="M7 10C5 8 5 5 6 3M17 10c2-2 2-5 1-7M10 13h.01M14 13h.01M10 17h4" /></>,
  first_boss: EMBLEM.bosses,
  boss_madame_shredwell: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.5 7.5L20 18M8.5 16.5L20 6" /></>,
  boss_foreman_grimbolt: <><path d="M15 3a5 5 0 0 0-4.6 7L3 17.5 6.5 21l7.5-7.4A5 5 0 0 0 21 9l-3 3-3-3 3-3a5 5 0 0 0-3-3z" /></>,
  boss_grizzlewick: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0M12 3v2" /></>,
  bosses_10: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6" /></>,
  type_clockwork_25: GEAR,
  type_starlight_25: STAR,
  type_frost_25: FLAKE,
  type_all_owned: <><circle cx="12" cy="7" r="3.5" /><circle cx="7" cy="16" r="3.5" /><circle cx="17" cy="16" r="3.5" /></>,
  weakness_100: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  craft_capstone: <><path d="M4 15v-4a4 4 0 0 1 8 0v4l1 1.5H3z" /><path d="M12 13v-2a4 4 0 0 1 8 0v4l1 1.5h-8" /><path d="M7 19a1 1 0 0 0 2 0M15 19a1 1 0 0 0 2 0" /></>,
  ladder_tier_2: <><circle cx="12" cy="12" r="4" /><path d="M8.5 10.5L4 8l1 4-1 4 4.5-2.5M15.5 10.5L20 8l-1 4 1 4-4.5-2.5" /></>,
  ladder_tier_3: <path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />,
  order_first: <>{CLIPBOARD}<path d="M9 13l2 2 4-4" /></>,
  orders_10: <>{CLIPBOARD}<path d="M9 10l1 1 2-2M9 16l1 1 2-2M14 10h1M14 16h1" /></>,
  rush_order: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M10 2h4M12 2v3" /></>,
  sleigh_launch: <>{SLEIGH}<path d="M14 7V2M12 4l2-2 2 2" /></>,
  sleigh_express: <>{SLEIGH}<path d="M2 6h5M1 9h4M3 12h3" /></>,
  secret_butterfingers: EMBLEM.first_steps,
  secret_silent_night: <>{MOON}<path d="M19 3v2M18 4h2" /></>,
  secret_robbed: <><path d="M6 10h12l-1 11H7z" /><path d="M9 10l3-5 3 5M10 15h4" /></>,
  secret_boss_starter: <><path d="M9 3h6v8l4 4a3 3 0 0 1-4 4l-6-5V3z" /><path d="M9 6h6" /></>,
  secret_top_hunter: <path d="M3 21h18M5 21v-6h4v6M10 21V9h4v12M15 21v-8h4v8M12 3l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" />,
  secret_sleigh_fail: <>{SLEIGH}<path d="M15 3l4 4M19 3l-4 4" /></>,
};

/** An achievement's badge: its frame's metal, the emblem embossed, greyed when not earned, "?" for unearned secrets. */
export function BadgeMedal({ a, earned, size = 72, shine = false }: { a: Achievement; earned: boolean; size?: number; shine?: boolean }) {
  if (a.secret && !earned) {
    return <Medal metal="secret" size={size} class="secret" label="Secret achievement"><span style={{ fontSize: `${Math.round(size * 0.42)}px` }}>?</span></Medal>;
  }
  const emblem = BADGE_EMBLEM[a.id] ?? EMBLEM[a.category] ?? EMBLEM.hunting;
  return (
    <Medal metal={a.frame} size={size} class={`${earned ? '' : 'locked'} ${shine ? 'shine' : ''} ${a.frame === 'gold' && earned ? 'glow' : ''}`} label={`${a.name} badge${earned ? '' : ', not earned yet'}`}>
      {icon(Math.round(size * 0.46), '#9e2219', emblem, 1.7)}
    </Medal>
  );
}

export const FRAME_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' } as const;
export const CATEGORY_NAME: Record<Achievement['category'], string> = {
  first_steps: 'First steps', hunting: 'Hunting', ranks: 'Ranks', naughty_list: 'Naughty List', bosses: 'Bosses', gear: 'Gear', objectives: 'Location goals', secret: 'Secret',
};
