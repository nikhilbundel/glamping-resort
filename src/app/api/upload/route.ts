import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { storeFile, maxAnyUploadBytes } from '@/lib/media';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Multi-file upload for the media library. Same-origin + session required. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ message: 'Bad origin' }, { status: 403 });
  if (!rateLimit(`upload:${user.id}`, 120, 10 * 60_000).ok) return NextResponse.json({ message: 'Upload limit reached, try again shortly' }, { status: 429 });

  const form = await req.formData();
  const folder = String(form.get('folder') || 'general');
  const alts = form.getAll('alt').map(String);
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ message: 'No files' }, { status: 400 });

  const created = [];
  const errors: string[] = [];
  for (const [i, file] of files.entries()) {
    try {
      if (file.size > maxAnyUploadBytes()) throw new Error('too large');
      const alt = (alts[i] || '').trim() || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      const stored = await storeFile(Buffer.from(await file.arrayBuffer()), file.name, folder);
      created.push(await prisma.media.create({ data: { ...stored, alt, folder } }));
    } catch (e) {
      errors.push(`${file.name}: ${(e as Error).message}`);
    }
  }
  if (created.length) await logActivity(user, 'upload', 'media', null, `Uploaded ${created.length} file(s) to "${folder}"`, { where: 'Media library', note: created.map((m) => `${m.url}  (${m.mime}, alt: "${m.alt}")`).join('\n') });
  return NextResponse.json({ media: created, errors }, { status: created.length ? 200 : 400 });
}
