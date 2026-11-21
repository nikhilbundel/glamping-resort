import fsp from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { UPLOAD_DIR } from '@/lib/media';
import { listSavedBackups } from '@/lib/backup';
import { PageHeader } from '@/components/admin/ui';
import { BackupRestore } from '@/components/admin/forms/BackupRestore';

export const dynamic = 'force-dynamic';

async function folderSize(dir: string): Promise<{ files: number; bytes: number }> {
  let files = 0;
  let bytes = 0;
  try {
    for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const s = await folderSize(p);
        files += s.files;
        bytes += s.bytes;
      } else if (e.isFile()) {
        files++;
        bytes += (await fsp.stat(p)).size;
      }
    }
  } catch {}
  return { files, bytes };
}

export default async function BackupPage() {
  await requirePageUser('SUPER_ADMIN');
  const [pages, sections, media, enquiries, subscribers, users, uploads, saved, bookings] = await Promise.all([
    prisma.page.count(),
    prisma.section.count(),
    prisma.media.count(),
    prisma.enquiry.count(),
    prisma.subscriber.count(),
    prisma.user.count(),
    folderSize(UPLOAD_DIR),
    listSavedBackups(),
    prisma.booking.count(),
  ]);
  return (
    <>
      <PageHeader
        title="Backup & Restore"
        description="Download everything on the website as one ZIP file — pages, sections, stays, activities, menus, theme, settings and (optionally) your uploaded photos & videos. Restore loads a backup into this website."
      />
      <BackupRestore stats={{ pages, sections, media, enquiries, subscribers, bookings, users, uploadFiles: uploads.files, uploadBytes: uploads.bytes }} saved={saved} />
    </>
  );
}
