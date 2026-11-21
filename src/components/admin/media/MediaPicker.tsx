'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, FileText, Search } from 'lucide-react';
import type { Media } from '@prisma/client';
import { listMedia } from '@/app/admin/_actions/media';
import { Btn, Input, Modal, Select } from '../ui';
import { Uploader } from './Uploader';
import { cn } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';

export function mediaToImage(m: Media): ImageValue {
  return { url: m.url, alt: m.alt, width: m.width, height: m.height, publicId: m.publicId, focalX: m.focalX, focalY: m.focalY };
}

/** Media library picker modal (single or multiple) with inline upload. */
export function MediaPicker({ open, onClose, onSelect, multiple, type = 'image' }: { open: boolean; onClose: () => void; onSelect: (items: Media[]) => void; multiple?: boolean; type?: 'image' | 'file' | 'video' | 'all' }) {
  const [items, setItems] = useState<Media[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('');
  const [selected, setSelected] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'library' | 'upload'>('library');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listMedia({ q, folder: folder || undefined, type, take: 120 });
    setLoading(false);
    if (res.ok) {
      setItems(res.data.items);
      setFolders(res.data.folders);
    }
  }, [q, folder, type]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [open, load]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  const toggle = (m: Media) => {
    if (!multiple) return setSelected([m]);
    setSelected((s) => (s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={multiple ? 'Select images' : type === 'file' ? 'Select file' : type === 'video' ? 'Select video' : 'Select image'}
      footer={
        <>
          <span className="mr-auto self-center text-sm text-zinc-500">{selected.length ? `${selected.length} selected` : ''}</span>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!selected.length}
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
          >
            Use {multiple ? 'selected' : 'this'}
          </Btn>
        </>
      }
    >
      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {(['library', 'upload'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('-mb-px border-b-2 px-3 py-2 text-sm capitalize', tab === t ? 'border-emerald-600 font-medium' : 'border-transparent text-zinc-500')}>
            {t === 'library' ? 'Media library' : 'Upload new'}
          </button>
        ))}
      </div>
      {tab === 'upload' ? (
        <Uploader
          folder={folder || 'general'}
          accept={type === 'file' ? 'application/pdf' : type === 'image' ? 'image/*' : type === 'video' ? 'video/mp4,video/webm,video/quicktime' : undefined}
          onUploaded={(m) => {
            setItems((i) => [...m, ...i]);
            setSelected(multiple ? m : m.slice(0, 1));
            setTab('library');
          }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by alt text or filename" className="pl-9" aria-label="Search media" />
            </div>
            <Select value={folder} onChange={(e) => setFolder(e.target.value)} className="sm:w-48" aria-label="Folder">
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          {loading && !items.length ? (
            <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>
          ) : !items.length ? (
            <p className="py-10 text-center text-sm text-zinc-500">No media yet. Switch to “Upload new”.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((m) => {
                const isSel = selected.some((s) => s.id === m.id);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => toggle(m)} onDoubleClick={() => { if (!multiple) { onSelect([m]); onClose(); } }} className={cn('group relative block aspect-square w-full overflow-hidden rounded-lg border-2', isSel ? 'border-emerald-600' : 'border-transparent hover:border-zinc-300')} title={m.alt}>
                      {m.mime.startsWith('image/') ? (
                        <img src={m.url} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
                      ) : m.mime.startsWith('video/') ? (
                        <video src={`${m.url}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 p-2 text-xs dark:bg-zinc-800">
                          <FileText className="mb-1 h-6 w-6" />
                          <span className="line-clamp-2 break-all">{m.filename}</span>
                        </span>
                      )}
                      {isSel && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-600 p-1 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
