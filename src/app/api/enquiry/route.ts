import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enquirySchema } from '@/lib/forms';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { escapeHtml, sendMail } from '@/lib/mail';
import { getSettings } from '@/lib/data';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`enquiry:${ip}`, 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ message: 'Too many requests. Please try again in a few minutes.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Invalid form' }, { status: 400 });
  const d = parsed.data;
  // Honeypot filled → pretend success, store nothing
  if (d.website) return NextResponse.json({ ok: true });

  const sourceUrl = typeof body?.sourceUrl === 'string' ? body.sourceUrl.slice(0, 1000) : null;
  const enquiry = await prisma.enquiry.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      checkIn: d.checkIn ? new Date(d.checkIn) : null,
      checkOut: d.checkOut ? new Date(d.checkOut) : null,
      guests: typeof d.guests === 'number' && !Number.isNaN(d.guests) ? d.guests : null,
      stayType: d.stayType || null,
      message: d.message || null,
      sourceUrl,
    },
  });

  try {
    const s = await getSettings();
    const to = process.env.ENQUIRY_NOTIFY_TO || s.contact.reservationsEmail || s.contact.email;
    if (to) {
      const rows: [string, unknown][] = [
        ['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Check-in', d.checkIn && formatDate(d.checkIn)], ['Check-out', d.checkOut && formatDate(d.checkOut)],
        ['Guests', d.guests], ['Stay type', d.stayType], ['Message', d.message], ['Page', sourceUrl],
      ];
      await sendMail({
        to,
        replyTo: d.email,
        subject: `New enquiry from ${d.name}`,
        html: `<h2>New enquiry</h2><table cellpadding="6">${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table><p>Manage it in the admin panel → Enquiries (ID ${enquiry.id}).</p>`,
      });
    }
  } catch (e) {
    console.error('enquiry email failed', e);
  }
  return NextResponse.json({ ok: true });
}
