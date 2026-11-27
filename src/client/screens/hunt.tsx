import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { count, huntOdds, type Setup } from '../../engine/index.js';
import { useGame } from '../game.js';
import { Art, Icon } from '../lib/art.js';
import { num, pct, plural } from '../lib/format.js';
import { usePrefs } from '../lib/prefs.js';
import { go } from '../lib/route.js';
import { BottomNav, Sheet, Tabs, TopHeader } from '../ui.js';
import { PowerBar, useExactOdds, useRateText } from '../lib/effectiveness.js';
import { LogRow } from './log.js';
import { HintSheet, ObjectivePanel } from './objective.js';
import { TypeMedal } from '../lib/medal.js';
import { BoonCard, CheerCard, ScrinchCard } from './cheer.js';
import { TYPE_NAME } from '../lib/format.js';

/** Catch chance once an imp is attracted, averaged over the imps this bait draws. */
export function catchIfAttracted(odds: ReturnType<typeof huntOdds>) {
  return odds.catchPerHunt;
}

export function StatRow({ setup }: { setup: Setup }) {
  const { content, player } = useGame();
  const odds = huntOdds(content, setup, player.location);
  return (
    <div class="stat-row">
      <div><b>{num(odds.stats.power)}</b><span>Power</span></div>
      <div><b>{num(odds.stats.luck)}</b><span>Luck</span></div>
    </div>
  );
}

/** Attraction and catch chance as five-tier power bars; exact rates stay hidden from players. */
export function RateBars({ setup }: { setup: Setup }) {
  const { content, player } = useGame();
  const odds = huntOdds(content, setup, player.location);
  return (
    <div class="rate-bars">
      <div><span>Allure</span><PowerBar rate={odds.stats.attraction} /></div>
      <div class="catch"><span>Catch</span><PowerBar rate={catchIfAttracted(odds)} /></div>
    </div>
  );
}

/** The trap drawn standing on its base (both pictures share one 600×450 canvas). */
export function TrapOnBase({ trap, base, class: cls = '' }: { trap: string; base: string; class?: string }) {
  const { data } = useGame();
  return (
    <span class={`trap-stack ${cls}`} role="img" aria-label={`${data.items.get(trap)?.name} on ${data.items.get(base)?.name}`}>
      <Art slot="bases" id={base} />
      <Art slot="traps" id={trap} />
    </span>
  );
}

export function HuntScreen() {
  const g = useGame();
  const { content, data, player, log, hunt, busy } = g;
  const prefs = usePrefs();
  const [sheet, setSheet] = useState<null | 'bait' | 'charm'>(null);
  const [hint, setHint] = useState(false);
  const location = data.locations.get(player.location)!;
  const trap = data.items.get(player.setup.trap)!;
  const base = data.items.get(player.setup.base)!;
  const bait = player.setup.bait ? data.items.get(player.setup.bait) : undefined;
  const charm = player.setup.charm ? data.items.get(player.setup.charm) : undefined;
  // Rows present when the screen opens don't animate; rows that arrive afterwards slide in.
  const seen = useRef<Set<number> | null>(null);
  if (!seen.current && (log.length > 0 || player.stats.hunts === 0)) seen.current = new Set(log.map((r) => r.id));
  const huntsShown = useMemo(() => log.filter((r) => r.kind === 'hunt').length, [log]);

  useEffect(() => {
    if (!prefs.spaceHunts) return;
    const onKey = (e: KeyboardEvent) => {
      if (sheet || hint || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); hunt(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prefs.spaceHunts, sheet, hint, hunt, busy]);

  return (
    <div class="screen">
      <TopHeader />
      <div class="scroll hunt-scroll">
        <div class="banner">
          <Art slot="locations" id={location.id} class="banner-art" />
          {location.homeTypes.length > 0 && (
            <div class="banner-types" aria-label={`Recommended trap power type: ${location.homeTypes.map((t) => TYPE_NAME[t]).join(' or ')}`}>
              <small>Best traps</small>
              {location.homeTypes.map((t) => <TypeMedal type={t} size={30} />)}
            </div>
          )}
          <div class="banner-bottom">
            <h1>{location.name}</h1>
            <span class="banner-actions">
              <button class="hint-btn" onClick={() => setHint(true)} aria-label={`How to clear the ${location.name}`}>?</button>
              <button class="cream-btn" onClick={() => go('more/travel')}>Travel</button>
            </span>
          </div>
        </div>
        <div class="pad stack">
          <TipBar onEquipCharm={() => setSheet('charm')} />
          <div class="card gear-card">
            <div class="trap-row">
              <button class="trap-button" onClick={() => go('arsenal/trap')} aria-label={`Change trap and base. Now ${trap.name} on ${base.name}`}>
                <TrapOnBase trap={trap.id} base={base.id} />
              </button>
              <div class="trap-stats">
                <StatRow setup={player.setup} />
                <RateBars setup={player.setup} />
              </div>
            </div>
            <div class="gear-grid">
              <button class="slot-btn" onClick={() => go('arsenal/trap')}>
                {trap.kind === 'trap' ? <TypeMedal type={trap.type} size={38} /> : <span class="thumb small empty-thumb" />}
                <span><small>Trap{trap.kind === 'trap' ? ` · ${TYPE_NAME[trap.type]}` : ''}</small><br /><b>{trap.name}</b></span>
              </button>
              <button class="slot-btn" onClick={() => setSheet('bait')}>
                {bait ? <Art slot="baits" id={bait.id} class="thumb small" /> : <span class="thumb small empty-thumb">none</span>}
                <span><small>Bait</small><br /><b>{bait ? bait.name : 'No bait'}</b>{bait && ` ×${num(count(player, bait.id))}`}</span>
              </button>
              <button class="slot-btn" onClick={() => go('arsenal/base')}>
                <Art slot="bases" id={base.id} class="thumb small gear-thumb" />
                <span><small>Base</small><br /><b>{base.name}</b></span>
              </button>
              <button class="slot-btn" onClick={() => setSheet('charm')}>
                {charm ? <Art slot="charms" id={charm.id} class="thumb small" /> : <span class="thumb small empty-thumb">none</span>}
                <span><small>Charm</small><br /><b>{charm ? charm.name : 'No charm'}</b>{charm && ` ×${num(count(player, charm.id))}`}</span>
              </button>
            </div>
          </div>

          <ObjectivePanel location={location} onHint={() => setHint(true)} />
          <BoonCard />
          <CheerCard />

          <div class="section-head"><h2>Hunt log</h2><span>newest first</span></div>
          <div class="log">
            {log.length === 0 && <p class="muted center-pad">No hunts yet. Press Hunt to set your first trap!</p>}
            {player.stats.hunts === 0 && log.length > 0 && <p class="muted center-pad">No hunts yet. Read Santa's letter, then press Hunt to set your first trap!</p>}
            {log.map((row) => <div key={row.id} class={seen.current && !seen.current.has(row.id) ? 'log-new' : undefined}><LogRow row={row} /></div>)}
          </div>
          {player.stats.hunts > 0 && (
            <div class="log-end">
              <span>{huntsShown >= 50 ? `That's your last 50 hunts. ${num(player.stats.hunts)} in total.` : `${plural(player.stats.hunts, 'hunt')} in total.`}</span>
              <button class="outline-btn" onClick={() => go('history')}>Show full history</button>
            </div>
          )}
          <div class="hunt-dock">
            <ScrinchCard />
            <button class="hunt-btn" disabled={busy} onClick={() => hunt()}>Hunt</button>
            {prefs.spaceHunts && <p class="hint desktop-only">or press Space</p>}
          </div>
        </div>
      </div>
      <BottomNav tab="hunt" />
      {sheet && <BaitSheet initial={sheet} onClose={() => setSheet(null)} />}
      {hint && <HintSheet location={location} onClose={() => setHint(false)} />}
    </div>
  );
}

/** Seen tips are remembered on this device, per hunter. */
const seenKey = (userId: number) => `nl_tips_${userId}`;
function readSeen(userId: number): string[] {
  try { return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]') as string[]; } catch { return []; }
}

/** A light one-line tip for new hunters, shown once each and never over other popups. */
function TipBar({ onEquipCharm }: { onEquipCharm: () => void }) {
  const { content, data, player, user } = useGame();
  const [seen, setSeen] = useState(() => readSeen(user.id));
  const mark = (id: string) => {
    const next = [...new Set([...readSeen(user.id), id])];
    try { localStorage.setItem(seenKey(user.id), JSON.stringify(next)); } catch { /* private mode: hide for this visit */ }
    setSeen(next);
  };
  const buyable = content.items.traps.filter((t) => t.price !== null && t.rank <= player.rank).sort((a, b) => a.price! - b.price!)[0];
  const ownsNewTrap = content.items.traps.some((t) => t.id !== content.constants.startingSetup.trap && count(player, t.id) > 0);
  const charm = content.items.charms.find((c) => count(player, c.id) > 0);
  const tips: Record<string, { text: string; go: () => void; label: string } | null> = {
    trap: buyable && !ownsNewTrap && player.gold >= buyable.price! && player.setup.trap === content.constants.startingSetup.trap
      ? { text: `You can afford the ${buyable.name}! Buy it in the Elf Emporium, then equip it from the Arsenal to catch more elves.`, go: () => go('emporium/traps'), label: 'Open Emporium' } : null,
    charm: charm && !player.setup.charm
      ? { text: `You have a ${charm.name}! Equip it in the Charm slot to strengthen your trap.`, go: onEquipCharm, label: 'Equip charm' } : null,
  };
  const id = ['trap', 'charm'].find((k) => tips[k] && !seen.includes(k));
  if (!id) return null;
  const tip = tips[id]!;
  return (
    <div class="tip-bar" role="note">
      <span aria-hidden="true">💡</span>
      <p>{tip.text}</p>
      <button class="outline-btn" onClick={() => { mark(id); tip.go(); }}>{tip.label}</button>
      <button class="ach-close" aria-label="Dismiss tip" onClick={() => mark(id)}>✕</button>
    </div>
  );
}

function BaitSheet({ initial, onClose }: { initial: 'bait' | 'charm'; onClose: () => void }) {
  const { content, data, player, act } = useGame();
  const prefs = usePrefs();
  const [tab, setTab] = useState<'bait' | 'charm'>(initial);
  const [pick, setPick] = useState<string | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const list = (tab === 'bait' ? content.items.baits : content.items.charms).filter((i) => count(player, i.id) > 0);
  const current = player.setup[tab];
  const chosen = pick === undefined ? current : pick;
  const item = chosen ? data.items.get(chosen) : undefined;
  const before = huntOdds(content, player.setup, player.location);
  const after = huntOdds(content, { ...player.setup, [tab]: chosen }, player.location);
  const rare = item?.kind === 'bait' && item.price === null;

  const use = async () => {
    if (rare && prefs.confirmRareBait && !confirming) { setConfirming(true); return; }
    if (await act('/api/setup', { slot: tab, item: chosen ?? null })) onClose();
  };
  const describe = (i: (typeof list)[number]) => {
    const it = data.items.get(i.id)!;
    if (it.kind === 'bait') return [exact && pct(it.attraction), it.rareMultiplier && `rares ×${it.rareMultiplier}`].filter(Boolean).join(', ');
    if (it.kind === 'charm') return [it.luck && `+${it.luck} luck`, exact && it.attraction && `+${pct(it.attraction)} attr.`, it.powerBonus && `+${pct(it.powerBonus)} power`].filter(Boolean).join(', ');
    return '';
  };
  const exact = useExactOdds();
  const rateText = useRateText();
  const change = (a: number, b: number, f: (x: number) => string) => (f(a) === f(b) ? `stays ${f(a)}` : `${f(a)} → ${f(b)}`);

  return (
    <Sheet title={tab === 'bait' ? 'Choose bait' : 'Choose a charm'} onClose={onClose}>
      <Tabs label="Slot" tabs={[{ id: 'bait', label: 'Bait' }, { id: 'charm', label: 'Charm' }]} value={tab} onChange={(t) => { setTab(t); setPick(undefined); setConfirming(false); }} />
      <div class="pick-grid">
        {tab === 'charm' && (
          <button class={`pick ${chosen === null ? 'on' : ''}`} onClick={() => { setPick(null); setConfirming(false); }}>
            <span class="thumb empty-thumb">none</span>
            <b>No charm</b>
            <small>{current === null ? 'Equipped' : 'Save charms'}</small>
          </button>
        )}
        {list.map((i) => (
          <button class={`pick ${chosen === i.id ? 'on' : ''}`} onClick={() => { setPick(i.id); setConfirming(false); }}>
            <Art slot={tab === 'bait' ? 'baits' : 'charms'} id={i.id} class="thumb" />
            {current === i.id && <span class="pill green corner">Equipped</span>}
            <b>{i.name}</b>
            <small>×{num(count(player, i.id))} · {describe(i)}</small>
          </button>
        ))}
      </div>
      {list.length === 0 && <p class="muted">You have no {tab === 'bait' ? 'bait' : 'charms'}. Buy some in the Elf Emporium.</p>}
      {chosen !== current && (
        <div class="preview-box">
          {item?.flavour && <p><b>{item.name}:</b> {item.flavour.description}</p>}
          <p class="small">Catch chance {change(catchIfAttracted(before), catchIfAttracted(after), rateText)}; allure {change(before.stats.attraction, after.stats.attraction, rateText)}; power {change(before.stats.power, after.stats.power, num)}; luck {change(before.stats.luck, after.stats.luck, num)}</p>
          <button class="primary-btn wide" onClick={use}>
            {confirming ? `Yes, use ${item?.name}` : chosen ? `Use ${item?.name}` : 'Take off charm'}
          </button>
          {confirming && <p class="small muted">{item?.name} is crafted, not sold. Each attracted hunt uses one.</p>}
        </div>
      )}
      <button class="text-btn wide" onClick={() => { onClose(); go(`emporium/${tab === 'bait' ? 'bait' : 'charms'}`); }}>
        <Icon id="nav_emporium" size={18} /> Buy more {tab === 'bait' ? 'bait' : 'charms'} in the Elf Emporium
      </button>
    </Sheet>
  );
}
