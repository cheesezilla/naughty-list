import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Achievement } from '../../content/schema.js';
import { achievementProgress } from '../../engine/index.js';
import { api } from '../api.js';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { num, when } from '../lib/format.js';
import { BadgeMedal, CATEGORY_NAME, FRAME_NAME } from '../lib/medal.js';
import { usePrefs } from '../lib/prefs.js';
import { go } from '../lib/route.js';
import { Sheet, useAsync } from '../ui.js';

/** Space, Enter and Esc close a popup, and the press never reaches the Hunt screen behind it. */
function useCloseKeys(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
}

/** What a count is of, for the badge sheet: "312 / 500 hunts". */
const UNIT: Partial<Record<string, string>> = {
  hunts: 'hunts', caught: 'catches', escapes: 'escapes', goldEarned: 'gold', bossesCaught: 'bosses', weaknessCatches: 'catches',
  catches_clockwork: 'catches', catches_starlight: 'catches', catches_frost: 'catches', ordersDone: 'orders', pillaged: 'pillages',
};

/** "312 / 500", or "Best run 7 / 10" for streaks; with `unit`, "312 / 500 hunts". Empty for yes/no badges. */
const progressText = (a: Achievement, have: number, need: number, unit = false) => {
  const w = a.when;
  if (need <= 1 || (w.type !== 'stat' && w.type !== 'collection' && w.type !== 'own_all_types')) return '';
  const text = `${num(have)} / ${num(need)}`;
  if (w.type === 'stat' && w.stat.startsWith('best')) return `Best run ${text}`;
  if (!unit) return text;
  const u = w.type === 'stat' ? UNIT[w.stat] : w.type === 'collection' ? 'imps' : 'power types';
  return u ? `${text} ${u}` : text;
};

/** "Achievement earned" card, one badge at a time when several come at once. */
export function AchievementPopup({ ids, backfill, onClose }: { ids: string[]; backfill: boolean; onClose: () => void }) {
  const { content } = useGame();
  const [i, setI] = useState(0);
  const list = ids.map((id) => content.achievements.find((a) => a.id === id)).filter((a): a is Achievement => !!a);
  const a = list[i];
  const next = () => (i + 1 < list.length ? setI(i + 1) : onClose());
  useCloseKeys(next);
  if (!a) return null;
  return (
    <div class="popup-backdrop" onClick={(e) => { if (e.target === e.currentTarget) next(); }}>
      <div class={`confetti frame-${a.frame}`} aria-hidden="true">{Array.from({ length: 14 }, (_, k) => <i style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 5) * 0.08}s` }} />)}</div>
      <div class="popup ach-popup" role="dialog" aria-modal="true" aria-label="Achievement earned">
        <div class="popup-kicker">{backfill && i === 0 ? `Welcome back! You've already earned ${list.length} badges` : '✦ Achievement earned ✦'}</div>
        <div class="medal-glow"><BadgeMedal a={a} earned size={128} shine /></div>
        <h2>{a.name}</h2>
        <p>{a.description}</p>
        <span class={`frame-pill frame-${a.frame}`}>{FRAME_NAME[a.frame]} · {CATEGORY_NAME[a.category]}</span>
        <div class="popup-buttons">
          <button class="outline-btn dark" onClick={() => { onClose(); go(`more/profile/achievements/${a.id}`); }}>View badges</button>
          <button class="primary-btn" onClick={next}>Nice!</button>
        </div>
        {list.length > 1 && <button class="text-btn" onClick={next}>{i + 1} of {list.length}{i + 1 < list.length ? ' · Next ›' : ''}</button>}
      </div>
    </div>
  );
}

/** The quiet version: a small toast at the top for 3 seconds. */
export function AchievementToast({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { content } = useGame();
  const a = content.achievements.find((x) => x.id === ids[0]);
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [ids]);
  if (!a) return null;
  return (
    <button class="ach-toast" onClick={() => { onClose(); go(`more/profile/achievements/${a.id}`); }}>
      <BadgeMedal a={a} earned size={44} />
      <span>
        <small class="kicker">Achievement earned{ids.length > 1 ? ` (+${ids.length - 1} more)` : ''}</small>
        <b>{a.name}</b>
        <small>{FRAME_NAME[a.frame]} · tap to view</small>
      </span>
    </button>
  );
}

/** The one-time welcome of a new game. */
export function WelcomePopup({ onClose }: { onClose: (readLetter: boolean) => void }) {
  const { content } = useGame();
  const w = content.story?.welcome;
  useCloseKeys(() => onClose(false));
  if (!w) return null;
  const [lead, ...rest] = w.title.split(' ');
  return (
    <div class="popup-backdrop welcome-backdrop">
      <div class="popup welcome" role="dialog" aria-modal="true" aria-label={w.title}>
        <Art slot="brand" id="key_art" class="welcome-art" />
        <Art slot="brand" id="icon" class="welcome-icon" />
        <div class="welcome-body">
          <h2>{lead} {rest.slice(0, 1).join(' ')}<br /><span>{rest.slice(1).join(' ')}</span></h2>
          <p>{w.text}</p>
          <button class="hunt-btn wide" onClick={() => onClose(false)}>{w.button}</button>
          <button class="text-btn underline" onClick={() => onClose(true)}>Read Santa's letter</button>
        </div>
      </div>
    </div>
  );
}

type Filter = 'all' | Achievement['category'];

/** My profile > Achievements: every badge, earned in colour, the rest greyed with progress. */
export function AchievementsTab({ openId }: { openId?: string }) {
  const { content, player } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [earnedFirst, setEarnedFirst] = useState(false);
  const [open, setOpen] = useState<string | undefined>(openId);
  useEffect(() => setOpen(openId), [openId]);
  const counts = useAsync(() => api<{ hunters: number; counts: Record<string, number> }>('GET', '/api/achievements'));
  const earned = player.achievements ?? {};
  const all = content.achievements;
  const has = (a: Achievement) => earned[a.id] !== undefined;
  const byFrame = (f: Achievement['frame']) => `${all.filter((a) => a.frame === f && has(a)).length}/${all.filter((a) => a.frame === f).length}`;
  const done = all.filter(has).length;
  const cats = useMemo(() => [...new Set(all.map((a) => a.category))], [all]);
  const shown = (cat: Achievement['category']) => {
    const list = all.filter((a) => a.category === cat);
    return earnedFirst ? [...list.filter(has), ...list.filter((a) => !has(a))] : list;
  };
  const selected = all.find((a) => a.id === open);
  return (
    <>
      <div class="card ach-summary">
        <div class="ach-total"><span>{done} of {all.length} badges</span><b>{all.length ? Math.round((done / all.length) * 100) : 0}%</b></div>
        <div class="bar"><div style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></div>
        <div class="ach-frames"><span class="frame-dot bronze">●</span> Bronze {byFrame('bronze')} <span class="frame-dot silver">●</span> Silver {byFrame('silver')} <span class="frame-dot gold">●</span> Gold {byFrame('gold')}</div>
      </div>
      <div class="chips" role="tablist" aria-label="Category">
        <button role="tab" aria-selected={filter === 'all'} class={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
        {cats.map((c) => <button role="tab" aria-selected={filter === c} class={filter === c ? 'on' : ''} onClick={() => setFilter(c)}>{CATEGORY_NAME[c]}</button>)}
      </div>
      <label class="check"><input type="checkbox" checked={earnedFirst} onChange={(e) => setEarnedFirst((e.target as HTMLInputElement).checked)} /> Earned first</label>
      {cats.filter((c) => filter === 'all' || filter === c).map((c) => {
        const list = shown(c);
        return (
          <section class="ach-group">
            <div class="ach-group-head"><span>{CATEGORY_NAME[c]}</span><span>{list.filter(has).length} / {list.length}</span></div>
            <div class="badge-grid">
              {list.map((a) => {
                const got = has(a);
                const p = achievementProgress(content, player, a);
                const secret = a.secret && !got;
                return (
                  <button class={`badge-cell ${got ? 'earned' : ''}`} onClick={() => setOpen(a.id)}>
                    <BadgeMedal a={a} earned={got} size={72} />
                    <b>{secret ? 'Secret' : a.name}</b>
                    {!got && !secret && progressText(a, p.have, p.need) && <small>{progressText(a, p.have, p.need)}</small>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {selected && <BadgeSheet a={selected} at={earned[selected.id]} counts={counts.data} onClose={() => setOpen(undefined)} />}
    </>
  );
}

function BadgeSheet({ a, at, counts, onClose }: { a: Achievement; at?: number; counts?: { hunters: number; counts: Record<string, number> }; onClose: () => void }) {
  const { content, player } = useGame();
  const prefs = usePrefs();
  const got = at !== undefined;
  const secret = a.secret && !got;
  const p = achievementProgress(content, player, a);
  const hunt = player.achievementHunts?.[a.id];
  const by = counts ? `Earned by ${counts.counts[a.id] ?? 0} of ${counts.hunters} hunters` : '';
  return (
    <Sheet title={secret ? 'Secret achievement' : a.name} onClose={onClose} bare>
      <div class="badge-sheet">
        <BadgeMedal a={a} earned={got} size={120} shine={got} />
        <h2>{secret ? '?' : a.name}</h2>
        <p>{secret ? 'Keep hunting. This one is a surprise.' : a.description}</p>
        <span class={`frame-pill frame-${a.frame}`}>{secret ? 'Secret' : `${FRAME_NAME[a.frame]} · ${CATEGORY_NAME[a.category]}`}</span>
        {got
          ? <p class="small">Earned {when(at!, prefs.clock24)}{hunt ? ` on hunt #${num(hunt)}` : ''}{by && <><br />{by}</>}</p>
          : <>
            {!secret && p.need > 1 && (
              <div class="badge-progress">
                <div><span>Progress</span><b>{progressText(a, p.have, p.need, true)}</b></div>
                <div class="bar"><div style={{ width: `${(p.have / p.need) * 100}%` }} /></div>
              </div>
            )}
            <p class="small muted">Not earned yet{by && ` · ${by}`}</p>
          </>}
        <button class="outline-btn dark wide" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  );
}
