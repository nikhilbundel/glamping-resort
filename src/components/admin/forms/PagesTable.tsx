'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, ExternalLink, Pencil, Search, Trash2 } from 'lucide-react';
import { deletePage, duplicatePage, setPagePublished } from '@/app/admin/_actions/pages';
import { Badge, Btn, Input, Switch } from '../ui';
import { formatDate } from '@/lib/utils';

export type PageRow = { id: string; title: string; slug: string; published: boolean; noindex: boolean; sections: number; hiddenSections: number; drafts: number; updatedAt: string; from?: { label: string; href: string }[] };

export function PagesTable({ initial }: { initial: PageRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState('');
  const router = useRouter();
  const shown = useMemo(() => rows.filter((r) => !q || `${r.title} /${r.slug}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const toggle = async (r: PageRow, v: boolean) => {
    const res = await setPagePublished(r.id, v);
    if (!res.ok) return toast.error(res.error);
    setRows((all) => all.map((x) => (x.id === r.id ? { ...x, published: v } : x)));
    toast.success(v ? `“${r.title}” is now visible` : `“${r.title}” is hidden from visitors`);
  };

  const remove = async (r: PageRow) => {
    if (!confirm(`Delete the page “${r.title}” (/${r.slug}) and all ${r.sections} of its sections?\n\nThis can’t be undone. Remember to remove any menu links pointing to it (Menu Builder).\n\nTip: use the Visible switch to hide it instead.`)) return;
    const res = await deletePage(r.id);
    if (!res.ok) return toast.error(res.error);
    setRows((all) => all.filter((x) => x.id !== r.id));
    toast.success('Page deleted');
  };

  const duplicate = async (r: PageRow) => {
    const res = await duplicatePage(r.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Copied to /${res.data.slug} (hidden until you switch it on)`);
    router.push(`/admin/pages/${res.data.id}`);
  };

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages…" className="pl-9" aria-label="Search pages" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">Page</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Opened from</th>
              <th className="px-4 py-3 font-medium">Sections</th>
              <th className="px-4 py-3 font-medium">Visible</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {shown.map((r) => {
              const isHome = r.slug === '';
              return (
                <tr key={r.id} className={r.published ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : 'bg-zinc-50/60 text-zinc-500 dark:bg-zinc-900/60'}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/pages/${r.id}`} className="font-medium text-emerald-800 hover:underline dark:text-emerald-300">
                      {r.title}
                    </Link>
                    {!r.published && <span className="ml-2"><Badge>Hidden</Badge></span>}
                    {r.noindex && <span className="ml-1"><Badge tone="red">noindex</Badge></span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">/{r.slug}</td>
                  <td className="px-4 py-3 text-xs" data-testid="opened-from">
                    {isHome ? <span className="text-zinc-400">Start of the site</span> : r.from?.length ? (
                      <span className="flex flex-wrap gap-1">
                        {r.from.slice(0, 2).map((f) => <Link key={f.href} href={f.href} className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-800 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200">← {f.label}</Link>)}
                        {r.from.length > 2 && <span className="text-zinc-400">+{r.from.length - 2}</span>}
                      </span>
                    ) : <span className="text-zinc-400">Menu / direct</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/pages/${r.id}`} className="hover:underline">
                      {r.sections} section{r.sections === 1 ? '' : 's'}
                    </Link>
                    {r.hiddenSections > 0 && <span className="ml-2 text-xs text-zinc-400">({r.hiddenSections} hidden)</span>}
                    {r.drafts > 0 && <span className="ml-2"><Badge tone="amber">{r.drafts} draft</Badge></span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" title={isHome ? 'The Home page is always visible' : undefined}>
                      <Switch checked={r.published} disabled={isHome} onChange={(v) => toggle(r, v)} label={r.published ? `Hide ${r.title}` : `Show ${r.title}`} />
                      <span className="text-xs">{r.published ? 'Shown' : 'Hidden'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(r.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/pages/${r.id}`} aria-label={`Edit ${r.title}`} title="Edit sections & settings" className="inline-flex h-8 items-center rounded-lg px-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <a
                        href={r.published ? `/${r.slug}` : `/api/preview?path=${encodeURIComponent(`/${r.slug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${r.title}`}
                        title={r.published ? 'View on site' : 'Preview (hidden page)'}
                        className="inline-flex h-8 items-center rounded-lg px-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <Btn size="sm" variant="ghost" aria-label={`Duplicate ${r.title}`} title="Duplicate page" onClick={() => duplicate(r)}>
                        <Copy className="h-4 w-4" />
                      </Btn>
                      <Btn size="sm" variant="ghost" className="text-red-600" aria-label={`Delete ${r.title}`} title={isHome ? 'The Home page can’t be deleted' : 'Delete page'} disabled={isHome} onClick={() => remove(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Hidden pages show a “not found” page to visitors and are left out of the sitemap; you can still preview them. To add, hide, reorder, duplicate or delete the <b>sections</b> on a page, open the page.
      </p>
    </div>
  );
}
