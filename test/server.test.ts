import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/server/app.js';
import { Store } from '../src/server/db.js';
import { newPlayer, type PlayerState } from '../src/engine/player.js';
import { content, scripted } from './helpers.js';
import type { JournalEntry } from '../src/engine/hunt.js';

let app: FastifyInstance;
let store: Store;
let clock = 1_000_000;

beforeEach(async () => {
  store = new Store(':memory:');
  clock = 1_000_000;
  // Every roll is 0: always attracted, always the first imp (Crumb Elf, which has no loot), always caught.
  // Achievements are off here so the log checks stay about one thing; they have their own tests below.
  app = await buildApp({ content: { ...content, achievements: [] }, store, version: 'test', now: () => clock, rng: () => 0 });
});
afterEach(async () => {
  await app.close();
  store.close();
});

const cookieOf = (r: LightMyRequestResponse) => {
  const c = r.cookies.find((x) => x.name === 'nl_session');
  if (!c) throw new Error('no session cookie');
  return `nl_session=${c.value}`;
};
const post = (url: string, payload: object, cookie?: string) =>
  app.inject({ method: 'POST', url, payload, headers: cookie ? { cookie } : {} });
const get = (url: string, cookie?: string) => app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });

async function signupAdmin() {
  const r = await post('/api/auth/signup', { username: 'eddy', password: 'candycane123' });
  expect(r.statusCode).toBe(200);
  return cookieOf(r);
}

describe('server', () => {
  it('answers health and content without logging in', async () => {
    expect((await get('/api/health')).json()).toEqual({ ok: true, version: 'test' });
    expect((await get('/api/content')).json().locations).toHaveLength(4);
    expect((await get('/api/setup-status')).json()).toEqual({ needsAdmin: true, signupsOpen: true });
  });

  it('makes the first account the admin, then lets anyone sign up until the admin closes it', async () => {
    const admin = await signupAdmin();
    expect((await get('/api/me', admin)).json().user).toMatchObject({ username: 'eddy', isAdmin: true });
    expect((await get('/api/setup-status')).json()).toEqual({ needsAdmin: false, signupsOpen: true });

    const sam = await post('/api/auth/signup', { username: 'sam', password: 'snowball99' });
    expect(sam.statusCode).toBe(200);
    expect(sam.json().user.isAdmin).toBe(false);
    expect((await post('/api/auth/signup', { username: 'SAM', password: 'snowball99' })).statusCode).toBe(400);

    // only the admin can change the setting
    expect((await post('/api/admin/settings', { allowSignups: false }, cookieOf(sam))).statusCode).toBe(403);
    expect((await post('/api/admin/settings', { allowSignups: 'no' }, admin)).statusCode).toBe(400);
    const closed = await post('/api/admin/settings', { allowSignups: false }, admin);
    expect(closed.json().settings).toEqual({ allowSignups: false });
    expect((await get('/api/setup-status')).json()).toEqual({ needsAdmin: false, signupsOpen: false });
    const refused = await post('/api/auth/signup', { username: 'pat', password: 'snowball99' });
    expect(refused.statusCode).toBe(400);
    expect(refused.json().error).toMatch(/closed/);

    await post('/api/admin/settings', { allowSignups: true }, admin);
    expect((await post('/api/auth/signup', { username: 'pat', password: 'snowball99' })).statusCode).toBe(200);

    const players = (await get('/api/admin/players', admin)).json().players;
    expect(players.map((p: { username: string }) => p.username)).toEqual(['eddy', 'sam', 'pat']);
    expect(players[0]).toMatchObject({ isAdmin: true, rank: 1, hunts: 0 });
  });

  it('changes the password only with the current one', async () => {
    const c = await signupAdmin();
    expect((await post('/api/account/password', { current: 'nope-nope', next: 'gingerbread1' }, c)).statusCode).toBe(400);
    expect((await post('/api/account/password', { current: 'candycane123', next: 'short' }, c)).statusCode).toBe(400);
    expect((await post('/api/account/password', { current: 'candycane123', next: 'gingerbread1' }, c)).statusCode).toBe(200);
    expect((await post('/api/auth/login', { username: 'eddy', password: 'candycane123' })).statusCode).toBe(400);
    expect((await post('/api/auth/login', { username: 'eddy', password: 'gingerbread1' })).statusCode).toBe(200);
  });

  it('logs in and out', async () => {
    await signupAdmin();
    expect((await post('/api/auth/login', { username: 'eddy', password: 'wrong-password' })).statusCode).toBe(400);
    const login = await post('/api/auth/login', { username: 'EDDY', password: 'candycane123' });
    expect(login.statusCode).toBe(200);
    const c = cookieOf(login);
    expect((await get('/api/me', c)).statusCode).toBe(200);
    await post('/api/auth/logout', {}, c);
    expect((await get('/api/me', c)).statusCode).toBe(401);
  });

  it('rejects game calls without a session', async () => {
    expect((await post('/api/hunt', {})).statusCode).toBe(401);
  });

  it('hunts on the server, saves the player and the journal', async () => {
    const c = await signupAdmin();
    const r = await post('/api/hunt', {}, c);
    expect(r.statusCode).toBe(200);
    expect(r.json().entry.entry).toMatchObject({ outcome: 'catch', imp: 'crumb_elf' });
    const me = (await get('/api/me', c)).json();
    expect(me.player.gold).toBe(312);
    expect(me.journal).toHaveLength(3);
    expect(me.journal[0]).toMatchObject({ n: 1, kind: 'hunt', entry: { firstCatch: true } });
    expect(me.journal[1]).toMatchObject({ n: 0, kind: 'event', entry: { type: 'arrival', location: 'cookie_pantry' } });
    expect(me.journal[2]).toMatchObject({ n: 0, kind: 'event', entry: { type: 'intro' } });
    expect(me.player.seen).toEqual({ crumb_elf: 1 });
    expect(me.player.stats.goldEarned).toBe(12);
  });

  it('logs buy, equip, sell, craft and travel events in the hunt log', async () => {
    const c = await signupAdmin();
    await post('/api/hunt', {}, c);
    clock += 1000;
    const buy = (await post('/api/buy', { item: 'jack_in_the_box' }, c)).json();
    expect(buy.log).toMatchObject({ kind: 'event', n: 1, entry: { type: 'buy', item: 'jack_in_the_box', amount: 1, gold: 300 } });
    const eq = (await post('/api/setup', { slot: 'trap', item: 'jack_in_the_box' }, c)).json();
    expect(eq.log.entry).toEqual({ type: 'equip', slot: 'trap', item: 'jack_in_the_box', previous: 'starlit_stocking' });
    // equipping what is already equipped logs nothing
    expect((await post('/api/setup', { slot: 'trap', item: 'jack_in_the_box' }, c)).json().log).toBeNull();
    const sell = (await post('/api/sell', { item: 'stale_cookie', amount: 10 }, c)).json();
    expect(sell.log.entry).toMatchObject({ type: 'sell', amount: 10, gold: 30 });
    const me = (await get('/api/me', c)).json();
    expect(me.journal.map((r: { kind: string }) => r.kind)).toEqual(['event', 'event', 'event', 'hunt', 'event', 'event']);
  });

  it('keeps the last 50 hunts with the events between them, and pages the full history', async () => {
    const c = await signupAdmin();
    for (let i = 0; i < 60; i++) {
      clock += 1000;
      await post('/api/hunt', {}, c);
      if (i === 5 || i === 55) await post('/api/buy', { item: 'stale_cookie', amount: 1 }, c);
    }
    const log = (await get('/api/me', c)).json().journal;
    expect(log.filter((r: { kind: string }) => r.kind === 'hunt')).toHaveLength(50);
    expect(log.filter((r: { kind: string }) => r.kind === 'event')).toHaveLength(1); // the intro and arrival are older than the 50th hunt
    expect(log[0].n).toBe(60);
    expect(log.at(-1)).toMatchObject({ kind: 'hunt', n: 11 });

    const page1 = (await get('/api/history?limit=40', c)).json();
    expect(page1.rows).toHaveLength(40);
    expect(page1.more).toBe(true);
    const page2 = (await get(`/api/history?limit=40&before=${page1.rows.at(-1).id}`, c)).json();
    expect(page2.rows).toHaveLength(24);
    expect(page2.more).toBe(false);
    expect((await get('/api/history?filter=events', c)).json().rows).toHaveLength(4);
    expect((await get('/api/history?filter=catches&limit=200', c)).json().rows).toHaveLength(60);
    expect((await get('/api/history?filter=bosses', c)).json().rows).toHaveLength(0);
  });

  it('shows hunters a leaderboard and a feed of notable catches and rank-ups', async () => {
    const admin = await signupAdmin();
    await post('/api/hunt', {}, admin);
    const sam = cookieOf(await post('/api/auth/signup', { username: 'sam', password: 'snowball99' }));
    const r = (await get('/api/hunters', sam)).json();
    expect(r.players).toEqual([
      { username: 'eddy', rank: 1, points: 20, impsOnList: 1, you: false },
      { username: 'sam', rank: 1, points: 0, impsOnList: 0, you: true },
    ]);
    // a common catch is not news
    expect(r.feed).toEqual([]);
  });

  it('limits hunts to the configured rate', async () => {
    const c = await signupAdmin();
    expect((await post('/api/hunt', {}, c)).statusCode).toBe(200);
    expect((await post('/api/hunt', {}, c)).statusCode).toBe(429);
    clock += 600;
    expect((await post('/api/hunt', {}, c)).statusCode).toBe(200);
  });

  it('buys, equips, travels and reports engine errors', async () => {
    const c = await signupAdmin();
    expect((await post('/api/buy', { item: 'jack_in_the_box' }, c)).json().player.gold).toBe(0);
    expect((await post('/api/setup', { slot: 'trap', item: 'jack_in_the_box' }, c)).json().player.setup.trap).toBe('jack_in_the_box');
    const broke = await post('/api/buy', { item: 'gingerbread_slab' }, c);
    expect(broke.statusCode).toBe(400);
    expect(broke.json().error).toMatch(/Not enough gold/);
    expect((await post('/api/travel', { location: 'wrapping_room' }, c)).statusCode).toBe(400);
  });

  it('logs an arrival intro the first time a player reaches a location, and runs location goals', async () => {
    const c = await signupAdmin();
    const rich: PlayerState = { ...newPlayer(content), rank: 4, points: 50_000, gold: 20_000 };
    store.savePlayer(1, rich, clock);
    const first = (await post('/api/travel', { location: 'reindeer_stables' }, c)).json();
    expect(first.logs.map((r: { entry: { type: string } }) => r.entry.type)).toEqual(['travel', 'arrival']);
    await post('/api/travel', { location: 'cookie_pantry' }, c);
    const again = (await post('/api/travel', { location: 'reindeer_stables' }, c)).json();
    expect(again.logs.map((r: { entry: { type: string } }) => r.entry.type)).toEqual(['travel']);
    const run = (await post('/api/objective', { action: 'start_run' }, c)).json();
    expect(run.player.objectives.reindeer_stables).toMatchObject({ type: 'sleigh_run', active: true, left: 40, readiness: 0 });
    expect(run.log.entry).toEqual({ type: 'objective', location: 'reindeer_stables', action: 'start_run' });
    expect((await post('/api/objective', { action: 'start_run' }, c)).statusCode).toBe(400);
    expect((await post('/api/objective', { action: 'rush_order' }, c)).statusCode).toBe(400);
  });

  it('filters pillaged hunts and shows boss pillages in the feed without amounts', async () => {
    const c = await signupAdmin();
    const p: PlayerState = { ...newPlayer(content), rank: 4, points: 50_000, gold: 9_000, location: 'wrapping_room', unlocked: ['cookie_pantry', 'wrapping_room'] };
    store.savePlayer(1, p, clock);
    store.addJournal(1, 1, { outcome: 'escape', location: 'wrapping_room', imp: 'madame_shredwell', gold: 0, points: 0, loot: [], baitUsed: 1, charmUsed: false, pillage: { gold: 720, points: 1000 } }, clock);
    const rows = (await get('/api/history?filter=pillaged', c)).json().rows;
    expect(rows).toHaveLength(1);
    const feed = (await get('/api/hunters', c)).json().feed;
    expect(feed[0].entry.pillage).toEqual({ gold: 0, points: 0 });
  });
});

describe('start over', () => {
  it('needs an explicit confirm and a session', async () => {
    expect((await post('/api/restart', { confirm: true })).statusCode).toBe(401);
    const c = await signupAdmin();
    const r = await post('/api/restart', {}, c);
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatch(/confirm/);
  });

  it("wipes only that player's progress and journal, keeps the account and logs it", async () => {
    const admin = await signupAdmin();
    const sam = cookieOf(await post('/api/auth/signup', { username: 'sam', password: 'snowball99' }));

    for (const c of [admin, sam]) {
      expect((await post('/api/hunt', {}, c)).statusCode).toBe(200);
      clock += 1000;
    }
    await post('/api/buy', { item: 'mistletoe_charm', amount: 2 }, sam);

    const r = await post('/api/restart', { confirm: true }, sam);
    expect(r.statusCode).toBe(200);
    expect(r.json().player).toMatchObject({ gold: 300, points: 0, rank: 1, catches: {}, stats: { hunts: 0 } });

    const samMe = (await get('/api/me', sam)).json();
    expect(samMe.user.username).toBe('sam');
    expect(samMe.player.gold).toBe(300);
    expect(samMe.player.inventory.mistletoe_charm).toBeUndefined();
    // the log starts again with Santa's letter and the Cookie Pantry's intro
    expect(samMe.journal).toEqual([
      expect.objectContaining({ n: 0, kind: 'event', entry: { type: 'arrival', location: 'cookie_pantry' } }),
      expect.objectContaining({ n: 0, kind: 'event', entry: { type: 'intro' } }),
    ]);
    expect(r.json().journal).toHaveLength(2);

    // the other player is untouched
    const eddyMe = (await get('/api/me', admin)).json();
    expect(eddyMe.player.gold).toBe(312);
    expect(eddyMe.journal).toHaveLength(3);

    // the restart is logged with what sam had, visible to sam and to the admin
    const own = (await get('/api/restarts', sam)).json().restarts;
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ username: 'sam', summary: { gold: 252, points: 20, hunts: 1, caught: 1, impsOnList: 1 } });
    const all = (await get('/api/admin/restarts', admin)).json().restarts;
    expect(all.map((x: { username: string }) => x.username)).toEqual(['sam']);
    expect((await get('/api/admin/restarts', sam)).statusCode).toBe(403);

    // and the player can play straight away
    clock += 1000;
    expect((await post('/api/hunt', {}, sam)).statusCode).toBe(200);
  });
});

describe('store', () => {
  it('prunes the journal to its limit every 100 hunts', () => {
    const s = new Store(':memory:', 150);
    const id = s.createUser('a', 'x', false, 0);
    for (let n = 1; n <= 210; n++) s.addJournal(id, n, { outcome: 'quiet', location: 'x', gold: 0, points: 0, loot: [], baitUsed: 0, charmUsed: false }, n);
    const rows = s.journal(id, 500);
    expect(rows).toHaveLength(160); // pruned to 150 at hunt 200, then 10 more
    expect(rows[0]!.n).toBe(210);
    s.close();
  });

  it('adds the log kind column to journals saved by older versions', () => {
    const s = new Store(':memory:');
    s.db.exec('DROP TABLE journal; CREATE TABLE journal (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, hunt_no INTEGER NOT NULL, created_at INTEGER NOT NULL, entry TEXT NOT NULL)');
    s.db.prepare('INSERT INTO journal (user_id, hunt_no, created_at, entry) VALUES (1, 1, 5, ?)').run('{"outcome":"quiet"}');
    (s as unknown as { migrate(): void }).migrate();
    expect(s.journal(1)).toEqual([{ id: 1, n: 1, at: 5, kind: 'hunt', entry: { outcome: 'quiet' } }]);
    s.close();
  });

  it('renames the old Holly trap ids in saves and log entries', () => {
    const s = new Store(':memory:');
    const id = s.createUser('a', 'x', false, 0);
    const old = newPlayer(content, 0);
    const state = JSON.parse(JSON.stringify(old).replaceAll('starlit_stocking', 'stocking_snare')) as PlayerState;
    state.inventory.holly_noose = 1;
    s.savePlayer(id, state, 0);
    s.addJournal(id, 0, { type: 'equip', slot: 'trap', item: 'holly_noose', previous: 'stocking_snare' }, 0, 'event');
    s.addJournal(id, 0, { type: 'craft', recipe: 'wreath_of_thorns', item: 'wreath_of_thorns', amount: 1, gold: 6000 }, 1, 'event');
    (s as unknown as { migrate(): void }).migrate();
    const p = s.player(id)!;
    expect(p.setup.trap).toBe('starlit_stocking');
    expect(p.inventory).toMatchObject({ starlit_stocking: 1, star_lantern: 1 });
    expect(p.inventory).not.toHaveProperty('stocking_snare');
    expect(s.journal(id).map((r) => r.entry)).toEqual([
      { type: 'craft', recipe: 'constellation_wreath', item: 'constellation_wreath', amount: 1, gold: 6000 },
      { type: 'equip', slot: 'trap', item: 'star_lantern', previous: 'starlit_stocking' },
    ]);
    s.close();
  });

  it('renames the old imp ids and boss badges in saves and log entries', () => {
    const s = new Store(':memory:');
    const id = s.createUser('a', 'x', false, 0);
    const old: PlayerState = {
      ...newPlayer(content, 0),
      catches: { crumb_imp: 4, grizzlewick: 1, foreman_grimbolt: 2 },
      seen: { glitter_imp: 1 },
      achievements: { boss_grizzlewick: 5 },
    };
    s.savePlayer(id, old, 0);
    s.addJournal(id, 0, { outcome: 'catch', imp: 'grizzlewick' } as unknown as JournalEntry, 0, 'hunt');
    (s as unknown as { migrate(): void }).migrate();
    const p = s.player(id)!;
    expect(p.catches).toEqual({ crumb_elf: 4, cinderhoof: 1, general_grimbolt: 2 });
    expect(p.seen).toEqual({ glitterbug: 1 });
    expect(p.achievements).toEqual({ boss_cinderhoof: 5 });
    expect(s.journal(id)[0]!.entry).toEqual({ outcome: 'catch', imp: 'cinderhoof' });
    s.close();
  });
});

describe('achievements and the welcome popup', () => {
  beforeEach(async () => {
    await app.close();
    app = await buildApp({ content, store, version: 'test', now: () => clock, rng: () => 0 });
  });

  it('awards badges after a hunt and an action, logs them and lists them in the feed when notable', async () => {
    const cookie = await signupAdmin();
    const me = (await get('/api/me', cookie)).json();
    expect(me.backfill).toEqual([]);
    expect(me.player.welcomeSeen).toBe(false);

    // Alone on the server, the first catch is not yet "top of the list".
    let h = (await post('/api/hunt', {}, cookie)).json();
    expect(h.newAchievements).toEqual(['first_catch']);
    expect(h.player.achievementHunts).toEqual({ first_catch: 1 });
    expect((await post('/api/auth/signup', { username: 'holly', password: 'candycane123' })).statusCode).toBe(200);

    clock += 1000;
    h = (await post('/api/hunt', {}, cookie)).json();
    expect(h.newAchievements).toEqual(['secret_top_hunter']);
    expect(h.logs.map((r: { kind: string }) => r.kind)).toEqual(['hunt', 'event']);
    expect(h.logs[1].entry).toEqual({ type: 'achievement', ids: ['secret_top_hunter'] });
    expect(h.player.achievements).toEqual({ first_catch: clock - 1000, secret_top_hunter: clock });
    expect(h.player.achievementHunts).toEqual({ first_catch: 1, secret_top_hunter: 2 });

    clock += 1000;
    const b = (await post('/api/buy', { item: 'jack_in_the_box' }, cookie)).json();
    expect(b.newAchievements).toEqual(['first_purchase']);
    // Badges from actions other than a hunt have no hunt number.
    expect(b.player.achievementHunts.first_purchase).toBeUndefined();
    const e = (await post('/api/setup', { slot: 'trap', item: 'jack_in_the_box' }, cookie)).json();
    expect(e.newAchievements).toEqual(['first_upgrade']);
    // Badges never come twice.
    clock += 1000;
    expect((await post('/api/hunt', {}, cookie)).json().newAchievements).toEqual([]);

    // Only the Silver, Gold and Secret badges go into the Hunters feed.
    const feed = (await get('/api/hunters', cookie)).json().feed;
    expect(feed.filter((f: { kind: string }) => f.kind === 'event').map((f: { entry: unknown }) => f.entry)).toEqual([{ type: 'achievement', ids: ['secret_top_hunter'] }]);
    expect((await get('/api/achievements', cookie)).json()).toMatchObject({ hunters: 2, counts: { first_catch: 1, first_purchase: 1 } });
  });

  it('gives an old save everything it already qualifies for, once', async () => {
    const cookie = await signupAdmin();
    const old = { ...newPlayer(content), rank: 2, points: 3000 } as PlayerState;
    old.stats = { hunts: 120, attracted: 100, caught: 80, goldEarned: 2000 };
    old.catches = { crumb_elf: 50, gingerbread_rascal: 1 };
    delete old.achievements;
    delete old.tally;
    delete old.welcomeSeen;
    store.savePlayer(1, old, clock);
    const me = (await get('/api/me', cookie)).json();
    expect(me.backfill).toEqual(['first_catch', 'first_escape', 'hunts_100', 'catches_50', 'gold_1000', 'rank_2', 'first_rare']);
    expect(me.journal[0].entry).toMatchObject({ type: 'achievement', backfill: true });
    // No welcome for an existing player, and no second backfill.
    expect(me.player.welcomeSeen).toBeUndefined();
    expect((await get('/api/me', cookie)).json().backfill).toEqual([]);
  });

  it('shows the welcome popup once per game', async () => {
    const cookie = await signupAdmin();
    expect((await post('/api/welcome', {}, cookie)).json().player.welcomeSeen).toBe(true);
    expect((await get('/api/me', cookie)).json().player.welcomeSeen).toBe(true);
    await post('/api/restart', { confirm: true }, cookie);
    expect((await get('/api/me', cookie)).json().player.welcomeSeen).toBe(false);
  });
});

void scripted;
