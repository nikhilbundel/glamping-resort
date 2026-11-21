'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { Copy, Crop, FileText, Search, Trash2, Crosshair, Link2 } from 'lucide-react';
import type { Media } from '@prisma/client';
import { listMedia, updateMedia, deleteMedia, mediaUsage, cropMedia } from '@/app/admin/_actions/media';
import { Btn, Card, Empty, Input, Label, Modal, Select } from '../ui';
import { Uploader } from './Uploader';
import { cn, formatDate } from '@/lib/utils';
import type { Role } from '@/lib/types';

function Detail({ m, onChange, onDeleted, role }: { m: Media; onChange: (m: Media) => void; onDeleted: (id: string) => void; role: Role }) {
  const [alt, setAlt] = useState(m.alt);
  const [folder, setFolder] = useState(m.folder);
  const [focal, setFocal] = useState({ x: m.focalX, y: m.focalY });
  const [usage, setUsage] = useState<string[] | null>(null);
  const [crop, setCrop] = useState(false);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const isImage = m.mime.startsWith('image/');

  useEffect(() => {
    setAlt(m.alt);
    setFolder(m.folder);
    setFocal({ x: m.focalX, y: m.focalY });
    setUsage(null);
    mediaUsage(m.id).then((r) => r.ok && setUsage(r.data));
  }, [m]);

  const save = async () => {
    setBusy(true);
    const r = await updateMedia(m.id, { alt, folder, focalX: focal.x, focalY: focal.y });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    onChange(r.data);
    toast.success('Saved. Note: images already placed on pages keep their own alt text/focal point until re-selected.');
  };

  const remove = async () => {
    const force = !!usage?.length;
    if (!confirm(force ? `This file is used in ${usage!.length} place(s). Delete anyway? Those spots will show a placeholder.` : 'Delete this file permanently?')) return;
    const r = await deleteMedia(m.id, force);
    if (!r.ok) return toast.error(r.error);
    if (!r.data.deleted) {
      setUsage(r.data.usage);
      return toast.error('File is in use — see the list below');
    }
    toast.success('Deleted');
    onDeleted(m.id);
  };

  const doCrop = async () => {
    if (!area) return;
    setBusy(true);
    const r = await cropMedia(m.id, area);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success('Cropped copy created');
    setCrop(false);
    onChange(r.data);
  };

  return (
    <Card title="Details" className="h-fit xl:sticky xl:top-24">
      {isImage ? (
        <div className="relative">
          <button
            type="button"
            className="relative block w-full cursor-crosshair overflow-hidden rounded-lg"
            aria-label="Click to set the focal point"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setFocal({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
            }}
          >
            <img src={m.url} alt={m.alt} className="w-full" style={{ backgroundColor: '#71717a', backgroundImage: 'linear-gradient(45deg,#52525b 25%,transparent 25%,transparent 75%,#52525b 75%),linear-gradient(45deg,#52525b 25%,transparent 25%,transparent 75%,#52525b 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,8px 8px' }} />
            <span className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.4)]" style={{ left: `${focal.x}%`, top: `${focal.y}%` }} />
          </button>
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><Crosshair className="h-3 w-3" /> Click the image to set the focal point ({focal.x}% / {focal.y}%) used when it is cropped to fit.</p>
        </div>
      ) : m.mime.startsWith('video/') ? (
        <video src={m.url} controls muted playsInline preload="metadata" className="w-full rounded-lg bg-black" />
      ) : (
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800"><FileText className="h-5 w-5" /> {m.filename}</a>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
        <div><dt>Size</dt><dd className="text-zinc-800 dark:text-zinc-200">{(m.size / 1024).toFixed(0)} KB</dd></div>
        {isImage && <div><dt>Dimensions</dt><dd className="text-zinc-800 dark:text-zinc-200">{m.width}×{m.height}</dd></div>}
        <div><dt>Type</dt><dd className="text-zinc-800 dark:text-zinc-200">{m.mime}</dd></div>
        <div><dt>Uploaded</dt><dd className="text-zinc-800 dark:text-zinc-200">{formatDate(m.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
      </dl>
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="m-alt" required>{isImage ? 'Alt text' : 'Description'}</Label>
          <Input id="m-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="m-folder">Folder</Label>
          <Input id="m-folder" value={folder} onChange={(e) => setFolder(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" size="sm" onClick={save} loading={busy} disabled={!alt.trim()}>Save</Btn>
          {isImage && <Btn size="sm" onClick={() => setCrop(true)}><Crop className="h-3.5 w-3.5" /> Crop</Btn>}
          <Btn size="sm" onClick={() => { navigator.clipboard.writeText(m.url); toast.success('URL copied'); }}><Copy className="h-3.5 w-3.5" /> Copy URL</Btn>
          <Btn size="sm" variant="ghost" className="text-red-600" onClick={remove} disabled={!!usage?.length && role !== 'SUPER_ADMIN'}><Trash2 className="h-3.5 w-3.5" /> Delete</Btn>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800">
          <p className="mb-1 flex items-center gap-1 font-medium"><Link2 className="h-3 w-3" /> Where it’s used</p>
          {usage === null ? <p className="text-zinc-500">Checking…</p> : usage.length ? <ul className="list-disc space-y-0.5 pl-4 text-zinc-600 dark:text-zinc-400">{usage.map((u) => <li key={u}>{u}</li>)}</ul> : <p className="text-zinc-500">Not used anywhere — safe to delete.</p>}
        </div>
      </div>
      <Modal open={crop} onClose={() => setCrop(false)} title="Crop image" wide footer={<><Btn onClick={() => setCrop(false)}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={doCrop}>Save cropped copy</Btn></>}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Label htmlFor="aspect">Aspect</Label>
          <Select id="aspect" className="w-40" value={aspect ? String(aspect) : 'free'} onChange={(e) => setAspect(e.target.value === 'free' ? undefined : Number(e.target.value))}>
            <option value={String(16 / 9)}>16:9</option>
            <option value={String(4 / 3)}>4:3</option>
            <option value="1">1:1</option>
            <option value={String(3 / 4)}>3:4</option>
            <option value={String(1200 / 630)}>Social (1.91:1)</option>
            <option value="free">Free</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">Zoom <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-emerald-700" /></label>
        </div>
        <div className="relative h-[55vh] overflow-hidden rounded-lg bg-zinc-900">
          {crop && <Cropper image={m.url} crop={cropPos} zoom={zoom} aspect={aspect} onCropChange={setCropPos} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} objectFit="contain" />}
        </div>
        <p className="mt-2 text-xs text-zinc-500">A new cropped image is added to the library; the original is kept.</p>
      </Modal>
    </Card>
  );
}

export function MediaLibrary({ role }: { role: Role }) {
  const [items, setItems] = useState<Media[]>([]);
  const [total, setTotal] = useState(0);
  const [folders, setFolders] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('');
  const [type, setType] = useState<'all' | 'image' | 'file' | 'video'>('all');
  const [active, setActive] = useState<Media | null>(null);
  const [uploadFolder, setUploadFolder] = useState('general');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (append = false) => {
    setLoading(true);
    const r = await listMedia({ q, folder: folder || undefined, type, take: 60, skip: append ? items.length : 0 });
    setLoading(false);
    if (!r.ok) return toast.error(r.error);
    setItems((prev) => (append ? [...prev, ...r.data.items] : r.data.items));
    setTotal(r.data.total);
    setFolders(r.data.folders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, folder, type]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <Card title="Upload">
        <div className="mb-3 max-w-xs">
          <Label htmlFor="up-folder">Upload into folder</Label>
          <Input id="up-folder" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} list="folders" />
          <datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
        </div>
        <Uploader folder={uploadFolder} onUploaded={(m) => { setItems((i) => [...m, ...i]); setTotal((t) => t + m.length); if (!folders.includes(uploadFolder)) setFolders((f) => [...f, uploadFolder]); }} />
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alt text or filename" className="pl-9" aria-label="Search media" />
            </div>
            <Select value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder" className="sm:w-44">
              <option value="">All folders</option>
              {folders.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type" className="sm:w-36">
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="file">Documents</option>
            </Select>
          </div>
          {!items.length && !loading ? (
            <Empty>No media found.</Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6">
              {items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setActive(m)} className={cn('group relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-zinc-100 dark:bg-zinc-800', active?.id === m.id ? 'border-emerald-600' : 'border-transparent hover:border-zinc-300')} title={m.alt}>
                    {m.mime.startsWith('image/') ? <img src={m.url} alt={m.alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: `${m.focalX}% ${m.focalY}%` }} /> : m.mime.startsWith('video/') ? <video src={`${m.url}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <span className="flex h-full flex-col items-center justify-center p-2 text-xs"><FileText className="mb-1 h-6 w-6" /><span className="line-clamp-2 break-all">{m.filename}</span></span>}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-left text-[11px] text-white opacity-0 transition group-hover:opacity-100">{m.folder} · {m.alt}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length < total && (
            <div className="mt-4 text-center">
              <Btn onClick={() => load(true)} loading={loading}>Load more ({total - items.length} remaining)</Btn>
            </div>
          )}
        </div>
        {active ? (
          <Detail
            m={active}
            role={role}
            onChange={(m) => {
              setItems((all) => (all.some((x) => x.id === m.id) ? all.map((x) => (x.id === m.id ? m : x)) : [m, ...all]));
              setActive(m);
            }}
            onDeleted={(id) => {
              setItems((all) => all.filter((x) => x.id !== id));
              setTotal((t) => t - 1);
              setActive(null);
            }}
          />
        ) : (
          <Card title="Details" className="h-fit"><p className="text-sm text-zinc-500">Select a file to edit its alt text, folder and focal point, crop it, or check where it’s used before deleting.</p></Card>
        )}
      </div>
    </div>
  );
}
