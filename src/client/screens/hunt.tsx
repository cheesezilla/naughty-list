import { useEffect, useMemo, useState } from 'preact/hooks';
import { count, huntOdds, type Setup } from '../../engine/index.js';
import { useGame } from '../game.js';
import { Art, Icon } from '../lib/art.js';
import { num, pct, plural } from '../lib/format.js';
import { usePrefs } from '../lib/prefs.js';
import { go } from '../lib/route.js';
import { BottomNav, PlayerBar, RankProgress, Sheet, Tabs, TitleStrip } from '../ui.js';
import { LogRow } from './log.js';
import { HintSheet, ObjectivePanel } from './objective.js';

/** Catch chance once an imp is attracted, averaged over the imps this bait draws. */
export function catchIfAttracted(odds: ReturnType<typeof huntOdds>) {
  return odds.stats.attraction > 0 ? odds.catchPerHunt / odds.stats.attraction : odds.imps.reduce((s, o) => s + o.encounter * o.catchChance, 0);
}

export function StatRow({ setup }: { setup: Setup }) {
  const { content, player } = useGame();
  const odds = huntOdds(content, setup, player.location);
  return (
    <div class="stat-row">
      <div><b>{num(odds.stats.power)}</b><span>Power</span></div>
      <div><b>{num(odds.stats.luck)}</b><span>Luck</span></div>
      <div><b>{pct(odds.stats.attraction)}</b><span>Attraction</span></div>
      <div class="catch"><b>{pct(catchIfAttracted(odds))}</b><span>Catch</span></div>
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
  }, [prefs.spaceHunts, sheet, hint, hunt]);

  return (
    <div class="screen">
      <TitleStrip />
      <div class="scroll hunt-scroll">
        <div class="banner">
          <Art slot="locations" id={location.id} class="banner-art" />
          <div class="banner-top"><PlayerBar overlay /></div>
          <div class="banner-bottom">
            <h1>{location.name}</h1>
            <span class="banner-actions">
              <button class="hint-btn" onClick={() => setHint(true)} aria-label={`How to clear the ${location.name}`}>?</button>
              <button class="cream-btn" onClick={() => go('more/travel')}>Travel</button>
            </span>
          </div>
        </div>
        <RankProgress />
        <div class="pad stack">
          <div class="card gear-card">
            <div class="gear">
              <button class="trap-button" onClick={() => go('arsenal/trap')} aria-label={`Change trap and base. Now ${trap.name} on ${base.name}`}>
                <TrapOnBase trap={trap.id} base={base.id} />
                <span class="trap-caption"><b>{trap.name}</b><br />on {base.name}</span>
              </button>
              <div class="side-slots">
                <button class="slot-btn" onClick={() => setSheet('bait')}>
                  {bait ? <Art slot="baits" id={bait.id} class="thumb small" /> : <span class="thumb small empty-thumb">none</span>}
                  <span><small>Bait</small><br /><b>{bait ? bait.name : 'No bait'}</b>{bait && ` ×${num(count(player, bait.id))}`}</span>
                </button>
                <button class="slot-btn" onClick={() => setSheet('charm')}>
                  {charm ? <Art slot="charms" id={charm.id} class="thumb small" /> : <span class="thumb small empty-thumb">none</span>}
                  <span><small>Charm</small><br /><b>{charm ? charm.name : 'No charm'}</b>{charm && ` ×${num(count(player, charm.id))}`}</span>
                </button>
                <p class="hint">Tap any item to change it</p>
              </div>
            </div>
            <StatRow setup={player.setup} />
          </div>

          <ObjectivePanel location={location} onHint={() => setHint(true)} />

          <div class="section-head"><h2>Hunt log</h2><span>newest first</span></div>
          <div class="log">
            {log.length === 0 && <p class="muted center-pad">No hunts yet. Press Hunt to set your first trap!</p>}
            {player.stats.hunts === 0 && log.length > 0 && <p class="muted center-pad">No hunts yet. Read Santa's letter, then press Hunt to set your first trap!</p>}
            {log.map((row) => <LogRow row={row} />)}
          </div>
          {player.stats.hunts > 0 && (
            <div class="log-end">
              <span>{huntsShown >= 50 ? `That's your last 50 hunts. ${num(player.stats.hunts)} in total.` : `${plural(player.stats.hunts, 'hunt')} in total.`}</span>
              <button class="outline-btn" onClick={() => go('history')}>Show full history</button>
            </div>
          )}
          <div class="hunt-dock">
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
    if (it.kind === 'bait') return `${pct(it.attraction)}${it.rareMultiplier ? `, rares ×${it.rareMultiplier}` : ''}`;
    if (it.kind === 'charm') return [it.luck && `+${it.luck} luck`, it.attraction && `+${pct(it.attraction)} attr.`, it.powerBonus && `+${pct(it.powerBonus)} power`].filter(Boolean).join(', ');
    return '';
  };
  const change = (a: number, b: number, f: (x: number) => string) => (Math.abs(a - b) < 1e-9 ? `stays ${f(a)}` : `${f(a)} → ${f(b)}`);

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
          <p class="small">Catch chance {change(catchIfAttracted(before), catchIfAttracted(after), pct)}; attraction {change(before.stats.attraction, after.stats.attraction, pct)}; power {change(before.stats.power, after.stats.power, num)}; luck {change(before.stats.luck, after.stats.luck, num)}</p>
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
