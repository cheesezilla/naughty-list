import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import type { Content } from '../content/schema.js';
import {
  addItem, buy, checkAchievements, craft, equip, gameData, grantKeys, hunt, newPlayer, objectiveAction, rankFor, sell, travel,
  type ActionResult, type JournalRow, type PlayerState, type Rng, type Setup,
} from '../engine/index.js';
import { Store, type GameEvent, type HistoryFilter, type UserRow } from './db.js';
import { hashPassword, hashToken, newToken, validPassword, validUsername, verifyPassword } from './auth.js';

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
  const data = gameData(content);
  const impsOfTier = (...tiers: string[]) => [...data.imps.values()].filter((i) => tiers.includes(i.tier)).map((i) => i.id);
  const bossIds = impsOfTier('miniboss', 'boss');
  const notableIds = impsOfTier('rare', 'miniboss', 'boss');
  const pillageFeedIds = impsOfTier('boss');
  // Silver, Gold and Secret achievements go into the Hunters feed.
  const feedAchievements = content.achievements.filter((a) => a.frame !== 'bronze' || a.secret).map((a) => a.id);
  const achievementLeaderboard = content.achievements.some((a) => a.when.type === 'leaderboard');

  /** Awards new achievements on `p` (in place) and returns the log event for them, or null. */
  function awardAchievements(userId: number, p: PlayerState, t: number, afterHunt = false): GameEvent | null {
    let topHunter = false;
    if (afterHunt && achievementLeaderboard) {
      const others = store.players().filter((x) => x.id !== userId);
      // Only counts against at least one other hunter, so a lone player on a new server doesn't get it on hunt #1.
      topHunter = p.points > 0 && others.length > 0 && others.every((x) => p.points > x.points);
    }
    const rewards: Record<string, number> = {};
    const ids = checkAchievements(content, p, t, { topHunter, hunt: afterHunt ? p.stats.hunts : undefined, rewards });
    return ids.length ? { type: 'achievement', ids, rewards } : null;
  }
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
    if (p) {
      // Saves from before boss keys get the keys they have already earned, once.
      if (grantKeys(content, p)) store.savePlayer(userId, p, now());
      return p;
    }
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

  /**
   * Runs an engine action on the logged-in player, saves the result and writes the event to the hunt log.
   * `describe` turns the old and new state into the logged event, or null to log nothing.
   */
  function playerAction(
    fn: (p: PlayerState, body: Record<string, unknown>) => ActionResult,
    describe: (before: PlayerState, after: PlayerState, body: Record<string, unknown>) => GameEvent | GameEvent[] | null,
  ) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const before = loadPlayer(userId);
      const r = fn(before, body);
      if (!r.ok) return reply.code(400).send({ error: r.error });
      const t = now();
      const described = describe(before, r.player, body);
      const events = described === null ? [] : Array.isArray(described) ? described : [described];
      const earned = awardAchievements(userId, r.player, t);
      if (earned) events.push(earned);
      const logs = store.tx(() => {
        store.savePlayer(userId, r.player, t);
        return events.map((e) => store.addJournal(userId, r.player.stats.hunts, e, t, 'event'));
      });
      // `log` is the newest row (older clients); `logs` has every row in the order they were written.
      return { player: r.player, log: logs.at(-1) ?? null, logs, newAchievements: earned?.type === 'achievement' ? earned.ids : [] };
    };
  }
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const amount = (v: unknown) => (v === undefined ? 1 : typeof v === 'number' ? v : NaN);

  // ---------- public ----------
  app.get('/api/health', async () => ({ ok: true, version: opts.version ?? 'dev' }));
  app.get('/api/content', async () => content);
  app.get('/api/setup-status', async () => {
    const needsAdmin = store.userCount() === 0;
    return { needsAdmin, signupsOpen: needsAdmin || store.settings().allowSignups };
  });

  // ---------- accounts ----------
  app.post('/api/auth/signup', async (req, reply) => {
    const { username, password } = (req.body ?? {}) as Record<string, unknown>;
    if (!validUsername(username)) return reply.code(400).send({ error: 'Usernames are 3 to 20 letters, digits, _ or -.' });
    if (!validPassword(password)) return reply.code(400).send({ error: 'Passwords need at least 8 characters.' });
    if (store.userByName(username)) return reply.code(400).send({ error: 'That username is taken.' });

    const t = now();
    const result = store.tx(() => {
      // The very first account becomes the admin. After that, sign-up is open unless the admin closed it.
      const first = store.userCount() === 0;
      if (!first && !store.settings().allowSignups) return { error: 'New accounts are closed right now. Ask the admin to open them.' } as const;
      const id = store.createUser(username, hashPassword(password), first, t);
      store.savePlayer(id, newPlayer(content, t), t);
      store.addJournal(id, 0, { type: 'intro' }, t, 'event');
      store.addJournal(id, 0, { type: 'arrival', location: content.constants.startingLocation }, t, 'event');
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

    game.get('/api/me', async (req) => {
      const userId = req.user!.id;
      const player = loadPlayer(userId);
      // A save from before achievements gets everything it already qualifies for, once, in one log row.
      let backfill: string[] = [];
      if (player.achievements === undefined) {
        const t = now();
        const rewards: Record<string, number> = {};
        backfill = checkAchievements(content, player, t, { rewards });
        store.tx(() => {
          store.savePlayer(userId, player, t);
          if (backfill.length) store.addJournal(userId, player.stats.hunts, { type: 'achievement', ids: backfill, backfill: true, rewards }, t, 'event');
        });
      }
      return {
        user: { ...publicUser(req.user!), createdAt: req.user!.created_at },
        player,
        // The last 50 hunts plus the events between them.
        journal: store.recentLog(userId, 50),
        backfill,
      };
    });

    // How many hunters have earned each achievement, for "Earned by 2 of 5 hunters".
    game.get('/api/achievements', async () => {
      const counts: Record<string, number> = {};
      const players = store.playerStates();
      for (const st of players) for (const id of Object.keys(st.achievements ?? {})) counts[id] = (counts[id] ?? 0) + 1;
      return { hunters: players.length, counts };
    });

    // The welcome popup of a new game was closed.
    game.post('/api/welcome', async (req) => {
      const p = loadPlayer(req.user!.id);
      if (p.welcomeSeen === false) {
        p.welcomeSeen = true;
        store.savePlayer(req.user!.id, p, now());
      }
      return { player: p };
    });

    game.get<{ Querystring: { before?: string; filter?: string; limit?: string } }>('/api/history', async (req) => {
      const filters: HistoryFilter[] = ['all', 'catches', 'escapes', 'pillaged', 'events', 'bosses'];
      const filter = filters.includes(req.query.filter as HistoryFilter) ? (req.query.filter as HistoryFilter) : 'all';
      const before = Number(req.query.before) || undefined;
      const limit = Number(req.query.limit) || 50;
      const rows = store.history(req.user!.id, { before, filter, limit, bossIds });
      return { rows, more: rows.length === Math.min(200, limit) };
    });

    game.get('/api/stats', async (req) => ({ joinedAt: req.user!.created_at, ...store.milestones(req.user!.id) }));

    // Leaderboard and catch feed. Only public numbers: no inventories or gold.
    game.get('/api/hunters', async (req) => ({
      players: store.players().map((p) => ({ username: p.username, rank: p.rank, points: p.points, impsOnList: p.impsOnList, you: p.id === req.user!.id })),
      // A pillage shows who was hit, not how much they lost.
      feed: store.feed(notableIds, 20, pillageFeedIds, feedAchievements).map((r) => ({
        id: r.id, at: r.at, username: r.username, kind: r.kind,
        entry: 'pillage' in r.entry && r.entry.pillage ? { ...r.entry, pillage: { gold: 0, points: 0 } }
          // Only the feed-worthy badges of an achievement row.
          : 'type' in r.entry && r.entry.type === 'achievement' ? { ...r.entry, ids: r.entry.ids.filter((id) => feedAchievements.includes(id)) }
          : r.entry,
      })),
    }));

    game.post('/api/account/password', async (req, reply) => {
      const { current, next } = (req.body ?? {}) as Record<string, unknown>;
      if (typeof current !== 'string' || !verifyPassword(current, req.user!.password_hash)) return reply.code(400).send({ error: 'Your current password is wrong.' });
      if (!validPassword(next)) return reply.code(400).send({ error: 'Passwords need at least 8 characters.' });
      store.setPassword(req.user!.id, hashPassword(next));
      return { ok: true };
    });

    game.post('/api/hunt', async (req, reply) => {
      const userId = req.user!.id;
      const t = now();
      const last = lastHunt.get(userId) ?? 0;
      if (t - last < minHuntGapMs) return reply.code(429).send({ error: 'Easy there! One hunt at a time.' });
      lastHunt.set(userId, t);

      const before = loadPlayer(userId);
      // Speed-run boosts are admin-only: ignored for everyone else even if a save somehow carries them.
      const boost = req.user!.is_admin === 1 ? before.speedRun : undefined;
      const r = hunt(content, before, rng, t, boost);
      if (!r.ok) return reply.code(400).send({ error: r.error });
      const earned = awardAchievements(userId, r.player, t, true);
      const rows = store.tx(() => {
        store.savePlayer(userId, r.player, t);
        const out: JournalRow[] = [store.addJournal(userId, r.player.stats.hunts, r.entry, t)];
        if (earned) out.push(store.addJournal(userId, r.player.stats.hunts, earned, t, 'event'));
        return out;
      });
      // `entry` is the hunt row; `logs` also holds the achievement row when one was earned.
      return { player: r.player, entry: rows[0], logs: rows, newAchievements: earned?.type === 'achievement' ? earned.ids : [] };
    });

    // Start over: wipes this player's progress and journal, keeps the account, and logs the restart.
    // The client asks for confirmation first; the server also insists on an explicit confirm flag.
    game.post('/api/restart', async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (body.confirm !== true) return reply.code(400).send({ error: 'Please confirm that you want to wipe your progress.' });
      const userId = req.user!.id;
      const old = loadPlayer(userId);
      const t = now();
      const fresh = newPlayer(content, t);
      store.restartPlayer(userId, fresh, {
        gold: old.gold, points: old.points, rank: old.rank, hunts: old.stats.hunts, caught: old.stats.caught,
        impsOnList: Object.keys(old.catches).length, location: old.location,
      }, t);
      store.addJournal(userId, 0, { type: 'intro' }, t, 'event');
      store.addJournal(userId, 0, { type: 'arrival', location: content.constants.startingLocation }, t, 'event');
      lastHunt.delete(userId);
      req.log.info({ userId, username: req.user!.username }, 'player restarted');
      return { player: fresh, journal: store.recentLog(userId, 50) };
    });
    // Feedback is append-only here: players can add notes and read their own; nothing deletes them.
    game.post('/api/feedback', async (req, reply) => {
      const msg = String(((req.body ?? {}) as Record<string, unknown>).message ?? '').trim();
      if (msg.length < 3) return reply.code(400).send({ error: 'Please write a few words of feedback.' });
      if (msg.length > 2000) return reply.code(400).send({ error: 'Feedback can be up to 2,000 characters.' });
      const last = store.feedback(req.user!.id, 1)[0];
      if (last && now() - last.at < 5000) return reply.code(429).send({ error: 'Easy there, wait a few seconds before sending another note.' });
      return { feedback: store.addFeedback(req.user!.id, req.user!.username, msg, now()) };
    });
    game.get('/api/feedback', async (req) => ({ feedback: store.feedback(req.user!.id, 50) }));
    game.get('/api/restarts', async (req) => ({ restarts: store.restarts(req.user!.id) }));

    game.post('/api/setup', playerAction((p, b) => {
      const slot = str(b.slot) as keyof Setup;
      if (!['trap', 'base', 'bait', 'charm'].includes(slot)) return { ok: false, error: 'Unknown slot.' };
      return equip(content, p, slot, b.item === null ? null : str(b.item));
    }, (before, after, b) => {
      const slot = str(b.slot) as keyof Setup;
      if (before.setup[slot] === after.setup[slot]) return null;
      return { type: 'equip', slot, item: after.setup[slot], previous: before.setup[slot] };
    }));
    game.post('/api/buy', playerAction((p, b) => buy(content, p, str(b.item), amount(b.amount)),
      (before, after, b) => ({ type: 'buy', item: str(b.item), amount: amount(b.amount), gold: before.gold - after.gold })));
    game.post('/api/sell', playerAction((p, b) => sell(content, p, str(b.item), amount(b.amount)),
      (before, after, b) => ({ type: 'sell', item: str(b.item), amount: amount(b.amount), gold: after.gold - before.gold })));
    game.post('/api/craft', playerAction((p, b) => craft(content, p, str(b.recipe)), (before, after, b) => {
      const recipe = data.recipes.get(str(b.recipe))!;
      return { type: 'craft', recipe: recipe.id, item: recipe.output.item, amount: recipe.output.amount, gold: before.gold - after.gold };
    }));
    game.post('/api/travel', playerAction((p, b) => travel(content, p, str(b.location)), (before, after) => {
      if (before.location === after.location) return null;
      const moved: GameEvent = { type: 'travel', location: after.location, unlockCost: before.gold - after.gold };
      // The first time a player reaches a location (it unlocks then), the log gets its intro.
      return before.unlocked.includes(after.location) ? moved : [moved, { type: 'arrival', location: after.location }];
    }));
    game.post('/api/objective', playerAction((p, b) => {
      const action = str(b.action);
      if (action !== 'start_run' && action !== 'rush_order') return { ok: false, error: 'Unknown action.' };
      return objectiveAction(content, p, action, rng);
    }, (_before, after, b) => ({ type: 'objective', location: after.location, action: str(b.action) as 'start_run' | 'rush_order' })));
  });

  // ---------- admin ----------
  app.register(async (admin) => {
    admin.addHook('preHandler', requireAdmin);
    admin.get('/api/admin/players', async () => ({
      players: store.players().map((p) => ({ username: p.username, isAdmin: p.isAdmin, rank: p.rank, points: p.points, hunts: p.hunts, lastActive: p.updatedAt })),
    }));
    admin.get('/api/admin/settings', async () => ({ settings: store.settings(), cocoaMeter: content.constants.stamina.enabled }));
    admin.post('/api/admin/settings', async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (typeof body.allowSignups !== 'boolean') return reply.code(400).send({ error: 'allowSignups must be true or false.' });
      store.setSetting('allowSignups', body.allowSignups);
      req.log.info({ allowSignups: body.allowSignups, by: req.user!.username }, 'sign-up setting changed');
      return { settings: store.settings() };
    });
    // Speed-run tools. They only ever change the calling admin's own save.
    admin.post('/api/admin/speedrun', async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const userId = req.user!.id;
      const p = loadPlayer(userId);
      const n = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : null);
      switch (b.action) {
        case 'boost': {
          const reward = n(b.reward, 1000);
          if (reward === null || reward < 1 || typeof b.odds !== 'boolean') return reply.code(400).send({ error: 'Pick a multiplier from 1 to 1000.' });
          if (reward === 1 && !b.odds) delete p.speedRun; else p.speedRun = { reward, odds: b.odds };
          break;
        }
        case 'gold': {
          const amount = n(b.amount, 1e9);
          if (!amount) return reply.code(400).send({ error: 'Amount must be a whole number up to 1,000,000,000.' });
          p.gold += amount;
          break;
        }
        case 'rank': {
          const rank = n(b.rank, content.ranks.length);
          const r = content.ranks.find((x) => x.rank === rank);
          if (!r) return reply.code(400).send({ error: 'No such rank.' });
          p.points = Math.max(p.points, r.points);
          p.rank = rankFor(content, p.points);
          break;
        }
        case 'unlock':
          for (const l of content.locations) {
            if (!p.unlocked.includes(l.id)) p.unlocked.push(l.id);
            if (l.key && !(p.keys ??= []).includes(l.key.id)) p.keys.push(l.key.id);
          }
          break;
        case 'portraits':
          // One catch for every elf that has none, so every Naughty List portrait and description unlocks. Only the
          // catches map changes: no hunts, points, gold or loot. Catch badges this earns are awarded silently (no
          // banner or log row), and boss keys follow from the caught bosses via grantKeys on the next load.
          for (const l of content.locations) for (const m of l.imps) p.catches[m.id] = Math.max(1, p.catches[m.id] ?? 0);
          checkAchievements(content, p, now());
          grantKeys(content, p);
          break;
        case 'supplies':
          // 200 of every bait and charm, and 50 of every material, to try any setup or recipe.
          for (const i of [...content.items.baits, ...content.items.charms]) addItem(p, i.id, Math.max(0, 200 - (p.inventory[i.id] ?? 0)));
          for (const i of content.items.materials) addItem(p, i.id, Math.max(0, 50 - (p.inventory[i.id] ?? 0)));
          break;
        default: return reply.code(400).send({ error: 'Unknown speed-run action.' });
      }
      store.savePlayer(userId, p, now());
      req.log.info({ by: req.user!.username, action: b.action }, 'speed-run tool used');
      return { player: p };
    });
    admin.get('/api/admin/feedback', async () => ({ feedback: store.feedback() }));
    admin.get('/api/admin/restarts', async () => ({ restarts: store.restarts() }));
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
