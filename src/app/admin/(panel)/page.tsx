import Link from 'next/link';
import { Inbox, PenSquare, BedDouble, Mail, FilePlus2, Images, Palette, Menu } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { Card, PageHeader, Badge } from '@/components/admin/ui';
import { formatDate } from '@/lib/utils';

export default async function Dashboard({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await requirePageUser();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [enqWeek, enqNew, posts, rooms, subs, latest, activity] = await Promise.all([
    prisma.enquiry.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.enquiry.count({ where: { status: 'NEW' } }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.room.count({ where: { published: true } }),
    prisma.subscriber.count(),
    prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);
  const stats = [
    { label: 'Enquiries this week', value: enqWeek, sub: `${enqNew} new`, icon: Inbox, href: '/admin/enquiries' },
    { label: 'Published posts', value: posts, icon: PenSquare, href: '/admin/collections/posts' },
    { label: 'Rooms & units', value: rooms, icon: BedDouble, href: '/admin/collections/rooms' },
    { label: 'Subscribers', value: subs, icon: Mail, href: '/admin/subscribers' },
  ];
  const quick = [
    { label: 'New blog post', href: '/admin/collections/posts/new', icon: PenSquare },
    { label: 'Edit home page', href: '/admin/pages?slug=', icon: FilePlus2 },
    { label: 'Upload media', href: '/admin/media', icon: Images },
    { label: 'Edit menus', href: '/admin/menus', icon: Menu },
    ...(user.role === 'SUPER_ADMIN' ? [{ label: 'Theme & colors', href: '/admin/theme', icon: Palette }] : []),
  ];
  const tone = { NEW: 'blue', CONTACTED: 'amber', BOOKED: 'green', CLOSED: 'zinc' } as const;
  return (
    <>
      {searchParams.denied && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">That area is only available to Super Admins.</p>}
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Here’s what’s happening on your website." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-600 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">{s.label}</p>
              <s.icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="mt-2 text-3xl font-semibold">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-zinc-500">{s.sub}</p>}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Latest enquiries" actions={<Link href="/admin/enquiries" className="text-sm text-emerald-700">View all</Link>}>
          {latest.length ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {latest.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-zinc-500">
                      {e.email} · {e.stayType || 'Any stay'} {e.checkIn && `· ${formatDate(e.checkIn, { day: 'numeric', month: 'short' })}–${formatDate(e.checkOut, { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={tone[e.status]}>{e.status.toLowerCase()}</Badge>
                    <span className="text-xs text-zinc-500">{formatDate(e.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No enquiries yet.</p>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Quick links">
            <ul className="grid grid-cols-1 gap-2">
              {quick.map((q) => (
                <li key={q.label}>
                  <Link href={q.href} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm hover:border-emerald-600 dark:border-zinc-800">
                    <q.icon className="h-4 w-4 text-emerald-600" aria-hidden="true" /> {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Recent activity" actions={<Link href="/admin/activity" className="text-sm text-emerald-700">All</Link>}>
            <ul className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id}>
                  <p>{a.summary}</p>
                  <p className="text-xs text-zinc-500">
                    {a.userName} · {formatDate(a.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
