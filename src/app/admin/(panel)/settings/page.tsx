import { requirePageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { PageHeader } from '@/components/admin/ui';
import { SettingsTabs } from '@/components/admin/forms/SettingsTabs';

export default async function SettingsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await requirePageUser();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Site Settings" description="Global details used across the whole website." />
      <SettingsTabs values={s as unknown as Record<string, Record<string, unknown>>} role={user.role} initial={searchParams.tab} />
    </>
  );
}
