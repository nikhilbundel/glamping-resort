import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { ChangePassword } from '@/components/admin/forms/AdminTables';

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email}`} />
      <ChangePassword />
    </>
  );
}
