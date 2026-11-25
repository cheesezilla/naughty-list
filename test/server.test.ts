import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/server/app.js';
import { Store } from '../src/server/db.js';
import { content, scripted } from './helpers.js';

let app: FastifyInstance;
let store: Store;
let clock = 1_000_000;

beforeEach(async () => {
  store = new Store(':memory:');
  clock = 1_000_000;
  // Every roll is 0: always attracted, always the first imp (Crumb Imp, which has no loot), always caught.
  app = await buildApp({ content, store, version: 'test', now: () => clock, rng: () => 0 });
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
    expect(r.json().entry.entry).toMatchObject({ outcome: 'catch', imp: 'crumb_imp' });
    const me = (await get('/api/me', c)).json();
    expect(me.player.gold).toBe(312);
    expect(me.journal).toHaveLength(2);
    expect(me.journal[0]).toMatchObject({ n: 1, kind: 'hunt', entry: { firstCatch: true } });
    expect(me.journal[1]).toMatchObject({ n: 0, kind: 'event', entry: { type: 'intro' } });
    expect(me.player.seen).toEqual({ crumb_imp: 1 });
    expect(me.player.stats.goldEarned).toBe(12);
  });

  it('logs buy, equip, sell, craft and travel events in the hunt log', async () => {
    const c = await signupAdmin();
    await post('/api/hunt', {}, c);
    clock += 1000;
    const buy = (await post('/api/buy', { item: 'jack_in_the_box' }, c)).json();
    expect(buy.log).toMatchObject({ kind: 'event', n: 1, entry: { type: 'buy', item: 'jack_in_the_box', amount: 1, gold: 300 } });
    const eq = (await post('/api/setup', { slot: 'trap', item: 'jack_in_the_box' }, c)).json();
    expect(eq.log.entry).toEqual({ type: 'equip', slot: 'trap', item: 'jack_in_the_box', previous: 'stocking_snare' });
    // equipping what is already equipped logs nothing
    expect((await post('/api/setup', { slot: 'trap', item: 'jack_in_the_box' }, c)).json().log).toBeNull();
    const sell = (await post('/api/sell', { item: 'stale_cookie', amount: 10 }, c)).json();
    expect(sell.log.entry).toMatchObject({ type: 'sell', amount: 10, gold: 30 });
    const me = (await get('/api/me', c)).json();
    expect(me.journal.map((r: { kind: string }) => r.kind)).toEqual(['event', 'event', 'event', 'hunt', 'event']);
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
    expect(log.filter((r: { kind: string }) => r.kind === 'event')).toHaveLength(1); // the intro is older than the 50th hunt
    expect(log[0].n).toBe(60);
    expect(log.at(-1)).toMatchObject({ kind: 'hunt', n: 11 });

    const page1 = (await get('/api/history?limit=40', c)).json();
    expect(page1.rows).toHaveLength(40);
    expect(page1.more).toBe(true);
    const page2 = (await get(`/api/history?limit=40&before=${page1.rows.at(-1).id}`, c)).json();
    expect(page2.rows).toHaveLength(23);
    expect(page2.more).toBe(false);
    expect((await get('/api/history?filter=events', c)).json().rows).toHaveLength(3);
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
    // the log starts again with Santa's letter
    expect(samMe.journal).toEqual([expect.objectContaining({ n: 0, kind: 'event', entry: { type: 'intro' } })]);
    expect(r.json().journal).toHaveLength(1);

    // the other player is untouched
    const eddyMe = (await get('/api/me', admin)).json();
    expect(eddyMe.player.gold).toBe(312);
    expect(eddyMe.journal).toHaveLength(2);

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
});

void scripted;
