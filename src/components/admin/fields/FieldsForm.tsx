'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FormProvider, useForm, useWatch, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save, RotateCcw, CloudUpload } from 'lucide-react';
import { buildSchema, type Field } from '@/lib/fields';
import type { ActionResult } from '@/lib/action';
import { Btn } from '../ui';
import { FieldList, type FieldOptions } from './FieldRenderer';

type Props = {
  fields: Field[];
  defaultValues: Record<string, unknown>;
  options?: FieldOptions;
  onSubmit: (values: Record<string, unknown>) => Promise<ActionResult<unknown>>;
  submitLabel?: string;
  /** localStorage key for client-side draft autosave */
  draftKey?: string;
  /** server-side draft autosave (sections) */
  onDraft?: (values: Record<string, unknown>) => Promise<ActionResult<{ savedAt: string }>>;
  hasServerDraft?: boolean;
  onDiscardDraft?: () => Promise<unknown>;
  extraActions?: ReactNode;
  header?: ReactNode;
  onSaved?: (data: unknown, values: Record<string, unknown>) => void;
  disabled?: boolean;
};

/** Shared guard: warn when leaving with unsaved changes (tab close + in-app link clicks). */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (!window.confirm('You have unsaved changes. Leave this page?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', before);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', before);
      document.removeEventListener('click', click, true);
    };
  }, [dirty]);
}

export function FieldsForm({ fields, defaultValues, options = {}, onSubmit, submitLabel = 'Save', draftKey, onDraft, hasServerDraft, onDiscardDraft, extraActions, header, onSaved, disabled }: Props) {
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const methods = useForm<FieldValues>({ resolver: zodResolver(schema), defaultValues, mode: 'onBlur' });
  const { handleSubmit, formState, reset, control, getValues } = methods;
  const values = useWatch({ control });
  const [saving, setSaving] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string>(hasServerDraft ? 'Unpublished draft' : '');
  const [localDraft, setLocalDraft] = useState<Record<string, unknown> | null>(null);
  const first = useRef(true);
  const dirty = formState.isDirty;

  useUnsavedGuard(dirty && !saving);

  // Offer to restore a local draft
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (JSON.stringify(parsed.values) !== JSON.stringify(defaultValues)) setLocalDraft(parsed.values);
        else localStorage.removeItem(draftKey);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Debounced autosave
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!dirty || disabled) return;
    const t = setTimeout(async () => {
      const v = getValues();
      if (draftKey) {
        try {
          localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), values: v }));
          setDraftStatus(`Draft auto-saved on this device · ${new Date().toLocaleTimeString()}`);
        } catch {}
      }
      if (onDraft) {
        const r = await onDraft(v);
        if (r.ok) setDraftStatus(`Draft auto-saved · ${new Date(r.data.savedAt).toLocaleTimeString()}`);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const submit = handleSubmit(
    async (v) => {
      setSaving(true);
      const res = await onSubmit(v);
      setSaving(false);
      if (!res.ok) return toast.error(res.error);
      toast.success('Saved');
      if (draftKey) localStorage.removeItem(draftKey);
      setDraftStatus('');
      reset(v);
      onSaved?.(res.data, v);
    },
    (errs) => {
      toast.error('Please fix the highlighted fields');
      console.warn(errs);
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    },
  );

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            submit();
          }
        }}
        noValidate
      >
        {localDraft && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <span>You have an unsaved draft from a previous session.</span>
            <span className="flex gap-2">
              <Btn size="sm" onClick={() => { reset(localDraft, { keepDefaultValues: true }); setLocalDraft(null); }}>
                Restore draft
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => { if (draftKey) localStorage.removeItem(draftKey); setLocalDraft(null); }}>
                Discard
              </Btn>
            </span>
          </div>
        )}
        {header}
        <fieldset disabled={disabled} className="min-w-0">
          <FieldList fields={fields} options={options} />
        </fieldset>
        <div className="sticky bottom-0 z-20 -mx-5 mt-8 flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <Btn type="submit" variant="primary" loading={saving} disabled={disabled}>
            {onDraft ? <CloudUpload className="h-4 w-4" /> : <Save className="h-4 w-4" />} {submitLabel}
          </Btn>
          {dirty && (
            <Btn variant="ghost" onClick={() => reset()}>
              <RotateCcw className="h-4 w-4" /> Undo changes
            </Btn>
          )}
          {onDiscardDraft && hasServerDraft && (
            <Btn
              variant="ghost"
              onClick={async () => {
                if (!confirm('Discard the unpublished draft and go back to the live version?')) return;
                await onDiscardDraft();
              }}
            >
              Discard draft
            </Btn>
          )}
          {extraActions}
          <span className="ml-auto text-xs text-zinc-500" aria-live="polite">
            {dirty ? (draftStatus || 'Unsaved changes') : draftStatus}
          </span>
        </div>
      </form>
    </FormProvider>
  );
}
