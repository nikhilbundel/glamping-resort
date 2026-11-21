import 'server-only';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { PassThrough, type Writable } from 'node:stream';
import archiver from 'archiver';
import yauzl from 'yauzl';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { UPLOAD_DIR } from './media';

/**
 * Full-site backup / restore.
 * ZIP layout:  manifest.json · data/<Model>.json (one per table) · uploads/<folder>/<file> (local media files)
 * The table list and field types are read from the Prisma schema, so new tables / fields are included automatically.
 */

export const BACKUP_APP = 'glamping-resort-backup';
export const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');

export type BackupOptions = { media: boolean; customers: boolean; history: boolean; users: boolean };
export type Manifest = {
  app: string;
  version: 1;
  createdAt: string;
  site: string;
  includes: BackupOptions;
  counts: Record<string, number>;
  mediaFiles: number;
  mediaBytes: number;
};

type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];
const MODELS = Prisma.dmmf.datamodel.models as readonly DmmfModel[];
const USERS = new Set(['User']);
const CUSTOMERS = new Set(['Enquiry', 'Subscriber', 'Booking']); // guests' personal details
const HISTORY = new Set(['ActivityLog', 'Revision']);

const delegate = (name: string) => (prisma as unknown as Record<string, { findMany: (a?: unknown) => Promise<Record<string, unknown>[]>; createMany: (a: unknown) => Promise<unknown>; deleteMany: (a?: unknown) => Promise<unknown>; update: (a: unknown) => Promise<unknown> }>)[name.charAt(0).toLowerCase() + name.slice(1)];

type DmmfField = DmmfModel['fields'][number];
/** The foreign-key column of a relation field (e.g. Section.page → "pageId"). Falls back to the "<name>Id" convention
 *  for Prisma versions whose schema description leaves relationFromFields out. */
function fkOf(m: DmmfModel, f: DmmfField): string | undefined {
  if (f.kind !== 'object') return undefined;
  if (f.relationFromFields?.length) return f.relationFromFields[0];
  if (f.relationFromFields && !f.relationFromFields.length) return undefined;
  const guess = `${f.name}Id`;
  return m.fields.some((x) => x.name === guess && x.kind === 'scalar') ? guess : undefined;
}
const backField = (f: DmmfField) => MODELS.find((x) => x.name === f.type)?.fields.find((x) => x.relationName === f.relationName && x.name !== f.name);

/** Many-to-many relation fields (e.g. Post.tags) — stored as id lists and re-connected after insert. */
function m2mFields(m: DmmfModel) {
  return m.fields.filter((f) => {
    if (f.kind !== 'object' || fkOf(m, f) || f.isList === false) return false;
    const other = MODELS.find((x) => x.name === f.type);
    const back = backField(f);
    return !!other && !!back && !fkOf(other, back) && back.isList !== false;
  });
}

/** Parents before children (a Section needs its Page first). */
function insertOrder(): DmmfModel[] {
  const deps = new Map(MODELS.map((m) => [m.name, new Set(m.fields.filter((f) => fkOf(m, f) && f.type !== m.name).map((f) => f.type))]));
  const out: DmmfModel[] = [];
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    deps.get(name)?.forEach(visit);
    out.push(MODELS.find((m) => m.name === name)!);
  };
  MODELS.forEach((m) => visit(m.name));
  return out;
}

const included = (name: string, o: BackupOptions) => (USERS.has(name) ? o.users : CUSTOMERS.has(name) ? o.customers : HISTORY.has(name) ? o.history : true);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/** Write a backup ZIP into `target` (an HTTP response stream or a file). */
export async function writeBackup(target: Writable, opts: BackupOptions) {
  const zip = archiver('zip', { zlib: { level: 6 } });
  const done = new Promise<void>((resolve, reject) => {
    target.on('finish', resolve);
    target.on('close', resolve);
    zip.on('error', reject);
  });
  zip.on('warning', (e: Error) => console.warn('backup warning', e));
  zip.pipe(target);

  const counts: Record<string, number> = {};
  for (const m of MODELS) {
    if (!included(m.name, opts)) continue;
    const rel = m2mFields(m);
    const include = rel.length ? Object.fromEntries(rel.map((f) => [f.name, { select: { id: true } }])) : undefined;
    const rows = await delegate(m.name).findMany(include ? { include } : undefined);
    const data = rows.map((r) => {
      if (!rel.length) return r;
      const o: Record<string, unknown> = { ...r, __m2m: {} };
      for (const f of rel) {
        (o.__m2m as Record<string, string[]>)[f.name] = ((r[f.name] as { id: string }[]) || []).map((x) => x.id);
        delete o[f.name];
      }
      return o;
    });
    counts[m.name] = data.length;
    zip.append(JSON.stringify(data), { name: `data/${m.name}.json` });
  }

  let mediaFiles = 0;
  let mediaBytes = 0;
  if (opts.media) {
    for (const file of await walk(UPLOAD_DIR)) {
      const stat = await fsp.stat(file);
      mediaFiles++;
      mediaBytes += stat.size;
      // photos / videos are already compressed — store them as-is (much faster)
      const store = /\.(mp4|webm|mov|m4v|jpe?g|png|webp|avif|gif|zip)$/i.test(file);
      zip.file(file, { name: `uploads/${path.relative(UPLOAD_DIR, file).split(path.sep).join('/')}`, ...(store ? { store: true } : {}) } as archiver.EntryData);
    }
  }

  const general = await prisma.setting.findUnique({ where: { key: 'general' } });
  const manifest: Manifest = {
    app: BACKUP_APP,
    version: 1,
    createdAt: new Date().toISOString(),
    site: String((general?.value as { siteName?: string } | null)?.siteName || 'Website'),
    includes: opts,
    counts,
    mediaFiles,
    mediaBytes,
  };
  zip.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  await zip.finalize();
  await done;
  return manifest;
}

/** Backup straight into a web Response body (streams — big video folders never sit in memory). */
export function backupResponseStream(opts: BackupOptions) {
  const pass = new PassThrough();
  writeBackup(pass, opts).catch((e) => pass.destroy(e));
  return pass;
}

/** Saves a backup file on the server (used automatically before every restore). */
export async function saveBackupToDisk(prefix: string, opts: BackupOptions) {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const name = `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`;
  const file = path.join(BACKUP_DIR, name);
  await writeBackup(fs.createWriteStream(file), opts);
  return name;
}

export async function listSavedBackups() {
  try {
    const names = (await fsp.readdir(BACKUP_DIR)).filter((n) => n.endsWith('.zip'));
    const rows = await Promise.all(names.map(async (name) => ({ name, ...(await fsp.stat(path.join(BACKUP_DIR, name)).then((s) => ({ size: s.size, at: s.mtime.toISOString() }))) })));
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  } catch {
    return [];
  }
}

// ───────────────────────────── Restore ─────────────────────────────

type ZipFile = yauzl.ZipFile;
const openZip = (file: string) => new Promise<ZipFile>((res, rej) => yauzl.open(file, { lazyEntries: true, autoClose: false }, (e, z) => (e || !z ? rej(e || new Error('Could not open ZIP')) : res(z))));
const readStream = (z: ZipFile, entry: yauzl.Entry) => new Promise<NodeJS.ReadableStream>((res, rej) => z.openReadStream(entry, (e, s) => (e || !s ? rej(e) : res(s))));
async function readText(z: ZipFile, entry: yauzl.Entry) {
  const chunks: Buffer[] = [];
  for await (const c of (await readStream(z, entry)) as AsyncIterable<Buffer>) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}
async function entries(z: ZipFile) {
  const list: yauzl.Entry[] = [];
  await new Promise<void>((res, rej) => {
    z.on('entry', (e: yauzl.Entry) => {
      list.push(e);
      z.readEntry();
    });
    z.on('end', res);
    z.on('error', rej);
    z.readEntry();
  });
  return list;
}

/** Convert one backed-up row into data Prisma accepts for the CURRENT schema (unknown old columns are skipped). */
function toCreate(m: DmmfModel, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of m.fields) {
    if (f.kind !== 'scalar' && f.kind !== 'enum') continue;
    if (!(f.name in row)) continue;
    let v = row[f.name];
    if (f.type === 'Json') v = v === null ? (f.isRequired ? Prisma.JsonNull : Prisma.DbNull) : v;
    else if (f.type === 'DateTime' && typeof v === 'string') v = new Date(v);
    else if (f.type === 'BigInt' && (typeof v === 'string' || typeof v === 'number')) v = BigInt(v);
    out[f.name] = v;
  }
  return out;
}

export type RestoreOptions = { media: boolean; customers: boolean; users: boolean; history: boolean };
export type RestoreResult = { manifest: Manifest; tables: Record<string, number>; mediaFiles: number; safetyBackup: string };

/** Read a backup ZIP from disk and replace the site's content with it. */
export async function restoreFromZip(zipPath: string, opts: RestoreOptions): Promise<RestoreResult> {
  const z = await openZip(zipPath);
  try {
    const list = await entries(z);
    const manEntry = list.find((e) => e.fileName === 'manifest.json');
    if (!manEntry) throw new Error('This is not a website backup (manifest.json missing).');
    const manifest = JSON.parse(await readText(z, manEntry)) as Manifest;
    if (manifest.app !== BACKUP_APP) throw new Error('This ZIP is not a backup made by this website.');

    // Read all table data first (validates the file before anything is deleted).
    const data = new Map<string, Record<string, unknown>[]>();
    for (const e of list) {
      const m = /^data\/(\w+)\.json$/.exec(e.fileName);
      if (!m) continue;
      const model = MODELS.find((x) => x.name === m[1]);
      if (!model) continue; // table no longer exists
      data.set(model.name, JSON.parse(await readText(z, e)));
    }
    if (!data.size) throw new Error('The backup contains no data.');

    const restoreTable = (name: string) => data.has(name) && (USERS.has(name) ? opts.users : CUSTOMERS.has(name) ? opts.customers : HISTORY.has(name) ? opts.history : true);
    if (opts.users && !(data.get('User') || []).some((u) => u.role === 'SUPER_ADMIN' && u.active !== false)) throw new Error('The backup has no active Super Admin login — restoring its users would lock you out. Untick “admin logins”.');

    // Safety copy of the current site (content + logins, no media) before anything changes.
    const safetyBackup = await saveBackupToDisk('before-restore', { media: false, customers: true, history: true, users: true });

    const order = insertOrder();
    const tables: Record<string, number> = {};
    await prisma.$transaction(
      async (tx) => {
        const t = (name: string) => (tx as unknown as Record<string, ReturnType<typeof delegate>>)[name.charAt(0).toLowerCase() + name.slice(1)];
        // Tables we keep (e.g. bookings when "guest data" is unticked) but that point at tables being replaced:
        // set their rows aside, then put back those whose parent still exists afterwards.
        const restored = new Set(order.filter((m) => restoreTable(m.name)).map((m) => m.name));
        const keep = new Map<string, { rows: Record<string, unknown>[]; fks: { field: string; model: string }[] }>();
        for (const m of order) {
          if (restored.has(m.name)) continue;
          const fks = m.fields.filter((f) => fkOf(m, f) && restored.has(f.type)).map((f) => ({ field: fkOf(m, f)!, model: f.type }));
          if (!fks.length) continue;
          keep.set(m.name, { rows: await t(m.name).findMany(), fks });
          await t(m.name).deleteMany();
        }
        for (const m of [...order].reverse()) if (restoreTable(m.name)) await t(m.name).deleteMany();
        for (const m of order) {
          if (!restoreTable(m.name)) continue;
          const rows = (data.get(m.name) || []).map((r) => toCreate(m, r));
          for (let i = 0; i < rows.length; i += 200) await t(m.name).createMany({ data: rows.slice(i, i + 200) });
          tables[m.name] = rows.length;
        }
        for (const [name, k] of keep) {
          const m = MODELS.find((x) => x.name === name)!;
          const ok: Record<string, unknown>[] = [];
          for (const r of k.rows) {
            let exists = true;
            for (const fk of k.fks) if (r[fk.field] && !(data.get(fk.model) || []).some((x) => x.id === r[fk.field])) exists = false;
            if (exists) ok.push(toCreate(m, JSON.parse(JSON.stringify(r))));
          }
          for (let i = 0; i < ok.length; i += 200) await t(name).createMany({ data: ok.slice(i, i + 200) });
          if (ok.length < k.rows.length) console.warn(`restore: ${k.rows.length - ok.length} ${name} rows dropped (their room is not in the backup)`);
        }
        // re-connect many-to-many links (e.g. blog post ↔ tags)
        for (const m of order) {
          const rel = m2mFields(m);
          if (!rel.length || !restoreTable(m.name)) continue;
          for (const r of data.get(m.name) || []) {
            const links = r.__m2m as Record<string, string[]> | undefined;
            if (!links) continue;
            const upd = Object.fromEntries(rel.filter((f) => links[f.name]?.length).map((f) => [f.name, { connect: links[f.name].map((id) => ({ id })) }]));
            if (Object.keys(upd).length) await t(m.name).update({ where: { id: r.id }, data: upd });
          }
        }
      },
      { timeout: 10 * 60_000, maxWait: 30_000 },
    );

    // Media files (added / overwritten — existing files that aren't in the backup are kept).
    let mediaFiles = 0;
    if (opts.media) {
      const root = path.resolve(UPLOAD_DIR);
      for (const e of list) {
        if (!e.fileName.startsWith('uploads/') || e.fileName.endsWith('/')) continue;
        const dest = path.resolve(root, e.fileName.slice('uploads/'.length));
        if (!dest.startsWith(root + path.sep)) continue; // never write outside the uploads folder
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await new Promise<void>((res, rej) => {
          readStream(z, e)
            .then((s) => s.pipe(fs.createWriteStream(dest)).on('finish', () => res()).on('error', rej))
            .catch(rej);
        });
        mediaFiles++;
      }
    }
    return { manifest, tables, mediaFiles, safetyBackup };
  } finally {
    z.close();
  }
}

/** Stream an uploaded request body to a temporary file (no size limit, nothing held in memory). */
export async function bodyToTempFile(body: ReadableStream<Uint8Array>) {
  const file = path.join(os.tmpdir(), `restore-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
  const out = fs.createWriteStream(file);
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!out.write(value)) await new Promise<void>((r) => out.once('drain', () => r()));
  }
  await new Promise<void>((res, rej) => out.end((e?: Error | null) => (e ? rej(e) : res())));
  return file;
}
