import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { formatDay, formatINR } from '@/lib/booking';
import { confirmationPath } from '@/lib/booking-mail';
import { Badge, Card, PageHeader } from '@/components/admin/ui';
import { BookingActions } from '@/components/admin/forms/BookingActions';
import { STATUS_TONE } from '@/lib/booking-ui';

export const dynamic = 'force-dynamic';

export default async function BookingDetail({ params }: { params: { id: string } }) {
  await requirePageUser();
  const b = await prisma.booking.findUnique({ where: { id: params.id }, include: { room: { include: { stay: true } } } });
  if (!b) notFound();
  const br = b.breakdown as { nights?: { date: string; price: number }[]; extraGuests?: number; extrasTotal?: number } | null;
  const ages = Array.isArray(b.childAges) ? (b.childAges as number[]) : [];
  const rows: [string, React.ReactNode][] = [
    ['Room', `${b.room.stay.name} — ${b.room.name}`],
    ['Check-in', formatDay(b.checkIn)],
    ['Check-out', formatDay(b.checkOut)],
    ['Nights', b.nights],
    ['Guests', `${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}${b.source === 'website' && ages.length ? ` (ages ${ages.join(', ')})` : ''}` : ''}`],
    ['Guest', <span key="g">{b.name}<br /><a className="text-emerald-700 underline" href={`mailto:${b.email}`}>{b.email}</a> · <a className="text-emerald-700 underline" href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a></span>],
    ['Guest’s note', b.notes || '—'],
    ['Amount', formatINR(b.amount)],
    ['Payment', b.razorpayPaymentId ? <span key="p">Razorpay <span className="font-mono">{b.razorpayPaymentId}</span> · paid {b.paidAt?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span> : b.source === 'admin' ? 'Added by admin (offline)' : 'Not paid'],
    ['Order', b.razorpayOrderId ? <span key="o" className="font-mono">{b.razorpayOrderId}</span> : '—'],
    ['Made', b.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
  ];
  return (
    <>
      <PageHeader
        back={<Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="h-4 w-4" /> Bookings</Link>}
        title={<span className="flex items-center gap-3">Booking <span className="font-mono">{b.code}</span> <Badge tone={STATUS_TONE[b.status]}>{b.status.toLowerCase()}</Badge></span>}
        actions={b.status === 'CONFIRMED' ? <a href={confirmationPath(b.code)} target="_blank" className="text-sm text-emerald-700 underline">Guest’s confirmation page ↗</a> : undefined}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <dl className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[160px_1fr] gap-4 py-3"><dt className="text-zinc-500">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {br?.nights && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-zinc-500">Price breakdown</summary>
              <ul className="mt-2 space-y-1">
                {br.nights.map((n) => <li key={n.date} className="flex justify-between"><span>{formatDay(n.date)}</span><span>{formatINR(n.price)}</span></li>)}
                {!!br.extrasTotal && <li className="flex justify-between"><span>{br.extraGuests} extra guest(s)</span><span>{formatINR(br.extrasTotal)}</span></li>}
              </ul>
            </details>
          )}
        </Card>
        <BookingActions id={b.id} status={b.status} note={b.adminNote || ''} paid={!!b.razorpayPaymentId} />
      </div>
    </>
  );
}
