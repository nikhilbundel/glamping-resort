import 'server-only';
import { Prisma, type Booking, type Room } from '@prisma/client';
import { prisma } from './db';
import { getSettings } from './data';
import { guestCharges, occupancyError } from './pricing';

/**
 * Online booking engine.
 * Dates are plain calendar days ("YYYY-MM-DD"), stored as UTC midnight. A "night" is identified by the date it starts on,
 * so a stay from 10 → 12 occupies the nights of the 10th and 11th.
 */

export const HOLD_MINUTES = 15; // a guest who opened the payment window keeps the dates this long

export type BookingSettings = {
  mode: 'online' | 'external' | 'enquiry';
  childFreeAge: number;
  checkInTime: string;
  checkOutTime: string;
  maxAdvanceDays: number;
  policy: string;
  notifyEmail: string;
  taxNote: boolean;
};

export async function bookingSettings(): Promise<BookingSettings> {
  const s = (await getSettings()).booking as unknown as Partial<BookingSettings>;
  return {
    mode: (s.mode as BookingSettings['mode']) || 'online',
    childFreeAge: Number.isFinite(Number(s.childFreeAge)) && s.childFreeAge !== undefined && String(s.childFreeAge) !== '' ? Number(s.childFreeAge) : 5,
    checkInTime: s.checkInTime || '12:00 PM',
    checkOutTime: s.checkOutTime || '11:00 AM',
    maxAdvanceDays: Number(s.maxAdvanceDays) || 365,
    policy: s.policy || 'All bookings are non-refundable. Dates can be changed once, subject to availability, if you contact us at least 7 days before check-in.',
    notifyEmail: s.notifyEmail || '',
    taxNote: s.taxNote !== false,
  };
}

// ── dates ──
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function toDay(s: string): Date {
  if (!DAY.test(s)) throw new BookingError('Please choose valid dates.');
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new BookingError('Please choose valid dates.');
  return d;
}
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
/** Today's date in India (bookings are for a property in Shimla). */
export function todayIST() {
  return toDay(new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10));
}
export function nightsBetween(a: Date, b: Date) {
  const out: Date[] = [];
  for (let d = a; d < b; d = addDays(d, 1)) out.push(d);
  return out;
}

export class BookingError extends Error {}

// ── occupancy ──
const activeWhere = (now = new Date()): Prisma.BookingWhereInput => ({
  OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', holdUntil: { gt: now } }],
});

type Db = Prisma.TransactionClient | typeof prisma;

/** How many units are taken on each night in [from, to). */
async function occupancy(db: Db, roomId: string, from: Date, to: Date, excludeId?: string) {
  const rows = await db.booking.findMany({
    where: { roomId, checkIn: { lt: to }, checkOut: { gt: from }, ...activeWhere(), ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { checkIn: true, checkOut: true },
  });
  const map = new Map<string, number>();
  for (const b of rows) for (const n of nightsBetween(b.checkIn < from ? from : b.checkIn, b.checkOut > to ? to : b.checkOut)) map.set(dayKey(n), (map.get(dayKey(n)) || 0) + 1);
  return map;
}

export type CalendarDay = { date: string; price: number | null; available: boolean; reason?: 'past' | 'closed' | 'booked' | 'no-price' | 'too-far' };

/** Price and availability for every night in [from, to) — used by the guest calendar and the admin rates calendar. */
export async function roomCalendar(room: Pick<Room, 'id' | 'units' | 'basePrice'>, from: Date, to: Date, opts: { maxAdvanceDays?: number; db?: Db } = {}): Promise<CalendarDay[]> {
  const db = opts.db || prisma;
  const [rates, occ] = await Promise.all([db.roomRate.findMany({ where: { roomId: room.id, date: { gte: from, lt: to } } }), occupancy(db, room.id, from, to)]);
  const rateMap = new Map(rates.map((r) => [dayKey(r.date), r]));
  const today = todayIST();
  const last = opts.maxAdvanceDays ? addDays(today, opts.maxAdvanceDays) : null;
  return nightsBetween(from, to).map((d) => {
    const k = dayKey(d);
    const r = rateMap.get(k);
    const price = r?.price ?? room.basePrice ?? null;
    let reason: CalendarDay['reason'];
    if (d < today) reason = 'past';
    else if (last && d > last) reason = 'too-far';
    else if (r?.closed) reason = 'closed';
    else if ((occ.get(k) || 0) >= Math.max(1, room.units)) reason = 'booked';
    else if (price == null) reason = 'no-price';
    return { date: k, price, available: !reason, ...(reason ? { reason } : {}) };
  });
}

export type Quote = {
  nights: { date: string; price: number }[];
  roomTotal: number;
  countedGuests: number;
  extraGuests: number;
  extraAdults: number;
  extraChildren: number;
  extraPerNight: number;
  extrasTotal: number;
  total: number;
};

/** Validate a stay and work out its price. Throws BookingError with a guest-friendly message. */
export async function quote(
  room: Room,
  checkInStr: string,
  checkOutStr: string,
  adults: number,
  childAges: number[],
  opts: { db?: Db; settings?: BookingSettings; ignoreAvailability?: boolean } = {},
): Promise<Quote> {
  const settings = opts.settings || (await bookingSettings());
  if (!room.bookable || !room.published) throw new BookingError('This room can’t be booked online right now.');
  const checkIn = toDay(checkInStr);
  const checkOut = toDay(checkOutStr);
  if (checkOut <= checkIn) throw new BookingError('Check-out must be after check-in.');
  const n = Math.round((checkOut.getTime() - checkIn.getTime()) / 864e5);
  if (n < Math.max(1, room.minNights)) throw new BookingError(`This room needs a minimum stay of ${room.minNights} nights.`);
  if (n > 60) throw new BookingError('For stays longer than 60 nights please contact us.');
  if (!Number.isInteger(adults) || adults < 1) throw new BookingError('At least one adult is needed.');
  if (childAges.some((a) => !Number.isInteger(a) || a < 0 || a > 17)) throw new BookingError('Please give each child’s age (0–17).');
  const occErr = occupancyError(room, adults, childAges, settings.childFreeAge);
  if (occErr && !opts.ignoreAvailability) throw new BookingError(occErr);
  const g = guestCharges(room, adults, childAges, settings.childFreeAge);

  const days = await roomCalendar(room, checkIn, checkOut, { maxAdvanceDays: opts.ignoreAvailability ? undefined : settings.maxAdvanceDays, db: opts.db });
  if (!opts.ignoreAvailability) {
    const bad = days.find((d) => !d.available);
    if (bad) {
      const when = new Date(`${bad.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      throw new BookingError(
        bad.reason === 'past' ? 'Those dates are in the past.' : bad.reason === 'too-far' ? `Bookings open up to ${settings.maxAdvanceDays} days ahead.` : bad.reason === 'no-price' ? `The night of ${when} isn’t open for booking yet.` : `Sorry — ${room.name} is not available on the night of ${when}.`,
      );
    }
  }
  const nights = days.map((d) => ({ date: d.date, price: d.price ?? 0 }));
  const roomTotal = nights.reduce((a, b) => a + b.price, 0);
  const extrasTotal = g.perNight * n;
  return { nights, roomTotal, countedGuests: g.counted, extraGuests: g.extraAdults + g.extraChildren, extraAdults: g.extraAdults, extraChildren: g.extraChildren, extraPerNight: g.perNight, extrasTotal, total: roomTotal + extrasTotal };
}

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function newCode() {
  let s = 'GHC-';
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export type GuestInput = { roomId: string; checkIn: string; checkOut: string; adults: number; childAges: number[]; name: string; email: string; phone: string; notes?: string };

/**
 * Re-checks availability while holding a lock on the room, then saves the booking.
 * Two guests paying for the same dates at the same moment can never both get them.
 */
export async function createBooking(input: GuestInput, opts: { status: 'PENDING' | 'CONFIRMED'; source: 'website' | 'admin'; amountOverride?: number; ignoreAvailability?: boolean; adminNote?: string }) {
  const settings = await bookingSettings();
  await expireStale();
  return prisma.$transaction(
    async (tx) => {
      // Row lock on the room (works on MySQL and PostgreSQL): other bookings for this room wait until we commit.
      const room = await tx.room.update({ where: { id: input.roomId }, data: { updatedAt: new Date() } }).catch(() => null);
      if (!room) throw new BookingError('That room no longer exists.');
      const q = await quote(opts.source === 'admin' ? { ...room, bookable: true, published: true } : room, input.checkIn, input.checkOut, input.adults, input.childAges, { db: tx, settings, ignoreAvailability: opts.ignoreAvailability });
      let code = newCode();
      for (let i = 0; i < 5 && (await tx.booking.findUnique({ where: { code } })); i++) code = newCode();
      return tx.booking.create({
        data: {
          code,
          roomId: room.id,
          checkIn: toDay(input.checkIn),
          checkOut: toDay(input.checkOut),
          nights: q.nights.length,
          adults: input.adults,
          children: input.childAges.length,
          childAges: input.childAges,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          notes: input.notes?.trim() || null,
          amount: opts.amountOverride ?? q.total,
          breakdown: q as unknown as Prisma.InputJsonValue,
          status: opts.status,
          source: opts.source,
          holdUntil: opts.status === 'PENDING' ? new Date(Date.now() + HOLD_MINUTES * 60_000) : null,
          adminNote: opts.adminNote || null,
        },
        include: { room: { include: { stay: true } } },
      });
    },
    { timeout: 20_000, maxWait: 10_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

/** Mark payments that were never completed as expired, releasing their dates. */
export async function expireStale() {
  await prisma.booking.updateMany({ where: { status: 'PENDING', holdUntil: { lt: new Date() } }, data: { status: 'EXPIRED' } });
}

/**
 * Called after a successful payment (from the browser and from Razorpay's webhook — whichever comes first).
 * Safe to call twice. Returns the booking and whether it was newly confirmed.
 */
export async function confirmPaid(orderId: string, paymentId: string): Promise<{ booking: Booking; newlyConfirmed: boolean } | null> {
  const b = await prisma.booking.findUnique({ where: { razorpayOrderId: orderId } });
  if (!b) return null;
  if (b.status === 'CONFIRMED') return { booking: b, newlyConfirmed: false };
  // Paid after the hold ran out and someone else took the dates? Still confirm (the guest has paid) but flag it.
  const occ = await occupancy(prisma, b.roomId, b.checkIn, b.checkOut, b.id);
  const room = await prisma.room.findUnique({ where: { id: b.roomId } });
  const clash = [...occ.values()].some((v) => v >= Math.max(1, room?.units || 1));
  const booking = await prisma.booking.update({
    where: { id: b.id },
    data: {
      status: 'CONFIRMED',
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
      holdUntil: null,
      ...(clash ? { adminNote: `${b.adminNote ? `${b.adminNote}\n` : ''}⚠ Paid after the 15-minute hold ended and these dates overlap another booking — please contact the guest.` } : {}),
    },
  });
  return { booking, newlyConfirmed: true };
}

export const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export const formatDay = (d: Date | string) => new Date(typeof d === 'string' ? `${d}T00:00:00Z` : d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
