'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeftToLine, ArrowRightToLine, ChevronDown, Eye, EyeOff, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { saveMenu } from '@/app/admin/_actions/menus';
import type { MenuNode } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { Badge, Btn, Card, Input, Label, Select } from '../ui';
import { useUnsavedGuard } from '../fields/FieldsForm';

type Flat = { id: string; label: string; href: string; newTab: boolean; hidden: boolean; depth: 0 | 1 };
const LOCATIONS = [
  { key: 'header', label: 'Main menu', nested: true },
  { key: 'utility', label: 'Utility bar', nested: false },
  { key: 'footer', label: 'Footer quick links', nested: true },
  { key: 'legal', label: 'Footer legal links', nested: false },
];

function flatten(nodes: MenuNode[]): Flat[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: n.label, href: n.href, newTab: !!n.newTab, hidden: !!n.hidden, depth: 0 as const },
    ...(n.children || []).map((c) => ({ id: c.id, label: c.label, href: c.href, newTab: !!c.newTab, hidden: !!c.hidden, depth: 1 as const })),
  ]);
}
function toTree(flat: Flat[]): MenuNode[] {
  const out: MenuNode[] = [];
  for (const f of flat) {
    const node = { id: f.id, label: f.label, href: f.href, newTab: f.newTab, hidden: f.hidden, children: [] as MenuNode[] };
    if (f.depth === 1 && out.length) out[out.length - 1].children!.push(node);
    else out.push(node);
  }
  return out;
}
function blockLen(list: Flat[], i: number) {
  if (list[i].depth === 1) return 1;
  let n = 1;
  while (list[i + n]?.depth === 1) n++;
  return n;
}

function Row({ item, pages, nested, onChange, onRemove, onIndent, onOutdent, canIndent, open, setOpen, parentHidden }: {
  parentHidden?: boolean;
  item: Flat; pages: { value: string; label: string }[]; nested: boolean; onChange: (p: Partial<Flat>) => void; onRemove: () => void; onIndent: () => void; onOutdent: () => void; canIndent: boolean; open: boolean; setOpen: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition, marginLeft: item.depth ? 36 : 0 }} className={cn('rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900', isDragging && 'relative z-10 shadow-lg', (item.hidden || parentHidden) && 'border-dashed bg-zinc-50 dark:bg-zinc-900/50')}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button type="button" {...attributes} {...listeners} aria-label={`Drag ${item.label}. Drag right to nest, left to un-nest.`} className="cursor-grab rounded p-1 text-zinc-400 hover:text-zinc-700">
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex flex-1 items-center gap-2 py-1 text-left text-sm">
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          <span className={cn('font-medium', (item.hidden || parentHidden) && 'text-zinc-400 line-through decoration-zinc-300')}>{item.label || 'Untitled'}</span>
          <span className="truncate text-xs text-zinc-500">{item.href}</span>
          {item.hidden ? <Badge>Hidden</Badge> : parentHidden ? <Badge>Hidden with parent</Badge> : null}
        </button>
        <Btn size="sm" variant="ghost" aria-label={item.hidden ? `Show ${item.label}` : `Hide ${item.label}`} title={item.hidden ? 'Show on website' : 'Hide from website'} onClick={() => onChange({ hidden: !item.hidden })}>
          {item.hidden ? <EyeOff className="h-3.5 w-3.5 text-zinc-400" /> : <Eye className="h-3.5 w-3.5" />}
        </Btn>
        {nested && (
          <>
            <Btn size="sm" variant="ghost" aria-label="Outdent" onClick={onOutdent} disabled={item.depth === 0}>
              <ArrowLeftToLine className="h-3.5 w-3.5" />
            </Btn>
            <Btn size="sm" variant="ghost" aria-label="Indent (make sub-item)" onClick={onIndent} disabled={!canIndent}>
              <ArrowRightToLine className="h-3.5 w-3.5" />
            </Btn>
          </>
        )}
        <Btn size="sm" variant="ghost" className="text-red-600" aria-label="Remove item" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Btn>
      </div>
      {open && (
        <div className="grid gap-3 border-t border-zinc-200 p-3 sm:grid-cols-2 dark:border-zinc-800">
          <div>
            <Label htmlFor={`l-${item.id}`}>Label</Label>
            <Input id={`l-${item.id}`} value={item.label} onChange={(e) => onChange({ label: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`h-${item.id}`}>Link (internal page or external URL)</Label>
            <Input id={`h-${item.id}`} value={item.href} onChange={(e) => onChange({ href: e.target.value })} list="menu-pages" />
          </div>
          <div>
            <Label htmlFor={`p-${item.id}`}>…or pick a page</Label>
            <Select id={`p-${item.id}`} value="" onChange={(e) => e.target.value && onChange({ href: e.target.value })}>
              <option value="">Choose a page</option>
              {pages.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={item.newTab} onChange={(e) => onChange({ newTab: e.target.checked })} className="h-4 w-4 accent-emerald-700" /> Open in new tab
          </label>
        </div>
      )}
    </li>
  );
}

export function MenuBuilder({ menus, pages }: { menus: Record<string, MenuNode[]>; pages: { value: string; label: string }[] }) {
  const [loc, setLoc] = useState('header');
  const [state, setState] = useState<Record<string, Flat[]>>(() => Object.fromEntries(LOCATIONS.map((l) => [l.key, flatten(menus[l.key] || [])])));
  const [saved, setSaved] = useState(() => JSON.stringify(state));
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const meta = LOCATIONS.find((l) => l.key === loc)!;
  const list = state[loc];
  const set = (next: Flat[]) => setState((s) => ({ ...s, [loc]: next }));
  const dirty = JSON.stringify(state) !== saved;
  useUnsavedGuard(dirty);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    const from = list.findIndex((x) => x.id === e.active.id);
    const overIdx = e.over ? list.findIndex((x) => x.id === e.over!.id) : from;
    const len = blockLen(list, from);
    const block = list.slice(from, from + len);
    const rest = [...list.slice(0, from), ...list.slice(from + len)];
    let to = overIdx > from ? overIdx - len + 1 : overIdx;
    to = Math.max(0, Math.min(rest.length, to));
    if (overIdx >= from && overIdx < from + len) to = from; // dropped on itself/children
    let depth = block[0].depth;
    if (meta.nested) {
      if (e.delta.x > 40 && len === 1) depth = 1;
      if (e.delta.x < -40) depth = 0;
    } else depth = 0;
    if (to === 0) depth = 0;
    block[0] = { ...block[0], depth };
    set([...rest.slice(0, to), ...block, ...rest.slice(to)]);
  };

  const save = async () => {
    for (const [k, l] of Object.entries(state)) {
      const bad = l.find((i) => !i.label.trim() || !i.href.trim());
      if (bad) {
        setLoc(k);
        setOpen(bad.id);
        return toast.error('Every menu item needs a label and a link');
      }
    }
    setBusy(true);
    const results = await Promise.all(LOCATIONS.map((l) => saveMenu(l.key, toTree(state[l.key]))));
    setBusy(false);
    const err = results.find((r) => !r.ok);
    if (err && !err.ok) return toast.error(err.error);
    setSaved(JSON.stringify(state));
    toast.success('Menus saved');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Menu locations" className="flex gap-1 overflow-x-auto lg:flex-col">
        {LOCATIONS.map((l) => (
          <button key={l.key} type="button" onClick={() => setLoc(l.key)} aria-current={loc === l.key} className={cn('shrink-0 rounded-lg px-3 py-2 text-left text-sm', loc === l.key ? 'bg-white font-medium shadow-sm dark:bg-zinc-900' : 'text-zinc-600 hover:bg-white/60 dark:text-zinc-400')}>
            {l.label} <span className="text-xs text-zinc-400">({state[l.key].length}{state[l.key].some((x) => x.hidden) ? `, ${state[l.key].filter((x) => x.hidden).length} hidden` : ''})</span>
          </button>
        ))}
      </nav>
      <Card title={meta.label} actions={<Btn variant="primary" size="sm" onClick={save} loading={busy} disabled={!dirty}><Save className="h-4 w-4" /> Save menus</Btn>}>
        <p className="mb-4 text-sm text-zinc-500">
          Drag to reorder. Use the eye to hide an item from the website without deleting it.{meta.nested && ' Drag an item to the right to nest it under the item above (dropdown), or use the indent buttons.'}
        </p>
        <datalist id="menu-pages">
          {pages.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </datalist>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {list.map((item, i) => (
                <Row
                  key={item.id}
                  item={item}
                  parentHidden={item.depth === 1 && (() => { for (let j = i - 1; j >= 0; j--) if (list[j].depth === 0) return list[j].hidden; return false; })()}
                  pages={pages}
                  nested={meta.nested}
                  open={open === item.id}
                  setOpen={(v) => setOpen(v ? item.id : null)}
                  canIndent={meta.nested && i > 0 && item.depth === 0 && blockLen(list, i) === 1}
                  onChange={(p) => set(list.map((x) => (x.id === item.id ? { ...x, ...p } : x)))}
                  onIndent={() => set(list.map((x) => (x.id === item.id ? { ...x, depth: 1 } : x)))}
                  onOutdent={() => set(list.map((x) => (x.id === item.id ? { ...x, depth: 0 } : x)))}
                  onRemove={() => {
                    const len = blockLen(list, i);
                    if (len > 1 && !confirm('Remove this item and its sub-items?')) return;
                    set([...list.slice(0, i), ...list.slice(i + len)]);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <Btn
          size="sm"
          className="mt-3"
          onClick={() => {
            const id = uid();
            set([...list, { id, label: 'New link', href: '/', newTab: false, hidden: false, depth: 0 }]);
            setOpen(id);
          }}
        >
          <Plus className="h-4 w-4" /> Add item
        </Btn>
      </Card>
    </div>
  );
}
