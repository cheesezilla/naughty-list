import { describe, expect, it } from 'vitest';
import { cheerAddPips, cheerAction, cheerAfterHunt, cheerOf, drawCards, eventAction, eventsAfterHunt, eventsOf, forceEvent, hunt, modsOf, newPlayer, seededRng, unitH, type PlayerState } from '../src/engine/index.js';
import { travel } from '../src/engine/index.js';
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

  it('Overcharge perks: second pick, longer boons, guaranteed Santa\'s Blessing', () => {
    const held = () => cheerAction(content, fresh((q) => { cheerOf(q).pips = 15; cheerOf(q).held = true; }), 'draw', seededRng(5));
    const r = held();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.player.cheer!.draw!.perks).toEqual(['second_pick', 'long', 'blessing']);
    const sp = cheerAction(content, r.player, 'perk', seededRng(5), 'second_pick');
    expect(sp.ok && sp.player.cheer!.draw!.picks).toBe(2);
    const lg = cheerAction(content, r.player, 'perk', seededRng(5), 'long');
    if (!lg.ok) throw new Error('perk failed');
    const card = lg.player.cheer!.draw!.cards[0]!;
    const picked = cheerAction(content, lg.player, 'pick', seededRng(5), card);
    const base = content.boons.find((b) => b.id === card)!.hunts;
    expect(picked.ok && picked.player.cheer!.active[0]!.hunts).toBe(Math.ceil(base * 1.5));
    const bl = cheerAction(content, r.player, 'perk', seededRng(5), 'blessing');
    expect(bl.ok && bl.player.cheer!.draw!.cards).toEqual(['santas_blessing']);
    if (!bl.ok) throw new Error('perk failed');
    const blessed = cheerAction(content, bl.player, 'pick', seededRng(5), 'santas_blessing');
    expect(blessed.ok && blessed.player.cheer!.active[0]!.hunts).toBe(content.boons.find((b) => b.id === 'santas_blessing')!.hunts * 2);
    expect(cheerAction(content, fresh((q) => { cheerOf(q).pips = 10; }), 'draw', seededRng(5)).ok).toBe(true);
  });

  it('a finished Workshop order slot adds Cheer pips', () => {
    const p = fresh((q) => { cheerOf(q).pips = 4; });
    expect(cheerAddPips(content, p, content.constants.cheer.orderPips)).toBe(content.constants.cheer.orderPips);
    expect(p.cheer!.pips).toBe(4 + content.constants.cheer.orderPips);
  });
});

describe('cheer boons by context', () => {
  it('catches fill the meter twice as fast while pushing', () => {
    const farm = fresh();
    const push = fresh((q) => { q.setup.bait = 'sugar_cookie'; });
    cheerAfterHunt(content, farm, common, true, none);
    cheerAfterHunt(content, push, common, true, none);
    expect(farm.cheer!.pips).toBe(1);
    expect(push.cheer!.pips).toBe(2);
  });
  const pickAs = (bait: string, roll: number) => {
    const p = fresh((q) => { q.setup.bait = bait; cheerOf(q).draw = { cards: ['steady_hands'], rerolls: 0, tier: 'Full', picks: 1 }; });
    const r = cheerAction(content, p, 'pick', () => roll, 'steady_hands');
    return r.ok ? r.player.cheer!.active[0]! : undefined;
  };
  it('scales luck and gold by farm or push context', () => {
    const p = fresh((q) => { cheerOf(q).active = [{ id: 'lucky_stocking', hunts: 3 }, { id: 'double_haul', hunts: 3 }]; });
    expect(modsOf(content, p).luckAdd).toBeCloseTo(3);
    expect(modsOf(content, p).goldMult).toBeCloseTo(1.5);
    p.setup.bait = 'sugar_cookie';
    expect(modsOf(content, p).luckAdd).toBeCloseTo(9);
    expect(modsOf(content, p).goldMult).toBeCloseTo(2.5);
  });
  it('a boon picked with push bait sometimes Surges and lasts longer; farming never does', () => {
    expect(pickAs('sugar_cookie', 0.05)).toEqual({ id: 'steady_hands', hunts: 10, surge: true });
    expect(pickAs('sugar_cookie', 0.9)).toEqual({ id: 'steady_hands', hunts: 5 });
    expect(pickAs('stale_cookie', 0.05)).toEqual({ id: 'steady_hands', hunts: 5 });
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
    expect(modsOf(content, p).powerMult).toBeCloseTo(1.75 * 1.15); // farming: boon bonuses count at half
    p.setup.bait = 'sugar_cookie';
    expect(modsOf(content, p).powerMult).toBeCloseTo((1 + 1.5 * 1.5) * (1 + 0.3 * 1.5)); // pushing: half again as strong
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
    const seq = [0.0, 0.99, 0.5, 0];
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

  it('a boss escape starts no event of its own', () => {
    const p = fresh((q) => { q.stats.hunts = 15; });
    expect(eventsAfterHunt(content, p, ctx(false, boss), () => 0.99)).toEqual([]);
  });

  it('an old save with a Scrinch challenge, penalties and totals still loads, minus the Scrinch parts', () => {
    const p = fresh((q) => {
      q.events = {
        grand: 0.3, lastEvent: 5, escapeImp: boss.id, escapeCount: 2, wins: 2, fails: 1, tolls: 1, boons: 4, grands: 1,
        scrinch: { id: 'soot_snatch', hunts: 2, caught: 1, run: 0 },
        buffs: [
          { stat: 'powerMult', value: 0.8, label: 'Soot: weaker power', hunts: 5 },
          { stat: 'baitCost', value: 2, label: 'Dearer bait', hunts: 5 },
          { stat: 'powerMult', value: 1.1, label: 'Warm Mittens: +10% power', hunts: 5 },
        ],
      } as never;
    });
    const ev = eventsOf(content, p);
    expect(ev).not.toHaveProperty('scrinch');
    expect(ev).not.toHaveProperty('tolls');
    expect(ev.buffs.map((b) => b.label)).toEqual(['Warm Mittens: +10% power']);
    expect(ev.grand).toBe(0.3);
    expect(ev.boons).toBe(4);
    expect(() => hunt(content, p, () => 0.5)).not.toThrow();
    expect(eventAction(content, p, 'a', seededRng(1)).ok).toBe(false); // no pending card
  });

  it('a hex buff lowers power and a Grand Gift power buff does not stack with a Cheer boon', () => {
    const p = fresh((q) => {
      eventsOf(content, q).buffs = [{ stat: 'powerMult', value: 0.75, label: 'hex', hunts: 5 }, { stat: 'powerMult', value: 1.25, label: 'heirloom', hunts: 5 }];
      cheerOf(q).active = [{ id: 'steady_hands', hunts: 3 }];
    });
    expect(modsOf(content, p).powerMult).toBeCloseTo(1.25 * 0.75); // higher of the (farm-scaled) 1.15 and 1.25, then the hex
  });

  it('is switched off by constants', () => {
    const off = { ...content, constants: { ...content.constants, events: { ...content.constants.events, enabled: false } } };
    expect(eventsAfterHunt(off, fresh((p) => { p.stats.hunts = 99; }), ctx(false, boss), () => 0)).toEqual([]);
  });
});

describe('travel resets the Cheer Meter', () => {
  const other = content.locations.find((l) => l.id !== 'cookie_pantry')!.id;
  it('drops pips, Overcharge, carry, an open draw and boons, keeping pity counters', () => {
    const p = fresh((q) => { Object.assign(cheerOf(q), { pips: 15, held: true, carry: 3, sinceRare: 4, active: [{ id: 'x', hunts: 5 }], draw: { cards: ['a'], rerolls: 0, tier: 'common' } }); q.unlocked.push(other); });
    const r = travel(content, p, other);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.player.cheer).toMatchObject({ pips: 0, held: false, carry: 0, active: [], sinceRare: 4 });
    expect(r.player.cheer!.draw).toBeUndefined();
  });
  it('staying put keeps the meter', () => {
    const p = fresh((q) => { cheerOf(q).pips = 6; });
    const r = travel(content, p, p.location);
    expect(r.ok && r.player.cheer!.pips).toBe(6);
  });
});
