'use client';

import { useRouter } from 'next/navigation';
import { SEO_FIELDS } from '@/lib/settings-defs';
import { saveSettings } from '@/app/admin/_actions/settings';
import { FieldsForm } from '../fields/FieldsForm';

export function SeoDefaultsForm({ values }: { values: Record<string, unknown> }) {
  const router = useRouter();
  return <FieldsForm fields={SEO_FIELDS} defaultValues={values} draftKey="draft:settings:seo" onSubmit={(v) => saveSettings('seo', v)} onSaved={() => router.refresh()} />;
}
