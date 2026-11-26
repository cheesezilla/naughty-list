import { describe, expect, it } from 'vitest';
import { hunt, rollPillage } from '../src/engine/hunt.js';
import { newPlayer, buy, sell, craft, equip, travel, type PlayerState } from '../src/engine/player.js';
import { seededRng } from '../src/engine/rng.js';
import { content, scripted, withConstants } from './helpers.js';

const fresh = () => newPlayer(content);

describe('hunt', () => {
  it('uses no bait when nothing is attracted', () => {
    const r = hunt(content, fresh(), scripted(0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.outcome).toBe('quiet');
    expect(r.player.inventory.stale_cookie).toBe(100);
    expect(r.player.stats.hunts).toBe(1);
  });

  it('catches: pays gold and points and uses one bait', () => {
    // attract (0), pick first imp (0), catch (0), no loot needed
    const r = hunt(content, fresh(), scripted(0, 0, 0, 0.99));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry).toMatchObject({ outcome: 'catch', imp: 'crumb_imp', gold: 12, points: 20, baitUsed: 1 });
    expect(r.player.gold).toBe(312);
    expect(r.player.points).toBe(20);
    expect(r.player.catches.crumb_imp).toBe(1);
    expect(r.player.inventory.stale_cookie).toBe(99);
  });

  it('escapes: pays nothing and still uses bait', () => {
    const r = hunt(content, fresh(), scripted(0, 0, 0.999));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.outcome).toBe('escape');
    expect(r.player.gold).toBe(300);
    expect(r.player.inventory.stale_cookie).toBe(99);
  });

  it('bait-stealing imps always pillage one bait when they escape', () => {
    // Jarbelly sits after weights 40+30+21+5 = 96 of 100
    const r = hunt(content, fresh(), scripted(0, 0.97, 0.999));
    if (!r.ok) throw new Error(r.error);
    expect(r.entry.imp).toBe('jarbelly');
    expect(r.entry.baitUsed).toBe(1);
    expect(r.entry.pillage).toEqual({ gold: 0, points: 0, bait: { item: 'stale_cookie', amount: 1 } });
    expect(r.player.inventory.stale_cookie).toBe(98);
    expect(r.player.stats.pillaged).toBe(1);
  });

  it('ranks up when points pass a threshold', () => {
    const p: PlayerState = { ...fresh(), points: 2490 };
    const r = hunt(content, p, scripted(0, 0, 0, 0.99));
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
    expect(r.player.inventory.stale_cookie).toBe(10);
  });

  it('uses and then unequips a charm when the last one is spent', () => {
    const p = fresh();
    p.inventory.mistletoe_charm = 1;
    p.setup.charm = 'mistletoe_charm';
    const r = hunt(content, p, scripted(0, 0, 0, 0.99));
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
    const b = buy(content, fresh(), 'jack_in_the_box');
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
    const t = travel(content, { ...fresh(), rank: 2 }, 'wrapping_room');
    if (!t.ok) throw new Error(t.error);
    expect(t.player.gold).toBe(50);
    expect(t.player.unlocked).toContain('wrapping_room');
  });

  it('crafts Fruitcake from boss and common loot', () => {
    const p = { ...fresh(), rank: 2, inventory: { ...fresh().inventory, candied_peel: 3, cookie_tin: 1 } };
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
    expect(rollPillage(content, p, imp('crumb_imp'), 'stale_cookie', scripted(0.5))).toBeUndefined();
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
    const out = rollPillage(content, p, imp('baron_crumblewick'), 'stale_cookie', scripted(0));
    expect(p.points).toBe(2000);
    expect(out?.safe).toContain('points');
  });

  it('a mini boss takes two kinds', () => {
    const p = rich();
    const out = rollPillage(content, p, imp('spoolwick'), 'stale_cookie', scripted(0, 0, 0, 0))!;
    const kinds = [out.gold > 0, !!out.bait, out.points > 0].filter(Boolean).length;
    expect(kinds).toBe(2);
  });
});
