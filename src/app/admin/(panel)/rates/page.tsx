import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { bookingSettings, todayIST } from '@/lib/booking';
import { Empty, PageHeader } from '@/components/admin/ui';
import { RatesCalendar } from '@/components/admin/forms/RatesCalendar';

export const dynamic = 'force-dynamic';

export default async function RatesPage({ searchParams }: { searchParams: { room?: string } }) {
  await requirePageUser();
  const [rooms, bs] = await Promise.all([prisma.room.findMany({ where: { bookable: true }, include: { stay: true }, orderBy: [{ stay: { order: 'asc' } }, { order: 'asc' }] }), bookingSettings()]);
  return (
    <>
      <PageHeader
        title="Rates, guests & availability"
        description="Set the price for any night, close nights, and set each room’s guest limits and extra-guest charges. Nights without their own price use the room’s normal price. All prices include GST."
      />
      {rooms.length ? (
        <RatesCalendar rooms={rooms.map((r) => ({ id: r.id, name: `${r.stay.name} — ${r.name}` }))} initialRoom={rooms.find((r) => r.id === searchParams.room)?.id || rooms[0].id} today={todayIST().toISOString().slice(0, 10)} childFreeAge={bs.childFreeAge} />
      ) : (
        <Empty>No rooms are bookable online yet. Open Stays → Rooms & units, tick “Guests can book & pay for this room online” and set a normal price.</Empty>
      )}
    </>
  );
}
