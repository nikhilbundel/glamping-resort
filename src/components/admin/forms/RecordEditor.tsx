'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExternalLink, History, MonitorPlay } from 'lucide-react';
import { COLLECTION_MAP } from '@/lib/collections';
import { saveRecord } from '@/app/admin/_actions/collections';
import { restoreRevision } from '@/app/admin/_actions/pages';
import { FieldsForm } from '../fields/FieldsForm';
import type { FieldOptions } from '../fields/FieldRenderer';
import { Btn, Card } from '../ui';
import { formatDate } from '@/lib/utils';

export function RecordEditor({ collectionKey, id, values, options, viewUrl, revisions }: { collectionKey: string; id: string | null; values: Record<string, unknown>; options: FieldOptions; viewUrl: string | null; revisions: { id: string; userName: string; createdAt: string }[] }) {
  const def = COLLECTION_MAP[collectionKey];
  const router = useRouter();
  const [key, setKey] = useState(0);
  const isPost = collectionKey === 'posts';
  return (
    <div className={def.revisions ? 'grid gap-6 xl:grid-cols-[1fr_300px]' : ''}>
      <Card>
        <FieldsForm
          key={`${key}-${JSON.stringify(values).length}`}
          fields={def.fields}
          defaultValues={values}
          options={options}
          draftKey={`draft:${collectionKey}:${id || 'new'}`}
          submitLabel={id ? 'Save changes' : `Create ${def.singular.toLowerCase()}`}
          onSubmit={(v) => saveRecord(collectionKey, id, v)}
          onSaved={(data) => {
            const newId = (data as { id: string }).id;
            if (!id) router.replace(`/admin/collections/${collectionKey}/${newId}`);
            else router.refresh();
          }}
          extraActions={
            viewUrl ? (
              <a href={isPost ? `/api/preview?path=${encodeURIComponent(viewUrl)}` : viewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {isPost ? <MonitorPlay className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />} {isPost ? 'Preview' : 'View'}
              </a>
            ) : null
          }
        />
      </Card>
      {def.revisions && (
        <Card title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4" /> Revisions</span>} className="h-fit">
          {revisions.length ? (
            <ul className="space-y-2">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {formatDate(r.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    <span className="block text-xs text-zinc-500">{r.userName}</span>
                  </span>
                  <Btn
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Restore this version? The current version is kept as a revision.')) return;
                      const res = await restoreRevision(r.id);
                      if (!res.ok) return toast.error(res.error);
                      toast.success('Restored');
                      router.refresh();
                      setKey((k) => k + 1);
                    }}
                  >
                    Restore
                  </Btn>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Each save keeps the previous version here (last 10).</p>
          )}
        </Card>
      )}
    </div>
  );
}
