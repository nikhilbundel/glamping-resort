'use client';

import { useState } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch, type FieldErrors } from 'react-hook-form';
import { ChevronDown, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Field } from '@/lib/fields';
import { defaults } from '@/lib/fields';
import type { CTA } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { Btn, Input, Label, Select, Switch, Textarea } from '../ui';
import { ImageField, ImagesField, FileField, VideoField } from './ImageField';
import { RichTextEditor } from './RichTextEditor';
import { TagsInput } from './TagsInput';
import { IconPicker } from './IconPicker';

export type FieldOptions = Record<string, { value: string; label: string }[] | undefined>;

function getError(errors: FieldErrors, path: string): string | undefined {
  const parts = path.split('.');
  let cur: any = errors;
  for (const p of parts) cur = cur?.[p];
  return cur?.message || cur?.root?.message || (cur?.url?.message ?? cur?.alt?.message);
}

const domId = (path: string) => `f-${path.replace(/\./g, '-')}`;

function ShowIf({ cond, prefix, children }: { cond: NonNullable<Field['showIf']>; prefix: string; children: React.ReactNode }) {
  const { control } = useFormContext();
  const v = useWatch({ control, name: `${prefix}${cond.field}` });
  const allowed = Array.isArray(cond.equals) ? cond.equals : [cond.equals];
  return allowed.includes(String(v ?? '')) ? <>{children}</> : null;
}

export function FieldList({ fields, prefix = '', options }: { fields: Field[]; prefix?: string; options: FieldOptions }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
      {fields.map((f, i) =>
        f.type === 'heading' ? (
          <div key={f.name} className={cn('md:col-span-2', i > 0 && 'mt-4')}>
            <div className="flex items-center gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{f.label}</span>
            </div>
            {f.help && <p className="mt-1.5 text-xs text-zinc-500">{f.help}</p>}
          </div>
        ) : f.showIf ? (
          <ShowIf key={f.name} cond={f.showIf} prefix={prefix}>
            <div className={cn(f.half ? 'md:col-span-1' : 'md:col-span-2')}>
              <FieldRenderer field={f} path={`${prefix}${f.name}`} options={options} />
            </div>
          </ShowIf>
        ) : (
          <div key={f.name} className={cn(f.half ? 'md:col-span-1' : 'md:col-span-2')}>
            <FieldRenderer field={f} path={`${prefix}${f.name}`} options={options} />
          </div>
        ),
      )}
    </div>
  );
}

function CtaEditor({ value, onChange, idBase }: { value: CTA | null; onChange: (v: CTA | null) => void; idBase: string }) {
  const v = value || { label: '', href: '', style: 'primary' as const, newTab: false };
  const set = (patch: Partial<CTA>) => onChange({ ...v, ...patch });
  return (
    <div className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-end dark:border-zinc-800">
      <div>
        <Label htmlFor={`${idBase}-l`}>Label</Label>
        <Input id={`${idBase}-l`} value={v.label} onChange={(e) => set({ label: e.target.value })} placeholder="Book Now" />
      </div>
      <div>
        <Label htmlFor={`${idBase}-h`}>Link</Label>
        <Input id={`${idBase}-h`} value={v.href} onChange={(e) => set({ href: e.target.value })} placeholder="/stays/domes or https://…" />
      </div>
      <div>
        <Label htmlFor={`${idBase}-s`}>Style</Label>
        <Select id={`${idBase}-s`} value={v.style || 'primary'} onChange={(e) => set({ style: e.target.value as CTA['style'] })}>
          <option value="primary">Primary</option>
          <option value="secondary">Outline</option>
          <option value="light">Light outline</option>
          <option value="link">Text link →</option>
        </Select>
      </div>
      <label className="flex h-10 items-center gap-2 text-sm">
        <input type="checkbox" checked={!!v.newTab} onChange={(e) => set({ newTab: e.target.checked })} className="h-4 w-4 accent-emerald-700" /> New tab
      </label>
    </div>
  );
}

function SortableItem({ id, children, handleLabel }: { id: string; children: (handle: React.ReactNode) => React.ReactNode; handleLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" {...attributes} {...listeners} aria-label={handleLabel} className="cursor-grab rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900', isDragging && 'relative z-10 shadow-lg')}>
      {children(handle)}
    </li>
  );
}

function ListField({ field, path, options }: { field: Extract<Field, { type: 'list' }>; path: string; options: FieldOptions }) {
  const { control, watch } = useFormContext();
  const { fields: items, append, remove, move, insert } = useFieldArray({ control, name: path, keyName: '_rhfId' });
  const [open, setOpen] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(items.findIndex((i) => i._rhfId === e.active.id), items.findIndex((i) => i._rhfId === e.over!.id));
  };
  const labelOf = (i: number) => {
    const v = watch(`${path}.${i}.${field.itemLabel || field.fields[0]?.name}`);
    const img = watch(`${path}.${i}.contentImage`);
    if (watch(`${path}.${i}.contentType`) === 'image') return `🖼 ${img?.alt || 'Image slide'}`;
    const s = Array.isArray(v) ? v.join(' · ') : typeof v === 'object' && v ? v.label || v.alt || v.url : v || (img?.url ? `🖼 ${img.alt || 'Image'}` : '');
    return (s && String(s).slice(0, 80)) || `Item ${i + 1}`;
  };
  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i._rhfId)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <SortableItem key={item._rhfId} id={item._rhfId} handleLabel={`Drag to reorder ${labelOf(i)}`}>
                {(handle) => (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      {handle}
                      <button type="button" className="flex flex-1 items-center gap-2 py-1 text-left text-sm font-medium" aria-expanded={open === item._rhfId} onClick={() => setOpen(open === item._rhfId ? null : item._rhfId)}>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', open === item._rhfId && 'rotate-180')} />
                        <span className="truncate">{labelOf(i)}</span>
                      </button>
                      <Btn size="sm" variant="ghost" aria-label="Duplicate item" onClick={() => insert(i + 1, { ...JSON.parse(JSON.stringify(watch(`${path}.${i}`))), _key: uid() })}>
                        <Copy className="h-3.5 w-3.5" />
                      </Btn>
                      <Btn size="sm" variant="ghost" aria-label="Remove item" className="text-red-600" onClick={() => remove(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Btn>
                    </div>
                    {open === item._rhfId && (
                      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                        <FieldList fields={field.fields} prefix={`${path}.${i}.`} options={options} />
                      </div>
                    )}
                  </>
                )}
              </SortableItem>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {(!field.maxItems || items.length < field.maxItems) && (
        <Btn
          size="sm"
          className="mt-2"
          onClick={() => {
            const key = uid();
            append({ ...defaults(field.fields), _key: key });
          }}
        >
          <Plus className="h-4 w-4" /> {field.addLabel || `Add ${field.label.replace(/s$/, '').toLowerCase()}`}
        </Btn>
      )}
    </div>
  );
}

export function FieldRenderer({ field: f, path, options }: { field: Field; path: string; options: FieldOptions }) {
  const { register, control, formState } = useFormContext();
  const id = domId(path);
  const error = getError(formState.errors, path);
  const opts = (f.type === 'select' || f.type === 'multiselect') ? (f.options || (f.source ? options[f.source] : []) || []) : [];

  let input: React.ReactNode;
  switch (f.type) {
    case 'text':
    case 'url':
    case 'email':
      input = <Input id={id} type={f.type === 'email' ? 'email' : 'text'} placeholder={f.placeholder} aria-invalid={!!error} {...register(path)} />;
      break;
    case 'date':
      input = <Input id={id} type="date" {...register(path)} />;
      break;
    case 'datetime':
      input = <Input id={id} type="datetime-local" {...register(path)} />;
      break;
    case 'number':
      input = <Input id={id} type="number" min={f.min} max={f.max} step={f.step || 1} aria-invalid={!!error} {...register(path)} />;
      break;
    case 'textarea':
      input = <Textarea id={id} rows={3} placeholder={f.placeholder} aria-invalid={!!error} {...register(path)} />;
      break;
    case 'color':
      input = (
        <Controller
          control={control}
          name={path}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <input type="color" aria-label={`${f.label} picker`} value={field.value || '#000000'} onChange={(e) => field.onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-zinc-300 bg-transparent dark:border-zinc-700" />
              <Input id={id} value={field.value || ''} onChange={(e) => field.onChange(e.target.value)} placeholder="#2F4A3A" className="w-32" />
            </div>
          )}
        />
      );
      break;
    case 'boolean':
      input = (
        <Controller
          control={control}
          name={path}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch checked={!!field.value} onChange={field.onChange} label={f.label} />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{field.value ? 'On' : 'Off'}</span>
            </div>
          )}
        />
      );
      break;
    case 'select':
      input = (
        <Select id={id} aria-invalid={!!error} {...register(path)}>
          {!f.required && !opts.some((o) => o.value === '') && <option value="">— None —</option>}
          {f.required && !f.options && <option value="">Select…</option>}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case 'multiselect':
      input = (
        <Controller
          control={control}
          name={path}
          render={({ field }) => {
            const val: string[] = field.value || [];
            return (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-300 p-2 dark:border-zinc-700" id={id}>
                {!opts.length && <p className="p-1 text-xs text-zinc-500">No options yet.</p>}
                {opts.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={val.includes(o.value)} onChange={(e) => field.onChange(e.target.checked ? [...val, o.value] : val.filter((x) => x !== o.value))} />
                    {o.label}
                  </label>
                ))}
              </div>
            );
          }}
        />
      );
      break;
    case 'tags':
      input = <Controller control={control} name={path} render={({ field }) => <TagsInput id={id} value={field.value || []} onChange={field.onChange} />} />;
      break;
    case 'icon':
      input = <Controller control={control} name={path} render={({ field }) => <IconPicker id={id} value={field.value || ''} onChange={field.onChange} />} />;
      break;
    case 'richtext':
      input = <Controller control={control} name={path} render={({ field }) => <RichTextEditor id={id} value={field.value || ''} onChange={field.onChange} />} />;
      break;
    case 'image':
      input = <Controller control={control} name={path} render={({ field }) => <ImageField id={id} value={field.value || null} onChange={field.onChange} />} />;
      break;
    case 'images':
      input = <Controller control={control} name={path} render={({ field }) => <ImagesField value={field.value || []} onChange={field.onChange} />} />;
      break;
    case 'file':
      input = <Controller control={control} name={path} render={({ field }) => <FileField id={id} value={field.value || ''} onChange={field.onChange} />} />;
      break;
    case 'video':
      input = <Controller control={control} name={path} render={({ field }) => <VideoField id={id} value={field.value || ''} onChange={field.onChange} />} />;
      break;
    case 'cta':
      input = (
        <Controller
          control={control}
          name={path}
          render={({ field }) => (
            <div className="space-y-2">
              {field.value ? (
                <>
                  <CtaEditor idBase={id} value={field.value} onChange={field.onChange} />
                  <Btn size="sm" variant="ghost" className="text-red-600" onClick={() => field.onChange(null)}>
                    Remove button
                  </Btn>
                </>
              ) : (
                <Btn size="sm" onClick={() => field.onChange({ label: 'Learn more', href: '/', style: 'link', newTab: false })}>
                  <Plus className="h-4 w-4" /> Add button
                </Btn>
              )}
            </div>
          )}
        />
      );
      break;
    case 'ctas':
      input = (
        <Controller
          control={control}
          name={path}
          render={({ field }) => {
            const list: CTA[] = field.value || [];
            return (
              <div className="space-y-2">
                {list.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1">
                      <CtaEditor idBase={`${id}-${i}`} value={c} onChange={(v) => field.onChange(list.map((x, j) => (j === i ? v : x)))} />
                    </div>
                    <Btn size="sm" variant="ghost" aria-label="Remove button" className="mt-2 text-red-600" onClick={() => field.onChange(list.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Btn>
                  </div>
                ))}
                {(!f.maxItems || list.length < f.maxItems) && (
                  <Btn size="sm" onClick={() => field.onChange([...list, { label: '', href: '', style: list.length ? 'secondary' : 'primary', newTab: false }])}>
                    <Plus className="h-4 w-4" /> Add button
                  </Btn>
                )}
              </div>
            );
          }}
        />
      );
      break;
    case 'list':
      input = <ListField field={f} path={path} options={options} />;
      break;
    case 'group':
      input = (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <FieldList fields={f.fields} prefix={`${path}.`} options={options} />
        </div>
      );
      break;
  }

  const labelFor = ['boolean', 'multiselect', 'images', 'ctas', 'list', 'group', 'cta', 'image'].includes(f.type) ? undefined : id;
  return (
    <div>
      {labelFor ? (
        <Label htmlFor={labelFor} required={f.required}>
          {f.label}
        </Label>
      ) : (
        <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {f.label}
          {f.required && <span className="text-red-600"> *</span>}
        </p>
      )}
      {input}
      {f.help && <p className="mt-1 text-xs text-zinc-500">{f.help}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
