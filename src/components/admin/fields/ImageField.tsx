'use client';

import { useState } from 'react';
import { ImagePlus, Smartphone, Trash2, Replace, GripVertical, FileText, Film } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaPicker, mediaToImage } from '../media/MediaPicker';
import { Btn, Input, Label } from '../ui';
import type { ImageValue } from '@/lib/types';

const CHECKER = { backgroundColor: '#71717a', backgroundImage: 'linear-gradient(45deg,#52525b 25%,transparent 25%,transparent 75%,#52525b 75%),linear-gradient(45deg,#52525b 25%,transparent 25%,transparent 75%,#52525b 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,8px 8px' };

/** Checkerboard behind thumbnails so white / transparent PNGs stay visible. */
function Thumb({ img, className }: { img: ImageValue; className?: string }) {
  return <img src={img.url} alt={img.alt} className={className} style={{ ...CHECKER, objectPosition: `${img.focalX ?? 50}% ${img.focalY ?? 50}%` }} />;
}

/** Single image with alt text and optional mobile variant. */
export function ImageField({ value, onChange, id }: { value: ImageValue | null; onChange: (v: ImageValue | null) => void; id: string }) {
  const [picker, setPicker] = useState<'main' | 'mobile' | null>(null);
  return (
    <div>
      {value?.url ? (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 sm:flex-row dark:border-zinc-800">
          <Thumb img={value} className={`h-28 w-40 shrink-0 rounded ${value.url.match(/\.(png|svg|gif|webp)(\?|$)/i) ? 'object-contain p-2' : 'object-cover'}`} />
          <div className="flex-1 space-y-2">
            <div>
              <Label htmlFor={`${id}-alt`} required>
                Alt text
              </Label>
              <Input id={`${id}-alt`} value={value.alt || ''} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn size="sm" onClick={() => setPicker('main')}>
                <Replace className="h-3.5 w-3.5" /> Replace
              </Btn>
              <Btn size="sm" onClick={() => setPicker('mobile')}>
                <Smartphone className="h-3.5 w-3.5" /> {value.mobile?.url ? 'Change' : 'Add'} mobile variant
              </Btn>
              {value.mobile?.url && (
                <Btn size="sm" variant="ghost" onClick={() => onChange({ ...value, mobile: null })}>
                  Remove mobile
                </Btn>
              )}
              <Btn size="sm" variant="ghost" className="text-red-600" onClick={() => onChange(null)}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Btn>
            </div>
          </div>
          {value.mobile?.url && (
            <div className="text-center text-xs text-zinc-500">
              <Thumb img={value.mobile} className="h-28 w-16 rounded object-cover" />
              Mobile
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setPicker('main')} className="flex h-28 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-emerald-600 hover:text-emerald-700 dark:border-zinc-700">
          <ImagePlus className="h-5 w-5" /> Choose image
        </button>
      )}
      <MediaPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onSelect={([m]) => {
          if (!m) return;
          if (picker === 'mobile' && value) onChange({ ...value, mobile: mediaToImage(m) });
          else onChange({ ...mediaToImage(m), mobile: value?.mobile ?? null });
        }}
      />
    </div>
  );
}

function SortableThumb({ img, i, onRemove, onAlt }: { img: ImageValue & { _id: string }; i: number; onRemove: () => void; onAlt: (alt: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img._id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900 ${isDragging ? 'z-10 shadow-lg' : ''}`}>
      <div className="relative">
        <Thumb img={img} className="aspect-[4/3] w-full rounded object-cover" />
        <button type="button" {...attributes} {...listeners} aria-label={`Drag to reorder image ${i + 1}`} className="absolute left-1 top-1 cursor-grab rounded bg-white/90 p-1 text-zinc-700 shadow">
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove image ${i + 1}`} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600 shadow">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <Input aria-label={`Alt text for image ${i + 1}`} value={img.alt} onChange={(e) => onAlt(e.target.value)} placeholder="Alt text (required)" className="mt-2 h-8 text-xs" />
    </li>
  );
}

/** Multiple images: pick many, drag to reorder, edit alt inline. */
export function ImagesField({ value, onChange }: { value: ImageValue[]; onChange: (v: ImageValue[]) => void }) {
  const [open, setOpen] = useState(false);
  const list = (value || []).map((v, i) => ({ ...v, _id: `${i}-${v.url}` }));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const strip = (l: typeof list) => l.map(({ _id, ...rest }) => { void _id; return rest; });
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = list.findIndex((x) => x._id === e.active.id);
    const to = list.findIndex((x) => x._id === e.over!.id);
    onChange(strip(arrayMove(list, from, to)));
  };
  return (
    <div>
      {!!list.length && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((l) => l._id)} strategy={rectSortingStrategy}>
            <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((img, i) => (
                <SortableThumb key={img._id} img={img} i={i} onRemove={() => onChange(strip(list.filter((_, j) => j !== i)))} onAlt={(alt) => onChange(strip(list.map((x, j) => (j === i ? { ...x, alt } : x))))} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <Btn size="sm" onClick={() => setOpen(true)}>
        <ImagePlus className="h-4 w-4" /> Add images
      </Btn>
      <MediaPicker open={open} multiple onClose={() => setOpen(false)} onSelect={(items) => onChange([...(value || []), ...items.map(mediaToImage)])} />
    </div>
  );
}

/** File (PDF) chooser — stores a URL string. */
export function FileField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input id={id} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/menu.pdf or https://…" className="pl-9" />
      </div>
      <Btn onClick={() => setOpen(true)}>Choose file</Btn>
      <MediaPicker open={open} type="file" onClose={() => setOpen(false)} onSelect={([m]) => m && onChange(m.url)} />
    </div>
  );
}

/** Video chooser — stores a URL string; previews the clip. */
export function VideoField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 sm:flex-row dark:border-zinc-800">
          <video key={value} src={value} muted loop playsInline autoPlay className="h-28 w-48 shrink-0 rounded bg-black object-cover" />
          <div className="flex-1 space-y-2">
            <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => setOpen(true)}><Replace className="h-3.5 w-3.5" /> Replace</Btn>
              <Btn size="sm" variant="ghost" className="text-red-600" onClick={() => onChange('')}><Trash2 className="h-3.5 w-3.5" /> Remove</Btn>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={id} value="" onChange={(e) => onChange(e.target.value)} placeholder="Paste a .mp4 / .webm URL, or upload →" />
          <Btn onClick={() => setOpen(true)}><Film className="h-4 w-4" /> Upload / choose video</Btn>
        </div>
      )}
      <MediaPicker open={open} type="video" onClose={() => setOpen(false)} onSelect={([m]) => m && onChange(m.url)} />
    </div>
  );
}
