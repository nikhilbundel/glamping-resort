import { requirePageUser } from '@/lib/auth';
import { getTheme } from '@/lib/data';
import { PageHeader } from '@/components/admin/ui';
import { ThemeEditor } from '@/components/admin/forms/ThemeEditor';

export default async function ThemePage() {
  await requirePageUser('SUPER_ADMIN');
  const theme = await getTheme();
  return (
    <>
      <PageHeader title="Theme" description="Colors, fonts and shape for the public site. Changes apply site-wide when saved." />
      <ThemeEditor initial={theme} />
    </>
  );
}
