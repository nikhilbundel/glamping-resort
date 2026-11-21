import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { expireStale, formatINR, todayIST } from '@/lib/booking';
import { razorpayConfig } from '@/lib/razorpay';
import { Badge, Card, Empty, PageHeader } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { STATUS_TONE } from '@/lib/booking-ui';

export const dynamic = 'force-dynamic';

const VIEWS = { upcoming: 'Upcoming stays', past: 'Past stays', pending: 'Awaiting payment', cancelled: 'Cancelled', all: 'All' } as const;
type View = keyof typeof VIEWS;

const d = (x: Date) => x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' });

export default async function BookingsPage({ searchParams }: { searchParams: { view?: string; q?: string } }) {
  await requirePageUser();
  await expireStale();
  const view: View = (searchParams.view as View) in VIEWS ? (searchParams.view as View) : 'upcoming';
  const today = todayIST();
  const q = searchParams.q?.trim();
  const where: Prisma.BookingWhereInput = {
    ...(view === 'upcoming' ? { status: 'CONFIRMED', checkOut: { gte: today } } : {}),
    ...(view === 'past' ? { status: 'CONFIRMED', checkOut: { lt: today } } : {}),
    ...(view === 'pending' ? { status: { in: ['PENDING', 'EXPIRED', 'FAILED'] } } : {}),
    ...(view === 'cancelled' ? { status: 'CANCELLED' } : {}),
    ...(q ? { OR: [{ code: { contains: q.toUpperCase() } }, { name: { contains: q } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q } }] } : {}),
  };
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [rows, upcoming, monthPaid] = await Promise.all([
    prisma.booking.findMany({ where, include: { room: true }, orderBy: view === 'upcoming' ? { checkIn: 'asc' } : { createdAt: 'desc' }, take: 300 }),
    prisma.booking.count({ where: { status: 'CONFIRMED', checkOut: { gte: today } } }),
    prisma.booking.aggregate({ where: { status: 'CONFIRMED', source: 'website', paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
  ]);
  const rz = razorpayConfig();
  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking made on the website (paid by Razorpay) and the ones you add yourself."
        actions={<Link href="/admin/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"><Plus className="h-4 w-4" /> Add booking</Link>}
      />
      {!rz.configured && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Razorpay isn’t connected yet</b>, so guests can’t pay online. Add <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code> and <code>RAZORPAY_WEBHOOK_SECRET</code> to your <code>.env</code> file and restart the site.
        </div>
      )}
      {rz.configured && rz.mode === 'test' && <div className="mb-6 rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">Razorpay is in <b>test mode</b> — no real money is taken. Switch to live keys (rzp_live_…) when you go live.</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-zinc-500">Upcoming stays</p><p className="mt-1 text-2xl font-semibold">{upcoming}</p></Card>
        <Card><p className="text-sm text-zinc-500">Paid online this month</p><p className="mt-1 text-2xl font-semibold">{formatINR(monthPaid._sum.amount || 0)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Online bookings this month</p><p className="mt-1 text-2xl font-semibold">{monthPaid._count}</p></Card>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link key={v} href={`/admin/bookings?view=${v}`} className={cn('rounded-full border px-3 py-1.5 text-sm', v === view ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800')}>{VIEWS[v]}</Link>
        ))}
        <form className="ml-auto"><input type="hidden" name="view" value={view} /><input name="q" defaultValue={q} placeholder="Search code, name, email, phone" className="h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></form>
      </div>
      <Card className="overflow-hidden p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm" data-testid="bookings-table">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
                <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Guest</th><th className="px-4 py-3">Room</th><th className="px-4 py-3">Stay</th><th className="px-4 py-3">Guests</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-mono"><Link href={`/admin/bookings/${b.id}`} className="text-emerald-700 underline">{b.code}</Link></td>
                    <td className="px-4 py-3">{b.name}<span className="block text-xs text-zinc-500">{b.phone}</span></td>
                    <td className="px-4 py-3">{b.room.name}</td>
                    <td className="px-4 py-3">{d(b.checkIn)} → {d(b.checkOut)}<span className="block text-xs text-zinc-500">{b.nights} night{b.nights > 1 ? 's' : ''}</span></td>
                    <td className="px-4 py-3">{b.adults}{b.children ? ` + ${b.children}` : ''}</td>
                    <td className="px-4 py-3 text-right">{formatINR(b.amount)}<span className="block text-xs text-zinc-500">{b.source === 'admin' ? 'added by admin' : b.paidAt ? 'paid online' : ''}</span></td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[b.status]}>{b.status.toLowerCase()}</Badge>{b.adminNote?.includes('⚠') && <span className="ml-1" title={b.adminNote}>⚠</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6"><Empty>No bookings here yet.</Empty></div>
        )}
      </Card>
    </>
  );
}
