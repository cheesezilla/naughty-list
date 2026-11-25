import type { Imp } from '../../content/schema.js';

export const num = (x: number) => Math.round(x).toLocaleString('en-US');
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;

export const TIER_NAME: Record<Imp['tier'], string> = { common: 'Common', rare: 'Rare', miniboss: 'Mini boss', boss: 'Boss' };
export const TIER_ORDER: Record<Imp['tier'], number> = { common: 0, rare: 1, miniboss: 2, boss: 3 };
export const TYPE_NAME: Record<string, string> = { clockwork: 'Clockwork', holly: 'Holly', frost: 'Frost' };

const DAY = 864e5;
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** A time in the viewer's own time zone: "3:28 PM" today, "Yesterday 3:28 PM", "Tue 3:28 PM" this week, else "18 Nov, 3:28 PM". */
export function when(at: number, clock24: boolean, now = Date.now()): string {
  const time = new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !clock24 });
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY);
  if (days <= 0) return time;
  if (days === 1) return `Yesterday ${time}`;
  if (days < 7) return `${new Date(at).toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
  return `${new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined })}, ${time}`;
}

/** Header for a group of log rows on one day: "Today", "Yesterday", "Tuesday 18 November". */
export function dayLabel(at: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "just now", "12 min ago", "3 h ago", "yesterday", "Mon" */
export function ago(at: number, now = Date.now()): string {
  const min = Math.floor((now - at) / 60000);
  if (min < 2) return 'online now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60 && startOfDay(at) === startOfDay(now)) return `${Math.floor(min / 60)} h ago`;
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY);
  if (days === 1) return 'yesterday';
  if (days < 7) return new Date(at).toLocaleDateString(undefined, { weekday: 'short' });
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const date = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
