import { prisma } from './db';
import type { Prisma } from '@prisma/client';
import type { SessionUser } from './auth';

/** One field that changed. `path` is the data key, e.g. "heading" or "items[2].name". */
export type Change = { path: string; from?: unknown; to?: unknown };
/** Extra detail stored with each log entry so the change can be reproduced exactly. */
export type LogDetails = {
  where?: string; // human location, e.g. Home (/) › #4 Split image / text [split]
  changes?: Change[];
  snapshot?: unknown; // full copy of a created / deleted item
  order?: string[]; // new order after a reorder
  note?: string;
};

const MAX_VALUE = 6000; // characters kept per value
const MAX_CHANGES = 400;
const IGNORE = new Set(['updatedAt', 'createdAt', 'passwordHash', '_key']);

/** Trim very long values so one entry can't bloat the database. */
function clip(v: unknown): unknown {
  if (typeof v === 'string') return v.length > MAX_VALUE ? `${v.slice(0, MAX_VALUE)}… [${v.length - MAX_VALUE} more characters]` : v;
  if (v && typeof v === 'object') {
    const s = JSON.stringify(v);
    if (s.length > MAX_VALUE * 3) return `${s.slice(0, MAX_VALUE * 3)}… [truncated]`;
  }
  return v;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v === undefined ? null : v);
/** JSON with object keys sorted, so {a,b} and {b,a} compare equal. */
const stable = (v: unknown): string => {
  v = norm(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
};
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
/** Image / media objects are compared and shown by their URL (plus alt), not every property. */
const isMediaObj = (v: unknown) => isObj(v) && typeof v.url === 'string' && ('alt' in v || 'width' in v || 'publicId' in v);

/** Deep difference between two JSON-like values, field by field. */
export function diff(before: unknown, after: unknown, path = ''): Change[] {
  const out: Change[] = [];
  const walk = (a: unknown, b: unknown, p: string) => {
    if (out.length >= MAX_CHANGES || same(a, b)) return;
    if (isMediaObj(a) || isMediaObj(b)) {
      out.push({ path: p, from: clip(norm(a)), to: clip(norm(b)) });
      return;
    }
    if (isObj(a) && isObj(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (IGNORE.has(k)) continue;
        walk(a[k], b[k], p ? `${p}.${k}` : k);
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      // simple lists of words/numbers: show the whole list
      if ([...a, ...b].every((x) => !x || typeof x !== 'object')) {
        out.push({ path: p, from: a, to: b });
        return;
      }
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) walk(a[i], b[i], `${p}[${i}]`);
      return;
    }
    out.push({ path: p || '(value)', from: clip(norm(a)), to: clip(norm(b)) });
  };
  walk(before, after, path);
  return out;
}

/** Copy of a record without noise (timestamps, password hashes) and with long values trimmed. */
export function snapshot(rec: unknown): unknown {
  if (Array.isArray(rec)) return rec.map(snapshot);
  if (!isObj(rec)) return clip(norm(rec));
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) if (!IGNORE.has(k)) o[k] = isObj(v) || Array.isArray(v) ? snapshot(v) : clip(norm(v));
  return o;
}

export async function logActivity(user: SessionUser | null, action: string, entity: string, entityId: string | null, summary: string, details?: LogDetails) {
  const base = { userId: user?.id, userName: user?.name || 'system', action, entity, entityId, summary };
  try {
    await prisma.activityLog.create({ data: { ...base, ...(details ? { details: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue } : {}) } });
  } catch (e) {
    // If the database hasn't been migrated yet (no "details" column), still keep the summary line.
    try {
      if (details) await prisma.activityLog.create({ data: base });
      else throw e;
    } catch (e2) {
      console.error('activity log failed', e2);
    }
  }
}

const KEEP = 10;

/** Store a snapshot and keep only the latest 10 per entity. */
export async function saveRevision(entityType: string, entityId: string, data: unknown, user: SessionUser | null) {
  await prisma.revision.create({ data: { entityType, entityId, data: data as Prisma.InputJsonValue, userName: user?.name || 'system' } });
  const old = await prisma.revision.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    skip: KEEP,
    select: { id: true },
  });
  if (old.length) await prisma.revision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}
