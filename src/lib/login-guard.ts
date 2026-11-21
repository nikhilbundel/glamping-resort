import 'server-only';
import { prisma } from './db';
import { pickClientIp } from './rate-limit';

/**
 * Admin sign-in lockout. Failures are stored in the database (survives restarts), per email and per IP.
 * 3 wrong attempts in a row → that email / IP is locked for 1 hour. A successful sign-in clears the count.
 */
export const MAX_FAILURES = 3;
export const LOCK_MS = 60 * 60_000;

export function loginKeys(email: string, ip: string) {
  return [`email:${email.toLowerCase().trim().slice(0, 180)}`, `ip:${ip.slice(0, 180)}`];
}

/** Client IP. On the VPS nginx must set X-Real-IP (see README → Deploy). */
export function clientIpFrom(headers: Record<string, unknown> | undefined) {
  const h = (k: string) => {
    const v = headers?.[k];
    return Array.isArray(v) ? String(v[0]) : typeof v === 'string' ? v : '';
  };
  return pickClientIp(h('x-real-ip'), h('x-forwarded-for'));
}

/** Milliseconds left on the longest active lock among the keys (0 = not locked). */
export async function lockRemaining(keys: string[]) {
  const rows = await prisma.loginAttempt.findMany({ where: { key: { in: keys }, lockedUntil: { gt: new Date() } }, select: { lockedUntil: true } });
  return rows.reduce((m, r) => Math.max(m, r.lockedUntil!.getTime() - Date.now()), 0);
}

/** Count one failure for every key. Returns ms of lock if this failure caused (or hit) a lock, else 0. */
export async function recordFailure(keys: string[]) {
  const now = new Date();
  // an old, expired lock starts a fresh count
  await prisma.loginAttempt.updateMany({ where: { key: { in: keys }, lockedUntil: { lte: now } }, data: { failures: 0, lockedUntil: null } });
  let locked = 0;
  for (const key of keys) {
    const row = await prisma.loginAttempt.upsert({ where: { key }, create: { key, failures: 1 }, update: { failures: { increment: 1 } } });
    if (row.failures >= MAX_FAILURES) {
      const until = row.lockedUntil && row.lockedUntil > now ? row.lockedUntil : new Date(now.getTime() + LOCK_MS);
      if (!row.lockedUntil || row.lockedUntil <= now) await prisma.loginAttempt.update({ where: { key }, data: { lockedUntil: until } });
      locked = Math.max(locked, until.getTime() - now.getTime());
    }
  }
  return locked;
}

export async function clearFailures(keys: string[]) {
  await prisma.loginAttempt.deleteMany({ where: { key: { in: keys } } });
}

export function lockMessage(ms: number) {
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
}
