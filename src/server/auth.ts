import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Session tokens are stored hashed, so a copied database can't be used to log in. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Invite codes like "SNOW-7K3Q-PX9D": easy to read out loud, no 0/O or 1/I. */
export function newInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = [...randomBytes(8)].map((b) => alphabet[b % alphabet.length]).join('');
  return `SNOW-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function validUsername(u: unknown): u is string {
  return typeof u === 'string' && /^[A-Za-z0-9_-]{3,20}$/.test(u);
}

export function validPassword(p: unknown): p is string {
  return typeof p === 'string' && p.length >= 8 && p.length <= 200;
}
