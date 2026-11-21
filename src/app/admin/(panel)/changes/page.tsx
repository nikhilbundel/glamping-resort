import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { PageHeader } from '@/components/admin/ui';
import { ChangeLogView } from '@/components/admin/forms/ChangeLogView';
import type { LogEntry } from '@/lib/changelog-text';

export const dynamic = 'force-dynamic';

const RANGES = ['since', 'today', '7d', '30d', 'all'] as const;
type Range = (typeof RANGES)[number];

export default async function ChangesPage({ searchParams }: { searchParams: { range?: string; from?: string } }) {
  await requirePageUser();
  const marker = await prisma.setting.findUnique({ where: { key: 'changelog' } });
  const sentAt = (marker?.value as { sentAt?: string } | null)?.sentAt || null;
  const range: Range = RANGES.includes(searchParams.range as Range) ? (searchParams.range as Range) : sentAt ? 'since' : 'all';

  let from: Date | null = null;
  const now = new Date();
  if (searchParams.from && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from)) from = new Date(`${searchParams.from}T00:00:00`);
  else if (range === 'since' && sentAt) from = new Date(sentAt);
  else if (range === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === '7d') from = new Date(now.getTime() - 7 * 864e5);
  else if (range === '30d') from = new Date(now.getTime() - 30 * 864e5);

  const where: Prisma.ActivityLogWhereInput = { action: { not: 'login' } };
  if (from) where.createdAt = { gt: from };
  let rows;
  try {
    rows = await prisma.activityLog.findMany({ where, orderBy: { createdAt: 'asc' }, take: 3000 });
  } catch (e) {
    console.error(e);
    return (
      <>
        <PageHeader title="Change log (for Claude)" />
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">One quick database update is needed first.</p>
          <p className="mt-2">Stop the site (Ctrl + C) in Terminal, run this in the project folder, then start it again with <code>npm run dev</code>:</p>
          <pre className="mt-3 rounded-lg bg-white p-3 font-mono text-xs">npx prisma migrate dev --name change-log-details</pre>
        </div>
      </>
    );
  }
  const settings = await getSettings();
  const entries: LogEntry[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    userName: r.userName,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    summary: r.summary,
    details: ((r as { details?: unknown }).details ?? null) as LogEntry['details'],
  }));

  return (
    <>
      <PageHeader
        title="Change log (for Claude)"
        description="Every change you publish in the admin is written down here as plain text — which page, which section, which field, and the old and new value. Copy it (or download the .txt) and paste it to Claude, so it knows exactly what you changed."
      />
      <ChangeLogView
        entries={entries}
        site={String((settings.general as { siteName?: string })?.siteName || 'Website')}
        range={searchParams.from ? 'custom' : range}
        from={from?.toISOString() || null}
        customFrom={searchParams.from || ''}
        sentAt={sentAt}
        capped={rows.length >= 3000}
      />
    </>
  );
}
