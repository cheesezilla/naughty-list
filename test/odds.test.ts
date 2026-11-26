import { describe, expect, it } from 'vitest';
import { catchChance, huntOdds, setupStats } from '../src/engine/odds.js';
import { content } from './helpers.js';
import type { Imp, Location } from '../src/content/schema.js';

const imp = (over: Partial<Imp> = {}): Imp => ({ id: 'x', name: 'X', tier: 'common', power: 90, gold: 0, points: 0, weight: 1, ...over });

describe('catch chance', () => {
  it('matches the worked example in the plan: (170 + 4) / (170 + 90)', () => {
    const stats = { power: 170, luck: 2, attraction: 1, type: 'clockwork' };
    expect(catchChance(stats, imp(), 0.98)).toBeCloseTo(174 / 260, 6);
  });

  it('applies weakness and resistance to power', () => {
    const stats = { power: 100, luck: 0, attraction: 1, type: 'starlight' };
    expect(catchChance(stats, imp({ effectiveness: { starlight: 1.5 } }), 1)).toBeCloseTo(150 / 240);
    expect(catchChance(stats, imp({ effectiveness: { starlight: 0.5 } }), 1)).toBeCloseTo(50 / 140);
  });

  it('is zero against an immune imp, even with luck', () => {
    const stats = { power: 5000, luck: 20, attraction: 1, type: 'frost' };
    expect(catchChance(stats, imp({ effectiveness: { frost: 0 } }), 0.98)).toBe(0);
  });

  it('is capped', () => {
    const stats = { power: 1e6, luck: 50, attraction: 1, type: 'starlight' };
    expect(catchChance(stats, imp(), 0.98)).toBe(0.98);
  });
});

describe('setup stats', () => {
  const pantry = content.locations[0]!;
  const stables = content.locations.find((l) => l.id === 'reindeer_stables') as Location;

  it('adds power, luck and charm bonuses', () => {
    const s = setupStats(content, { trap: 'jack_in_the_box', base: 'gingerbread_slab', bait: 'stale_cookie', charm: 'windup_key_charm' }, pantry);
    expect(s.power).toBeCloseTo((150 + 80) * 1.2);
    expect(s.luck).toBe(2);
    expect(s.type).toBe('clockwork');
  });

  it('caps attraction and halves it in the stables without Hot Cocoa', () => {
    const base = { trap: 'icicle_jar', base: 'yule_log_base', charm: 'jingle_bell_charm' } as const;
    expect(setupStats(content, { ...base, bait: 'hot_cocoa' }, stables).attraction).toBe(0.95);
    expect(setupStats(content, { ...base, bait: 'sugar_cookie' }, stables).attraction).toBeCloseTo(0.78 * 1.3 * 0.5);
  });

  it('is zero attraction with no bait', () => {
    expect(setupStats(content, { trap: 'starlit_stocking', base: 'cardboard_box', bait: null, charm: null }, pantry).attraction).toBe(0);
  });
});

describe('hunt odds', () => {
  it('encounter chances add up to 1 and Fruitcake doubles boss odds', () => {
    const setup = { trap: 'starlit_stocking', base: 'cardboard_box', bait: 'stale_cookie', charm: null };
    const plain = huntOdds(content, setup, 'cookie_pantry');
    const fruit = huntOdds(content, { ...setup, bait: 'fruitcake' }, 'cookie_pantry');
    expect(plain.imps.reduce((s, o) => s + o.encounter, 0)).toBeCloseTo(1);
    const boss = (o: typeof plain) => o.imps.find((i) => i.imp.tier === 'boss')!.encounter;
    expect(boss(plain)).toBeCloseTo(0.01);
    expect(boss(fruit)).toBeCloseTo(2 / 109);
  });
});
