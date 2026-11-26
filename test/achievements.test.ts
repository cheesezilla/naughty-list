import { describe, expect, it } from 'vitest';
import { achievementProgress, checkAchievements, statValue } from '../src/engine/achievements.js';
import { hunt } from '../src/engine/hunt.js';
import { buy, craft, equip, newPlayer, type PlayerState } from '../src/engine/player.js';
import { content, scripted } from './helpers.js';

const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error((r as unknown as { error: string }).error);
  return r as Extract<T, { ok: true }>;
};
const byId = (id: string) => content.achievements.find((a) => a.id === id)!;

describe('achievements content', () => {
  it('has 55 achievements with unique ids, 24 Bronze, 19 Silver and 12 Gold, 6 of them secret', () => {
    const a = content.achievements;
    expect(a).toHaveLength(55);
    expect(new Set(a.map((x) => x.id)).size).toBe(55);
    expect(a.filter((x) => x.frame === 'bronze')).toHaveLength(24);
    expect(a.filter((x) => x.frame === 'silver')).toHaveLength(19);
    expect(a.filter((x) => x.frame === 'gold')).toHaveLength(12);
    expect(a.filter((x) => x.secret)).toHaveLength(6);
  });
});

describe('earning achievements', () => {
  it('awards the first catch once, with the time, and nothing twice', () => {
    let p = newPlayer(content);
    p = ok(hunt(content, p, scripted(0))).player;
    expect(checkAchievements(content, p, 123)).toEqual(['first_catch']);
    expect(p.achievements).toEqual({ first_catch: 123 });
    expect(checkAchievements(content, p, 456)).toEqual([]);
  });

  it('counts purchases, crafts and a new trap from the engine actions', () => {
    let p: PlayerState = { ...newPlayer(content), gold: 10_000, rank: 2 };
    p = ok(buy(content, p, 'jack_in_the_box')).player;
    p = ok(equip(content, p, 'trap', 'jack_in_the_box')).player;
    p.inventory.sugar_twist = 2;
    p.inventory.candied_peel = 1;
    p = ok(craft(content, p, 'ribbon_candy_x3')).player;
    expect(p.tally).toMatchObject({ bought: 1, newTrap: 1, crafted: 1, 'craft:ribbon_candy': 1 });
    expect(checkAchievements(content, p, 1)).toEqual(['first_purchase', 'first_upgrade', 'first_craft', 'rank_2', 'ladder_tier_2']);
  });

  it('keeps catch and escape streaks', () => {
    let p = newPlayer(content);
    const catchRoll = () => scripted(0);
    const escapeRoll = () => scripted(0, 0.999, 0.999);
    for (let i = 0; i < 3; i++) p = ok(hunt(content, p, catchRoll())).player;
    p = ok(hunt(content, p, catchRoll())).player;
    expect(p.tally).toMatchObject({ streakCatch: 4, bestCatchStreak: 4 });
    for (let i = 0; i < 5; i++) p = ok(hunt(content, p, escapeRoll())).player;
    expect(p.tally).toMatchObject({ streakCatch: 0, bestCatchStreak: 4, streakEscape: 5, bestEscapeStreak: 5 });
    expect(checkAchievements(content, p, 1)).toContain('secret_butterfingers');
  });

  it('counts catches by trap type and weakness, and a boss caught with the starter trap', () => {
    const p: PlayerState = { ...newPlayer(content), location: 'toy_workshop', unlocked: ['cookie_pantry', 'toy_workshop'], rank: 3 };
    // Hammerhand is forced by an Inspection; he is weak to Frost, and the starter trap is Starlight.
    p.objectives = { toy_workshop: { type: 'order_board', slots: ['frost', 'frost', 'frost'], filled: 0, rush: false, ordersDone: 3, rushReady: true, forced: 'hammerhand' } };
    const r = ok(hunt(content, p, scripted(0, 0, 0, 0, 0.999)));
    expect(r.entry).toMatchObject({ imp: 'hammerhand', outcome: 'catch' });
    expect(r.player.tally).toMatchObject({ catches_starlight: 1, starterBoss: 1 });
    expect(r.player.tally?.weaknessCatches).toBeUndefined();
    expect(checkAchievements(content, r.player, 1)).toEqual(expect.arrayContaining(['first_miniboss', 'secret_boss_starter', 'order_first']));
  });

  it('reports progress for counts and collections, and derives stats from older saves', () => {
    const p: PlayerState = { ...newPlayer(content), catches: { crumb_elf: 3, sprinkle_snatcher: 1 } };
    p.stats = { hunts: 312, attracted: 10, caught: 4 };
    delete p.tally;
    expect(achievementProgress(content, p, byId('hunts_500'))).toEqual({ have: 312, need: 500 });
    expect(achievementProgress(content, p, byId('list_cookie_pantry'))).toEqual({ have: 2, need: 5 });
    expect(statValue(content, p, 'escapes')).toBe(6);
    expect(achievementProgress(content, p, byId('type_all_owned'))).toEqual({ have: 1, need: 3 });
    expect(achievementProgress(content, p, byId('secret_top_hunter'), { topHunter: true })).toEqual({ have: 1, need: 1 });
  });
});
