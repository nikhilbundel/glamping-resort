import { prisma } from '@/lib/db';
import { confirmPaid } from '@/lib/booking';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { sendBookingEmails } from '@/lib/booking-mail';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks → URL: https://YOUR-DOMAIN/api/razorpay/webhook,
 * events: payment.captured, order.paid, payment.failed). Confirms bookings even if the guest closed the browser
 * before returning to the site.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature') || '')) return new Response('invalid signature', { status: 400 });
  let evt: { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string; status: string; error_description?: string } }; order?: { entity?: { id: string } } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const pay = evt.payload?.payment?.entity;
  const orderId = pay?.order_id || evt.payload?.order?.entity?.id;
  if (!orderId) return Response.json({ ok: true });

  if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
    const res = await confirmPaid(orderId, pay?.id || '');
    if (res?.newlyConfirmed) {
      const full = await prisma.booking.findUniqueOrThrow({ where: { id: res.booking.id }, include: { room: { include: { stay: true } } } });
      await logActivity(null, 'create', 'booking', full.id, `Booking ${full.code} PAID & confirmed (via Razorpay webhook) — ${full.room.name}, ₹${full.amount.toLocaleString('en-IN')}`);
      await sendBookingEmails(full).catch((e) => console.error('booking email failed', e));
    }
  } else if (evt.event === 'payment.failed') {
    await prisma.booking.updateMany({ where: { razorpayOrderId: orderId, status: 'PENDING' }, data: { adminNote: `Last payment attempt failed: ${pay?.error_description || 'unknown reason'}` } });
  }
  return Response.json({ ok: true });
}
