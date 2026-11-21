import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { bookingSettings, formatDay, formatINR } from '@/lib/booking';
import { bookingToken } from '@/lib/booking-mail';
import { HomeLink } from '@/components/site/HomeLink';
import { AutoRefresh } from '@/components/site/AutoRefresh';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your booking', robots: { index: false } };

export default async function Confirmed({ params, searchParams }: { params: { code: string }; searchParams: { t?: string } }) {
  if (searchParams.t !== bookingToken(params.code)) notFound();
  const b = await prisma.booking.findUnique({ where: { code: params.code }, include: { room: { include: { stay: true } } } });
  if (!b) notFound();
  const [s, bs] = await Promise.all([getSettings(), bookingSettings()]);
  const confirmed = b.status === 'CONFIRMED';
  const rows: [string, string][] = [
    ['Booking code', b.code],
    ['Stay', `${b.room.stay.name} — ${b.room.name}`],
    ['Check-in', `${formatDay(b.checkIn)} · from ${bs.checkInTime}`],
    ['Check-out', `${formatDay(b.checkOut)} · by ${bs.checkOutTime}`],
    ['Guests', `${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}`],
    [confirmed ? 'Paid' : 'Amount', `${formatINR(b.amount)}${bs.taxNote ? ' (incl. GST)' : ''}`],
  ];
  return (
    <>
      <HomeLink variant="bar" />
      <section className="pb-24 pt-8">
        <div className="container max-w-2xl" data-testid="booking-confirmed">
          {confirmed ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-700" aria-hidden="true" />
              <h1 className="mt-4 font-heading text-h2 font-semibold">You’re booked, {b.name.split(' ')[0]}!</h1>
              <p className="mt-3 text-muted">A confirmation has been sent to <b className="text-ink">{b.email}</b>. We can’t wait to welcome you to {s.general.siteName}.</p>
            </>
          ) : b.status === 'PENDING' ? (
            <>
              <AutoRefresh seconds={4} />
              <Clock className="h-12 w-12 text-muted" aria-hidden="true" />
              <h1 className="mt-4 font-heading text-h2 font-semibold">Confirming your payment…</h1>
              <p className="mt-3 text-muted">This usually takes a few seconds. This page refreshes on its own.</p>
            </>
          ) : (
            <>
              <h1 className="font-heading text-h2 font-semibold">This booking is {b.status.toLowerCase()}</h1>
              <p className="mt-3 text-muted">If money was deducted, please contact us with your booking code and we’ll sort it out.</p>
            </>
          )}
          <dl className="mt-8 divide-y divide-line rounded-card border border-line bg-surface">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-2 px-5 py-4">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted">{bs.policy}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex min-h-[48px] items-center rounded-btn bg-btn px-7 text-sm font-medium text-btn-ink">Back to Home</Link>
            <Link href="/contact" className="inline-flex min-h-[48px] items-center rounded-btn border border-line px-7 text-sm font-medium">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
