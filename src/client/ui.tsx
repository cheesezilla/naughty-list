import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Art, Icon } from './lib/art.js';
import { num } from './lib/format.js';
import { back, go } from './lib/route.js';
import { useGame } from './game.js';

export type Tab = 'hunt' | 'list' | 'emporium' | 'workshop' | 'more';
const TABS: { id: Tab; label: string; icon: string; path: string }[] = [
  { id: 'hunt', label: 'Hunt', icon: 'nav_hunt', path: 'hunt' },
  { id: 'list', label: 'Naughty List', icon: 'nav_naughty_list', path: 'list' },
  { id: 'emporium', label: 'Emporium', icon: 'nav_emporium', path: 'emporium' },
  { id: 'workshop', label: 'Workshop', icon: 'nav_workshop', path: 'workshop' },
  { id: 'more', label: 'More', icon: 'nav_more', path: 'more' },
];

export function TitleStrip() {
  return (
    <div class="title-strip">
      <Art slot="brand" id="icon" class="title-icon" />
      <span class="title-text">The Naughty List</span>
    </div>
  );
}

/** Rank badge, username, rank and points, gold. `overlay` draws it over the location banner. */
export function PlayerBar({ overlay = false }: { overlay?: boolean }) {
  const { content, user, player } = useGame();
  const rank = content.ranks[player.rank - 1]!;
  return (
    <div class={`player-bar ${overlay ? 'on-banner' : ''}`}>
      <Art slot="ranks" id={`rank_${player.rank}`} alt={`Rank ${player.rank}`} class="rank-badge" />
      <div class="who">
        <b>{user.username}</b>
        <span>{rank.name} · {num(player.points)} pts</span>
      </div>
      <div class="gold"><Icon id="stat_gold" size={18} /> {num(player.gold)} gold</div>
    </div>
  );
}

export function RankProgress() {
  const { content, player } = useGame();
  const rank = content.ranks[player.rank - 1]!;
  const next = content.ranks[player.rank];
  const progress = next ? (player.points - rank.points) / (next.points - rank.points) : 1;
  const label = next ? `${num(next.points - player.points)} points to ${next.name}` : 'Top rank for now';
  return (
    <div class="rank-progress" role="progressbar" aria-label={label} title={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
      <div style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
    </div>
  );
}

export function BottomNav({ tab }: { tab: Tab | null }) {
  return (
    <nav class="bottom-nav" aria-label="Main">
      {TABS.map((t) => (
        <button class={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.path)}>
          <Icon id={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** A screen with the title strip, player bar and bottom nav. */
export function MainScreen({ tab, children, bar = true, class: cls = '' }: { tab: Tab | null; children: ComponentChildren; bar?: boolean; class?: string }) {
  return (
    <div class="screen">
      <TitleStrip />
      <div class={`scroll ${cls}`}>
        {bar && <><PlayerBar /><RankProgress /></>}
        {children}
      </div>
      <BottomNav tab={tab} />
    </div>
  );
}

export function BackRow({ label = 'Back', to, title, sub }: { label?: string; to: string; title: string; sub?: string }) {
  return (
    <div class="back-row">
      <button class="back" onClick={() => back(to)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        {label}
      </button>
      <div class="back-title">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

/** A full-screen page without the bottom nav: Arsenal, item details, imp files. */
export function FullScreen({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return <div class="screen"><div class={`scroll ${cls}`}>{children}</div></div>;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: ComponentChildren }[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div class="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button role="tab" aria-selected={value === t.id} class={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label class={`toggle-row ${disabled ? 'disabled' : ''}`}>
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
    </label>
  );
}

export function Stepper({ value, onChange, min = 1, max = 9999, step = 10 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.floor(n) || min));
  return (
    <div class="stepper">
      <button aria-label="Fewer" disabled={value <= min} onClick={() => onChange(clamp(value <= step ? value - 1 : value - step))}>−</button>
      <input type="number" inputMode="numeric" min={min} max={max} value={value} aria-label="Amount" onInput={(e) => onChange(clamp(Number((e.target as HTMLInputElement).value)))} />
      <button aria-label="More" disabled={value >= max} onClick={() => onChange(clamp(value < step ? (value === 1 ? step : value + 1) : value + step))}>+</button>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-head"><h2>{title}</h2><button class="text-btn" onClick={onClose}>Done</button></div>
        {children}
      </div>
    </div>
  );
}

export function Loading({ what = 'Loading' }: { what?: string }) {
  return <p class="muted center-pad">{what}…</p>;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): { data?: T; error?: string; reload: () => void } {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fn().then((data) => live && setState({ data }), (e: Error) => live && setState({ error: e.message }));
    return () => { live = false; };
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
