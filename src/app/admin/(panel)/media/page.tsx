import { requirePageUser } from '@/lib/auth';
import { cloudinaryEnabled } from '@/lib/media';
import { PageHeader } from '@/components/admin/ui';
import { MediaLibrary } from '@/components/admin/media/MediaLibrary';

export default async function MediaPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageHeader title="Media Library" description={`Storage: ${cloudinaryEnabled() ? 'Cloudinary' : 'local /public/uploads (set Cloudinary env vars for cloud storage)'}`} />
      <MediaLibrary role={user.role} />
    </>
  );
}
