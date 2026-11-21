import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { UsersManager } from '@/components/admin/forms/AdminTables';

export default async function UsersPage() {
  const me = await requirePageUser('SUPER_ADMIN');
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true } });
  return (
    <>
      <PageHeader title="Users & Roles" />
      <UsersManager initial={users} me={me.id} />
    </>
  );
}
