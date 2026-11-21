import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { requireUser } from '@/lib/auth';
import { BACKUP_DIR } from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Download one of the backups saved on the server (e.g. the automatic copy made before a restore). */
export async function GET(req: Request) {
  try {
    await requireUser('SUPER_ADMIN');
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
  const name = new URL(req.url).searchParams.get('name') || '';
  if (!/^[\w.-]+\.zip$/.test(name)) return new Response('Bad name', { status: 400 });
  const file = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(file)) return new Response('Not found', { status: 404 });
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${name}"`, 'Content-Length': String(fs.statSync(file).size) },
  });
}
