import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { Badge, PageHeader } from '@/components/admin/ui';
import { formatDate } from '@/lib/utils';

const PER = 50;

export default async function ActivityPage({ searchParams }: { searchParams: { page?: string; user?: string; entity?: string } }) {
  await requirePageUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: Prisma.ActivityLogWhereInput = {};
  if (searchParams.user) where.userName = searchParams.user;
  if (searchParams.entity) where.entity = searchParams.entity;
  const [rows, total, users, entities] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER, select: { id: true, createdAt: true, userName: true, action: true, entity: true, summary: true } }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ distinct: ['userName'], select: { userName: true } }),
    prisma.activityLog.findMany({ distinct: ['entity'], select: { entity: true } }),
  ]);
  const pages = Math.ceil(total / PER);
  const qs = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    Object.entries({ ...searchParams, ...p }).forEach(([k, v]) => v && s.set(k, v));
    return `/admin/activity?${s}`;
  };
  const tone = (a: string) => (a === 'delete' ? 'red' : a === 'create' || a === 'publish' ? 'green' : a === 'login' ? 'blue' : 'zinc');
  return (
    <>
      <PageHeader title="Activity log" description="Who changed what, and when." />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/activity">
        <select name="user" defaultValue={searchParams.user || ''} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" aria-label="Filter by user">
          <option value="">All users</option>
          {users.map((u) => <option key={u.userName}>{u.userName}</option>)}
        </select>
        <select name="entity" defaultValue={searchParams.entity || ''} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" aria-label="Filter by area">
          <option value="">All areas</option>
          {entities.map((e) => <option key={e.entity}>{e.entity}</option>)}
        </select>
        <button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">What</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">{formatDate(r.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-4 py-2.5">{r.userName}</td>
                <td className="px-4 py-2.5"><Badge tone={tone(r.action)}>{r.action}</Badge> <span className="text-xs text-zinc-500">{r.entity}</span></td>
                <td className="px-4 py-2.5">{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex gap-2" aria-label="Pagination">
          {page > 1 && <Link className="rounded-lg border px-3 py-1.5 text-sm" href={qs({ page: String(page - 1) })}>Previous</Link>}
          <span className="px-3 py-1.5 text-sm text-zinc-500">Page {page} of {pages}</span>
          {page < pages && <Link className="rounded-lg border px-3 py-1.5 text-sm" href={qs({ page: String(page + 1) })}>Next</Link>}
        </nav>
      )}
    </>
  );
}
