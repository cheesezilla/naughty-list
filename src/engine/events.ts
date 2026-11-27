import type { Content, Effect, Imp } from '../content/schema.js';
import { gameData } from './data.js';
import { addItem, type ActionResult, type PlayerState } from './player.js';
import type { Rng } from './rng.js';

/** A timed effect from an event: lasts some hunts and/or some uses. */
export interface Buff {
  stat: Extract<Effect, { type: 'buff' }>['stat'];
  value: number;
  label: string;
  hunts?: number;
  uses?: number;
}

/** Random events, saved per player. */
export interface EventsState {
  /** Chance that the next boon is a Grand Gift (Santa's favour). */
  grand: number;
  /** Hunt number of the last event, for the minimum gap. */
  lastEvent: number;
  /** A boon card waiting for an answer. */
  pending?: { id: string };
  buffs: Buff[];
  /** Totals, for stats and future badges. */
  boons: number;
  grands: number;
}

/**
 * The player's events state. Saves from when Scrinch ran random events may still carry a pending challenge, its counters
 * and penalty buffs: they are dropped here, so old saves load cleanly.
 */
export const eventsOf = (content: Content, p: PlayerState): EventsState => {
  const ev = (p.events ??= { grand: content.constants.events.grandBase, lastEvent: 0, buffs: [], boons: 0, grands: 0 });
  stripScrinch(ev);
  return ev;
};

/** One line in the hunt log about an event. */
export interface EventNote {
  type: 'boon' | 'grand';
  id: string;
  name: string;
  text: string;
}

export type EventAction = 'a' | 'b' | 'decline';

/** H: the average gold of the common elves where the player is, so rewards matter equally in every area. */
export function unitH(content: Content, locationId: string): number {
  const loc = gameData(content).locations.get(locationId);
  const imps = (loc?.imps.filter((i) => i.tier === 'common') ?? []);
  const list = imps.length ? imps : loc?.imps ?? [];
  return list.length ? list.reduce((s, i) => s + i.gold, 0) / list.length : 0;
}

const isPenalty = (b: Buff) => b.stat === 'baitCost' || (/Mult$/.test(b.stat) && b.value < 1);

/** Removes what Scrinch's retired random events left in a saved events state. */
function stripScrinch(ev: EventsState): void {
  const old = ev as EventsState & { scrinch?: unknown; escapeImp?: unknown; escapeCount?: unknown; wins?: unknown; fails?: unknown; tolls?: unknown };
  delete old.scrinch; delete old.escapeImp; delete old.escapeCount; delete old.wins; delete old.fails; delete old.tolls;
  if (ev.buffs.some(isPenalty)) ev.buffs = ev.buffs.filter((b) => !isPenalty(b));
}

function addBuff(ev: EventsState, b: Buff): void {
  const have = ev.buffs.find((x) => x.stat === b.stat && x.label === b.label);
  if (have) { have.hunts = b.hunts; have.uses = b.uses; have.value = b.value; } else ev.buffs.push({ ...b });
}

/** Gives the player what the effects say, and returns a line for each ("+120 gold"). */
export function applyEffects(content: Content, p: PlayerState, effects: Effect[], rng: Rng): string[] {
  const data = gameData(content);
  const ev = eventsOf(content, p);
  const out: string[] = [];
  for (const e of effects) {
    if (e.type === 'gold') {
      const n = Math.max(1, Math.round(e.h * unitH(content, p.location)));
      p.gold += n;
      out.push(`+${n} gold`);
    } else if (e.type === 'bait') {
      const bait = content.items.baits.filter((b) => b.price !== null && b.rank <= p.rank).sort((a, b) => b.price! - a.price!)[0];
      if (bait) { addItem(p, bait.id, e.amount); out.push(`+${e.amount} ${bait.name}`); }
    } else if (e.type === 'charm') {
      const charms = content.items.charms.filter((c) => c.price !== null && c.rank <= p.rank);
      for (let i = 0; i < e.amount && charms.length; i++) {
        const c = charms[Math.floor(rng() * charms.length)]!;
        addItem(p, c.id, 1);
        out.push(`+1 ${data.items.get(c.id)?.name ?? c.id}`);
      }
    } else {
      addBuff(ev, { stat: e.stat, value: e.value, label: e.label, hunts: e.hunts, uses: e.uses });
      out.push(e.label);
    }
  }
  return out;
}

/** Counts every buff down after a hunt and drops the ones that ran out. */
export function tickBuffs(p: PlayerState): void {
  if (!p.events) return;
  for (const b of p.events.buffs) if (b.hunts !== undefined) b.hunts -= 1;
  p.events.buffs = p.events.buffs.filter((b) => (b.hunts === undefined || b.hunts > 0) && (b.uses === undefined || b.uses > 0));
}

/** Uses up one charge of the first buff with this stat (a Golden Ticket catch, a hunt shield, a Snow Globe). */
export function useBuff(p: PlayerState, stat: Buff['stat']): void {
  const b = p.events?.buffs.find((x) => x.stat === stat && x.uses !== undefined);
  if (b) b.uses = b.uses! - 1;
  if (p.events) p.events.buffs = p.events.buffs.filter((x) => x.uses === undefined || x.uses > 0);
}

const pick = <T,>(list: T[], rng: Rng): T => list[Math.floor(rng() * list.length)]!;

/** Santa or Mrs. Claus show up: a Grand Gift with the favour chance, otherwise a boon card with two gifts. */
function offerBoon(content: Content, p: PlayerState, rng: Rng, forceGrand?: boolean): EventNote | undefined {
  const c = content.constants.events;
  const ev = eventsOf(content, p);
  ev.lastEvent = p.stats.hunts;
  if (content.events.grandGifts.length && (forceGrand || rng() < ev.grand)) {
    const g = pick(content.events.grandGifts, rng);
    const got = applyEffects(content, p, g.effects, rng);
    ev.grand = c.grandBase;
    ev.grands += 1;
    return { type: 'grand', id: g.id, name: g.name, text: `${g.text} ${got.join(', ')}` };
  }
  if (!content.events.boons.length) return undefined;
  const b = pick(content.events.boons, rng);
  ev.pending = { id: b.id };
  ev.grand = Math.min(1, ev.grand + c.grandPerBoon);
  return { type: 'boon', id: b.id, name: b.name, text: 'Pick a gift, or say no thanks.' };
}

export interface HuntContext { imp: Imp; caught: boolean; trapType: string | null }

/**
 * Everything events do after a hunt: rolls for a new boon or Grand Gift. Returns the log notes. A no-op when events are switched off in constants.
 */
export function eventsAfterHunt(content: Content, p: PlayerState, h: HuntContext, rng: Rng): EventNote[] {
  const c = content.constants.events;
  if (!c.enabled) return [];
  const ev = eventsOf(content, p);
  const notes: EventNote[] = [];
  const hunts = p.stats.hunts;
  const busy = !!ev.pending || !!p.cheer?.draw;
  if (busy) return notes;
  const gap = hunts - ev.lastEvent;
  if (hunts >= c.minHunts && gap >= c.minGap && rng() < c.chancePerHunt) {
    const n = offerBoon(content, p, rng);
    if (n) notes.push(n);
  }
  return notes;
}

/** Answers the open boon card (`a`, `b` or `decline`). */
export function eventAction(content: Content, player: PlayerState, action: EventAction, rng: Rng): ActionResult {
  const p = structuredClone(player);
  const ev = eventsOf(content, p);
  const pending = ev.pending;
  const boon = pending && content.events.boons.find((b) => b.id === pending.id);
  if (!pending || !boon) return { ok: false, error: 'There is no gift waiting.' };
  if (action === 'a' || action === 'b') {
    applyEffects(content, p, boon[action].effects, rng);
    ev.boons += 1;
  }
  ev.pending = undefined;
  return { ok: true, player: p };
}

/** The log line for answering the boon card. Reads the state from before the answer. */
export function eventChoiceText(content: Content, before: PlayerState, action: EventAction): { id: string; name: string; text: string } {
  const ev = before.events;
  const boon = content.events.boons.find((b) => b.id === ev?.pending?.id);
  const gift = boon && action !== 'decline' ? boon[action].label : undefined;
  return { id: boon?.id ?? '', name: boon?.name ?? 'A gift', text: gift ? `Took: ${gift}` : 'No thanks.' };
}

/** Admin tool: triggers an event now. `boon` and `grand` give a card or gift. */
export function forceEvent(content: Content, player: PlayerState, kind: 'boon' | 'grand', rng: Rng): { player: PlayerState; note?: EventNote } {
  const p = structuredClone(player);
  const ev = eventsOf(content, p);
  ev.pending = undefined;
  const note = offerBoon(content, p, rng, kind === 'grand');
  return { player: p, note };
}
