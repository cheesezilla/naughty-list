import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { JournalEntry, PlayerState } from '../engine/index.js';

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
`;

export interface UserRow { id: number; username: string; password_hash: string; is_admin: number; created_at: number }
export interface InviteRow { code: string; created_at: number; used_by: number | null; used_at: number | null; used_by_name: string | null }
export interface JournalRow { n: number; at: number; entry: JournalEntry }

const JOURNAL_KEEP = 200;

/** All storage for the game. One SQLite file; every call is synchronous, so each request is atomic. */
export class Store {
  readonly db: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    this.db.exec(SCHEMA);
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

  // ----- invites -----
  createInvite(code: string, createdBy: number, now: number) {
    this.db.prepare('INSERT INTO invites (code, created_by, created_at) VALUES (?, ?, ?)').run(code, createdBy, now);
  }
  useInvite(code: string, userId: number, now: number): boolean {
    const r = this.db.prepare('UPDATE invites SET used_by = ?, used_at = ? WHERE code = ? AND used_by IS NULL').run(userId, now, code);
    return Number(r.changes) === 1;
  }
  inviteIsOpen(code: string): boolean {
    return this.db.prepare('SELECT 1 AS ok FROM invites WHERE code = ? AND used_by IS NULL').get(code) !== undefined;
  }
  listInvites(): InviteRow[] {
    return this.db.prepare(
      'SELECT i.code, i.created_at, i.used_by, i.used_at, u.username AS used_by_name FROM invites i LEFT JOIN users u ON u.id = i.used_by ORDER BY i.created_at DESC',
    ).all() as unknown as InviteRow[];
  }
  revokeInvite(code: string): boolean {
    return Number(this.db.prepare('DELETE FROM invites WHERE code = ? AND used_by IS NULL').run(code).changes) === 1;
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

  // ----- journal -----
  addJournal(userId: number, huntNo: number, entry: JournalEntry, now: number) {
    this.db.prepare('INSERT INTO journal (user_id, hunt_no, created_at, entry) VALUES (?, ?, ?, ?)').run(userId, huntNo, now, JSON.stringify(entry));
    this.db.prepare(
      'DELETE FROM journal WHERE user_id = ? AND id NOT IN (SELECT id FROM journal WHERE user_id = ? ORDER BY id DESC LIMIT ?)',
    ).run(userId, userId, JOURNAL_KEEP);
  }
  journal(userId: number, limit = 50): JournalRow[] {
    const rows = this.db.prepare('SELECT hunt_no, created_at, entry FROM journal WHERE user_id = ? ORDER BY id DESC LIMIT ?')
      .all(userId, limit) as { hunt_no: number; created_at: number; entry: string }[];
    return rows.map((r) => ({ n: r.hunt_no, at: r.created_at, entry: JSON.parse(r.entry) as JournalEntry }));
  }
}
