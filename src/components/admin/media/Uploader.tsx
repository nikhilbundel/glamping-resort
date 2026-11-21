'use client';

import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import type { Media } from '@prisma/client';
import { Btn, Input, Label } from '../ui';
import { cn } from '@/lib/utils';

type Pending = { file: File; alt: string; preview: string | null };

/** Drag-and-drop multi upload. Alt text is required for every image before upload. */
export function Uploader({ folder, accept = 'image/*,application/pdf,video/mp4,video/webm,video/quicktime', onUploaded, compact }: { folder: string; accept?: string; onUploaded: (m: Media[]) => void; compact?: boolean }) {
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const add = (files: FileList | File[]) => {
    const list = Array.from(files).map((file) => ({
      file,
      alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setPending((p) => [...p, ...list]);
  };

  const upload = async () => {
    if (pending.some((p) => p.file.type.startsWith('image/') && !p.alt.trim())) return toast.error('Alt text is required for every image');
    setBusy(true);
    toast.message(pending.some((p) => p.file.type.startsWith('video/')) ? 'Uploading… videos can take a minute' : 'Uploading…');
    const fd = new FormData();
    fd.set('folder', folder);
    pending.forEach((p) => {
      fd.append('files', p.file);
      fd.append('alt', p.alt.trim());
    });
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (json.errors?.length) json.errors.forEach((e: string) => toast.error(e));
    if (json.media?.length) {
      toast.success(`Uploaded ${json.media.length} file(s)`);
      pending.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setPending([]);
      onUploaded(json.media);
    } else if (!res.ok && !json.errors?.length) toast.error(json.message || 'Upload failed');
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={cn('flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition', compact ? 'p-4' : 'p-8', over ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'border-zinc-300 dark:border-zinc-700')}
      >
        <UploadCloud className="h-8 w-8 text-zinc-400" aria-hidden="true" />
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Drag & drop files here, or{' '}
          <button type="button" className="font-medium text-emerald-700 underline" onClick={() => input.current?.click()}>
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-zinc-400">Images & PDF up to {process.env.NEXT_PUBLIC_UPLOAD_MAX_MB || 8} MB · Videos (MP4, WEBM, MOV) up to {process.env.NEXT_PUBLIC_VIDEO_MAX_MB || 150} MB</p>
        <input ref={input} type="file" multiple accept={accept} className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>
      {!!pending.length && (
        <div className="mt-4 space-y-3">
          {pending.map((p, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
              {p.preview ? <img src={p.preview} alt="" className="h-14 w-14 rounded object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-100 text-xs dark:bg-zinc-800">{p.file.type.startsWith('video/') ? 'VIDEO' : 'PDF'}</div>}
              <div className="flex-1">
                <Label htmlFor={`alt-${i}`} required={p.file.type.startsWith('image/')}>
                  {p.file.type.startsWith('image/') ? 'Alt text' : 'Description'} — {p.file.name} ({(p.file.size / 1048576).toFixed(1)} MB)
                </Label>
                <Input id={`alt-${i}`} value={p.alt} onChange={(e) => setPending((all) => all.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Describe the image for screen readers" />
              </div>
              <Btn variant="ghost" size="sm" onClick={() => setPending((all) => all.filter((_, j) => j !== i))}>
                Remove
              </Btn>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setPending([])}>Clear</Btn>
            <Btn variant="primary" loading={busy} onClick={upload}>
              Upload {pending.length} file(s)
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
