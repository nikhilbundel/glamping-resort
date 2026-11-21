import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { COLLECTION_MAP } from '@/lib/collections';
import { fromDb, getCollection, includeFor } from '@/lib/collections-server';
import { loadOptions } from '@/lib/options';
import { defaults } from '@/lib/fields';
import { PageHeader } from '@/components/admin/ui';
import { RecordEditor } from '@/components/admin/forms/RecordEditor';

export default async function RecordPage({ params, searchParams }: { params: { key: string; id: string }; searchParams: Record<string, string> }) {
  await requirePageUser();
  const def = COLLECTION_MAP[params.key];
  if (!def) notFound();
  const { model } = getCollection(params.key);
  const isNew = params.id === 'new';
  let values: Record<string, unknown>;
  if (isNew) {
    values = defaults(def.fields);
    if (def.publishField === 'published') values.published = true;
    if (params.key === 'posts') values.status = 'DRAFT';
    if (params.key === 'testimonials') values.rating = 5;
    // allow pre-filling relations, e.g. ?stayId=…
    for (const [k, v] of Object.entries(searchParams)) if (k in values) values[k] = v;
  } else {
    const row = await model.findUnique({ where: { id: params.id }, include: includeFor(params.key) });
    if (!row) notFound();
    values = fromDb(def, row);
  }
  const [options, revisions] = await Promise.all([
    loadOptions(def.fields),
    def.revisions && !isNew ? prisma.revision.findMany({ where: { entityType: 'post', entityId: params.id }, orderBy: { createdAt: 'desc' }, take: 10 }) : Promise.resolve([]),
  ]);
  const view = !isNew && def.viewUrl ? def.viewUrl(values) : null;
  return (
    <>
      <PageHeader
        back={<Link href={`/admin/collections/${def.key}`} className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="h-4 w-4" /> {def.label}</Link>}
        title={isNew ? `New ${def.singular.toLowerCase()}` : String(values[def.titleField] || def.singular)}
      />
      <RecordEditor
        collectionKey={def.key}
        id={isNew ? null : params.id}
        values={JSON.parse(JSON.stringify(values))}
        options={options}
        viewUrl={view}
        revisions={revisions.map((r) => ({ id: r.id, userName: r.userName, createdAt: r.createdAt.toISOString() }))}
      />
    </>
  );
}
