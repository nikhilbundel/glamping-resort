'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { savePage, deletePage } from '@/app/admin/_actions/pages';
import { PAGE_FIELDS } from '@/lib/page-fields';
import { FieldsForm } from '../fields/FieldsForm';
import { Btn, Input, Label, Modal } from '../ui';
import { slugify } from '@/lib/utils';

export function NewPageButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const create = async () => {
    setBusy(true);
    const r = await savePage(null, { title, slug: slug || slugify(title), published: false, noindex: false });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success('Page created — add sections, then publish it');
    router.push(`/admin/pages/${r.data.id}`);
  };
  return (
    <>
      <Btn variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New page
      </Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="New page" footer={<><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" loading={busy} disabled={!title.trim()} onClick={create}>Create page</Btn></>}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="np-title" required>Title</Label>
            <Input id="np-title" value={title} onChange={(e) => { setTitle(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} autoFocus />
          </div>
          <div>
            <Label htmlFor="np-slug">URL path</Label>
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <span>/</span>
              <Input id="np-slug" value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} placeholder="e.g. weddings or about/sustainability" />
            </div>
          </div>
          <p className="text-xs text-zinc-500">New pages start unpublished. Build them from the block library, preview, then switch on “Published”.</p>
        </div>
      </Modal>
    </>
  );
}

export function PageMetaForm({ id, values, isSystem }: { id: string; values: Record<string, unknown>; isSystem: boolean }) {
  const router = useRouter();
  void isSystem;
  const isHome = values.slug === '';
  return (
    <>
      <FieldsForm fields={PAGE_FIELDS} defaultValues={values} draftKey={`draft:page:${id}`} onSubmit={(v) => savePage(id, v)} onSaved={() => router.refresh()} submitLabel="Save page settings" />
      {!isHome && (
        <Btn
          variant="ghost"
          className="mt-4 text-red-600"
          onClick={async () => {
            if (!confirm('Delete this page and all its sections? This can’t be undone. (Tip: switch off “Published” to hide it instead.)')) return;
            const r = await deletePage(id);
            if (!r.ok) return toast.error(r.error);
            toast.success('Page deleted');
            router.push('/admin/pages');
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete page
        </Btn>
      )}
    </>
  );
}
