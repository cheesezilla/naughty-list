import type { Content, Effect, Imp } from '../content/schema.js';
import { gameData } from './data.js';
import { addItem, count, type ActionResult, type PlayerState } from './player.js';
import type { Rng } from './rng.js';

/** A timed effect from an event: lasts some hunts and/or some uses. */
export interface Buff {
  stat: Extract<Effect, { type: 'buff' }>['stat'];
  value: number;
  label: string;
  hunts?: number;
  uses?: number;
}

/** A Scrinch challenge in progress. `hunts` counts hunts since it began, not the one that started it. */
export interface ActiveScrinch { id: string; hunts: number; caught: number; run: number }

/** Random events, saved per player. */
export interface EventsState {
  /** Chance that the next boon is a Grand Gift (Santa's favour). */
  grand: number;
  /** Hunt number of the last event, for the minimum gap. */
  lastEvent: number;
  /** The mini boss or boss that last escaped, and how many times in a row. */
  escapeImp?: string;
  escapeCount: number;
  /** A boon card waiting for an answer. */
  pending?: { id: string };
  scrinch?: ActiveScrinch;
  buffs: Buff[];
  /** Totals, for stats and future badges. */
  boons: number;
  grands: number;
  wins: number;
  fails: number;
  tolls: number;
}

export const eventsOf = (content: Content, p: PlayerState): EventsState =>
  (p.events ??= { grand: content.constants.events.grandBase, lastEvent: 0, escapeCount: 0, buffs: [], boons: 0, grands: 0, wins: 0, fails: 0, tolls: 0 });

/** One line in the hunt log about an event. */
export interface EventNote {
  type: 'boon' | 'grand' | 'scrinch' | 'scrinch_win' | 'scrinch_fail';
  id: string;
  name: string;
  text: string;
}

export type EventAction = 'a' | 'b' | 'decline' | 'toll';

/** H: the average gold of the common elves where the player is, so rewards matter equally in every area. */
export function unitH(content: Content, locationId: string): number {
  const loc = gameData(content).locations.get(locationId);
  const imps = (loc?.imps.filter((i) => i.tier === 'common') ?? []);
  const list = imps.length ? imps : loc?.imps ?? [];
  return list.length ? list.reduce((s, i) => s + i.gold, 0) / list.length : 0;
}

/** Gold a Scrinch skip toll costs right now. */
export function tollGold(content: Content, p: PlayerState, scrinchId: string): number {
  const t = content.events.scrinch.find((s) => s.id === scrinchId)?.toll;
  if (!t) return 0;
  return Math.max(1, Math.round((t.h ?? 0) * unitH(content, p.location) + (t.pct ?? 0) * p.gold));
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

/** Starts a Scrinch challenge. */
function startScrinch(content: Content, p: PlayerState, rng: Rng, why: 'chance' | 'grudge'): EventNote | undefined {
  const def = pick(content.events.scrinch, rng);
  if (!def) return undefined;
  const ev = eventsOf(content, p);
  ev.scrinch = { id: def.id, hunts: 0, caught: 0, run: 0 };
  ev.lastEvent = p.stats.hunts;
  return { type: 'scrinch', id: def.id, name: def.name, text: `${why === 'grudge' ? 'Scrinch holds a grudge! ' : ''}${def.text} ${def.goalText}, or pay the toll (${tollGold(content, p, def.id)} gold).` };
}

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

/** Moves an active Scrinch challenge on by one hunt. Returns a log note when it ended. */
function scrinchProgress(content: Content, p: PlayerState, h: HuntContext, rng: Rng): EventNote | undefined {
  const ev = eventsOf(content, p);
  const sc = ev.scrinch;
  const def = sc && content.events.scrinch.find((s) => s.id === sc.id);
  if (!sc || !def) { ev.scrinch = undefined; return undefined; }
  sc.hunts += 1;
  if (h.caught) { sc.caught += 1; sc.run += 1; } else sc.run = 0;
  const g = def.goal;
  const big = h.imp.tier === 'rare' || h.imp.tier === 'miniboss' || h.imp.tier === 'boss';
  const home = gameData(content).locations.get(p.location)?.homeTypes ?? [];
  let won = false;
  let over = sc.hunts >= g.window;
  if (g.type === 'catches') { won = sc.caught >= g.need; if (sc.caught + (g.window - sc.hunts) < g.need) over = true; }
  else if (g.type === 'streak') won = sc.run >= g.need;
  else if (g.type === 'rare') won = h.caught && big;
  else won = h.caught && (home.length === 0 || (h.trapType !== null && (home as string[]).includes(h.trapType)));
  if (won) {
    const got = applyEffects(content, p, def.prize, rng);
    ev.scrinch = undefined;
    ev.wins += 1;
    ev.grand = Math.min(1, ev.grand + content.constants.events.grandPerScrinchWin);
    return { type: 'scrinch_win', id: def.id, name: def.name, text: `${def.name} beaten! ${def.prizeText}${got.length ? ` (${got.join(', ')})` : ''}. Santa's favour grows.` };
  }
  if (!over) return undefined;
  ev.scrinch = undefined;
  ev.fails += 1;
  const t = def.threat;
  let lost = '';
  if (t.type === 'goldPct') {
    const take = Math.max(0, Math.min(Math.round(p.gold * t.pct), Math.round(t.capH * unitH(content, p.location)), p.gold - content.constants.pillage.goldFloor));
    p.gold -= take;
    lost = take > 0 ? `−${take} gold` : 'your gold is safe';
  } else if (t.type === 'baitLoss') {
    const bait = p.setup.bait;
    const take = bait ? Math.min(t.amount, count(p, bait)) : 0;
    if (bait && take > 0) addItem(p, bait, -take);
    lost = take > 0 ? `−${take} bait` : 'no bait to take';
  } else {
    addBuff(ev, { stat: t.stat, value: t.value, label: t.label, hunts: t.hunts, uses: t.uses });
    lost = t.label;
  }
  return { type: 'scrinch_fail', id: def.id, name: def.name, text: `${def.name} failed. ${def.failText} (${lost})` };
}

/**
 * Everything events do after a hunt: moves an active Scrinch challenge on, tracks escaped bosses and rolls for a new
 * event. Returns the log notes. A no-op when events are switched off in constants.
 */
export function eventsAfterHunt(content: Content, p: PlayerState, h: HuntContext, rng: Rng): EventNote[] {
  const c = content.constants.events;
  if (!c.enabled) return [];
  const ev = eventsOf(content, p);
  const notes: EventNote[] = [];
  const ended = scrinchProgress(content, p, h, rng);
  if (ended) notes.push(ended);

  const boss = h.imp.tier === 'miniboss' || h.imp.tier === 'boss';
  if (h.caught) {
    if (ev.escapeImp === h.imp.id) { ev.escapeImp = undefined; ev.escapeCount = 0; }
  } else if (boss) {
    ev.escapeCount = ev.escapeImp === h.imp.id ? ev.escapeCount + 1 : 1;
    ev.escapeImp = h.imp.id;
  }

  const hunts = p.stats.hunts;
  const busy = !!ev.pending || !!ev.scrinch || !!p.cheer?.draw;
  if (busy) return notes;
  const gap = hunts - ev.lastEvent;
  // Scrinch's grudge: a boss that got away, unless it has done so too many times in a row.
  if (!h.caught && boss && ev.escapeCount <= c.grudgeMaxStreak && gap >= c.grudgeGap && rng() < c.grudgeChance) {
    const n = startScrinch(content, p, rng, 'grudge');
    if (n) notes.push(n);
    return notes;
  }
  if (hunts >= c.minHunts && gap >= c.minGap && rng() < c.chancePerHunt) {
    const n = rng() < c.scrinchShare ? startScrinch(content, p, rng, 'chance') : offerBoon(content, p, rng);
    if (n) notes.push(n);
  }
  return notes;
}

/** Answers the open boon card (`a`, `b` or `decline`), or pays the skip toll of the active Scrinch challenge. */
export function eventAction(content: Content, player: PlayerState, action: EventAction, rng: Rng): ActionResult {
  const p = structuredClone(player);
  const ev = eventsOf(content, p);
  if (action === 'toll') {
    const sc = ev.scrinch;
    if (!sc) return { ok: false, error: 'There is no Scrinch challenge to skip.' };
    const toll = tollGold(content, p, sc.id);
    if (p.gold < toll) return { ok: false, error: `The toll is ${toll} gold and you only have ${p.gold}.` };
    p.gold -= toll;
    ev.scrinch = undefined;
    ev.tolls += 1;
    return { ok: true, player: p };
  }
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

/** The log line for answering the boon card or paying the toll. Reads the state from before the answer. */
export function eventChoiceText(content: Content, before: PlayerState, action: EventAction): { id: string; name: string; text: string } {
  const ev = before.events;
  if (action === 'toll') {
    const def = content.events.scrinch.find((s) => s.id === ev?.scrinch?.id);
    return { id: def?.id ?? '', name: def?.name ?? 'Scrinch', text: `Paid the skip toll: ${def ? tollGold(content, before, def.id) : 0} gold. ${def?.name ?? 'The challenge'} is cancelled.` };
  }
  const boon = content.events.boons.find((b) => b.id === ev?.pending?.id);
  const gift = boon && action !== 'decline' ? boon[action].label : undefined;
  return { id: boon?.id ?? '', name: boon?.name ?? 'A gift', text: gift ? `Took: ${gift}` : 'No thanks.' };
}

/** Admin tool: triggers an event now. `boon` and `grand` give a card or gift, `scrinch` starts a challenge. */
export function forceEvent(content: Content, player: PlayerState, kind: 'boon' | 'grand' | 'scrinch', rng: Rng): { player: PlayerState; note?: EventNote } {
  const p = structuredClone(player);
  const ev = eventsOf(content, p);
  ev.pending = undefined;
  ev.scrinch = undefined;
  const note = kind === 'scrinch' ? startScrinch(content, p, rng, 'chance') : offerBoon(content, p, rng, kind === 'grand');
  return { player: p, note };
}
