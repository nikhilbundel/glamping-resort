import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { Card, PageHeader } from '@/components/admin/ui';
import { SectionsManager } from '@/components/admin/forms/SectionsManager';
import { PageMetaForm } from '@/components/admin/forms/PageForms';
import { SECTION_MAP } from '@/lib/sections';
import { asArray } from '@/lib/utils';
import { loadFlow } from '@/lib/flow';
import { SECTION_SOURCES } from '@/lib/links';
import { ArrowLeftCircle } from 'lucide-react';

function summarize(data: Record<string, unknown>) {
  const slides = asArray<{ heading?: string }>(data.slides);
  return String(data.heading || slides[0]?.heading || data.eyebrow || '').slice(0, 80);
}

export default async function PageEditor({ params }: { params: { id: string } }) {
  await requirePageUser();
  const page = await prisma.page.findUnique({ where: { id: params.id }, include: { sections: { orderBy: { order: 'asc' } } } });
  if (!page) notFound();
  const flow = await loadFlow();
  const rows = page.sections.map((s) => {
    const d = (s.draftData || s.data) as Record<string, unknown>;
    return {
      id: s.id, type: s.type, label: s.label || SECTION_MAP[s.type]?.label || s.type, isVisible: s.isVisible, hasDraft: s.draftData !== null, summary: summarize(d),
      showOn: String(d?.showOn || 'always'),
      opens: flow.sectionLinks(s.type, d).map((l) => ({ label: l.label, href: l.adminHref, path: l.path })),
      sources: SECTION_SOURCES[s.type] || [],
    };
  });
  const linkedFrom = flow.linkedFrom(page.slug);
  const path = `/${page.slug}`;
  return (
    <>
      <PageHeader
        back={<Link href="/admin/pages" className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="h-4 w-4" /> All pages</Link>}
        title={page.title}
        description={<span className="font-mono">{path}</span>}
        actions={<a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">View live <ExternalLink className="h-4 w-4" /></a>}
      />
      {linkedFrom.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200" data-testid="linked-from">
          <ArrowLeftCircle className="h-4 w-4" /> <span className="font-medium">Visitors reach this page from:</span>
          {linkedFrom.map((l) => (
            <Link key={l.adminHref} href={l.adminHref} className="rounded-full border border-sky-300 bg-white px-2.5 py-0.5 font-medium hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950">← {l.label}</Link>
          ))}
        </div>
      )}
      <div className="grid gap-6 2xl:grid-cols-[1fr_520px]">
        <SectionsManager pageId={page.id} pagePath={path} initial={rows} />
        <Card title="Page settings & SEO" className="h-fit">
          <PageMetaForm
            id={page.id}
            isSystem={page.isSystem}
            values={{ title: page.title, slug: page.slug, published: page.published, seoTitle: page.seoTitle || '', seoDescription: page.seoDescription || '', ogImage: page.ogImage || null, canonical: page.canonical || '', noindex: page.noindex }}
          />
        </Card>
      </div>
    </>
  );
}
