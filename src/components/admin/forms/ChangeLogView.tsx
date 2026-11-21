'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ClipboardCopy, Download, Send } from 'lucide-react';
import { Badge, Btn, Card, Empty } from '@/components/admin/ui';
import { changelogText, type LogEntry } from '@/lib/changelog-text';
import { markChangesSent } from '@/app/admin/_actions/changelog';
import { cn } from '@/lib/utils';

const RANGE_LABEL: Record<string, string> = { since: 'Since last “Mark as sent”', today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'Everything' };
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const tone = (a: string) => (a === 'delete' ? 'red' : a === 'create' || a === 'publish' || a === 'upload' ? 'green' : a === 'restore' ? 'amber' : 'zinc');

export function ChangeLogView({ entries, site, range, from, customFrom, sentAt, capped }: { entries: LogEntry[]; site: string; range: string; from: string | null; customFrom: string; sentAt: string | null; capped: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const period = range === 'all' ? 'everything recorded' : from ? `after ${fmt(from)}` : RANGE_LABEL[range];
  const text = useMemo(() => changelogText(entries, { site, period }), [entries, site, period]);
  const fileName = `change-log-${new Date().toISOString().slice(0, 10)}.txt`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.getElementById('changelog-text') as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    toast.success('Copied — now paste it to Claude');
    setTimeout(() => setCopied(false), 2500);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  const markSent = () =>
    start(async () => {
      const r = await markChangesSent();
      if (!r.ok) return void toast.error(r.error);
      toast.success('Marked as sent. Next time only newer changes are shown.');
      router.push('/admin/changes?range=since');
      router.refresh();
    });

  const tab = (r: string) => (
    <Link
      key={r}
      href={`/admin/changes?range=${r}`}
      className={cn('rounded-full border px-3 py-1.5 text-sm', range === r ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800')}
    >
      {RANGE_LABEL[r]}
    </Link>
  );

  return (
    <div className="space-y-6" data-testid="changelog">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {(sentAt ? ['since', 'today', '7d', '30d', 'all'] : ['today', '7d', '30d', 'all']).map(tab)}
          <form action="/admin/changes" className="ml-auto flex items-center gap-2 text-sm">
            <label htmlFor="cl-from" className="text-zinc-500">From date</label>
            <input id="cl-from" type="date" name="from" defaultValue={customFrom} className="h-9 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900" />
            <Btn type="submit" size="sm">Show</Btn>
          </form>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          {sentAt ? <>Last marked as sent to Claude: <b>{fmt(sentAt)}</b>. </> : 'Nothing has been marked as sent yet. '}
          Showing <b>{entries.length}</b> change{entries.length === 1 ? '' : 's'} — {period}.
          {capped && ' (Only the first 3000 are shown — choose a shorter period.)'} Unpublished drafts are not included.
        </p>
      </Card>

      <Card
        title="Text to give Claude"
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={copy} disabled={!entries.length} data-testid="copy-log">
              {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy all'}
            </Btn>
            <Btn onClick={download} disabled={!entries.length}>
              <Download className="h-4 w-4" /> Download .txt
            </Btn>
            <Btn onClick={markSent} loading={pending} disabled={!entries.length} title="Next time, only show changes made after now">
              <Send className="h-4 w-4" /> Mark as sent
            </Btn>
          </div>
        }
      >
        {entries.length ? (
          <textarea
            id="changelog-text"
            readOnly
            value={text}
            spellCheck={false}
            className="h-[460px] w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            onFocus={(e) => e.currentTarget.select()}
          />
        ) : (
          <Empty>No changes in this period. Edit something in the admin and it will appear here.</Empty>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Tip: for big changes (new pages, many images) also send a <Link href="/admin/backup" className="underline">backup file</Link> — the change log says <i>what</i> changed, the backup contains the content itself.
        </p>
      </Card>

      {entries.length > 0 && (
        <Card title="At a glance">
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {[...entries].reverse().slice(0, 300).map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <span className="w-40 shrink-0 text-xs text-zinc-500">{fmt(e.createdAt)}</span>
                <Badge tone={tone(e.action)}>{e.action}</Badge>
                <span className="min-w-0 flex-1">
                  {e.summary}
                  {e.details?.changes?.length ? <span className="text-zinc-400"> · {e.details.changes.length} field{e.details.changes.length === 1 ? '' : 's'}</span> : null}
                </span>
                <span className="text-xs text-zinc-400">{e.userName}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
