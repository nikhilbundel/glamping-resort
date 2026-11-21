import type { ReactNode } from 'react';
import { requirePageUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser();
  const newEnquiries = await prisma.enquiry.count({ where: { status: 'NEW' } });
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }} newEnquiries={newEnquiries}>
      {children}
    </AdminShell>
  );
}
