import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { SubscribersTable } from '@/components/admin/forms/AdminTables';

export default async function SubscribersPage() {
  await requirePageUser();
  const rows = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <PageHeader title="Newsletter subscribers" description="People who signed up in the footer or a newsletter section." />
      <SubscribersTable initial={rows} />
    </>
  );
}
