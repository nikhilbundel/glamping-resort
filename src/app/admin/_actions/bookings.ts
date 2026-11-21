'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { logActivity, diff } from '@/lib/audit';
import { addDays, BookingError, createBooking, dayKey, expireStale, quote, roomCalendar, toDay } from '@/lib/booking';

/** Cancel a booking (frees the dates). Refunds, if any, are made by you in the Razorpay dashboard. */
export async function cancelBooking(id: string, note: string) {
  return run(async () => {
    const user = await requireUser();
    const b = await prisma.booking.findUniqueOrThrow({ where: { id } });
    if (b.status === 'CANCELLED') return;
    const stamp = `Cancelled by ${user.name} on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note.trim() ? ` — ${note.trim()}` : ''}`;
    await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED', holdUntil: null, adminNote: b.adminNote ? `${b.adminNote}\n${stamp}` : stamp } });
    await logActivity(user, 'update', 'booking', id, `Cancelled booking ${b.code}`, { changes: [{ path: 'status', from: b.status, to: 'CANCELLED' }], note: note || undefined });
    revalidatePath('/admin/bookings');
  });
}

export async function saveBookingNote(id: string, adminNote: string) {
  return run(async () => {
    const user = await requireUser();
    const b = await prisma.booking.update({ where: { id }, data: { adminNote: adminNote.slice(0, 5000) || null } });
    await logActivity(user, 'update', 'booking', id, `Updated note on booking ${b.code}`);
    revalidatePath(`/admin/bookings/${id}`);
  });
}

const manual = z.object({
  roomId: z.string().min(1, 'Choose a room'),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose check-in'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose check-out'),
  adults: z.coerce.number().int().min(1).max(30),
  children: z.coerce.number().int().min(0).max(20),
  name: z.string().trim().min(2, 'Enter the guest’s name'),
  email: z.string().trim().email().or(z.literal('')),
  phone: z.string().trim().max(30),
  amount: z.coerce.number().int().min(0),
  paid: z.boolean(),
  allowOverlap: z.boolean(),
  note: z.string().max(2000).optional(),
});

/** Price for the admin's manual booking form. */
export async function adminQuote(roomId: string, checkIn: string, checkOut: string, adults: number, children: number) {
  return run(async () => {
    await requireUser();
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    try {
      const q = await quote({ ...room, bookable: true, published: true }, checkIn, checkOut, adults, Array(children).fill(17), {});
      return { total: q.total, available: true, message: '' };
    } catch (e) {
      if (!(e instanceof BookingError)) throw e;
      const q = await quote({ ...room, bookable: true, published: true }, checkIn, checkOut, adults, Array(children).fill(17), { ignoreAvailability: true }).catch(() => null);
      return { total: q?.total ?? 0, available: false, message: e.message };
    }
  });
}

/** Add a booking taken by phone / in person / another website, so its dates are blocked online. */
export async function createManualBooking(values: z.input<typeof manual>) {
  return run(async () => {
    const user = await requireUser();
    const d = manual.parse(values);
    try {
      const b = await createBooking(
        { roomId: d.roomId, checkIn: d.checkIn, checkOut: d.checkOut, adults: d.adults, childAges: Array(d.children).fill(17), name: d.name, email: d.email || '-', phone: d.phone || '-', notes: undefined },
        { status: 'CONFIRMED', source: 'admin', amountOverride: d.amount, ignoreAvailability: d.allowOverlap, adminNote: [`Added by ${user.name}${d.paid ? ' (paid offline)' : ' (payment due at property)'}`, d.note].filter(Boolean).join(' — ') },
      );
      await logActivity(user, 'create', 'booking', b.id, `Added booking ${b.code} for ${d.name} — ${b.room.name}, ${d.checkIn} → ${d.checkOut}`);
      revalidatePath('/admin/bookings');
      return { id: b.id };
    } catch (e) {
      if (e instanceof BookingError) throw new Error(`${e.message} Tick “Allow overlap / ignore guest limits” to add it anyway.`);
      throw e;
    }
  });
}

export type AdminDay = { date: string; price: number | null; custom: boolean; closed: boolean; booked: number; guests: string[] };

/** Month view for Rates & availability. */
export async function loadRatesMonth(roomId: string, month: string) {
  return run(async () => {
    await requireUser();
    await expireStale();
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const from = toDay(`${month}-01`);
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 2, 1));
    const [rates, bookings] = await Promise.all([
      prisma.roomRate.findMany({ where: { roomId, date: { gte: from, lt: to } } }),
      prisma.booking.findMany({ where: { roomId, checkIn: { lt: to }, checkOut: { gt: from }, OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', holdUntil: { gt: new Date() } }] }, select: { checkIn: true, checkOut: true, name: true, code: true, status: true } }),
    ]);
    const rateMap = new Map(rates.map((r) => [dayKey(r.date), r]));
    const days: AdminDay[] = [];
    for (let d = from; d < to; d = addDays(d, 1)) {
      const k = dayKey(d);
      const r = rateMap.get(k);
      const here = bookings.filter((b) => b.checkIn <= d && b.checkOut > d);
      days.push({ date: k, price: r?.price ?? room.basePrice ?? null, custom: r?.price != null, closed: !!r?.closed, booked: here.length, guests: here.map((b) => `${b.name} (${b.code}${b.status === 'PENDING' ? ', paying now' : ''})`) });
    }
    return {
      days,
      units: room.units,
      basePrice: room.basePrice,
      name: room.name,
      guests: { basePrice: room.basePrice, baseGuests: room.baseGuests, maxGuests: room.maxGuests, maxAdults: room.maxAdults, maxChildren: room.maxChildren, extraGuestPrice: room.extraGuestPrice, extraChildPrice: room.extraChildPrice, minNights: room.minNights, occupancyNote: room.occupancyNote || '' },
    };
  });
}

const rates = z.object({
  roomId: z.string(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(800),
  action: z.enum(['price', 'close', 'open', 'reset']),
  price: z.coerce.number().int().min(0).max(10_000_000).optional(),
});

/** Set a price for chosen nights, close / open them, or go back to the room's normal price. */
export async function setRates(values: z.input<typeof rates>) {
  return run(async () => {
    const user = await requireUser();
    const d = rates.parse(values);
    if (d.action === 'price' && d.price === undefined) throw new Error('Enter a price');
    const room = await prisma.room.findUniqueOrThrow({ where: { id: d.roomId } });
    const ops = d.dates.map((k) => {
      const date = toDay(k);
      const where = { roomId_date: { roomId: d.roomId, date } };
      if (d.action === 'reset') return prisma.roomRate.deleteMany({ where: { roomId: d.roomId, date } });
      const data = d.action === 'price' ? { price: d.price } : { closed: d.action === 'close' };
      return prisma.roomRate.upsert({ where, update: data, create: { roomId: d.roomId, date, ...data } });
    });
    await prisma.$transaction(ops);
    const sorted = [...d.dates].sort();
    const what = d.action === 'price' ? `price ₹${d.price!.toLocaleString('en-IN')}` : d.action === 'close' ? 'closed' : d.action === 'open' ? 'opened' : 'reset to normal price';
    await logActivity(user, 'update', 'rates', d.roomId, `${room.name}: ${what} for ${d.dates.length} night${d.dates.length > 1 ? 's' : ''} (${sorted[0]}${sorted.length > 1 ? ` … ${sorted[sorted.length - 1]}` : ''})`, { where: `Rates & availability › ${room.name}`, note: `Nights: ${sorted.join(', ')}` });
    revalidatePath('/book');
  });
}

/** Calendar used by the admin to preview what guests see. */
export async function guestCalendar(roomId: string, month: string) {
  return run(async () => {
    await requireUser();
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const from = toDay(`${month}-01`);
    return roomCalendar(room, from, addDays(from, 31));
  });
}

const optInt = (max: number) => z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), z.coerce.number().int().min(0).max(max).nullable());
const guestsSchema = z
  .object({
    basePrice: optInt(10_000_000),
    baseGuests: z.coerce.number().int().min(1).max(20),
    maxGuests: z.coerce.number().int().min(1).max(30),
    maxAdults: optInt(30),
    maxChildren: optInt(20),
    extraGuestPrice: z.coerce.number().int().min(0).max(1_000_000),
    extraChildPrice: optInt(1_000_000),
    minNights: z.coerce.number().int().min(1).max(30),
    occupancyNote: z.string().max(200),
  });

/** Quick edit of a room's price and guest rules (Rates & availability page). */
export async function saveRoomGuests(roomId: string, values: Record<string, unknown>) {
  return run(async () => {
    const user = await requireUser();
    const d = guestsSchema.parse(values);
    if (d.maxGuests < d.baseGuests) throw new Error('Maximum guests can’t be less than the guests included in the price.');
    if (d.maxAdults !== null && d.maxAdults < 1) throw new Error('Maximum adults must be at least 1 (or leave it empty).');
    const before = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const data = { ...d, occupancyNote: d.occupancyNote.trim() || null };
    await prisma.room.update({ where: { id: roomId }, data });
    const pick = (r: Record<string, unknown>) => Object.fromEntries(Object.keys(data).map((k) => [k, r[k] ?? null]));
    await logActivity(user, 'update', 'rooms', roomId, `Updated guests & price for “${before.name}”`, { where: `Rates & availability › ${before.name}`, changes: diff(pick(before), pick(data)) });
    revalidatePath('/book');
    revalidatePath('/', 'layout');
  });
}
