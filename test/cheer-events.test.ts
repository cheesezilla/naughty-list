import { describe, expect, it } from 'vitest';
import { cheerAddPips, cheerAction, cheerAfterHunt, cheerOf, drawCards, eventAction, eventsAfterHunt, eventsOf, forceEvent, hunt, modsOf, newPlayer, seededRng, tollGold, unitH, type PlayerState } from '../src/engine/index.js';
import { content } from './helpers.js';

const pantry = content.locations.find((l) => l.id === 'cookie_pantry')!;
const common = pantry.imps.find((i) => i.tier === 'common')!;
const boss = content.locations.flatMap((l) => l.imps).find((i) => i.tier === 'boss')!;
const rare = pantry.imps.find((i) => i.tier === 'rare')!;
const none = modsOf(content, newPlayer(content));

function fresh(patch: (p: PlayerState) => void = () => {}): PlayerState {
  const p = newPlayer(content);
  patch(p);
  return p;
}

describe('cheer meter extras', () => {
  it('an Overcharged draw offers two rare-or-better boons and you pick one', () => {
    const p = fresh((q) => { cheerOf(q).pips = 15; cheerOf(q).held = true; });
    const r = cheerAction(content, p, 'draw', seededRng(3));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const draw = r.player.cheer!.draw!;
    expect(draw.cards).toHaveLength(2);
    expect(draw.picks).toBe(1);
    expect(draw.cards.every((id) => content.boons.find((b) => b.id === id)!.rarity !== 'common')).toBe(true);
    const done = cheerAction(content, r.player, 'pick', seededRng(3), draw.cards[0]);
    expect(done.ok && done.player.cheer!.draw).toBeUndefined();
    expect(done.ok && done.player.cheer!.active).toHaveLength(1);
  });

  it('a finished Workshop order slot adds Cheer pips', () => {
    const p = fresh((q) => { cheerOf(q).pips = 4; });
    expect(cheerAddPips(content, p, content.constants.cheer.orderPips)).toBe(content.constants.cheer.orderPips);
    expect(p.cheer!.pips).toBe(4 + content.constants.cheer.orderPips);
  });
});

describe('cheer meter', () => {
  it('fills +1 per catch, +2 for a rare, drains 3 on an escape and stops at full', () => {
    const p = fresh();
    cheerAfterHunt(content, p, common, true, none);
    cheerAfterHunt(content, p, rare, true, none);
    expect(p.cheer!.pips).toBe(3);
    cheerAfterHunt(content, p, common, false, none);
    expect(p.cheer!.pips).toBe(0);
    for (let i = 0; i < 12; i++) cheerAfterHunt(content, p, common, true, none);
    expect(p.cheer!.pips).toBe(10);
    cheerAfterHunt(content, p, common, false, none);
    expect(p.cheer!.pips).toBe(10); // a full meter waits for a cash-in
  });

  it('carries the overflow of the filling catch into the next meter', () => {
    const p = fresh((q) => { cheerOf(q).pips = 9; });
    cheerAfterHunt(content, p, rare, true, none);
    expect(p.cheer).toMatchObject({ pips: 10, carry: 1 });
    const r = cheerAction(content, p, 'draw', seededRng(1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pick = r.player.cheer!.draw!.cards[0]!;
    const done = cheerAction(content, r.player, 'pick', seededRng(1), pick);
    expect(done.ok && done.player.cheer).toMatchObject({ pips: 1, carry: 0, held: false });
  });

  it('Overcharge fills to 15, escapes cost 5, and 15 pips give 2 rare-or-better cards and a reroll', () => {
    const p = fresh((q) => { cheerOf(q).pips = 10; });
    const held = cheerAction(content, p, 'hold', seededRng(1));
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    for (let i = 0; i < 4; i++) cheerAfterHunt(content, held.player, rare, true, none);
    expect(held.player.cheer!.pips).toBe(15);
    const d = cheerAction(content, held.player, 'draw', seededRng(2));
    expect(d.ok && d.player.cheer!.draw).toMatchObject({ tier: 'Blazing', rerolls: 1 });
    expect(d.ok && d.player.cheer!.draw!.cards).toHaveLength(2);
    const e = structuredClone(held.player);
    cheerAfterHunt(content, e, common, false, none);
    expect(e.cheer!.pips).toBe(10);
  });

  it('draws different boons, never the last pick, and forces a rare after 3 draws without one', () => {
    const p = fresh((q) => { Object.assign(cheerOf(q), { pips: 10, sinceRare: 3, lastPicked: 'steady_hands' }); });
    for (let seed = 1; seed < 30; seed++) {
      const q = structuredClone(p);
      const d = drawCards(content, q, seededRng(seed));
      expect(new Set(d.cards).size).toBe(3);
      expect(d.cards).not.toContain('steady_hands');
      expect(d.cards.some((id) => content.boons.find((b) => b.id === id)!.rarity !== 'common')).toBe(true);
    }
  });

  it('boons change the hunt: Double Haul, Free Bait and a shorter life', () => {
    const p = fresh((q) => { cheerOf(q).active = [{ id: 'double_haul', hunts: 2 }, { id: 'free_bait', hunts: 1 }]; });
    const baits = p.inventory.stale_cookie!;
    const r = hunt(content, p, () => 0);
    expect(r.ok && r.entry.outcome).toBe('catch');
    if (!r.ok) return;
    expect(r.player.inventory.stale_cookie).toBe(baits); // free bait
    expect(r.entry.gold).toBe(Math.round(r.entry.gold)); // doubled whole gold
    expect(r.player.cheer!.active).toEqual([{ id: 'double_haul', hunts: 1 }]);
  });

  it('Santa\'s Blessing multiplies trap power by 2.5 and Boss Bell meets the boss', () => {
    const p = fresh((q) => { cheerOf(q).active = [{ id: 'santas_blessing', hunts: 3 }, { id: 'steady_hands', hunts: 3 }]; });
    expect(modsOf(content, p).powerMult).toBeCloseTo(3.25);
    const q = fresh((s) => { s.location = 'toy_workshop'; cheerOf(s).active = [{ id: 'boss_bell', hunts: 1 }]; });
    const r = hunt(content, q, () => 0.99);
    expect(r.ok && r.entry.imp).toBe(content.locations.find((l) => l.id === 'toy_workshop')!.imps.find((i) => i.tier === 'boss')!.id);
  });

  it('Mulligan rerolls an escape once', () => {
    const p = fresh((q) => { cheerOf(q).active = [{ id: 'mulligan', hunts: 2 }]; });
    const seq = [0, 0.99, 0]; // imp pick, first roll escapes, second roll catches
    let i = 0;
    const r = hunt(content, p, () => seq[Math.min(i++, seq.length - 1)]!);
    expect(r.ok && r.entry.outcome).toBe('catch');
    expect(r.ok && r.entry.mulligan).toBe(true);
  });

  it('is switched off by constants', () => {
    const off = { ...content, constants: { ...content.constants, cheer: { ...content.constants.cheer, enabled: false } } };
    const r = hunt(off, newPlayer(off), () => 0);
    expect(r.ok && r.entry.cheer).toBeUndefined();
  });
});

describe('events', () => {
  const ctx = (caught: boolean, imp = common) => ({ imp, caught, trapType: 'starlight' });

  it('rolls nothing in the first 30 hunts and offers a boon card afterwards', () => {
    const early = fresh((p) => { p.stats.hunts = 29; });
    expect(eventsAfterHunt(content, early, ctx(true), () => 0)).toEqual([]);
    const late = fresh((p) => { p.stats.hunts = 30; });
    // roll 0.0 < 2.5%, then 0.0 < 40% share starts Scrinch; use 0.5 for the share to get a boon
    const seq = [0.0, 0.5, 0.99, 0];
    let i = 0;
    const notes = eventsAfterHunt(content, late, ctx(true), () => seq[Math.min(i++, seq.length - 1)]!);
    expect(notes[0]!.type).toBe('boon');
    expect(late.events!.pending).toBeTruthy();
    expect(late.events!.grand).toBeCloseTo(0.15);
  });

  it('answering a boon gives the gift, and a Grand Gift resets the favour', () => {
    const p = fresh((q) => { eventsOf(content, q).pending = { id: 'cookie_tin' }; });
    const r = eventAction(content, p, 'a', seededRng(1));
    expect(r.ok && r.player.gold).toBe(p.gold + Math.round(8 * unitH(content, 'cookie_pantry')));
    const g = forceEvent(content, fresh((q) => { eventsOf(content, q).grand = 0.6; }), 'grand', seededRng(3));
    expect(g.note!.type).toBe('grand');
    expect(g.player.events!.grand).toBeCloseTo(0.1);
  });

  it('a boss escape can start a Scrinch grudge, but not after two in a row', () => {
    const p = fresh((q) => { q.stats.hunts = 15; });
    expect(eventsAfterHunt(content, p, ctx(false, boss), () => 0)[0]!.type).toBe('scrinch');
    const q = fresh((s) => { s.stats.hunts = 50; Object.assign(eventsOf(content, s), { escapeImp: boss.id, escapeCount: 2 }); });
    expect(eventsAfterHunt(content, q, ctx(false, boss), () => 0.99)).toEqual([]);
    expect(q.events!.escapeCount).toBe(3);
    const r = fresh((s) => { s.stats.hunts = 20; Object.assign(eventsOf(content, s), { escapeImp: boss.id, escapeCount: 2 }); });
    expect(eventsAfterHunt(content, r, ctx(false, boss), () => 0)).toEqual([]); // third escape: grudge skipped
  });

  it('beating a Scrinch challenge pays the prize and raises the favour; failing it applies the threat', () => {
    const win = fresh((q) => { q.stats.hunts = 40; eventsOf(content, q).scrinch = { id: 'soot_snatch', hunts: 0, caught: 0, run: 0 }; });
    const all = (p: PlayerState, caught: boolean, n: number) => Array.from({ length: n }, () => eventsAfterHunt(content, p, ctx(caught), () => 0.99)).flat();
    let notes = all(win, true, 5);
    expect(notes[0]!.type).toBe('scrinch_win');
    expect(win.events!.scrinch).toBeUndefined();
    expect(win.events!.grand).toBeCloseTo(0.25);

    const lose = fresh((q) => { q.gold = 1000; q.stats.hunts = 40; eventsOf(content, q).scrinch = { id: 'soot_snatch', hunts: 0, caught: 0, run: 0 }; });
    notes = all(lose, false, 8);
    expect(notes[0]!.type).toBe('scrinch_fail');
    expect(lose.gold).toBeLessThan(1000);
    expect(lose.gold).toBeGreaterThanOrEqual(content.constants.pillage.goldFloor);
  });

  it('the skip toll costs gold, cancels the challenge and needs enough gold', () => {
    const p = fresh((q) => { q.gold = 500; eventsOf(content, q).scrinch = { id: 'bait_bandits', hunts: 2, caught: 0, run: 0 }; });
    const toll = tollGold(content, p, 'bait_bandits');
    const r = eventAction(content, p, 'toll', seededRng(1));
    expect(r.ok && r.player.gold).toBe(500 - toll);
    expect(r.ok && r.player.events!.scrinch).toBeUndefined();
    expect(eventAction(content, { ...p, gold: 0 }, 'toll', seededRng(1)).ok).toBe(false);
  });

  it('a hex buff lowers power and a Grand Gift power buff does not stack with a Cheer boon', () => {
    const p = fresh((q) => {
      eventsOf(content, q).buffs = [{ stat: 'powerMult', value: 0.75, label: 'hex', hunts: 5 }, { stat: 'powerMult', value: 1.25, label: 'heirloom', hunts: 5 }];
      cheerOf(q).active = [{ id: 'steady_hands', hunts: 3 }];
    });
    expect(modsOf(content, p).powerMult).toBeCloseTo(1.3 * 0.75); // higher of 1.3 and 1.25, then the hex
  });

  it('is switched off by constants', () => {
    const off = { ...content, constants: { ...content.constants, events: { ...content.constants.events, enabled: false } } };
    expect(eventsAfterHunt(off, fresh((p) => { p.stats.hunts = 99; }), ctx(false, boss), () => 0)).toEqual([]);
  });
});
