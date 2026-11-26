import { describe, expect, it } from 'vitest';
import { hunt } from '../src/engine/hunt.js';
import { huntOdds } from '../src/engine/odds.js';
import { objectiveAction } from '../src/engine/objectives.js';
import { newPlayer, type PlayerState } from '../src/engine/player.js';
import { content, scripted } from './helpers.js';

const at = (location: string, setup: Partial<PlayerState['setup']> = {}, inventory: Record<string, number> = {}): PlayerState => {
  const p = newPlayer(content);
  return {
    ...p, rank: 4, points: 50_000, gold: 10_000, location,
    unlocked: content.locations.map((l) => l.id),
    setup: { ...p.setup, ...setup },
    inventory: { ...p.inventory, stale_cookie: 100, jack_in_the_box: 1, star_lantern: 1, icicle_jar: 1, ...inventory },
  };
};
const ok = (r: ReturnType<typeof hunt>) => {
  if (!r.ok) throw new Error(r.error);
  return r;
};
const encounter = (p: PlayerState, bait: string) =>
  Object.fromEntries(huntOdds(content, { ...p.setup, bait }, p.location).imps.map((o) => [o.imp.id, o.encounter]));

describe('Wrapping Room bait ladder', () => {
  it('shop bait only draws the commons', () => {
    const e = encounter(at('wrapping_room'), 'stale_cookie');
    expect(e.glitterbug).toBe(0);
    expect(e.spoolwick).toBe(0);
    expect(e.madame_shredwell).toBe(0);
  });
  it('Fruitcake cannot skip the ladder', () => {
    expect(encounter(at('wrapping_room'), 'fruitcake').madame_shredwell).toBe(0);
  });
  it('Ribbon Candy draws the rare and mini boss, and only Bonbons draw Madame Shredwell', () => {
    const candy = encounter(at('wrapping_room'), 'ribbon_candy');
    expect(candy.glitterbug).toBeCloseTo(0.3);
    expect(candy.spoolwick).toBeCloseTo(0.2);
    expect(candy.madame_shredwell).toBe(0);
    expect(encounter(at('wrapping_room'), 'golden_bow_bonbon').madame_shredwell).toBeCloseTo(0.5);
  });
});

describe('Toy Workshop order board', () => {
  // Rolls: order slots (3), attract, pick, catch, [loot...]. 0 picks Clockwork for every slot and the first imp.
  it('fills a slot only with a catch made by the matching trap type', () => {
    const r = ok(hunt(content, at('toy_workshop', { trap: 'jack_in_the_box' }), scripted(0, 0, 0, 0, 0, 0, 0.99)));
    expect(r.player.objectives?.toy_workshop).toMatchObject({ type: 'order_board', slots: ['clockwork', 'clockwork', 'clockwork'], filled: 1 });
    expect(r.entry.objective?.notes[0]).toMatch(/slot 1 of 3 filled \(Clockwork\)/);
    const wrong = ok(hunt(content, { ...r.player, setup: { ...r.player.setup, trap: 'star_lantern' } }, scripted(0, 0, 0, 0.99)));
    expect(wrong.player.objectives?.toy_workshop).toMatchObject({ filled: 1 });
  });

  it('pays a Toy Crate per order and sends the mini boss every third order, then a Rush order brings the boss', () => {
    let p = at('toy_workshop', { trap: 'jack_in_the_box' });
    const gold0 = p.gold;
    for (let i = 0; i < 9; i++) p = ok(hunt(content, p, scripted(0, 0, 0, 0, 0, 0, 0, 0, 0, 0))).player;
    const s = p.objectives?.toy_workshop;
    expect(s).toMatchObject({ ordersDone: 3, rushReady: true, forced: 'hammerhand' });
    expect(p.gold).toBeGreaterThan(gold0 + 3 * 400);
    expect(p.inventory.peppermint_bark).toBe(15);

    // The next attracted imp is Hammerhand, whatever the pick roll says.
    const inspect = ok(hunt(content, p, scripted(0, 0.5, 0.99, 0.99)));
    expect(inspect.entry.imp).toBe('hammerhand');
    expect(inspect.player.objectives?.toy_workshop?.forced).toBeUndefined();

    const rush = objectiveAction(content, inspect.player, 'rush_order', scripted(0));
    if (!rush.ok) throw new Error(rush.error);
    expect(rush.player.objectives?.toy_workshop).toMatchObject({ rush: true, rushReady: false, filled: 0 });
    expect(rush.player.objectives?.toy_workshop?.type === 'order_board' && rush.player.objectives.toy_workshop.slots).toHaveLength(5);
    let q = rush.player;
    for (let i = 0; i < 5; i++) q = ok(hunt(content, q, scripted(0, 0, 0, 0, 0, 0, 0))).player;
    expect(q.objectives?.toy_workshop).toMatchObject({ forced: 'general_grimbolt', rush: false });
    expect(ok(hunt(content, q, scripted(0, 0.1, 0.99, 0.99))).entry.imp).toBe('general_grimbolt');
  });

  it('never draws Hammerhand or General Grimbolt on their own', () => {
    const e = encounter(at('toy_workshop'), 'peppermint_bark');
    expect(e.hammerhand).toBe(0);
    expect(e.general_grimbolt).toBe(0);
  });
});

describe('Reindeer Stables sleigh run', () => {
  const start = (p: PlayerState) => {
    const r = objectiveAction(content, p, 'start_run', scripted(0));
    if (!r.ok) throw new Error(r.error);
    return r.player;
  };

  it('counts every hunt, quiet ones included, and pays for the work done when time runs out', () => {
    let p = start(at('reindeer_stables', {}, { hot_cocoa: 100 }));
    expect(objectiveAction(content, p, 'start_run', scripted(0)).ok).toBe(false);
    for (let i = 0; i < 39; i++) p = ok(hunt(content, p, scripted(0.999))).player;
    expect(p.objectives?.reindeer_stables).toMatchObject({ active: true, left: 1, readiness: 0 });
    // a common catch adds 5, then the run ends at 5 Readiness: 50 gold
    const gold = p.gold;
    const last = ok(hunt(content, p, scripted(0, 0, 0, 0.99)));
    expect(last.player.objectives?.reindeer_stables).toMatchObject({ active: false, readiness: 5 });
    expect(last.player.gold - gold).toBe(300 + 50);
  });

  it('escaped thieves take Readiness', () => {
    const p = start(at('reindeer_stables'));
    p.objectives!.reindeer_stables = { type: 'sleigh_run', active: true, left: 30, readiness: 20, launches: 0 };
    // Bell Thief is the second imp: weights 36 + 30 of 91
    const r = ok(hunt(content, p, scripted(0, 0.5, 0.999, 0.999)));
    expect(r.entry.imp).toBe('bell_thief');
    expect(r.player.objectives?.reindeer_stables).toMatchObject({ readiness: 12 });
    expect(r.entry.objective?.notes).toContain('Readiness 20 → 12');
  });

  it('launches at 100 Readiness, pays out and sends Cinderhoof', () => {
    const p = start(at('reindeer_stables'));
    p.objectives!.reindeer_stables = { type: 'sleigh_run', active: true, left: 10, readiness: 98, launches: 0 };
    const r = ok(hunt(content, p, scripted(0, 0, 0, 0.99)));
    expect(r.player.objectives?.reindeer_stables).toMatchObject({ active: false, launches: 1, forced: 'cinderhoof' });
    expect(r.player.inventory.silver_sleighbell).toBe(1);
    expect(r.entry.objective?.gold).toBe(2000);
    expect(objectiveAction(content, r.player, 'start_run', scripted(0)).ok).toBe(false);
    const boss = ok(hunt(content, r.player, scripted(0, 0, 0.999, 0.999)));
    expect(boss.entry.imp).toBe('cinderhoof');
    expect(boss.player.objectives?.reindeer_stables?.forced).toBeUndefined();
  });

  it('draws Antler Ripper only during a run from 50 Readiness, and never Cinderhoof on its own', () => {
    const p = start(at('reindeer_stables'));
    expect(encounter(p, 'hot_cocoa').antler_ripper).toBe(0);
    expect(encounter(p, 'hot_cocoa').cinderhoof).toBe(0);
    p.objectives!.reindeer_stables = { type: 'sleigh_run', active: true, left: 10, readiness: 50, launches: 0 };
    // huntOdds shows plain weights; the hunt applies the run's weights, so roll into the mini boss slot
    const r = ok(hunt(content, p, scripted(0, 0.99, 0.999, 0.999)));
    expect(r.entry.imp).toBe('antler_ripper');
  });
});
