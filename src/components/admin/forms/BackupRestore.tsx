'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, FileArchive, Upload } from 'lucide-react';
import { Btn, Card } from '@/components/admin/ui';

type Stats = { pages: number; sections: number; media: number; enquiries: number; subscribers: number; bookings: number; users: number; uploadFiles: number; uploadBytes: number };
type Saved = { name: string; size: number; at: string };
type Result = { manifest: { createdAt: string; site: string }; tables: Record<string, number>; mediaFiles: number; safetyBackup: string };

const mb = (b: number) => (b > 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`);
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Check({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}

export function BackupRestore({ stats, saved }: { stats: Stats; saved: Saved[] }) {
  // download options
  const [media, setMedia] = useState(true);
  const [customers, setCustomers] = useState(true);
  const [history, setHistory] = useState(true);
  const [users, setUsers] = useState(false);
  const q = (o: Record<string, boolean>) => new URLSearchParams(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v ? '1' : '0']))).toString();

  // restore options
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rMedia, setRMedia] = useState(true);
  const [rCustomers, setRCustomers] = useState(true);
  const [rHistory, setRHistory] = useState(true);
  const [rUsers, setRUsers] = useState(false);
  const [sure, setSure] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const restore = () => {
    if (!file) return;
    setResult(null);
    setProgress(0);
    setPhase('Uploading backup…');
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/admin/backup?${q({ media: rMedia, customers: rCustomers, history: rHistory, users: rUsers })}`);
    xhr.setRequestHeader('Content-Type', 'application/zip');
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const p = Math.round((e.loaded / e.total) * 100);
      setProgress(p);
      if (p >= 100) setPhase('Restoring — saving a safety copy, then replacing content…');
    };
    xhr.onload = () => {
      setProgress(null);
      setPhase('');
      let body: Result & { message?: string };
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        return void toast.error('Restore failed (unexpected server reply).');
      }
      if (xhr.status >= 400) return void toast.error(body.message || 'Restore failed');
      setResult(body);
      setFile(null);
      setSure(false);
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Backup restored');
    };
    xhr.onerror = () => {
      setProgress(null);
      setPhase('');
      toast.error('Upload failed — check the server is running.');
    };
    xhr.send(file);
  };

  const busy = progress !== null;

  return (
    <div className="grid gap-6 xl:grid-cols-2" data-testid="backup-page">
      <Card title={<span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download a backup</span>}>
        <p className="mb-4 text-sm text-zinc-500">
          Right now the site has <b>{stats.pages}</b> pages, <b>{stats.sections}</b> sections, <b>{stats.media}</b> media items and <b>{stats.uploadFiles}</b> uploaded files ({mb(stats.uploadBytes)}).
        </p>
        <div className="space-y-2">
          <Check id="b-media" checked={media} onChange={setMedia} label={`Uploaded photos & videos (${mb(stats.uploadBytes)})`} hint="Untick for a small “content only” file. Cloudinary images are links and are always kept." />
          <Check id="b-customers" checked={customers} onChange={setCustomers} label={`Guest data: bookings, enquiries & subscribers (${stats.enquiries + stats.subscribers + stats.bookings})`} hint="Guests’ names, emails, phone numbers and bookings. Untick before sharing the file with anyone." />
          <Check id="b-history" checked={history} onChange={setHistory} label="Change history" hint="Activity log, change log and section revisions." />
          <Check id="b-users" checked={users} onChange={setUsers} label={`Admin logins (${stats.users})`} hint="Emails and encrypted passwords of admin users. Leave off unless you are moving the whole site to a new server." />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`/api/admin/backup?${q({ media, customers, history, users })}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800" data-testid="download-backup">
            <Download className="h-4 w-4" /> Download backup
          </a>
          <a href={`/api/admin/backup?${q({ media: false, customers: false, history: true, users: false })}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800" data-testid="download-for-claude">
            <FileArchive className="h-4 w-4" /> Small file for Claude
          </a>
        </div>
        <p className="mt-3 text-xs text-zinc-500">“Small file for Claude” = all content + change history, without guests’ details or bookings, logins or the big media files. Send it with the text from the Change Log.</p>
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Restore from a backup</span>}>
        <div className="mb-4 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Restoring <b>replaces</b> all pages, sections, collections, menus, theme and settings with the ones in the backup. A safety copy of the current site is saved automatically first (listed below), so you can go back.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200 dark:file:bg-zinc-800"
          data-testid="restore-file"
        />
        {file && <p className="mt-2 text-xs text-zinc-500">{file.name} · {mb(file.size)}</p>}
        <div className="mt-4 space-y-2">
          <Check id="r-media" checked={rMedia} onChange={setRMedia} label="Restore photos & videos from the backup" hint="Adds / overwrites files in the uploads folder. Nothing is deleted." />
          <Check id="r-customers" checked={rCustomers} onChange={setRCustomers} label="Replace bookings, enquiries & subscribers" hint="Untick to keep the guest bookings and enquiries you have now." />
          <Check id="r-history" checked={rHistory} onChange={setRHistory} label="Replace change history" />
          <Check id="r-users" checked={rUsers} onChange={setRUsers} label="Replace admin logins" hint="Only if the backup includes them. You may need to log in again with the backup’s password." />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="h-4 w-4 accent-red-600" data-testid="restore-sure" />
          I understand this replaces the current website content.
        </label>
        <div className="mt-4">
          <Btn variant="danger" onClick={restore} disabled={!file || !sure || busy} loading={busy} data-testid="restore-btn">
            <Upload className="h-4 w-4" /> Restore backup
          </Btn>
        </div>
        {busy && (
          <div className="mt-4" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">{phase} {progress! < 100 && `${progress}%`}</p>
          </div>
        )}
        {result && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" data-testid="restore-result">
            <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Restored “{result.manifest.site}” from {fmt(result.manifest.createdAt)}</p>
            <p className="mt-1">
              {Object.values(result.tables).reduce((a, b) => a + b, 0)} records in {Object.keys(result.tables).length} tables · {result.mediaFiles} media files.
            </p>
            <p className="mt-1 text-xs">Safety copy of the previous site: {result.safetyBackup}</p>
            <a href="/" target="_blank" className="mt-2 inline-block underline">View the website →</a>
          </div>
        )}
      </Card>

      <Card title="Backups saved on this computer / server" className="xl:col-span-2">
        {saved.length ? (
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {saved.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-mono text-xs">{s.name}</span>
                <span className="text-xs text-zinc-500">{fmt(s.at)} · {mb(s.size)}</span>
                <a href={`/api/admin/backup/file?name=${encodeURIComponent(s.name)}`} className="text-sm text-emerald-700 underline">Download</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">None yet. A safety copy is saved here automatically every time you restore (folder <code>storage/backups</code>).</p>
        )}
      </Card>
    </div>
  );
}
