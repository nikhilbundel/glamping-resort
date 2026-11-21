import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { ManualBookingForm } from '@/components/admin/forms/ManualBookingForm';

export const dynamic = 'force-dynamic';

export default async function NewBooking() {
  await requirePageUser();
  const rooms = await prisma.room.findMany({ include: { stay: true }, orderBy: [{ stay: { order: 'asc' } }, { order: 'asc' }] });
  return (
    <>
      <PageHeader
        back={<Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="h-4 w-4" /> Bookings</Link>}
        title="Add a booking"
        description="For guests who booked by phone, WhatsApp, in person or on another website — their dates are blocked on the website straight away."
      />
      <ManualBookingForm rooms={rooms.map((r) => ({ id: r.id, label: `${r.stay.name} — ${r.name}${r.bookable ? '' : ' (not bookable online)'}`, bookable: r.bookable }))} />
    </>
  );
}
