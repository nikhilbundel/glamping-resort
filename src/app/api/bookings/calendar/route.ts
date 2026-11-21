import { prisma } from '@/lib/db';
import { addDays, bookingSettings, expireStale, roomCalendar, toDay, todayIST } from '@/lib/booking';

export const dynamic = 'force-dynamic';

/** GET /api/bookings/calendar?room=<id>&month=2026-12&months=2 → price & availability for each night. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const room = await prisma.room.findFirst({ where: { id: sp.get('room') || '', bookable: true, published: true } });
  if (!room) return Response.json({ message: 'Room not found' }, { status: 404 });
  const month = /^\d{4}-\d{2}$/.test(sp.get('month') || '') ? sp.get('month')! : todayIST().toISOString().slice(0, 7);
  const months = Math.min(3, Math.max(1, Number(sp.get('months')) || 2));
  const from = toDay(`${month}-01`);
  const end = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1));
  await expireStale();
  const settings = await bookingSettings();
  // include one extra day so a stay can end on the 1st of the following month
  const days = await roomCalendar(room, from, addDays(end, 1), { maxAdvanceDays: settings.maxAdvanceDays });
  return Response.json({ days, minNights: room.minNights }, { headers: { 'Cache-Control': 'no-store' } });
}
