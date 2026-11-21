import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { requirePageUser } from '@/lib/auth';
import { COLLECTION_MAP } from '@/lib/collections';
import { getCollection } from '@/lib/collections-server';
import { loadSource } from '@/lib/options';
import type { OptionSource } from '@/lib/fields';
import { PageHeader } from '@/components/admin/ui';
import { CollectionTable } from '@/components/admin/forms/CollectionTable';

export default async function CollectionList({ params }: { params: { key: string } }) {
  await requirePageUser();
  const def = COLLECTION_MAP[params.key];
  if (!def) notFound();
  const { model } = getCollection(params.key);
  const orderBy = def.orderable ? { order: 'asc' } : params.key === 'posts' ? [{ publishedAt: 'desc' }, { createdAt: 'desc' }] : { createdAt: 'desc' };
  const rows = (await model.findMany({ orderBy })) as (Record<string, unknown> & { id: string })[];

  const relations: Record<string, Record<string, string>> = {};
  const filterOptions: Record<string, { value: string; label: string }[]> = {};
  const relFields = new Set([...(def.columns || []).filter((c) => c.kind === 'relation').map((c) => c.name), ...(def.filters || []).map((f) => f.name)]);
  for (const name of relFields) {
    const field = def.fields.find((f) => f.name === name);
    const source = field && 'source' in field ? (field.source as OptionSource | undefined) : undefined;
    if (!source) continue;
    const opts = await loadSource(source);
    relations[name] = Object.fromEntries(opts.map((o) => [o.value, o.label]));
    filterOptions[name] = opts;
  }

  return (
    <>
      <PageHeader
        title={def.label}
        description={`${rows.length} item${rows.length === 1 ? '' : 's'}${def.orderable ? ' · drag rows to reorder' : ''}`}
        actions={
          <Link href={`/admin/collections/${def.key}/new`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
            <Plus className="h-4 w-4" /> New {def.singular.toLowerCase()}
          </Link>
        }
      />
      <CollectionTable collectionKey={def.key} rows={JSON.parse(JSON.stringify(rows))} relations={relations} filterOptions={filterOptions} />
    </>
  );
}
