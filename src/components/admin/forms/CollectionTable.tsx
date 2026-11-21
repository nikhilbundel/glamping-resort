'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, Pencil, Search, Trash2, Check, Minus } from 'lucide-react';
import { COLLECTION_MAP } from '@/lib/collections';
import { deleteRecord, reorderRecords, togglePublish } from '@/app/admin/_actions/collections';
import type { ImageValue } from '@/lib/types';
import { Btn, Empty, Input, Select, Switch } from '../ui';
import { cn, formatDate } from '@/lib/utils';

type RowData = Record<string, unknown> & { id: string };

function firstImage(v: unknown): ImageValue | null {
  if (Array.isArray(v)) return (v[0] as ImageValue) || null;
  return (v as ImageValue) || null;
}

function SortRow({ id, enabled, children }: { id: string; enabled: boolean; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled });
  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50', isDragging && 'relative z-10 shadow-lg')}>
      {children(
        enabled ? (
          <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab rounded p-1 text-zinc-400 hover:text-zinc-700">
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null,
      )}
    </tr>
  );
}

export function CollectionTable({ collectionKey, rows: initial, relations, filterOptions }: { collectionKey: string; rows: RowData[]; relations: Record<string, Record<string, string>>; filterOptions: Record<string, { value: string; label: string }[]> }) {
  const def = COLLECTION_MAP[collectionKey];
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (query && !def.searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(query))) return false;
      return Object.entries(filters).every(([k, v]) => !v || String(r[k]) === v);
    });
  }, [rows, q, filters, def.searchFields]);
  const canSort = !!def.orderable && !q && !Object.values(filters).some(Boolean);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(rows, rows.findIndex((r) => r.id === e.active.id), rows.findIndex((r) => r.id === e.over!.id));
    const prev = rows;
    setRows(next);
    const r = await reorderRecords(collectionKey, next.map((x) => x.id));
    if (!r.ok) {
      setRows(prev);
      toast.error(r.error);
    } else toast.success('Order saved');
  };

  const cell = (r: RowData, c: NonNullable<typeof def.columns>[number]) => {
    const v = r[c.name];
    if (c.kind === 'bool') return v ? <Check className="h-4 w-4 text-emerald-600" aria-label="Yes" /> : <Minus className="h-4 w-4 text-zinc-300" aria-label="No" />;
    if (c.kind === 'date') return v ? formatDate(String(v), { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    if (c.kind === 'relation') return relations[c.name]?.[String(v)] || '—';
    if (c.kind === 'tags') return Array.isArray(v) ? (v as string[]).join(', ') || '—' : '—';
    return v === null || v === undefined || v === '' ? '—' : String(v);
  };

  const pub = def.publishField;
  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}…`} className="pl-9" aria-label="Search" />
        </div>
        {def.filters?.map((f) => (
          <Select key={f.name} aria-label={`Filter by ${f.label}`} value={filters[f.name] || ''} onChange={(e) => setFilters({ ...filters, [f.name]: e.target.value })} className="sm:w-52">
            <option value="">All {f.label.toLowerCase()}s</option>
            {(f.options || filterOptions[f.name] || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ))}
      </div>
      {!shown.length ? (
        <Empty>{rows.length ? 'No matches.' : `No ${def.label.toLowerCase()} yet.`}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  {def.orderable && <th className="w-10 px-2 py-3"><span className="sr-only">Order</span></th>}
                  <th className="px-3 py-3 font-medium">{def.singular}</th>
                  {def.columns?.map((c) => (
                    <th key={c.name} className="px-3 py-3 font-medium">{c.label}</th>
                  ))}
                  {pub && <th className="px-3 py-3 font-medium">Published</th>}
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <SortableContext items={shown.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {shown.map((r) => {
                    const img = def.imageField ? firstImage(r[def.imageField]) : null;
                    const isPub = pub === 'status' ? r.status === 'PUBLISHED' : !!r.published;
                    const view = def.viewUrl?.(r);
                    return (
                      <SortRow key={r.id} id={r.id} enabled={canSort}>
                        {(handle) => (
                          <>
                            {def.orderable && <td className="px-2 py-2">{handle}</td>}
                            <td className="px-3 py-2">
                              <Link href={`/admin/collections/${collectionKey}/${r.id}`} className="flex items-center gap-3">
                                {def.imageField && (img?.url ? <img src={img.url} alt="" className="h-10 w-14 shrink-0 rounded object-cover" /> : <span className="h-10 w-14 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />)}
                                <span className="line-clamp-2 font-medium text-emerald-800 hover:underline dark:text-emerald-300">{String(r[def.titleField] || '(untitled)')}</span>
                              </Link>
                            </td>
                            {def.columns?.map((c) => (
                              <td key={c.name} className="max-w-[220px] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400">{cell(r, c)}</td>
                            ))}
                            {pub && (
                              <td className="px-3 py-2">
                                <Switch
                                  checked={isPub}
                                  label={isPub ? 'Unpublish' : 'Publish'}
                                  onChange={async (v) => {
                                    const res = await togglePublish(collectionKey, r.id, v);
                                    if (!res.ok) return toast.error(res.error);
                                    setRows((all) => all.map((x) => (x.id === r.id ? { ...x, ...(pub === 'status' ? { status: v ? 'PUBLISHED' : 'DRAFT' } : { published: v }) } : x)));
                                    toast.success(v ? 'Published' : 'Unpublished');
                                  }}
                                />
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1">
                                {view && isPub && (
                                  <a href={view} target="_blank" rel="noopener noreferrer" aria-label="View on site" className="inline-flex h-8 items-center rounded-lg px-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                <Link href={`/admin/collections/${collectionKey}/${r.id}`} aria-label="Edit" className="inline-flex h-8 items-center rounded-lg px-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                  <Pencil className="h-4 w-4" />
                                </Link>
                                <Btn
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Delete"
                                  className="text-red-600"
                                  onClick={async () => {
                                    if (!confirm(`Delete "${String(r[def.titleField] || 'this item')}"?`)) return;
                                    const res = await deleteRecord(collectionKey, r.id);
                                    if (!res.ok) return toast.error(res.error);
                                    setRows((all) => all.filter((x) => x.id !== r.id));
                                    toast.success('Deleted');
                                    router.refresh();
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Btn>
                              </div>
                            </td>
                          </>
                        )}
                      </SortRow>
                    );
                  })}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
          {def.orderable && !canSort && <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">Clear search and filters to drag-reorder.</p>}
        </div>
      )}
    </div>
  );
}
