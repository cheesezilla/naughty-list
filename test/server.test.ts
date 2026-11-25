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
    expect((await get('/api/setup-status')).json()).toEqual({ needsAdmin: true });
  });

  it('makes the first account the admin, then requires invites', async () => {
    const admin = await signupAdmin();
    expect((await get('/api/me', admin)).json().user).toMatchObject({ username: 'eddy', isAdmin: true });

    const noInvite = await post('/api/auth/signup', { username: 'sam', password: 'snowball99' });
    expect(noInvite.statusCode).toBe(400);

    const { code } = (await post('/api/admin/invites', {}, admin)).json();
    expect(code).toMatch(/^SNOW-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const sam = await post('/api/auth/signup', { username: 'sam', password: 'snowball99', invite: code.toLowerCase() });
    expect(sam.statusCode).toBe(200);
    expect(sam.json().user.isAdmin).toBe(false);

    const reuse = await post('/api/auth/signup', { username: 'pat', password: 'snowball99', invite: code });
    expect(reuse.statusCode).toBe(400);

    const list = (await get('/api/admin/invites', admin)).json().invites;
    expect(list[0]).toMatchObject({ code, used_by_name: 'sam' });
    expect((await get('/api/admin/invites', cookieOf(sam))).statusCode).toBe(403);
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
    expect(me.journal).toHaveLength(1);
    expect(me.journal[0].n).toBe(1);
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
    const { code } = (await post('/api/admin/invites', {}, admin)).json();
    const sam = cookieOf(await post('/api/auth/signup', { username: 'sam', password: 'snowball99', invite: code }));

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
    expect(samMe.journal).toHaveLength(0);

    // the other player is untouched
    const eddyMe = (await get('/api/me', admin)).json();
    expect(eddyMe.player.gold).toBe(312);
    expect(eddyMe.journal).toHaveLength(1);

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
  it('keeps only the last 200 journal entries', () => {
    const s = new Store(':memory:');
    const id = s.createUser('a', 'x', false, 0);
    for (let n = 1; n <= 210; n++) s.addJournal(id, n, { outcome: 'quiet', location: 'x', gold: 0, points: 0, loot: [], baitUsed: 0, charmUsed: false }, n);
    const rows = s.journal(id, 500);
    expect(rows).toHaveLength(200);
    expect(rows[0]!.n).toBe(210);
    s.close();
  });
});

void scripted;
