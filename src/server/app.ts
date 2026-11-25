import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import type { Content } from '../content/schema.js';
import {
  buy, craft, equip, hunt, newPlayer, sell, travel,
  type ActionResult, type PlayerState, type Rng, type Setup,
} from '../engine/index.js';
import { Store, type UserRow } from './db.js';
import { hashPassword, hashToken, newInviteCode, newToken, validPassword, validUsername, verifyPassword } from './auth.js';

export interface AppOptions {
  content: Content;
  store: Store;
  /** Folder with the built web client; skipped when it doesn't exist (dev mode uses Vite). */
  clientDir?: string;
  version?: string;
  logger?: boolean;
  /** Injected for tests; defaults to a cryptographic random source. */
  rng?: Rng;
  now?: () => number;
}

const COOKIE = 'nl_session';
const SESSION_DAYS = 30;

const cryptoRng: Rng = () => randomInt(0, 2 ** 32) / 2 ** 32;

declare module 'fastify' {
  interface FastifyRequest { user?: UserRow }
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const { content, store } = opts;
  const rng = opts.rng ?? cryptoRng;
  const now = opts.now ?? Date.now;
  const minHuntGapMs = 1000 / content.constants.maxHuntsPerSecond;
  const lastHunt = new Map<number, number>();

  const app = Fastify({ logger: opts.logger ?? false, trustProxy: true });
  await app.register(fastifyCookie);

  // ---------- helpers ----------
  const publicUser = (u: UserRow) => ({ id: u.id, username: u.username, isAdmin: u.is_admin === 1 });

  function startSession(reply: FastifyReply, req: FastifyRequest, userId: number) {
    const token = newToken();
    const expires = now() + SESSION_DAYS * 864e5;
    store.createSession(hashToken(token), userId, expires);
    reply.setCookie(COOKIE, token, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: req.protocol === 'https', expires: new Date(expires),
    });
  }

  function loadPlayer(userId: number): PlayerState {
    const p = store.player(userId);
    if (p) return p;
    const fresh = newPlayer(content, now());
    store.savePlayer(userId, fresh, now());
    return fresh;
  }

  const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies[COOKIE];
    const user = token ? store.sessionUser(hashToken(token), now()) : undefined;
    if (!user) return reply.code(401).send({ error: 'Please log in.' });
    req.user = user;
  };
  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    await requireUser(req, reply);
    if (reply.sent) return;
    if (req.user?.is_admin !== 1) return reply.code(403).send({ error: 'Only the admin can do that.' });
  };

  /** Runs an engine action on the logged-in player and saves the result. */
  function playerAction(fn: (p: PlayerState, body: Record<string, unknown>) => ActionResult) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      const r = fn(loadPlayer(userId), (req.body ?? {}) as Record<string, unknown>);
      if (!r.ok) return reply.code(400).send({ error: r.error });
      store.savePlayer(userId, r.player, now());
      return { player: r.player };
    };
  }
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const amount = (v: unknown) => (v === undefined ? 1 : typeof v === 'number' ? v : NaN);

  // ---------- public ----------
  app.get('/api/health', async () => ({ ok: true, version: opts.version ?? 'dev' }));
  app.get('/api/content', async () => content);
  app.get('/api/setup-status', async () => ({ needsAdmin: store.userCount() === 0 }));

  // ---------- accounts ----------
  app.post('/api/auth/signup', async (req, reply) => {
    const { username, password, invite } = (req.body ?? {}) as Record<string, unknown>;
    if (!validUsername(username)) return reply.code(400).send({ error: 'Usernames are 3 to 20 letters, digits, _ or -.' });
    if (!validPassword(password)) return reply.code(400).send({ error: 'Passwords need at least 8 characters.' });
    if (store.userByName(username)) return reply.code(400).send({ error: 'That username is taken.' });

    const t = now();
    const result = store.tx(() => {
      // The very first account becomes the admin and needs no invite.
      const first = store.userCount() === 0;
      const code = str(invite).trim().toUpperCase();
      if (!first && !store.inviteIsOpen(code)) return { error: 'That invite code is not valid or was already used.' } as const;
      const id = store.createUser(username, hashPassword(password), first, t);
      if (!first) store.useInvite(code, id, t);
      store.savePlayer(id, newPlayer(content, t), t);
      return { id } as const;
    });
    if ('error' in result) return reply.code(400).send({ error: result.error });
    startSession(reply, req, result.id);
    return { user: publicUser({ ...store.userByName(username)! }) };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = (req.body ?? {}) as Record<string, unknown>;
    const user = typeof username === 'string' ? store.userByName(username) : undefined;
    if (!user || typeof password !== 'string' || !verifyPassword(password, user.password_hash)) {
      return reply.code(400).send({ error: 'Wrong username or password.' });
    }
    store.pruneSessions(now());
    startSession(reply, req, user.id);
    return { user: publicUser(user) };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies[COOKIE];
    if (token) store.endSession(hashToken(token));
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  // ---------- game ----------
  app.register(async (game) => {
    game.addHook('preHandler', requireUser);

    game.get('/api/me', async (req) => ({
      user: publicUser(req.user!),
      player: loadPlayer(req.user!.id),
      journal: store.journal(req.user!.id, 50),
    }));

    game.post('/api/hunt', async (req, reply) => {
      const userId = req.user!.id;
      const t = now();
      const last = lastHunt.get(userId) ?? 0;
      if (t - last < minHuntGapMs) return reply.code(429).send({ error: 'Easy there! One hunt at a time.' });
      lastHunt.set(userId, t);

      const r = hunt(content, loadPlayer(userId), rng, t);
      if (!r.ok) return reply.code(400).send({ error: r.error });
      store.tx(() => {
        store.savePlayer(userId, r.player, t);
        store.addJournal(userId, r.player.stats.hunts, r.entry, t);
      });
      return { player: r.player, entry: { n: r.player.stats.hunts, at: t, entry: r.entry } };
    });

    game.post('/api/setup', playerAction((p, b) => {
      const slot = str(b.slot) as keyof Setup;
      if (!['trap', 'base', 'bait', 'charm'].includes(slot)) return { ok: false, error: 'Unknown slot.' };
      return equip(content, p, slot, b.item === null ? null : str(b.item));
    }));
    game.post('/api/buy', playerAction((p, b) => buy(content, p, str(b.item), amount(b.amount))));
    game.post('/api/sell', playerAction((p, b) => sell(content, p, str(b.item), amount(b.amount))));
    game.post('/api/craft', playerAction((p, b) => craft(content, p, str(b.recipe))));
    game.post('/api/travel', playerAction((p, b) => travel(content, p, str(b.location))));
  });

  // ---------- admin ----------
  app.register(async (admin) => {
    admin.addHook('preHandler', requireAdmin);
    admin.get('/api/admin/invites', async () => ({ invites: store.listInvites() }));
    admin.post('/api/admin/invites', async (req) => {
      const code = newInviteCode();
      store.createInvite(code, req.user!.id, now());
      return { code };
    });
    admin.delete<{ Params: { code: string } }>('/api/admin/invites/:code', async (req, reply) => {
      if (!store.revokeInvite(req.params.code)) return reply.code(400).send({ error: 'That invite is already used or gone.' });
      return { ok: true };
    });
  });

  if (opts.clientDir && existsSync(opts.clientDir)) {
    await app.register(fastifyStatic, { root: opts.clientDir });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  }
  return app;
}
