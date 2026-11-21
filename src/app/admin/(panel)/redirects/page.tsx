import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { RedirectsManager } from '@/components/admin/forms/AdminTables';

export default async function RedirectsPage() {
  await requirePageUser();
  const rows = await prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <PageHeader title="Redirects" description="Send old URLs to new ones with 301 (permanent) or 302 (temporary) redirects." />
      <RedirectsManager initial={rows} />
    </>
  );
}
