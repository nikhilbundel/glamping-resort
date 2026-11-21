import { z } from 'zod';
import { prisma } from '@/lib/db';
import { BookingError, bookingSettings, createBooking } from '@/lib/booking';
import { createOrder, razorpayConfig } from '@/lib/razorpay';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(30),
  childAges: z.array(z.coerce.number().int().min(0).max(17)).max(20).default([]),
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().email('Please enter a valid email').max(200),
  phone: z.string().trim().min(7, 'Please enter a phone number').max(30).regex(/^[+\d][\d\s()-]{6,}$/, 'Please enter a valid phone number'),
  notes: z.string().max(1000).optional(),
  acceptPolicy: z.literal(true, { errorMap: () => ({ message: 'Please accept the booking policy' }) }),
  website: z.string().max(0).optional(), // honeypot
  replaceCode: z.string().max(20).optional(), // the guest changed details after opening a payment window
});

/** Start a booking: holds the dates for a few minutes and opens a Razorpay order for the full amount. */
export async function POST(req: Request) {
  if (!rateLimit(`book:${clientIp(req.headers)}`, 12, 10 * 60_000).ok) return Response.json({ message: 'Too many attempts — please wait a few minutes.' }, { status: 429 });
  const settings = await bookingSettings();
  if (settings.mode !== 'online') return Response.json({ message: 'Online booking is switched off.' }, { status: 403 });
  const rz = razorpayConfig();
  if (!rz.configured) return Response.json({ message: 'Online payment isn’t set up yet — please contact us to book.' }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message || 'Please check your details.' }, { status: 400 });
  const { acceptPolicy: _a, website: _w, replaceCode, ...input } = parsed.data;
  // release the dates held by this guest's previous, unpaid attempt
  if (replaceCode) await prisma.booking.updateMany({ where: { code: replaceCode, status: 'PENDING', email: input.email.trim().toLowerCase() }, data: { status: 'EXPIRED', holdUntil: null } });

  let booking;
  try {
    booking = await createBooking(input, { status: 'PENDING', source: 'website' });
  } catch (e) {
    if (e instanceof BookingError) return Response.json({ message: e.message }, { status: 409 });
    console.error('booking failed', e);
    return Response.json({ message: 'Something went wrong — please try again.' }, { status: 500 });
  }
  try {
    const order = await createOrder(booking.amount, booking.code, { booking: booking.code, room: booking.room.name, checkIn: input.checkIn, checkOut: input.checkOut });
    await prisma.booking.update({ where: { id: booking.id }, data: { razorpayOrderId: order.id } });
    await logActivity(null, 'create', 'booking', booking.id, `Booking ${booking.code} started (awaiting payment) — ${booking.room.name}, ${input.checkIn} → ${input.checkOut}`);
    return Response.json({
      keyId: rz.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      code: booking.code,
      description: `${booking.room.stay.name} — ${booking.room.name} · ${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
      prefill: { name: booking.name, email: booking.email, contact: booking.phone },
    });
  } catch (e) {
    console.error('razorpay order failed', e);
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'FAILED', holdUntil: null } });
    return Response.json({ message: 'Couldn’t start the payment — please try again in a moment.' }, { status: 502 });
  }
}
