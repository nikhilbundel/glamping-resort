import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';
import { requireUser } from '@/lib/auth';
import { backupResponseStream, bodyToTempFile, restoreFromZip } from '@/lib/backup';
import { logActivity } from '@/lib/audit';
import { revalidateSite } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 600;

const flag = (sp: URLSearchParams, k: string, d: boolean) => (sp.has(k) ? sp.get(k) === '1' : d);

/** Download a backup ZIP. ?media=1&customers=1&history=1&users=0 */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser('SUPER_ADMIN');
  } catch {
    return new Response('Only a Super Admin can download backups.', { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const opts = { media: flag(sp, 'media', true), customers: flag(sp, 'customers', true), history: flag(sp, 'history', true), users: flag(sp, 'users', false) };
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  await logActivity(user, 'backup', 'site', null, `Downloaded a backup (${[opts.media ? 'with media' : 'no media', opts.customers ? 'with enquiries' : 'no enquiries', opts.users ? 'with logins' : 'no logins'].join(', ')})`);
  return new Response(Readable.toWeb(backupResponseStream(opts)) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="site-backup-${stamp}${opts.media ? '' : '-content-only'}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Restore: the request body is the backup ZIP itself. ?media=1&customers=1&history=1&users=0 */
export async function PUT(req: Request) {
  let user;
  try {
    user = await requireUser('SUPER_ADMIN');
  } catch {
    return Response.json({ message: 'Only a Super Admin can restore backups.' }, { status: 403 });
  }
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return Response.json({ message: 'Bad origin' }, { status: 403 });
  if (!req.body) return Response.json({ message: 'No file received.' }, { status: 400 });
  const sp = new URL(req.url).searchParams;
  let tmp = '';
  try {
    tmp = await bodyToTempFile(req.body);
    const result = await restoreFromZip(tmp, { media: flag(sp, 'media', true), customers: flag(sp, 'customers', true), history: flag(sp, 'history', true), users: flag(sp, 'users', false) });
    const total = Object.values(result.tables).reduce((a, b) => a + b, 0);
    await logActivity(user, 'restore', 'site', null, `Restored backup from ${result.manifest.createdAt.slice(0, 16).replace('T', ' ')} (${total} records, ${result.mediaFiles} media files)`, {
      note: `Backup of "${result.manifest.site}". Safety copy of the previous site saved as storage/backups/${result.safetyBackup}`,
    });
    revalidateSite();
    return Response.json(result);
  } catch (e) {
    console.error('restore failed', e);
    return Response.json({ message: (e as Error).message || 'Restore failed' }, { status: 400 });
  } finally {
    if (tmp) await fsp.rm(tmp, { force: true });
  }
}
