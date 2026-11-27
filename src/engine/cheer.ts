import type { Boon, Content, Imp } from '../content/schema.js';
import { gameData, itemOfKind } from './data.js';
import type { Mods } from './mods.js';
import type { ActionResult, PlayerState } from './player.js';
import { pickWeighted, type Rng } from './rng.js';

/** The Cheer Meter, saved per player. Created on first use; a Start over wipes it with the rest of the save. */
export interface CheerState {
  pips: number;
  /** Holding the charge past 10 pips (Overcharge): better draw odds, harsher escapes. */
  held: boolean;
  /** Pips from the catch that filled the meter, kept for the next meter. */
  carry: number;
  /** Boons in play, with hunts left. */
  active: { id: string; hunts: number }[];
  /** Draws since one showed a rare or better / a legendary, for the pity rules. */
  sinceRare: number;
  sinceLegendary: number;
  /** The boon picked last time cannot appear in the next draw. */
  lastPicked?: string;
  /** An open draw: the cards are saved until one is picked. */
  draw?: { cards: string[]; rerolls: number; tier: string; picks?: number; perks?: string[]; longer?: boolean };
}

export const cheerOf = (p: PlayerState): CheerState =>
  (p.cheer ??= { pips: 0, held: false, carry: 0, active: [], sinceRare: 0, sinceLegendary: 0 });

export type CheerAction = 'draw' | 'hold' | 'reroll' | 'pick' | 'perk';

/** What the meter did on one hunt, for the hunt log. */
export interface CheerNote { gained: number; lost: number; pips: number; full?: boolean }

const isBig = (imp: Imp) => imp.tier === 'rare' || imp.tier === 'miniboss' || imp.tier === 'boss';

/** The draw table row for a meter with this many pips. */
export function drawTier(content: Content, pips: number) {
  const rows = content.constants.cheer.tiers;
  let row = rows[0]!;
  for (const r of rows) if (pips >= r.from) row = r;
  return row;
}

/** Updates the meter after a hunt. Returns what changed, or undefined when the meter is off. */
export function cheerAfterHunt(content: Content, p: PlayerState, imp: Imp, caught: boolean, mods: Mods): CheerNote | undefined {
  const c = content.constants.cheer;
  if (!c.enabled) return undefined;
  const s = cheerOf(p);
  const charm = itemOfKind(gameData(content), p.setup.charm, 'charm')?.cheer;
  const before = s.pips;
  // A full meter waits for a cash-in; an open draw waits for a pick. Neither fills or drains.
  const locked = !!s.draw || (s.pips >= c.full && !s.held);
  let gained = 0, lost = 0;
  if (caught) {
    if (!locked) {
      // A Cheer charm adds at most one pip; Cheer Surge doubles the total.
      const add = Math.min(1, Math.max(charm?.all ?? 0, isBig(imp) ? charm?.rare ?? 0 : 0));
      const total = s.pips + ((isBig(imp) ? c.bigCatchPips : c.catchPips) + add) * mods.pipMult;
      s.pips = Math.min(s.held ? c.max : c.full, total);
      if (!s.held && total > c.full) s.carry += total - c.full;
      gained = s.pips - before;
    }
  } else if (!locked && !mods.freeEscape) {
    const cost = Math.max(0, (s.held ? c.heldEscapePips : c.escapePips) - (charm?.escape ?? 0));
    s.pips = Math.max(0, s.pips - cost);
    lost = before - s.pips;
    if (s.pips < c.full) s.held = false;
  }
  return { gained, lost, pips: s.pips, ...(s.pips >= c.full ? { full: true } : {}) };
}

/** Counts down every boon after a hunt and drops the ones that ran out. */
export function tickBoons(p: PlayerState): void {
  if (!p.cheer) return;
  for (const a of p.cheer.active) a.hunts -= 1;
  p.cheer.active = p.cheer.active.filter((a) => a.hunts > 0);
}

/** Boons that can be drawn right now: Boss Bell needs a mini boss or boss in the current location. */
function eligible(content: Content, p: PlayerState): Boon[] {
  const loc = gameData(content).locations.get(p.location);
  const hasBoss = !!loc?.imps.some((i) => i.tier === 'miniboss' || i.tier === 'boss');
  return content.boons.filter((b) => b.id !== p.cheer?.lastPicked && (!b.effect.bossBell || hasBoss));
}

/** Draws the cards for the meter's current pips, with the pity rules, and updates the pity counters on `p`. */
export function drawCards(content: Content, p: PlayerState, rng: Rng): { cards: string[]; rerolls: number; tier: string; picks: number; perks: string[] } {
  const c = content.constants.cheer;
  const s = cheerOf(p);
  const tier = drawTier(content, s.pips);
  const pool = eligible(content, p);
  const cards: Boon[] = [];
  type Rarity = Boon['rarity'];
  const pickOf = (rarities: Rarity[], weights: number[]): Boon | undefined => {
    const open = rarities.map((r) => pool.filter((b) => b.rarity === r && !cards.includes(b)));
    const i = pickWeighted(open.map((list, k) => (list.length ? weights[k]! : 0)), rng);
    if (i < 0) return undefined;
    const list = open[i]!;
    return list[Math.floor(rng() * list.length)];
  };
  const w = [tier.weights.common, tier.weights.rare, tier.weights.legendary];
  const forceLegendary = s.sinceLegendary >= c.pity.legendary;
  const forceRare = s.sinceRare >= c.pity.rare;
  for (let i = 0; i < tier.cards; i++) {
    let b: Boon | undefined;
    if (i === 0 && forceLegendary) b = pickOf(['legendary'], [1]);
    else if (i === 0 && forceRare) b = pickOf(['rare', 'legendary'], [w[1]!, w[2]!]);
    b ??= pickOf(['common', 'rare', 'legendary'], w);
    b ??= pool.find((x) => !cards.includes(x));
    if (b) cards.push(b);
  }
  if (cards.some((b) => b.rarity !== 'common')) s.sinceRare = 0; else s.sinceRare += 1;
  if (cards.some((b) => b.rarity === 'legendary')) s.sinceLegendary = 0; else s.sinceLegendary += 1;
  return { cards: cards.map((b) => b.id), rerolls: tier.rerolls, tier: tier.name, picks: Math.min(tier.picks ?? 1, cards.length), perks: [...(tier.perks ?? [])] };
}

/**
 * Meter actions: `draw` (cash in: open the cards), `hold` (Overcharge: keep filling to the max),
 * `reroll` (Blazing only: redraw once) and `pick` (choose a boon from the open draw).
 */
export function cheerAction(content: Content, player: PlayerState, action: CheerAction, rng: Rng, boonId?: string): ActionResult {
  const c = content.constants.cheer;
  if (!c.enabled) return { ok: false, error: 'The Cheer Meter is switched off.' };
  const p = structuredClone(player);
  const s = cheerOf(p);
  switch (action) {
    case 'draw':
      if (s.draw) return { ok: true, player: p };
      if (s.pips < c.full) return { ok: false, error: `The meter needs ${c.full} pips to cash in.` };
      s.draw = drawCards(content, p, rng);
      return { ok: true, player: p };
    case 'hold':
      if (s.draw) return { ok: false, error: 'Pick a boon first.' };
      if (s.pips < c.full) return { ok: false, error: `The meter needs ${c.full} pips to hold the charge.` };
      s.held = true;
      return { ok: true, player: p };
    case 'reroll': {
      if (!s.draw || s.draw.rerolls < 1) return { ok: false, error: 'There is no reroll to use.' };
      const rerolls = s.draw.rerolls - 1;
      s.draw = { ...drawCards(content, p, rng), rerolls };
      return { ok: true, player: p };
    }
    case 'perk': {
      // Overcharge: before picking, trade the draw for one perk (once).
      if (!s.draw || !s.draw.perks?.includes(boonId ?? '')) return { ok: false, error: 'There is no such perk on this draw.' };
      if (boonId === 'second_pick') {
        const more = drawCards(content, p, rng).cards.filter((id) => !s.draw!.cards.includes(id));
        s.draw = { ...s.draw, cards: [...s.draw.cards, ...more], picks: 2, perks: [] };
        s.draw.picks = Math.min(2, s.draw.cards.length);
      } else if (boonId === 'long') {
        s.draw = { ...s.draw, longer: true, perks: [] };
      } else {
        const bless = content.boons.find((b) => b.id === 'santas_blessing');
        if (!bless) return { ok: false, error: 'Santa has no blessing to give.' };
        s.draw = { ...s.draw, cards: [bless.id], picks: 1, perks: [] };
      }
      return { ok: true, player: p };
    }
    case 'pick': {
      if (!s.draw) return { ok: false, error: 'There is no draw open.' };
      const boon = content.boons.find((b) => b.id === boonId);
      if (!boon || !s.draw.cards.includes(boon.id)) return { ok: false, error: 'Pick one of the cards on offer.' };
      const hunts = s.draw.longer ? Math.ceil(boon.hunts * (1 + c.longBoons)) : boon.hunts;
      const have = s.active.find((a) => a.id === boon.id);
      if (have) have.hunts = hunts; else s.active.push({ id: boon.id, hunts });
      s.lastPicked = boon.id;
      if ((s.draw.picks ?? 1) > 1) {
        // Overcharge: keep picking from what is left.
        s.draw = { ...s.draw, cards: s.draw.cards.filter((x) => x !== boon.id), picks: (s.draw.picks ?? 1) - 1 };
        return { ok: true, player: p };
      }
      s.draw = undefined;
      s.held = false;
      s.pips = Math.min(c.full - 1, s.carry);
      s.carry = 0;
      return { ok: true, player: p };
    }
  }
}

/** Admin tool: fills the meter to the top and holds it. */
export function cheerFill(content: Content, player: PlayerState): PlayerState {
  const p = structuredClone(player);
  const s = cheerOf(p);
  s.pips = content.constants.cheer.max;
  s.held = true;
  s.draw = undefined;
  return p;
}

/** Adds pips from outside a catch (a finished Workshop order slot). Same rules as a catch: a full meter or an open draw waits. */
export function cheerAddPips(content: Content, p: PlayerState, n: number): number {
  const c = content.constants.cheer;
  if (!c.enabled || n <= 0) return 0;
  const s = cheerOf(p);
  if (s.draw || (s.pips >= c.full && !s.held)) return 0;
  const before = s.pips;
  const total = s.pips + n;
  s.pips = Math.min(s.held ? c.max : c.full, total);
  if (!s.held && total > c.full) s.carry += total - c.full;
  return s.pips - before;
}
