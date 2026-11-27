import { useRef, useState } from 'preact/hooks';
import { type EventNote, type JournalEntry } from '../../engine/index.js';
import type { Boon } from '../../content/schema.js';
import { useGame } from '../game.js';
import { num } from '../lib/format.js';
import { Sheet } from '../ui.js';

const RARITY: Record<Boon['rarity'], string> = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };

/** Remembers the value before the latest change so the UI can animate a move forward or back. */
function useDelta(value: number) {
  const r = useRef({ prev: value, cur: value });
  if (r.current.cur !== value) r.current = { prev: r.current.cur, cur: value };
  return r.current.prev;
}

/** The Cheer Meter: pips, Cash in / Hold, boons in play, and the always-visible Santa's favour bar. */
export function CheerCard() {
  const { content, player, act } = useGame();
  const c = content.constants.cheer;
  const [open, setOpen] = useState(false);
  if (!c.enabled && !content.constants.events.enabled) return null;
  const s = player.cheer;
  const pips = s?.pips ?? 0;
  const full = pips >= c.full;
  const draw = s?.draw;
  const cashIn = async () => { if (draw || (await act('/api/cheer', { action: 'draw' }))) setOpen(true); };
  const favour = player.events?.grand ?? content.constants.events.grandBase;
  const prevPips = useDelta(pips);
  const prevFavour = useDelta(favour);
  const favourMove = favour > prevFavour ? 'up' : favour < prevFavour ? 'down' : '';
  return (
    <div class="card cheer-card">
      {c.enabled && (
        <>
          <div class="cheer-head">
            <b>Cheer Meter</b>
            <span class="muted">{pips}/{c.full}{s?.held ? ' · Overcharged' : ''}</span>
          </div>
          <div class={`pips ${full ? 'full' : ''}`} role="img" aria-label={`Cheer ${pips} of ${c.full}`}>
            {Array.from({ length: c.max }, (_, i) => (
              <i class={`pip ${i < pips ? 'on' : ''} ${i >= c.full ? 'over' : ''} ${i >= c.full && !s?.held ? 'hidden' : ''} ${i >= prevPips && i < pips ? 'pop' : ''} ${i >= pips && i < prevPips ? 'drop' : ''}`} />
            ))}
          </div>
          {full && (
            <div class="cheer-actions">
              <button class="primary-btn" onClick={cashIn}>{draw ? 'Pick a boon' : 'Cash in'}</button>
              {!draw && !s?.held && <button class="outline-btn" onClick={() => act('/api/cheer', { action: 'hold' })}>Hold the charge</button>}
            </div>
          )}
          {!full && <p class="hint cheer-hint">Catch elves to fill it. Rares count double. An escape costs {c.escapePips}.</p>}
          {s?.held && <p class="hint cheer-hint">Overcharged: better boons at {c.max}, but an escape costs {c.heldEscapePips}.</p>}
        </>
      )}
      <ActiveBuffs />
      {content.constants.events.enabled && (
        <div class="favour" title="Every boon from Santa or Mrs. Claus has this chance to be a free Grand Gift.">
          <span>Santa's favour</span>
          <span class={`favour-bar ${favourMove}`}><i style={{ width: `${Math.round(favour * 100)}%` }} /></span>
          <b>{Math.round(favour * 100)}%</b>
        </div>
      )}
      {open && (draw ?? player.cheer?.draw) && <CheerSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

const left = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} left`;
/** Everything in play with a countdown: boons, Santa's gifts, and event effects. */
function ActiveBuffs() {
  const { content, player } = useGame();
  const boons = content.constants.cheer.enabled ? player.cheer?.active ?? [] : [];
  const buffs = player.events?.buffs ?? [];
  if (!boons.length && !buffs.length) return null;
  return (
    <div class="boon-chips" aria-label="Active effects">
      {boons.map((a) => {
        const b = content.boons.find((x) => x.id === a.id);
        return <span class={`boon-chip boon-effect ${b?.rarity}`}><b>{b?.name} · {left(a.hunts, 'hunt')}</b><small>{b?.text}</small></span>;
      })}
      {buffs.map((b) => (
        <span class={`boon-chip gift`}>
          {b.label} · {[b.hunts !== undefined && left(b.hunts, 'hunt'), b.uses !== undefined && left(b.uses, b.stat === 'noPillage' || b.stat === 'bossShield' ? 'try' : 'use')].filter(Boolean).join(', ')}
        </span>
      ))}
    </div>
  );
}

function CheerSheet({ onClose }: { onClose: () => void }) {
  const { content, player, act } = useGame();
  const draw = player.cheer!.draw!;
  const cards = draw.cards.map((id) => content.boons.find((b) => b.id === id)!).filter(Boolean);
  return (
    <Sheet title={`Pick a boon · ${draw.tier}`} onClose={onClose}>
      <p class="muted">{(draw.picks ?? 1) > 1 ? `Overcharged: choose ${draw.picks} of these.` : 'Choose one.'} It lasts a number of hunts. Closing this keeps your draw.</p>
      <div class="boon-cards">
        {cards.map((b) => (
          <button class={`boon-card ${b.rarity}`} onClick={async () => { if (await act('/api/cheer', { action: 'pick', boon: b.id }) && (draw.picks ?? 1) <= 1) onClose(); }}>
            <small>{RARITY[b.rarity]}</small>
            <b>{b.name}</b>
            <span>{b.text}</span>
            <small>{b.hunts} {b.hunts === 1 ? 'hunt' : 'hunts'}</small>
          </button>
        ))}
      </div>
      {(draw.perks?.length ?? 0) > 0 && (
        <div class="boon-perks">
          <p class="muted">Overcharge perk (choose one, once):</p>
          {draw.perks!.includes('second_pick') && <button class="outline-btn" onClick={() => act('/api/cheer', { action: 'perk', boon: 'second_pick' })}>A second pick (and two more cards)</button>}
          {draw.perks!.includes('long') && <button class="outline-btn" onClick={() => act('/api/cheer', { action: 'perk', boon: 'long' })}>Boons last 50% longer</button>}
          {draw.perks!.includes('blessing') && <button class="outline-btn" onClick={() => act('/api/cheer', { action: 'perk', boon: 'blessing' })}>Two Santa's Blessings, guaranteed</button>}
        </div>
      )}
      {draw.rerolls > 0 && <button class="outline-btn" onClick={() => act('/api/cheer', { action: 'reroll' })}>Reroll the draw ({draw.rerolls})</button>}
    </Sheet>
  );
}

/** A boon card from Santa or Mrs. Claus: two gifts, or no thanks. Survives a reload. */
export function BoonCard() {
  const { content, player, act } = useGame();
  const pending = player.events?.pending;
  const def = pending && content.events.boons.find((b) => b.id === pending.id);
  if (!def) return null;
  const who = def.from === 'santa' ? 'Santa' : 'Mrs. Claus';
  return (
    <div class={`card event-card from-${def.from}`}>
      <b>{def.name}</b>
      <p class="muted">{who} drops by with a gift. Pick one:</p>
      <div class="gift-row">
        <button class="gift" onClick={() => act('/api/event', { action: 'a' })}>{def.a.label}</button>
        <button class="gift" onClick={() => act('/api/event', { action: 'b' })}>{def.b.label}</button>
      </div>
      <button class="text-btn" onClick={() => act('/api/event', { action: 'decline' })}>No thanks</button>
    </div>
  );
}

/** Cheer and event lines under a hunt in the log. */
export function HuntExtras({ e }: { e: JournalEntry }) {
  const notes: EventNote[] = e.events ?? [];
  return (
    <>
      {e.mulligan && <div class="event-note cheer">Mulligan! The escape was rolled again and the elf is caught.</div>}
      {e.cheer && (e.cheer.gained > 0 || e.cheer.lost > 0 || e.cheer.full) && (
        <div class="event-note cheer">Cheer {e.cheer.gained > 0 ? `+${e.cheer.gained}` : e.cheer.lost > 0 ? `−${e.cheer.lost}` : ''} ({e.cheer.pips}){e.cheer.full ? ' · meter full, cash in!' : ''}</div>
      )}
      {notes.map((n) => <div class={`event-note ${n.type}`}><b>{n.name}</b> {n.text}</div>)}
    </>
  );
}
