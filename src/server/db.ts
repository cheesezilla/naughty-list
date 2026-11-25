import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameEvent, JournalEntry, JournalRow, LogKind, PlayerState } from '../engine/index.js';

export type { GameEvent, JournalRow } from '../engine/index.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
-- invites is no longer used (open sign-up replaced invite codes) and is kept so old saves open unchanged.
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS players (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hunt_no INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  entry TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS journal_user ON journal(user_id, id);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS restarts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  summary TEXT NOT NULL
);
`;

export interface UserRow { id: number; username: string; password_hash: string; is_admin: number; created_at: number }
export type HistoryFilter = 'all' | 'catches' | 'escapes' | 'events' | 'bosses';
export interface PlayerSummary { id: number; username: string; isAdmin: boolean; createdAt: number; updatedAt: number; rank: number; points: number; hunts: number; caught: number; impsOnList: number }
export interface Settings { allowSignups: boolean }
const DEFAULT_SETTINGS: Settings = { allowSignups: true };
/** What a player had when they restarted, kept in the restart log. */
export interface RestartSummary { gold: number; points: number; rank: number; hunts: number; caught: number; impsOnList: number; location: string }
export interface RestartRow { id: number; username: string; at: number; summary: RestartSummary }

/** Rows kept per player (hunts and events). Older rows are pruned every 100 hunts. */
export const JOURNAL_KEEP = 10_000;

/** All storage for the game. One SQLite file; every call is synchronous, so each request is atomic. */
export class Store {
  readonly db: DatabaseSync;

  constructor(file: string, private readonly journalKeep = JOURNAL_KEEP) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    this.db.exec(SCHEMA);
    this.migrate();
  }

  /** Upgrades saves made by older versions in place. Each step checks before it changes anything. */
  private migrate() {
    const cols = (this.db.prepare('PRAGMA table_info(journal)').all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes('kind')) this.db.exec("ALTER TABLE journal ADD COLUMN kind TEXT NOT NULL DEFAULT 'hunt'");
  }

  close() { this.db.close(); }

  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ----- users -----
  userCount(): number {
    return Number((this.db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n);
  }
  createUser(username: string, passwordHash: string, isAdmin: boolean, now: number): number {
    const r = this.db.prepare('INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?)')
      .run(username, passwordHash, isAdmin ? 1 : 0, now);
    return Number(r.lastInsertRowid);
  }
  userByName(username: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
  }
  setPassword(userId: number, passwordHash: string) {
    this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
  }
  /** Every player with the numbers the leaderboard and the admin page show. */
  players(): PlayerSummary[] {
    const rows = this.db.prepare(
      `SELECT u.id, u.username, u.is_admin, u.created_at, p.updated_at, p.state FROM users u LEFT JOIN players p ON p.user_id = u.id ORDER BY u.id`,
    ).all() as { id: number; username: string; is_admin: number; created_at: number; updated_at: number | null; state: string | null }[];
    return rows.map((r) => {
      const st = r.state ? (JSON.parse(r.state) as PlayerState) : undefined;
      return {
        id: r.id, username: r.username, isAdmin: r.is_admin === 1, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
        rank: st?.rank ?? 1, points: st?.points ?? 0, hunts: st?.stats.hunts ?? 0, caught: st?.stats.caught ?? 0,
        impsOnList: st ? Object.keys(st.catches).length : 0,
      };
    });
  }

  // ----- settings -----
  settings(): Settings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const out: Settings = { ...DEFAULT_SETTINGS };
    for (const r of rows) if (r.key in out) (out as unknown as Record<string, unknown>)[r.key] = JSON.parse(r.value);
    return out;
  }
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
  }

  // ----- sessions -----
  createSession(tokenHash: string, userId: number, expiresAt: number) {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
  }
  sessionUser(tokenHash: string, now: number): UserRow | undefined {
    return this.db.prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
    ).get(tokenHash, now) as UserRow | undefined;
  }
  endSession(tokenHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }
  pruneSessions(now: number) {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  }

  // ----- players -----
  player(userId: number): PlayerState | undefined {
    const row = this.db.prepare('SELECT state FROM players WHERE user_id = ?').get(userId) as { state: string } | undefined;
    return row ? (JSON.parse(row.state) as PlayerState) : undefined;
  }
  savePlayer(userId: number, state: PlayerState, now: number) {
    this.db.prepare(
      'INSERT INTO players (user_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at',
    ).run(userId, JSON.stringify(state), now);
  }

  // ----- journal (the hunt log) -----
  addJournal(userId: number, huntNo: number, entry: JournalEntry | GameEvent, now: number, kind: LogKind = 'hunt'): JournalRow {
    const r = this.db.prepare('INSERT INTO journal (user_id, hunt_no, created_at, entry, kind) VALUES (?, ?, ?, ?, ?)')
      .run(userId, huntNo, now, JSON.stringify(entry), kind);
    const id = Number(r.lastInsertRowid);
    if (kind === 'hunt' && huntNo % 100 === 0) this.pruneJournal(userId);
    return { id, n: huntNo, at: now, kind, entry } as JournalRow;
  }
  pruneJournal(userId: number) {
    this.db.prepare(
      'DELETE FROM journal WHERE user_id = ? AND id NOT IN (SELECT id FROM journal WHERE user_id = ? ORDER BY id DESC LIMIT ?)',
    ).run(userId, userId, this.journalKeep);
  }
  private rows(sql: string, ...args: (string | number)[]): JournalRow[] {
    const rows = this.db.prepare(sql).all(...args) as { id: number; hunt_no: number; created_at: number; entry: string; kind: LogKind }[];
    return rows.map((r) => ({ id: r.id, n: r.hunt_no, at: r.created_at, kind: r.kind, entry: JSON.parse(r.entry) }) as JournalRow);
  }
  /** The newest rows, newest first. */
  journal(userId: number, limit = 50): JournalRow[] {
    return this.rows('SELECT * FROM journal WHERE user_id = ? ORDER BY id DESC LIMIT ?', userId, limit);
  }
  /** The last `hunts` hunts plus every event logged between them (and after the newest), newest first. */
  recentLog(userId: number, hunts = 50): JournalRow[] {
    const cut = this.db.prepare(
      "SELECT id FROM journal WHERE user_id = ? AND kind = 'hunt' ORDER BY id DESC LIMIT 1 OFFSET ?",
    ).get(userId, hunts - 1) as { id: number } | undefined;
    return this.rows('SELECT * FROM journal WHERE user_id = ? AND id >= ? ORDER BY id DESC', userId, cut?.id ?? 0);
  }
  /** One page of the full history, newest first, older than `before` (a row id). */
  history(userId: number, opts: { before?: number; filter?: HistoryFilter; limit?: number; bossIds?: string[] } = {}): JournalRow[] {
    const where = ['user_id = ?', 'id < ?'];
    const args: (string | number)[] = [userId, opts.before ?? Number.MAX_SAFE_INTEGER];
    switch (opts.filter ?? 'all') {
      case 'catches': where.push("kind = 'hunt'", "json_extract(entry, '$.outcome') = 'catch'"); break;
      case 'escapes': where.push("kind = 'hunt'", "json_extract(entry, '$.outcome') = 'escape'"); break;
      case 'events': where.push("(kind = 'event' OR json_extract(entry, '$.rankUp') IS NOT NULL)"); break;
      case 'bosses': {
        const ids = opts.bossIds ?? [];
        where.push("kind = 'hunt'", `json_extract(entry, '$.imp') IN (${ids.map(() => '?').join(',') || "''"})`);
        args.push(...ids);
        break;
      }
    }
    args.push(Math.min(200, Math.max(1, opts.limit ?? 50)));
    return this.rows(`SELECT * FROM journal WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ?`, ...args);
  }
  /** Rank-ups and first catches still in this player's log, oldest first, for the stats page. */
  milestones(userId: number): { rankUps: { rank: number; at: number }[]; firstCatches: Record<string, number> } {
    const rows = this.db.prepare(
      `SELECT created_at, json_extract(entry, '$.rankUp') AS rank_up, json_extract(entry, '$.imp') AS imp, json_extract(entry, '$.firstCatch') AS first
       FROM journal WHERE user_id = ? AND kind = 'hunt' AND (json_extract(entry, '$.rankUp') IS NOT NULL OR json_extract(entry, '$.firstCatch') = 1) ORDER BY id`,
    ).all(userId) as { created_at: number; rank_up: number | null; imp: string | null; first: number | null }[];
    const rankUps: { rank: number; at: number }[] = [];
    const firstCatches: Record<string, number> = {};
    for (const r of rows) {
      if (r.rank_up) rankUps.push({ rank: r.rank_up, at: r.created_at });
      if (r.first && r.imp) firstCatches[r.imp] = r.created_at;
    }
    return { rankUps, firstCatches };
  }
  /** Everyone's notable moments (rare and boss catches, rank-ups), newest first. */
  feed(notableImps: string[], limit = 20): (JournalRow & { username: string })[] {
    const marks = notableImps.map(() => '?').join(',') || "''";
    const rows = this.db.prepare(
      `SELECT j.*, u.username FROM journal j JOIN users u ON u.id = j.user_id
       WHERE j.kind = 'hunt' AND (json_extract(j.entry, '$.rankUp') IS NOT NULL
         OR (json_extract(j.entry, '$.outcome') = 'catch' AND json_extract(j.entry, '$.imp') IN (${marks})))
       ORDER BY j.id DESC LIMIT ?`,
    ).all(...notableImps, limit) as { id: number; hunt_no: number; created_at: number; entry: string; kind: LogKind; username: string }[];
    return rows.map((r) => ({ id: r.id, n: r.hunt_no, at: r.created_at, kind: 'hunt', entry: JSON.parse(r.entry), username: r.username }));
  }

  // ----- restarts -----
  /** Replaces a player's progress with a fresh state, clears their journal and logs what they had. Atomic. */
  restartPlayer(userId: number, fresh: PlayerState, summary: RestartSummary, now: number) {
    this.tx(() => {
      this.db.prepare('INSERT INTO restarts (user_id, created_at, summary) VALUES (?, ?, ?)').run(userId, now, JSON.stringify(summary));
      this.db.prepare('DELETE FROM journal WHERE user_id = ?').run(userId);
      this.savePlayer(userId, fresh, now);
    });
  }
  restarts(userId?: number, limit = 100): RestartRow[] {
    const rows = (userId === undefined
      ? this.db.prepare('SELECT r.id, u.username, r.created_at, r.summary FROM restarts r JOIN users u ON u.id = r.user_id ORDER BY r.id DESC LIMIT ?').all(limit)
      : this.db.prepare('SELECT r.id, u.username, r.created_at, r.summary FROM restarts r JOIN users u ON u.id = r.user_id WHERE r.user_id = ? ORDER BY r.id DESC LIMIT ?').all(userId, limit)
    ) as { id: number; username: string; created_at: number; summary: string }[];
    return rows.map((r) => ({ id: r.id, username: r.username, at: r.created_at, summary: JSON.parse(r.summary) as RestartSummary }));
  }
}
