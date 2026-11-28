import { describe, expect, it } from 'vitest';
import { hunt, rollPillage } from '../src/engine/hunt.js';
import { newPlayer, buy, sell, craft, equip, travel, grantKeys, keyNeeded, type PlayerState } from '../src/engine/player.js';
import { seededRng } from '../src/engine/rng.js';
import { catchChance, effectiveness, huntOdds, luckFactor } from '../src/engine/odds.js';
import { content, scripted, withConstants } from './helpers.js';

const fresh = () => newPlayer(content);
const fresh300 = () => ({ ...fresh(), gold: 300 });

describe('hunt', () => {
  it('every hunt meets an elf and uses bait: there are no quiet hunts', () => {
    const r = hunt(content, fresh(), scripted(0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.outcome).not.toBe('quiet');
    expect(r.entry.imp).toBeDefined();
    expect(r.player.inventory.stale_cookie).toBe(99);
    expect(r.player.stats.hunts).toBe(1);
  });

  it('allure scales rare, mini boss and boss odds by attraction / baseline, and leaves commons alone', () => {
    const setup = { trap: 'starlit_stocking', base: 'cardboard_box', bait: 'stale_cookie', charm: null };
    const loc = 'cookie_pantry';
    const a = huntOdds(content, setup, loc).stats.attraction;
    const neutral = huntOdds(withConstants({ allure: { baseline: a } }), setup, loc);
    const strong = huntOdds(withConstants({ allure: { baseline: a / 2 } }), setup, loc);
    const rare = (o: typeof neutral) => o.imps.find((i) => i.imp.tier === 'rare')!.encounter;
    const common = (o: typeof neutral) => o.imps.find((i) => i.imp.tier === 'common')!.encounter;
    expect(rare(strong)).toBeGreaterThan(rare(neutral));
    expect(common(strong)).toBeLessThan(common(neutral));
  });

  it('catches: pays gold and points and uses one bait', () => {
    // pick first imp (0), catch (0), no loot needed
    const r = hunt(content, fresh(), scripted(0, 0, 0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry).toMatchObject({ outcome: 'catch', imp: 'crumb_elf', gold: 16, points: 27, baitUsed: 1 });
    expect(r.player.gold).toBe(216);
    expect(r.player.points).toBe(27);
    expect(r.player.catches.crumb_elf).toBe(1);
    expect(r.player.inventory.stale_cookie).toBe(99);
  });

  it('escapes: pays nothing and still uses bait', () => {
    const r = hunt(content, fresh(), scripted(0, 0.999));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.outcome).toBe('escape');
    expect(r.player.gold).toBe(200);
    expect(r.player.inventory.stale_cookie).toBe(99);
  });

  it('bait-stealing imps always pillage one bait when they escape', () => {
    // Jarbelly sits after weights 40+30+15 = 85 of 100
    const r = hunt(content, fresh(), scripted(0.9, 0.999));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.imp).toBe('jarbelly');
    expect(r.entry.baitUsed).toBe(1);
    expect(r.entry.pillage).toEqual({ gold: 0, points: 0, bait: { item: 'stale_cookie', amount: 1 } });
    expect(r.player.inventory.stale_cookie).toBe(98);
    expect(r.player.stats.pillaged).toBe(1);
  });

  it('ranks up when points pass a threshold', () => {
    const p: PlayerState = { ...fresh(), points: 2490 };
    const r = hunt(content, p, scripted(0, 0, 0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.rankUp).toBe(2);
    expect(r.player.rank).toBe(2);
  });

  it('refuses to hunt with no bait when the player can afford some', () => {
    const p = fresh();
    delete p.inventory.stale_cookie;
    expect(hunt(content, p, scripted(0)).ok).toBe(false);
  });

  it("gives free cookies to a broke player so nobody gets stuck", () => {
    const p = { ...fresh(), gold: 10 };
    delete p.inventory.stale_cookie;
    const r = hunt(content, p, scripted(0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.rescued).toBe(true);
    expect(r.player.inventory.stale_cookie).toBe(9);
  });

  it("the wrong area's bait is used up and the catch always fails", () => {
    const p = { ...fresh(), location: 'wrapping_room', unlocked: ['cookie_pantry', 'wrapping_room'], rank: 2 };
    const r = hunt(content, p, scripted(0, 0, 0, 0));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.outcome).toBe('escape');
    expect(r.entry.wrongBait).toBe(true);
    expect(r.entry.catchChance).toBe(0);
    expect(r.player.inventory.stale_cookie).toBe(99);
  });

  it("a stranded player's free bait is the cheapest that works in the area they are in", () => {
    const p = { ...fresh(), gold: 10, location: 'toy_workshop', unlocked: ['cookie_pantry', 'toy_workshop'], rank: 3 };
    delete p.inventory.stale_cookie;
    const r = hunt(content, p, scripted(0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.rescued).toBe(true);
    expect(r.player.setup.bait).toBe('peppermint_bark');
  });

  it('uses and then unequips a charm when the last one is spent', () => {
    const p = fresh();
    p.inventory.mistletoe_charm = 1;
    p.setup.charm = 'mistletoe_charm';
    const r = hunt(content, p, scripted(0, 0, 0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.charmUsed).toBe(true);
    expect(r.player.setup.charm).toBeNull();
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const rng = seededRng(seed);
      let p = fresh();
      for (let i = 0; i < 50; i++) {
        const r = hunt(content, p, rng);
        if (!r.ok) throw new Error(r.error);
        p = r.player;
      }
      return p;
    };
    expect(run(7)).toEqual(run(7));
  });

  it('stamina is off by default and limits hunts when switched on', () => {
    expect(content.constants.stamina.enabled).toBe(false);
    const on = withConstants({ stamina: { ...content.constants.stamina, enabled: true, max: 2 } });
    let p = newPlayer(on, 0);
    for (let i = 0; i < 2; i++) {
      const r = hunt(on, p, scripted(0.99), 0);
      if (!r.ok) throw new Error(r.error);
      p = r.player;
    }
    expect(hunt(on, p, scripted(0.99), 0).ok).toBe(false);
    expect(hunt(on, p, scripted(0.99), 60_000).ok).toBe(true);
  });
});

describe('shop, crafting and travel', () => {
  it('buys and sells', () => {
    const b = buy(content, fresh300(), 'jack_in_the_box');
    if (!b.ok) throw new Error(b.error);
    expect(b.player.gold).toBe(0);
    expect(buy(content, b.player, 'jack_in_the_box').ok).toBe(false);
    const s = sell(content, b.player, 'jack_in_the_box');
    if (!s.ok) throw new Error(s.error);
    expect(s.player.gold).toBe(120);
  });

  it('enforces rank on purchases and travel', () => {
    expect(buy(content, { ...fresh(), gold: 1e6 }, 'star_lantern').ok).toBe(false);
    expect(travel(content, { ...fresh(), gold: 1e6 }, 'wrapping_room').ok).toBe(false);
    const t = travel(content, { ...fresh300(), rank: 2 }, 'wrapping_room'); // the Pantry has no boss, so no key
    if (!t.ok) throw new Error(t.error);
    expect(t.player.gold).toBe(50);
    expect(t.player.unlocked).toContain('wrapping_room');
  });

  it('crafts Fruitcake from boss and common loot', () => {
    const p = { ...fresh300(), rank: 2, inventory: { ...fresh().inventory, candied_peel: 3, cookie_tin: 1 } };
    const r = craft(content, p, 'fruitcake_x5');
    if (!r.ok) throw new Error(r.error);
    expect(r.player.inventory.fruitcake).toBe(5);
    expect(r.player.inventory.candied_peel).toBeUndefined();
    expect(r.player.gold).toBe(200);
  });

  it("won't craft away an equipped trap", () => {
    const p = { ...fresh(), rank: 4, gold: 1e6, inventory: { silver_sleighbell: 3, clockwork_heart: 1, nutcracker_jaws: 1, cardboard_box: 1 } };
    p.setup = { ...p.setup, trap: 'nutcracker_jaws' };
    expect(craft(content, p, 'sleigh_bell_snapper').ok).toBe(false);
  });

  it('equips only owned items of the right kind', () => {
    expect(equip(content, fresh(), 'trap', 'jack_in_the_box').ok).toBe(false);
    expect(equip(content, fresh(), 'trap', 'cardboard_box').ok).toBe(false);
    expect(equip(content, fresh(), 'charm', null).ok).toBe(true);
  });
});

describe('pillage on escape', () => {
  const imp = (id: string) => content.locations.flatMap((l) => l.imps).find((i) => i.id === id)!;
  const rich = (): PlayerState => ({ ...newPlayer(content), gold: 6000, points: 60000, rank: 4, inventory: { stale_cookie: 20 } });

  it('a boss that pillages takes gold, bait and points', () => {
    const p = rich();
    // chance roll 0 (hit), three picks, then the bait amount roll (0.99 -> the most, 5)
    const out = rollPillage(content, p, imp('madame_shredwell'), 'stale_cookie', scripted(0, 0, 0, 0, 0.99));
    // 8% of 6,000 = 480 (cap 15 x 300); 2% of 60,000 = 1,200 (cap 3 x 550 = 1,650)
    expect(out).toEqual({ gold: 480, points: 1200, bait: { item: 'stale_cookie', amount: 5 } });
    expect(p.gold).toBe(5520);
    expect(p.points).toBe(58800);
    expect(p.inventory.stale_cookie).toBe(15);
  });

  it('misses the roll most of the time for common imps', () => {
    const p = rich();
    expect(rollPillage(content, p, imp('crumb_elf'), 'stale_cookie', scripted(0.5))).toBeUndefined();
    expect(p.gold).toBe(6000);
  });

  it('never takes gold below the floor or points below the rank threshold', () => {
    const p: PlayerState = { ...rich(), gold: 105, points: 46_100, inventory: {} };
    const out = rollPillage(content, p, imp('madame_shredwell'), 'stale_cookie', scripted(0));
    expect(p.gold).toBe(100);
    expect(p.points).toBe(46_000); // rank 4 starts at 46,000
    expect(out).toMatchObject({ gold: 5, points: 100, safe: ['bait'] });
  });

  it('a rank 1 player keeps their points', () => {
    const p: PlayerState = { ...newPlayer(content), points: 2000, gold: 5000 };
    const out = rollPillage(content, p, imp('madame_shredwell'), 'stale_cookie', scripted(0));
    expect(p.points).toBe(2000);
    expect(out?.safe).toContain('points');
  });

  it('thieves often find no bait: crafted bait is saved most of the time', () => {
    const roll = (bait: string, saveRoll: number) => {
      const p = { ...rich(), inventory: { stale_cookie: 20, ribbon_candy: 20 } };
      return rollPillage(content, p, imp('jarbelly'), bait, scripted(0, 0, 0, saveRoll))!;
    };
    expect(roll('stale_cookie', 0.6).bait).toBeDefined();
    expect(roll('stale_cookie', 0.4).bait).toBeUndefined();
    expect(roll('ribbon_candy', 0.6).bait).toBeUndefined();
    expect(roll('ribbon_candy', 0.9).bait).toBeDefined();
  });

  it('a mini boss takes two kinds', () => {
    const p = rich();
    const out = rollPillage(content, p, imp('spoolwick'), 'stale_cookie', scripted(0, 0, 0, 0, 0.99))!;
    const kinds = [out.gold > 0, !!out.bait, out.points > 0].filter(Boolean).length;
    expect(kinds).toBe(2);
  });
});

describe('boss keys', () => {
  it('needs the previous boss key (not just rank and gold) to unlock a location', () => {
    const rich = { ...fresh(), rank: 4, gold: 1e6 };
    const blocked = travel(content, rich, 'toy_workshop');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/Gift-Tag Key/);
    expect(travel(content, { ...rich, keys: ['gift_tag_key'] }, 'toy_workshop').ok).toBe(true);
    // Already-unlocked rooms stay open without the key.
    expect(travel(content, { ...rich, unlocked: ['cookie_pantry', 'toy_workshop'] }, 'toy_workshop').ok).toBe(true);
  });

  it('still needs the minimum rank of the next area even with the key', () => {
    const early = { ...fresh(), rank: 3, gold: 1e6, keys: ['gift_tag_key', 'cog_key'] };
    const r = travel(content, early, 'reindeer_stables');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/needs rank Frost Warden.*even with the boss key/);
    expect(travel(content, { ...early, rank: 4, unlocked: [...early.unlocked, 'toy_workshop'] }, 'reindeer_stables').ok).toBe(true);
  });

  it('drops the key on the first catch of the local boss only', () => {
    const p: PlayerState = { ...fresh(), location: 'wrapping_room', rank: 2, gold: 1e6 };
    p.inventory.golden_bow_bonbon = 5000; // the boss only shows for the top bait
    p.setup.bait = 'golden_bow_bonbon';
    const rng = seededRng(3);
    let first: string | undefined;
    let cur = p;
    for (let i = 0; i < 3000 && !first; i++) {
      const r = hunt(content, cur, rng, 0, { reward: 1, odds: true });
      if (!r.ok) throw new Error(r.error);
      cur = r.player;
      if (r.entry.imp === 'madame_shredwell' && r.entry.outcome === 'catch') first = r.entry.key;
    }
    expect(first).toBe('gift_tag_key');
    expect(cur.keys).toEqual(['gift_tag_key']);
  });

  it('admin always-catch catches immune bosses too', () => {
    const p: PlayerState = { ...fresh(), location: 'reindeer_stables', rank: 4, gold: 1e6 };
    p.setup.trap = 'star_lantern';
    p.inventory.star_lantern = 1;
    p.inventory.ribbon_candy = 5000;
    p.setup.bait = 'ribbon_candy';
    const cinder = content.locations.find((l) => l.id === 'reindeer_stables')!.imps.find((i) => i.id === 'cinderhoof')!;
    expect((cinder.effectiveness as Record<string, number>).starlight).toBe(0);
    const rng = seededRng(7);
    let cur = p;
    let bosses = 0;
    for (let i = 0; i < 400; i++) {
      cur.objectives = { reindeer_stables: { type: 'sleigh_run', active: true, readiness: 40, forced: 'cinderhoof' } } as never;
      const r = hunt(content, cur, rng, 0, { reward: 1, odds: true });
      if (!r.ok) throw new Error(r.error);
      cur = r.player;
      if (r.entry.imp === 'cinderhoof') { bosses++; expect(r.entry.outcome).toBe('catch'); }
    }
    expect(bosses).toBeGreaterThan(0);
  });

  it('migrates old saves: keys for caught bosses and already-unlocked locations', () => {
    const old = { ...fresh(), catches: { madame_shredwell: 2 }, unlocked: ['cookie_pantry', 'wrapping_room', 'toy_workshop', 'reindeer_stables'] };
    expect(grantKeys(content, old)).toBe(true);
    expect(old.keys).toEqual(['gift_tag_key', 'cog_key']);
    expect(grantKeys(content, old)).toBe(false);
    const none = fresh();
    grantKeys(content, none);
    expect(none.keys).toEqual([]);
  });
});

describe('carol loft and luck', () => {
  const rich = { ...fresh(), rank: 2, gold: 1e6 };

  it('opens only once the Wrapping Room is unlocked, with no boss key', () => {
    const blocked = travel(content, rich, 'carol_loft');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/Wrapping Room/);
    const open = travel(content, { ...rich, unlocked: ['cookie_pantry', 'wrapping_room'] }, 'carol_loft');
    expect(open.ok).toBe(true);
    expect(travel(content, { ...rich, rank: 1, unlocked: ['cookie_pantry', 'wrapping_room'] }, 'carol_loft').ok).toBe(false);
  });

  it('does not move the key chain: the Toy Workshop still needs the Wrapping Room boss key', () => {
    expect(keyNeeded(content, 'toy_workshop')?.id).toBe('gift_tag_key');
    expect(keyNeeded(content, 'carol_loft')).toBeUndefined();
    const old = { ...fresh(), unlocked: ['cookie_pantry', 'wrapping_room', 'carol_loft'] };
    grantKeys(content, old);
    expect(old.keys).toEqual([]);
  });

  it('crafts the Carol Horn from Loft drops', () => {
    const p = { ...rich, inventory: { ...rich.inventory, hymn_reed: 6, carol_songsheet: 1 } };
    const r = craft(content, p, 'carol_horn');
    if (!r.ok) throw new Error(r.error);
    expect(r.player.inventory.carol_horn).toBe(1);
  });

  it('gives luck more say against commons than bosses, and power more against bosses', () => {
    const luckBuild = { power: 1500, luck: 12, attraction: 1, type: 'carol' };
    const powerBuild = { power: 1800, luck: 8, attraction: 1, type: 'carol' };
    const all = content.locations.flatMap((l) => l.imps);
    const get = (id: string) => all.find((i) => i.id === id)!;
    const chance = (s: typeof luckBuild, id: string) => catchChance(s, get(id), 0.98, luckFactor(content.constants, get(id)));
    expect(chance(luckBuild, 'paint_smudger')).toBeGreaterThan(chance(powerBuild, 'paint_smudger'));
    expect(chance(powerBuild, 'general_grimbolt')).toBeGreaterThan(chance(luckBuild, 'general_grimbolt'));
  });

  it('makes Madame Shredwell weak to Carol and heavily resistant to the rest', () => {
    const boss = content.locations.flatMap((l) => l.imps).find((i) => i.id === 'madame_shredwell')!;
    expect(effectiveness(boss, 'carol')).toBe(1.5);
    expect(effectiveness(boss, 'starlight')).toBe(0.6);
    expect(effectiveness(boss, 'frost')).toBe(0.6);
  });
});
