import { describe, expect, it } from 'vitest';
import { catchChance, huntOdds, setupStats } from '../src/engine/odds.js';
import { content, withConstants } from './helpers.js';
import type { Imp, Location } from '../src/content/schema.js';

const imp = (over: Partial<Imp> = {}): Imp => ({ id: 'x', name: 'X', tier: 'common', power: 90, gold: 0, points: 0, weight: 1, ...over });

describe('catch chance', () => {
  it('matches the worked example in the plan: (170 x 1.5 + 4) / (170 x 1.5 + 90)', () => {
    const stats = { power: 170, luck: 2, attraction: 1, type: 'clockwork' };
    expect(catchChance(stats, imp({ effectiveness: { clockwork: 1.5 } }), 0.98)).toBeCloseTo((255 + 4) / (255 + 90), 6);
  });

  it('ignores luck against a neutral or resisted elf', () => {
    const stats = { power: 170, luck: 2, attraction: 1, type: 'clockwork' };
    expect(catchChance(stats, imp(), 0.98)).toBeCloseTo(170 / 260, 6);
    expect(catchChance(stats, imp({ effectiveness: { clockwork: 0.5 } }), 0.98)).toBeCloseTo(85 / 175, 6);
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
  it('encounter chances add up to 1 and Fruitcake doubles uncommon and rare odds', () => {
    const setup = { trap: 'starlit_stocking', base: 'cardboard_box', bait: 'stale_cookie', charm: null };
    // Allure is neutral here (baseline = the setup's attraction) so the weights stay plain.
    const neutral = (bait: string) => withConstants({ allure: { baseline: huntOdds(content, { ...setup, bait }, 'cookie_pantry').stats.attraction } });
    const plain = huntOdds(neutral('stale_cookie'), setup, 'cookie_pantry');
    const fruit = huntOdds(neutral('fruitcake'), { ...setup, bait: 'fruitcake' }, 'cookie_pantry');
    expect(plain.imps.reduce((s, o) => s + o.encounter, 0)).toBeCloseTo(1);
    const rare = (o: typeof plain) => o.imps.find((i) => i.imp.tier === 'rare')!.encounter;
    expect(rare(plain)).toBeCloseTo(0.05);
    // commons 70, uncommons (15 + 10) x 2, rare 5 x 2
    expect(rare(fruit)).toBeCloseTo(10 / 130);
  });
});

describe('base affinity', () => {
  const loc = content.locations[0]!;
  const stats = (trap: string, base: string) => setupStats(content, { trap, base, bait: null, charm: null }, loc);

  it('adds 10% power only when the trap type matches', () => {
    const trap = content.items.traps.find((t) => t.id === 'sleigh_bell_snapper')!; // Clockwork
    const plain = trap.power + 1300;
    expect(stats('sleigh_bell_snapper', 'sleigh_runner').power).toBeCloseTo(plain * 1.1, 6);
    expect(stats('constellation_wreath', 'sleigh_runner').power).toBe(1400 + 1300);
  });

  it('lets the Wishing Star Pedestal match Carol as well as Starlight', () => {
    expect(stats('carol_horn', 'wishing_star_pedestal').power).toBeCloseTo((600 + 300) * 1.1, 6);
  });
});
