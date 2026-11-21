import { z } from 'zod';
import { prisma } from '@/lib/db';
import { confirmPaid } from '@/lib/booking';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { confirmationPath, sendBookingEmails } from '@/lib/booking-mail';
import { logActivity } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const schema = z.object({ razorpay_order_id: z.string().min(1), razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().min(1) });

/** Called by the browser right after Razorpay reports a successful payment. */
export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return Response.json({ message: 'Missing payment details.' }, { status: 400 });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig } = p.data;
  if (!verifyPaymentSignature(orderId, paymentId, sig)) return Response.json({ message: 'Payment could not be verified. If money was deducted, contact us with your booking code.' }, { status: 400 });
  const res = await confirmPaid(orderId, paymentId);
  if (!res) return Response.json({ message: 'Booking not found.' }, { status: 404 });
  if (res.newlyConfirmed) {
    const full = await prisma.booking.findUniqueOrThrow({ where: { id: res.booking.id }, include: { room: { include: { stay: true } } } });
    await logActivity(null, 'create', 'booking', full.id, `Booking ${full.code} PAID & confirmed — ${full.room.name}, ₹${full.amount.toLocaleString('en-IN')} (payment ${paymentId})`);
    sendBookingEmails(full).catch((e) => console.error('booking email failed', e));
    revalidatePath('/admin/bookings');
  }
  return Response.json({ code: res.booking.code, redirect: confirmationPath(res.booking.code) });
}
