import { powerTypes, type Content, type Imp, type Location, type PowerType } from '../content/schema.js';
import { addItem, bump, type ActionResult, type PlayerState } from './player.js';
import type { Rng } from './rng.js';

/** Saved progress on a location's own loop. The bait ladder needs none: it lives in the inventory. */
export type ObjectiveState =
  | {
    type: 'order_board';
    /** Catches so far toward each core type's standing order (parallel orders: any catch fills the order of its trap's type). */
    progress: Record<CoreType, number>;
    /** Types whose order was finished since the last Triple Crate. */
    finished: CoreType[];
    /** Catches left on a Rush order (0 when none is active). While it runs, standing orders pause. */
    rushLeft: number;
    ordersDone: number;
    /** After an Inspection the player may take a Rush order. */
    rushReady: boolean;
    /** The next attracted imp here is this one. */
    forced?: string;
  }
  | {
    type: 'sleigh_run';
    active: boolean;
    left: number;
    readiness: number;
    launches: number;
    forced?: string;
  };

/** What a hunt did to the location's loop, for the hunt log. */
export interface ObjectiveResult {
  notes: string[];
  gold?: number;
  items?: { item: string; amount: number }[];
  /** Order-board catches counted by this hunt (they add Cheer pips). */
  orders?: number;
}

export type CoreType = 'clockwork' | 'starlight' | 'frost';
export const coreTypes: CoreType[] = ['clockwork', 'starlight', 'frost'];

const TYPE_NAME: Record<PowerType, string> = { clockwork: 'Clockwork', starlight: 'Starlight', frost: 'Frost', carol: 'Carol' };

/** The saved state for a location's loop, created on first use. Bait ladders have none. */
export function objectiveState(p: PlayerState, location: Location, rng?: Rng): ObjectiveState | undefined {
  const o = location.objective;
  if (!o || o.type === 'bait_ladder') return undefined;
  const all = (p.objectives ??= {});
  let s = all[location.id];
  // Saves from the old ordered-slots board have no `progress`: keep the order count, start the new board fresh.
  if (s?.type === 'order_board' && !s.progress) {
    const old = s as unknown as { ordersDone?: number; rushReady?: boolean; forced?: string };
    s = { type: 'order_board', progress: { clockwork: 0, starlight: 0, frost: 0 }, finished: [], rushLeft: 0, ordersDone: old.ordersDone ?? 0, rushReady: old.rushReady ?? false, ...(old.forced ? { forced: old.forced } : {}) };
    all[location.id] = s;
  }
  if (!s || s.type !== o.type) {
    if (o.type === 'order_board') {
      s = { type: 'order_board', progress: { clockwork: 0, starlight: 0, frost: 0 }, finished: [], rushLeft: 0, ordersDone: 0, rushReady: false };
    } else {
      s = { type: 'sleigh_run', active: false, left: 0, readiness: 0, launches: 0 };
    }
    all[location.id] = s;
  }
  return s;
}

/** Adjusts encounter weights for the location's loop: a forced imp, and imps that only come at certain moments. */
export function objectiveWeights(p: PlayerState, location: Location, weights: number[]): number[] {
  const o = location.objective;
  const s = p.objectives?.[location.id];
  if (!o || o.type === 'bait_ladder' || !s) return weights;
  if (s.forced) {
    const i = location.imps.findIndex((imp) => imp.id === s.forced);
    if (i >= 0) return weights.map((_, j) => (j === i ? 1 : 0));
  }
  if (o.type === 'sleigh_run' && s.type === 'sleigh_run' && s.active && s.readiness >= o.minibossFrom) {
    return weights.map((w, j) => (location.imps[j]!.id === o.miniboss ? o.minibossWeight : w));
  }
  return weights;
}

/**
 * Updates the location's loop after a hunt. `imp` is undefined for a quiet hunt.
 * Pays any rewards straight into the player state and returns notes for the hunt log.
 */
export function afterHunt(
  content: Content, p: PlayerState, location: Location, imp: Imp | undefined, caught: boolean, trapType: string | null, rng: Rng,
): ObjectiveResult | undefined {
  const o = location.objective;
  const s = p.objectives?.[location.id];
  if (!o || o.type === 'bait_ladder' || !s) return undefined;
  const out: ObjectiveResult = { notes: [] };
  const name = (id: string) => location.imps.find((i) => i.id === id)?.name ?? id;
  const give = (item: string, amount: number) => {
    addItem(p, item, amount);
    (out.items ??= []).push({ item, amount });
  };
  if (imp && s.forced === imp.id) delete s.forced;

  if (o.type === 'order_board' && s.type === 'order_board') {
    if (!imp || !caught) return undefined;
    if (s.rushLeft > 0) {
      s.rushLeft -= 1;
      out.orders = 1;
      out.notes.push(`Rush order: ${s.rushLeft} part${s.rushLeft === 1 ? '' : 's'} to go`);
      if (s.rushLeft === 0) {
        s.forced = o.boss;
        bump(p, 'rushOrders');
        out.notes.push(`Rush order done! ${name(o.boss)} is coming to see it.`);
      }
      return out;
    }
    // A trap of the fourth type (Carol) is a joker: it fills the order that is furthest along.
    const t = coreTypes.includes(trapType as CoreType)
      ? (trapType as CoreType)
      : [...coreTypes].sort((a, b) => s.progress[b] - s.progress[a])[0]!;
    s.progress[t] += 1;
    out.orders = 1;
    out.notes.push(`${TYPE_NAME[t]} order ${s.progress[t]} of ${o.slots}`);
    if (s.progress[t] >= o.slots) {
      s.progress[t] = 0;
      s.ordersDone += 1;
      const extra = o.crateRewards[Math.floor(rng() * o.crateRewards.length)]!;
      p.gold += o.crateGold;
      out.gold = o.crateGold;
      give(extra.item, extra.amount);
      out.notes.push(`${TYPE_NAME[t]} order done: a Toy Crate`);
      if (!s.finished.includes(t)) s.finished.push(t);
      if (coreTypes.every((c) => s.finished.includes(c))) {
        s.finished = [];
        p.gold += o.tripleGold;
        out.gold = (out.gold ?? 0) + o.tripleGold;
        for (const r of o.crateRewards) give(r.item, r.amount);
        out.notes.push('All three orders done since the last time: a Triple Crate!');
      }
      if (s.ordersDone % o.inspectionEvery === 0) {
        s.forced = o.miniboss;
        s.rushReady = true;
        out.notes.push(`Inspection! ${name(o.miniboss)} is coming. A Rush order is now on offer.`);
      }
    }
    return out;
  }

  if (o.type === 'sleigh_run' && s.type === 'sleigh_run') {
    if (!s.active) return undefined;
    const before = s.readiness;
    s.left -= 1;
    if (imp && caught) s.readiness = Math.min(100, s.readiness + (o.gain[imp.tier] ?? 0));
    if (imp && !caught) s.readiness = Math.max(0, s.readiness - (o.loss[imp.id] ?? 0));
    if (s.readiness !== before) out.notes.push(`Readiness ${before} → ${s.readiness}`);
    if (s.readiness >= 100) {
      s.active = false;
      s.launches += 1;
      if (s.launches >= o.bossAfterLaunches) s.forced = o.boss;
      if (s.left >= 10) bump(p, 'expressLaunches');
      p.gold += o.launchGold;
      out.gold = o.launchGold;
      for (const [item, amount] of Object.entries(o.launchItems)) give(item, amount);
      out.notes.push(s.forced ? `The sleigh launches! ${name(o.boss)} attacks it.` : `The sleigh launches! Launch ${s.launches} of ${o.bossAfterLaunches} before ${name(o.boss)} shows up.`);
    } else if (s.left <= 0) {
      s.active = false;
      bump(p, 'sleighFails');
      const gold = Math.round(s.readiness * o.failGoldPerReadiness);
      p.gold += gold;
      out.gold = gold;
      out.notes.push(`Out of time at ${s.readiness} Readiness. The elves pay you for the work done.`);
    }
    return out.notes.length ? out : undefined;
  }
  return undefined;
}

export type ObjectiveAction = 'start_run' | 'abandon_run' | 'rush_order';

/** Player actions on a location's loop: start a sleigh run, or take a Rush order. */
export function objectiveAction(content: Content, player: PlayerState, action: ObjectiveAction, rng: Rng): ActionResult {
  const location = content.locations.find((l) => l.id === player.location);
  const o = location?.objective;
  if (!location || !o) return { ok: false, error: 'There is nothing to start here.' };
  const p = structuredClone(player);
  const s = objectiveState(p, location, rng);
  if (action === 'start_run' && o.type === 'sleigh_run' && s?.type === 'sleigh_run') {
    if (s.active) return { ok: false, error: 'A sleigh run is already going.' };
    if (s.forced) return { ok: false, error: 'Deal with the attack on the sleigh first.' };
    Object.assign(s, { active: true, left: o.hunts, readiness: 0 });
    return { ok: true, player: p };
  }
  if (action === 'abandon_run' && o.type === 'sleigh_run' && s?.type === 'sleigh_run') {
    if (!s.active) return { ok: false, error: 'There is no sleigh run to abandon.' };
    // Walking away pays nothing and drops the Readiness; launches already made stay.
    Object.assign(s, { active: false, left: 0, readiness: 0 });
    return { ok: true, player: p };
  }
  if (action === 'rush_order' && o.type === 'order_board' && s?.type === 'order_board') {
    if (!s.rushReady) return { ok: false, error: 'No Rush order is on offer right now.' };
    Object.assign(s, { rushReady: false, rushLeft: o.rushSlots });
    return { ok: true, player: p };
  }
  return { ok: false, error: 'You can\'t do that here.' };
}
