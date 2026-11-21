import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { asArray } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';
import { bookingSettings } from '@/lib/booking';
import { razorpayConfig } from '@/lib/razorpay';
import { HomeLink } from '@/components/site/HomeLink';
import { BookingFlow, type BookableRoom } from '@/components/site/BookingFlow';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return buildMetadata(s, { title: 'Book your stay', description: `Check availability and book your stay at ${s.general.siteName} directly — secure payment by Razorpay.`, path: '/book' });
}

export default async function BookPage({ searchParams }: { searchParams: { room?: string; in?: string; out?: string } }) {
  const [s, bs, rooms] = await Promise.all([
    getSettings(),
    bookingSettings(),
    prisma.room.findMany({ where: { bookable: true, published: true, stay: { published: true } }, include: { stay: true }, orderBy: [{ stay: { order: 'asc' } }, { order: 'asc' }] }),
  ]);
  const list: BookableRoom[] = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    stay: r.stay.name,
    description: r.description || '',
    image: asArray<ImageValue>(r.images)[0] || (r.stay.image as ImageValue | null) || null,
    capacity: r.capacity || '',
    basePrice: r.basePrice,
    baseGuests: r.baseGuests,
    maxGuests: r.maxGuests,
    maxAdults: r.maxAdults,
    maxChildren: r.maxChildren,
    extraGuestPrice: r.extraGuestPrice,
    extraChildPrice: r.extraChildPrice,
    occupancyNote: r.occupancyNote || '',
    minNights: r.minNights,
  }));
  const rz = razorpayConfig();
  return (
    <>
      <HomeLink variant="bar" />
      <section className="pb-20 pt-6 md:pb-28 md:pt-8">
        <div className="container">
          <p className="eyebrow text-accent">Book direct</p>
          <h1 className="mt-3 font-heading text-h2 font-semibold">Book your stay</h1>
          <p className="mt-3 max-w-2xl text-muted">Choose your stay, pick your dates and pay securely. You’ll get an instant confirmation by email.</p>
          {bs.mode !== 'online' ? (
            <p className="mt-10 rounded-card border border-line bg-surface p-6">Online booking is currently switched off. Please <a className="text-accent underline" href="/contact#enquiry">send us an enquiry</a>.</p>
          ) : !list.length ? (
            <p className="mt-10 rounded-card border border-line bg-surface p-6">No rooms are open for online booking yet. Please <a className="text-accent underline" href="/contact#enquiry">send us an enquiry</a>.</p>
          ) : (
            <BookingFlow
              rooms={list}
              initialRoom={searchParams.room}
              initialIn={searchParams.in}
              initialOut={searchParams.out}
              siteName={s.general.siteName}
              childFreeAge={bs.childFreeAge}
              checkInTime={bs.checkInTime}
              checkOutTime={bs.checkOutTime}
              policy={bs.policy}
              taxNote={bs.taxNote}
              paymentsReady={rz.configured}
              testMode={rz.configured && rz.mode === 'test'}
            />
          )}
        </div>
      </section>
    </>
  );
}
