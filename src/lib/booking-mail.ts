import 'server-only';
import crypto from 'node:crypto';
import type { Booking, Room, Stay } from '@prisma/client';
import { sendMail, escapeHtml } from './mail';
import { bookingSettings, formatDay, formatINR } from './booking';
import { getSettings } from './data';

/** Token that lets a guest open their own confirmation page (so booking details can't be guessed from the code alone). */
export function bookingToken(code: string) {
  return crypto.createHmac('sha256', process.env.NEXTAUTH_SECRET || 'booking').update(code).digest('hex').slice(0, 16);
}
export const confirmationPath = (code: string) => `/book/confirmed/${code}?t=${bookingToken(code)}`;

type Full = Booking & { room: Room & { stay: Stay } };

export async function sendBookingEmails(b: Full) {
  const [s, bs] = await Promise.all([getSettings(), bookingSettings()]);
  const site = s.general.siteName || 'Glamo Home Cheog';
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const rows: [string, string][] = [
    ['Booking code', b.code],
    ['Stay', `${b.room.stay.name} — ${b.room.name}`],
    ['Check-in', `${formatDay(b.checkIn)} (from ${bs.checkInTime})`],
    ['Check-out', `${formatDay(b.checkOut)} (by ${bs.checkOutTime})`],
    ['Nights', String(b.nights)],
    ['Guests', `${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}`],
    ['Amount paid', `${formatINR(b.amount)}${bs.taxNote ? ' (inclusive of all taxes)' : ''}`],
  ];
  const table = `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#666">${k}</td><td><b>${escapeHtml(v)}</b></td></tr>`).join('')}</table>`;
  const contact = [s.contact?.phones?.[0], s.contact?.email].filter(Boolean).join(' · ');
  await Promise.allSettled([
    sendMail({
      to: b.email,
      subject: `Booking confirmed — ${b.code} · ${site}`,
      html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6"><p>Dear ${escapeHtml(b.name.split(' ')[0])},</p><p>Thank you — your stay at <b>${escapeHtml(site)}</b> is confirmed.</p>${table}<p style="font-size:13px;color:#555">${escapeHtml(bs.policy)}</p><p><a href="${base}${confirmationPath(b.code)}">View your booking</a></p>${contact ? `<p>Questions? ${escapeHtml(contact)}</p>` : ''}</div>`,
      replyTo: s.contact?.email || undefined,
    }),
    bs.notifyEmail || s.contact?.reservationsEmail || s.contact?.email
      ? sendMail({
          to: bs.notifyEmail || s.contact?.reservationsEmail || s.contact?.email,
          subject: `New booking ${b.code} — ${b.room.name}, ${formatDay(b.checkIn)}`,
          html: `<div style="font-family:sans-serif">${table}<p>Guest: ${escapeHtml(b.name)} · ${escapeHtml(b.email)} · ${escapeHtml(b.phone)}</p>${b.notes ? `<p>Notes: ${escapeHtml(b.notes)}</p>` : ''}${b.adminNote ? `<p style="color:#b45309">${escapeHtml(b.adminNote)}</p>` : ''}<p><a href="${base}/admin/bookings/${b.id}">Open in admin</a></p></div>`,
          replyTo: b.email,
        })
      : Promise.resolve(false),
  ]);
}
