import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { EnquiriesTable } from '@/components/admin/forms/EnquiriesTable';

export default async function EnquiriesPage() {
  await requirePageUser();
  const rows = await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 2000 });
  return (
    <>
      <PageHeader title="Enquiries" description="Booking enquiries from the website. Update the status as you follow up." />
      <EnquiriesTable initial={rows} />
    </>
  );
}
