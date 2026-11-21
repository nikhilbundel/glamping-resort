'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SETTINGS_DEFS } from '@/lib/settings-defs';
import { saveSettings } from '@/app/admin/_actions/settings';
import { FieldsForm } from '../fields/FieldsForm';
import { Card } from '../ui';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

export function SettingsTabs({ values, role, initial }: { values: Record<string, Record<string, unknown>>; role: Role; initial?: string }) {
  const defs = SETTINGS_DEFS;
  const [tab, setTab] = useState(initial && defs.some((d) => d.key === initial) ? initial : defs[0].key);
  const router = useRouter();
  const def = defs.find((d) => d.key === tab)!;
  const locked = def.superAdminOnly && role !== 'SUPER_ADMIN';
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
        {defs.map((d) => (
          <button key={d.key} type="button" onClick={() => setTab(d.key)} aria-current={tab === d.key} className={cn('shrink-0 rounded-lg px-3 py-2 text-left text-sm', tab === d.key ? 'bg-white font-medium shadow-sm dark:bg-zinc-900' : 'text-zinc-600 hover:bg-white/60 dark:text-zinc-400')}>
            {d.label}
          </button>
        ))}
      </nav>
      <Card title={def.label}>
        <p className="mb-5 text-sm text-zinc-500">{def.description}</p>
        {locked && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Only a Super Admin can change these settings.</p>}
        <FieldsForm
          key={def.key}
          fields={def.fields}
          defaultValues={values[def.key] || {}}
          draftKey={`draft:settings:${def.key}`}
          disabled={locked}
          onSubmit={(v) => saveSettings(def.key, v)}
          onSaved={() => router.refresh()}
        />
      </Card>
    </div>
  );
}
