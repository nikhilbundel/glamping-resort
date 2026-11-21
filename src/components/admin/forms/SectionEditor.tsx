'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { History, MonitorPlay } from 'lucide-react';
import { getSectionDef } from '@/lib/sections';
import { withDefaults } from '@/lib/fields';
import { publishSection, saveSectionDraft, discardDraft, restoreRevision } from '@/app/admin/_actions/pages';
import { FieldsForm } from '../fields/FieldsForm';
import type { FieldOptions } from '../fields/FieldRenderer';
import { Btn, Card, Input, Label } from '../ui';
import { formatDate } from '@/lib/utils';

export function SectionEditor({ section, pagePath, options, revisions, aside }: {
  section: { id: string; type: string; label: string | null; data: Record<string, unknown>; draftData: Record<string, unknown> | null };
  pagePath: string;
  options: FieldOptions;
  revisions: { id: string; userName: string; createdAt: string }[];
  aside?: ReactNode;
}) {
  const def = getSectionDef(section.type);
  const router = useRouter();
  const [label, setLabel] = useState(section.label || '');
  const [formKey, setFormKey] = useState(0);
  if (!def) return <p>Unknown block type “{section.type}”.</p>;
  const initial = withDefaults(def.fields, section.draftData || section.data);
  const version = `${formKey}-${JSON.stringify(section.data).length}-${section.draftData ? JSON.stringify(section.draftData).length : 0}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <Card title={def.label}>
        <p className="mb-5 text-sm text-zinc-500">{def.description} Changes auto-save as a draft; visitors only see them after you publish.</p>
        <div className="mb-6 max-w-md">
          <Label htmlFor="section-label">Admin label (only shown here)</Label>
          <Input id="section-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <FieldsForm
          key={version}
          fields={def.fields}
          defaultValues={initial}
          options={options}
          submitLabel="Publish"
          hasServerDraft={!!section.draftData}
          onDraft={(v) => saveSectionDraft(section.id, v)}
          onDiscardDraft={async () => {
            const r = await discardDraft(section.id);
            if (!r.ok) return toast.error(r.error);
            toast.success('Draft discarded');
            router.refresh();
            setFormKey((k) => k + 1);
          }}
          onSubmit={(v) => publishSection(section.id, v, label)}
          onSaved={() => router.refresh()}
          extraActions={
            <a href={`/api/preview?path=${encodeURIComponent(pagePath)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <MonitorPlay className="h-4 w-4" /> Preview
            </a>
          }
        />
      </Card>
      <div className="space-y-6">
      {aside}
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
                    if (!confirm('Restore this version? The current live version is saved as a revision first.')) return;
                    const res = await restoreRevision(r.id);
                    if (!res.ok) return toast.error(res.error);
                    toast.success('Revision restored and published');
                    router.refresh();
                    setFormKey((k) => k + 1);
                  }}
                >
                  Restore
                </Btn>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Each publish keeps the previous version here (last 10).</p>
        )}
      </Card>
      </div>
    </div>
  );
}
