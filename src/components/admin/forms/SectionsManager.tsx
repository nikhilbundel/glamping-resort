'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { icons, Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, MonitorPlay } from 'lucide-react';
import { SECTION_DEFS, SECTION_MAP } from '@/lib/sections';
import { addSection, deleteSection, duplicateSection, reorderSections, toggleSection } from '@/app/admin/_actions/pages';
import { Badge, Btn, Card, Empty, Modal, Input } from '../ui';
import { cn } from '@/lib/utils';

type Chip = { label: string; href: string; path?: string };
export type SectionRow = { id: string; type: string; label: string | null; isVisible: boolean; hasDraft: boolean; summary: string; showOn?: string; opens?: Chip[]; sources?: Chip[] };

function Row({ s, n, pageId, onToggle, onDuplicate, onDelete }: { s: SectionRow; n: number; pageId: string; onToggle: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const def = SECTION_MAP[s.type];
  const I = (def && icons[def.icon as keyof typeof icons]) || icons.Square;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('rounded-lg border border-zinc-200 bg-white p-2 pr-3 dark:border-zinc-800 dark:bg-zinc-900', isDragging && 'relative z-10 shadow-lg', !s.isVisible && 'opacity-60')} data-testid="section-row">
     <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-center font-mono text-xs font-semibold text-zinc-400" title="Position on the page (top to bottom)">{n}</span>
      <button type="button" {...attributes} {...listeners} aria-label={`Drag to reorder ${s.label || def?.label}`} className="cursor-grab rounded p-1.5 text-zinc-400 hover:text-zinc-700">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <I className="h-4 w-4" />
      </span>
      <Link href={`/admin/pages/${pageId}/sections/${s.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.label || def?.label || s.type}</p>
        <p className="truncate text-xs text-zinc-500">
          {def?.label}
          {s.summary && ` · ${s.summary}`}
        </p>
      </Link>
      <div className="hidden gap-1 sm:flex">
        {s.showOn === 'tab1' && <Badge tone="green">Stays only</Badge>}
        {s.showOn === 'tab2' && <Badge tone="blue">Experiences only</Badge>}
        {!s.isVisible && <Badge>Hidden</Badge>}
        {s.hasDraft && <Badge tone="amber">Draft</Badge>}
      </div>
      <Btn size="sm" variant="ghost" aria-label={s.isVisible ? 'Hide section' : 'Show section'} onClick={onToggle}>
        {s.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Btn>
      <Btn size="sm" variant="ghost" aria-label="Duplicate section" onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </Btn>
      <Link href={`/admin/pages/${pageId}/sections/${s.id}`} aria-label="Edit section" className="inline-flex h-8 items-center rounded-lg px-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <Pencil className="h-4 w-4" />
      </Link>
      <Btn size="sm" variant="ghost" className="text-red-600" aria-label="Delete section" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Btn>
     </div>
      {(!!s.opens?.length || !!s.sources?.length) && (
        <div className="ml-[5.25rem] mt-1.5 flex flex-wrap items-center gap-1.5 pb-1 text-[11px]">
          {!!s.opens?.length && <span className="font-medium text-zinc-500">Opens →</span>}
          {s.opens?.map((c) => (
            <Link key={c.href} href={c.href} title={`Edit ${c.path}`} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200" data-testid="opens-chip">
              {c.label}
            </Link>
          ))}
          {!!s.sources?.length && <span className="ml-1 font-medium text-zinc-500">Content from →</span>}
          {s.sources?.map((c) => (
            <Link key={c.href} href={c.href} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200" data-testid="source-chip">
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

export function SectionsManager({ pageId, pagePath, initial }: { pageId: string; pagePath: string; initial: SectionRow[] }) {
  const [rows, setRows] = useState(initial);
  const [library, setLibrary] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(rows, rows.findIndex((r) => r.id === e.active.id), rows.findIndex((r) => r.id === e.over!.id));
    setRows(next);
    const r = await reorderSections(pageId, next.map((x) => x.id));
    if (!r.ok) {
      toast.error(r.error);
      setRows(rows);
    } else toast.success('Order saved');
  };

  const add = async (type: string) => {
    const r = await addSection(pageId, type);
    if (!r.ok) return toast.error(r.error);
    setLibrary(false);
    router.push(`/admin/pages/${pageId}/sections/${r.data.id}`);
  };

  const cats = Array.from(new Set(SECTION_DEFS.map((d) => d.category)));
  const filtered = SECTION_DEFS.filter((d) => !q || `${d.label} ${d.description}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card
      title={`Sections (${rows.length}) — in the same order as on the website, top to bottom`}
      actions={
        <div className="flex gap-2">
          <a href={`/api/preview?path=${encodeURIComponent(pagePath)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            <MonitorPlay className="h-3.5 w-3.5" /> Preview drafts
          </a>
          <Btn size="sm" variant="primary" onClick={() => setLibrary(true)}>
            <Plus className="h-4 w-4" /> Add section
          </Btn>
        </div>
      }
    >
      {rows.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {rows.map((s, i) => (
                <Row
                  key={s.id}
                  s={s}
                  n={i + 1}
                  pageId={pageId}
                  onToggle={async () => {
                    const r = await toggleSection(s.id, !s.isVisible);
                    if (!r.ok) return toast.error(r.error);
                    setRows((all) => all.map((x) => (x.id === s.id ? { ...x, isVisible: !x.isVisible } : x)));
                  }}
                  onDuplicate={async () => {
                    const r = await duplicateSection(s.id);
                    if (!r.ok) return toast.error(r.error);
                    toast.success('Duplicated (hidden until you show it)');
                    router.refresh();
                    const idx = rows.findIndex((x) => x.id === s.id);
                    setRows((all) => [...all.slice(0, idx + 1), { ...s, id: r.data.id, label: `${s.label || s.type} (copy)`, isVisible: false, hasDraft: false }, ...all.slice(idx + 1)]);
                  }}
                  onDelete={async () => {
                    if (!confirm(`Delete "${s.label || s.type}"? This cannot be undone.`)) return;
                    const r = await deleteSection(s.id);
                    if (!r.ok) return toast.error(r.error);
                    setRows((all) => all.filter((x) => x.id !== s.id));
                    toast.success('Section deleted');
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <Empty>This page has no sections yet. Click “Add section” to choose from the block library.</Empty>
      )}

      <Modal open={library} onClose={() => setLibrary(false)} title="Block library" wide>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks…" aria-label="Search blocks" className="mb-5" />
        {cats.map((c) => {
          const items = filtered.filter((d) => d.category === c);
          if (!items.length) return null;
          return (
            <div key={c} className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{c}</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => {
                  const I = icons[d.icon as keyof typeof icons] || icons.Square;
                  return (
                    <li key={d.type}>
                      <button type="button" onClick={() => add(d.type)} className="flex h-full w-full gap-3 rounded-lg border border-zinc-200 p-3 text-left transition hover:border-emerald-600 hover:bg-emerald-50/50 dark:border-zinc-800 dark:hover:bg-emerald-950/30">
                        <I className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <span>
                          <span className="block text-sm font-medium">{d.label}</span>
                          <span className="block text-xs text-zinc-500">{d.description}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </Modal>
    </Card>
  );
}
