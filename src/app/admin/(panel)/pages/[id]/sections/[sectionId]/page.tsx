import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { loadFlow } from '@/lib/flow';
import { SECTION_SOURCES } from '@/lib/links';
import { SECTION_MAP } from '@/lib/sections';
import { Card } from '@/components/admin/ui';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { loadOptions } from '@/lib/options';
import { getSectionDef } from '@/lib/sections';
import { PageHeader } from '@/components/admin/ui';
import { SectionEditor } from '@/components/admin/forms/SectionEditor';

export default async function SectionPage({ params }: { params: { id: string; sectionId: string } }) {
  await requirePageUser();
  const section = await prisma.section.findFirst({ where: { id: params.sectionId, pageId: params.id }, include: { page: true } });
  if (!section) notFound();
  const def = getSectionDef(section.type);
  const [options, revisions, flow, siblings] = await Promise.all([
    loadOptions(def?.fields || []),
    prisma.revision.findMany({ where: { entityType: 'section', entityId: section.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    loadFlow(),
    prisma.section.findMany({ where: { pageId: section.pageId }, orderBy: { order: 'asc' }, select: { id: true, type: true, label: true } }),
  ]);
  const opens = flow.sectionLinks(section.type, section.draftData || section.data);
  const sources = SECTION_SOURCES[section.type] || [];
  const idx = siblings.findIndex((x) => x.id === section.id);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  const nm = (x: { type: string; label: string | null }) => x.label || SECTION_MAP[x.type]?.label || x.type;
  const chip = 'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium';
  const aside = (
    <Card title="Where this section leads" className="h-fit" >
      <div data-testid="section-flow" className="space-y-4">
        <p className="text-xs text-zinc-500">Section {idx + 1} of {siblings.length} on <b>{section.page.title}</b></p>
        <div className="flex gap-2">
          {prev ? <Link href={`/admin/pages/${section.pageId}/sections/${prev.id}`} className="flex-1 truncate rounded-lg border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-800"><ChevronUp className="inline h-3.5 w-3.5" /> {nm(prev)}</Link> : <span className="flex-1" />}
          {next ? <Link href={`/admin/pages/${section.pageId}/sections/${next.id}`} className="flex-1 truncate rounded-lg border border-zinc-200 px-2 py-1.5 text-right text-xs hover:bg-zinc-50 dark:border-zinc-800">{nm(next)} <ChevronDown className="inline h-3.5 w-3.5" /></Link> : <span className="flex-1" />}
        </div>
        {opens.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Buttons & cards open</p>
            <ul className="space-y-1.5">
              {opens.map((l) => (
                <li key={l.adminHref}><Link href={l.adminHref} className={`${chip} border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200`}><span className="min-w-0 truncate">{l.label} <span className="block truncate font-mono text-[11px] font-normal opacity-70">{l.path}</span></span><ArrowRight className="h-4 w-4 shrink-0" /></Link></li>
              ))}
            </ul>
          </div>
        )}
        {sources.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Items shown here are edited in</p>
            <ul className="space-y-1.5">
              {sources.map((l) => (
                <li key={l.href}><Link href={l.href} className={`${chip} border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200`}>{l.label}<ArrowRight className="h-4 w-4 shrink-0" /></Link></li>
              ))}
            </ul>
          </div>
        )}
        {!opens.length && !sources.length && <p className="text-sm text-zinc-500">This section doesn’t link to another page.</p>}
      </div>
    </Card>
  );
  return (
    <>
      <PageHeader
        back={<Link href={`/admin/pages/${section.pageId}`} className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="h-4 w-4" /> {section.page.title}</Link>}
        title={section.label || def?.label || section.type}
        description={section.isVisible ? 'Visible on the live page' : 'Hidden — switch it on in the sections list after publishing'}
      />
      <SectionEditor
        section={{ id: section.id, type: section.type, label: section.label, data: section.data as Record<string, unknown>, draftData: section.draftData as Record<string, unknown> | null }}
        pagePath={`/${section.page.slug}`}
        options={options}
        revisions={revisions.map((r) => ({ id: r.id, userName: r.userName, createdAt: r.createdAt.toISOString() }))}
        aside={aside}
      />
    </>
  );
}
