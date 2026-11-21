import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { NewPageButton } from '@/components/admin/forms/PageForms';
import { PagesTable } from '@/components/admin/forms/PagesTable';
import { loadFlow } from '@/lib/flow';

export default async function PagesList({ searchParams }: { searchParams: { slug?: string } }) {
  await requirePageUser();
  if (searchParams.slug !== undefined) {
    const p = await prisma.page.findUnique({ where: { slug: searchParams.slug } });
    if (p) redirect(`/admin/pages/${p.id}`);
  }
  const [pages, flow] = await Promise.all([prisma.page.findMany({ include: { sections: { select: { isVisible: true, draftData: true } } } }), loadFlow()]);
  pages.sort((a, b) => flow.order.indexOf(a.slug) - flow.order.indexOf(b.slug));
  const rows = pages.map((p) => ({
    from: flow.linkedFrom(p.slug).map((l) => ({ label: l.label, href: l.adminHref })),
    id: p.id,
    title: p.title,
    slug: p.slug,
    published: p.published,
    noindex: p.noindex,
    sections: p.sections.length,
    hiddenSections: p.sections.filter((s) => !s.isVisible).length,
    drafts: p.sections.filter((s) => s.draftData !== null).length,
    updatedAt: p.updatedAt.toISOString(),
  }));
  return (
    <>
      <PageHeader title="Pages & Sections" description="Listed in the order visitors move through the website: Home first, then the pages its buttons and cards open, then menu pages. Open a page to manage its sections." actions={<NewPageButton />} />
      <PagesTable initial={rows} />
    </>
  );
}
