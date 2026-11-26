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

/** Emblems by category, with a few badges that have their own. Swapped for badge art when it exists. */
const EMBLEM: Record<string, ComponentChildren> = {
  first_steps: <><path d="M8 3c2 0 3 2 3 4.5S10 13 8 13s-3-3-3-5.5S6 3 8 3z" /><path d="M16 9c2 0 3 2 3 4.5S18 19 16 19s-3-3-3-5.5S14 9 16 9z" /><path d="M6 16h4M14 22h4" /></>,
  hunting: <><circle cx="12" cy="11" r="7" /><path d="M5 11h14M12 4v14M7 6l10 10M17 6L7 16" /><path d="M15 18c1 2 3 2 4 1" /></>,
  ranks: <><path d="M12 2l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 7.3l5-.7z" /><path d="M8 17l-2 5 6-2 6 2-2-5" /></>,
  naughty_list: <><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4" /><path d="M9 8l1.5 1.5L13 7M9 13l1.5 1.5L13 12M15 8h1M15 13h1" /></>,
  bosses: <><path d="M3 18h18l-2-10-4 4-3-6-3 6-4-4z" /><path d="M5 8L3 3M19 8l2-5" /></>,
  gear: GEAR,
  objectives: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  secret: <><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V15" /><path d="M12 19h.01" /></>,
  type_clockwork_25: GEAR,
  type_starlight_25: STAR,
  type_frost_25: FLAKE,
};

/** An achievement's badge: its frame's metal, the emblem embossed, greyed when not earned, "?" for unearned secrets. */
export function BadgeMedal({ a, earned, size = 72, shine = false }: { a: Achievement; earned: boolean; size?: number; shine?: boolean }) {
  if (a.secret && !earned) {
    return <Medal metal="secret" size={size} class="secret" label="Secret achievement"><span style={{ fontSize: `${Math.round(size * 0.42)}px` }}>?</span></Medal>;
  }
  const emblem = EMBLEM[a.id] ?? EMBLEM[a.category] ?? EMBLEM.hunting;
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
