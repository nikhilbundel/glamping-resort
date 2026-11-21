'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, Lock, Minus, Plus, ShieldCheck, Users } from 'lucide-react';
import type { ImageValue } from '@/lib/types';
import { SmartImage } from '@/components/ui/SmartImage';
import { cn } from '@/lib/utils';
import { guestCharges, guestLimits, occupancyError, occupancySummary } from '@/lib/pricing';

export type BookableRoom = {
  id: string;
  name: string;
  stay: string;
  description: string;
  image: ImageValue | null;
  capacity: string;
  basePrice: number | null;
  baseGuests: number;
  maxGuests: number;
  maxAdults: number | null;
  maxChildren: number | null;
  extraGuestPrice: number;
  extraChildPrice: number | null;
  occupancyNote: string;
  minNights: number;
};
type Day = { date: string; price: number | null; available: boolean; reason?: string };
type Props = {
  rooms: BookableRoom[];
  initialRoom?: string;
  initialIn?: string;
  initialOut?: string;
  siteName: string;
  childFreeAge: number;
  checkInTime: string;
  checkOutTime: string;
  policy: string;
  taxNote: boolean;
  paymentsReady: boolean;
  testMode: boolean;
};
type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpInstance = { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RzpInstance;
  }
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const short = (n: number) => (n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `₹${n}`);
const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const addDay = (k: string, n = 1) => new Date(Date.parse(`${k}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const nice = (k: string) => new Date(`${k}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthLabel = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const todayIST = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);

/** The site's button colour as #rrggbb for the Razorpay window. */
function themeHex() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--button-rgb').trim().split(/[\s,]+/).map(Number);
  return v.length === 3 && v.every((n) => Number.isFinite(n)) ? `#${v.map((n) => n.toString(16).padStart(2, '0')).join('')}` : '#111111';
}

function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window — check your internet connection.'));
    document.body.appendChild(s);
  });
}

function Stepper({ label, hint, value, min, max, onChange, id }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void; id: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium" id={id}>{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-labelledby={id}>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-30">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center font-medium tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-30">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BookingFlow(p: Props) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(p.rooms.find((r) => r.id === p.initialRoom)?.id || p.rooms[0].id);
  const room = p.rooms.find((r) => r.id === roomId)!;
  const t = todayIST();
  const [cursor, setCursor] = useState(() => {
    const k = p.initialIn && /^\d{4}-\d{2}-\d{2}$/.test(p.initialIn) ? p.initialIn : t;
    return { y: Number(k.slice(0, 4)), m: Number(k.slice(5, 7)) - 1 };
  });
  const [days, setDays] = useState<Record<string, Day>>({});
  const [loading, setLoading] = useState(false);
  const [checkIn, setCheckIn] = useState<string | null>(p.initialIn || null);
  const [checkOut, setCheckOut] = useState<string | null>(p.initialOut || null);
  const [adults, setAdults] = useState(2);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', website: '' });
  const [accept, setAccept] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [pending, setPending] = useState<{ sig: string; code: string; order: Record<string, unknown> } | null>(null);

  // load prices / availability for the two visible months
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const month = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;
      const r = await fetch(`/api/bookings/calendar?room=${roomId}&month=${month}&months=2`, { cache: 'no-store' });
      const j = (await r.json()) as { days: Day[] };
      setDays((prev) => ({ ...prev, ...Object.fromEntries((j.days || []).map((d) => [d.date, d])) }));
    } finally {
      setLoading(false);
    }
  }, [cursor, roomId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setDays({});
  }, [roomId]);

  const limits = guestLimits(room, adults, childAges, p.childFreeAge);
  const charges = guestCharges(room, adults, childAges, p.childFreeAge);
  const occErr = occupancyError(room, adults, childAges, p.childFreeAge);
  useEffect(() => {
    // keep guests within the room's limits when switching rooms
    if (childAges.length > (room.maxChildren ?? 8)) setChildAges((a) => a.slice(0, room.maxChildren ?? 8));
    const maxA = Math.max(1, Math.min(room.maxAdults ?? room.maxGuests, room.maxGuests));
    if (adults > maxA) setAdults(maxA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return [] as string[];
    const out: string[] = [];
    for (let d = checkIn; d < checkOut; d = addDay(d)) out.push(d);
    return out;
  }, [checkIn, checkOut]);
  const rangeOk = (a: string, b: string) => {
    for (let d = a; d < b; d = addDay(d)) if (!days[d]?.available) return false;
    return true;
  };
  const price = useMemo(() => {
    if (!nights.length || nights.some((n) => !days[n]?.available)) return null;
    const roomTotal = nights.reduce((s, n) => s + (days[n].price || 0), 0);
    const extras = charges.perNight * nights.length;
    return { roomTotal, extraAdults: charges.extraAdults, extraChildren: charges.extraChildren, extras, total: roomTotal + extras };
  }, [nights, days, charges]);

  const pick = (k: string) => {
    setMsg(null);
    setPending(null);
    const d = days[k];
    if (!checkIn || (checkIn && checkOut)) {
      if (!d?.available) return;
      setCheckIn(k);
      setCheckOut(null);
      return;
    }
    if (k <= checkIn) {
      if (d?.available) setCheckIn(k);
      return;
    }
    if (rangeOk(checkIn, k)) {
      const n = Math.round((Date.parse(k) - Date.parse(checkIn)) / 864e5);
      if (n < room.minNights) return setMsg({ tone: 'info', text: `${room.name} needs at least ${room.minNights} nights.` });
      setCheckOut(k);
    } else if (d?.available) {
      setCheckIn(k);
      setCheckOut(null);
    } else setMsg({ tone: 'info', text: 'Some nights in between are already booked — please choose other dates.' });
  };

  const months = [cursor, { y: cursor.m === 11 ? cursor.y + 1 : cursor.y, m: (cursor.m + 1) % 12 }];
  const canPrev = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}` > t.slice(0, 7);
  const shift = (n: number) => setCursor((c) => ({ y: c.y + Math.floor((c.m + n) / 12), m: (((c.m + n) % 12) + 12) % 12 }));

  const ready = !!(price && checkIn && checkOut && !occErr);
  const detailsOk = form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email) && form.phone.replace(/\D/g, '').length >= 7 && accept;

  const pay = async () => {
    if (!ready || !detailsOk) return;
    setMsg(null);
    setPaying(true);
    try {
      const body = { roomId, checkIn, checkOut, adults, childAges, ...form, acceptPolicy: true, replaceCode: pending?.code };
      const sig = JSON.stringify({ roomId, checkIn, checkOut, adults, childAges, email: form.email });
      let order = pending?.sig === sig ? pending.order : null;
      if (!order) {
        const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || 'Could not start the booking.');
        order = j;
        setPending({ sig, code: j.code, order: j });
        load();
      }
      await loadCheckout();
      const o = order as { keyId: string; orderId: string; amount: number; currency: string; description: string; prefill: Record<string, string>; code: string };
      const rzp = new window.Razorpay!({
        key: o.keyId,
        order_id: o.orderId,
        amount: o.amount,
        currency: o.currency,
        name: p.siteName,
        description: o.description,
        prefill: o.prefill,
        notes: { booking: o.code },
        timeout: 600,
        theme: { color: themeHex() },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setMsg({ tone: 'info', text: 'Payment window closed. Your dates are held for 15 minutes — press Pay again to finish.' });
          },
        },
        handler: async (resp: RzpResponse) => {
          setMsg({ tone: 'info', text: 'Payment received — confirming your booking…' });
          const r = await fetch('/api/bookings/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
          const j = await r.json();
          if (!r.ok) {
            setPaying(false);
            return setMsg({ tone: 'error', text: `${j.message} Booking code: ${o.code}` });
          }
          router.push(j.redirect);
        },
      });
      rzp.on('payment.failed', (r) => setMsg({ tone: 'error', text: `Payment failed: ${r.error?.description || 'please try another method.'} You can try again.` }));
      rzp.open();
    } catch (e) {
      setPaying(false);
      setMsg({ tone: 'error', text: (e as Error).message });
    }
  };

  const field = 'mt-1.5 h-12 w-full rounded-lg border border-line bg-surface px-4 text-ink outline-none focus:border-ink';

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]" data-testid="booking-flow">
      <div className="min-w-0 space-y-10">
        {/* 1 · Stay */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl"><span className="text-sm text-muted">1</span> Choose your stay</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Room">
            {p.rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={r.id === roomId}
                onClick={() => {
                  setRoomId(r.id);
                  setCheckIn(null);
                  setCheckOut(null);
                  setPending(null);
                  setMsg(null);
                }}
                className={cn('flex overflow-hidden rounded-card border text-left transition sm:block', r.id === roomId ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-ink/40')}
                data-testid="room-option"
                data-room={r.id}
              >
                <div className="relative w-28 shrink-0 bg-line/40 sm:aspect-[16/10] sm:w-auto">{r.image?.url && <SmartImage image={r.image} sizes="(min-width:1280px) 22vw, (min-width:640px) 40vw, 120px" />}</div>
                <div className="min-w-0 p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">{r.stay}</p>
                  <p className="mt-1 font-heading text-xl font-semibold">{r.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {r.occupancyNote || `Up to ${r.maxGuests} guest${r.maxGuests > 1 ? 's' : ''}`}{r.basePrice ? <> · from <b className="text-ink">{inr(r.basePrice)}</b> / night</> : null}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2 · Dates */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-heading text-2xl"><span className="text-sm text-muted">2</span> Pick your dates</h2>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Loading" />}
              <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => shift(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-line disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-line"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {months.map(({ y, m }, mi) => {
              const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); // 0 = Sun
              const lead = (first + 6) % 7; // weeks start on Monday
              const len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
              return (
                <div key={`${y}-${m}`} className={cn(mi === 1 && 'hidden md:block')}>
                  <p className="mb-3 text-center font-medium">{monthLabel(y, m)}</p>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="py-1">{d}</span>)}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
                    {Array.from({ length: len }, (_, i) => {
                      const k = key(y, m, i + 1);
                      const d = days[k];
                      const inRange = !!(checkIn && checkOut && k > checkIn && k < checkOut);
                      const isEnd = k === checkIn || k === checkOut;
                      const canBeCheckout = !!(checkIn && !checkOut && k > checkIn && rangeOk(checkIn, k));
                      const clickable = !!d && (d.available || canBeCheckout);
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={!clickable}
                          onClick={() => pick(k)}
                          aria-label={`${nice(k)}${d?.available && d.price ? `, ${inr(d.price)}` : d ? ', not available' : ''}`}
                          aria-pressed={isEnd}
                          data-date={k}
                          className={cn(
                            'flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-lg text-sm transition',
                            isEnd ? 'bg-ink text-bg' : inRange ? 'bg-ink/10' : clickable ? 'hover:bg-ink/5' : '',
                            !d?.available && !isEnd && 'text-muted/50',
                            !d?.available && !canBeCheckout && !isEnd && 'line-through decoration-1',
                          )}
                        >
                          <span className="leading-none">{i + 1}</span>
                          {d?.available && d.price ? <span className={cn('mt-1 text-[10px] leading-none', isEnd ? 'text-bg/80' : 'text-muted')}>{short(d.price)}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Prices are per night. Crossed-out dates are booked or closed. Check-in from {p.checkInTime}, check-out by {p.checkOutTime}.</p>
        </div>

        {/* 3 · Guests */}
        <div>
          <h2 className="mb-2 flex items-center gap-2 font-heading text-2xl"><span className="text-sm text-muted">3</span> Guests</h2>
          <div className="max-w-md divide-y divide-line">
            <Stepper id="g-adults" label="Adults" value={adults} min={1} max={limits.maxAdults} onChange={setAdults} />
            {limits.childrenAllowed ? (
              <Stepper id="g-children" label="Children" hint={p.childFreeAge > 0 ? `Ages 0–17 · under ${p.childFreeAge} stay free` : 'Ages 0–17'} value={childAges.length} min={0} max={limits.maxChildren} onChange={(n) => setChildAges((a) => (n > a.length ? [...a, 0] : a.slice(0, n)))} />
            ) : (
              <p className="py-3 text-sm text-muted">This stay is for adults only.</p>
            )}
            {childAges.length > 0 && (
              <div className="flex flex-wrap gap-3 py-3">
                {childAges.map((age, i) => (
                  <label key={i} className="text-sm">
                    Child {i + 1} age
                    <select value={age} onChange={(e) => setChildAges((a) => a.map((x, j) => (j === i ? Number(e.target.value) : x)))} className="ml-2 h-10 rounded-lg border border-line bg-surface px-2">
                      {Array.from({ length: 18 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
          {occErr && <p className="mt-2 text-sm text-red-700" role="alert">{occErr}</p>}
          {room.occupancyNote && <p className="mt-3 text-sm font-medium" data-testid="occupancy-note">{room.occupancyNote}</p>}
          <p className="mt-2 text-xs text-muted" data-testid="occupancy-summary">{occupancySummary(room, p.childFreeAge)}.</p>
        </div>

        {/* 4 · Details */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl"><span className="text-sm text-muted">4</span> Your details</h2>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Full name<input className={field} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} name="name" /></label>
            <label className="text-sm">Email<input className={field} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} name="email" /></label>
            <label className="text-sm">Phone (with country code)<input className={field} type="tel" autoComplete="tel" placeholder="+91 " value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} name="phone" /></label>
            <label className="text-sm sm:col-span-2">Anything we should know? <span className="text-muted">(optional)</span><textarea className={cn(field, 'h-24 py-3')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} name="notes" /></label>
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Mobile: total + jump to payment */}
      {price && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,.08)] lg:hidden" data-testid="mobile-pay-bar">
          <div className="text-sm"><b className="text-base">{inr(price.total)}</b><span className="block text-xs text-muted">{nights.length} night{nights.length > 1 ? 's' : ''} · {room.name}</span></div>
          <button type="button" onClick={() => document.getElementById('booking-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex min-h-[44px] items-center rounded-btn bg-btn px-5 text-sm font-medium text-btn-ink">Review & pay</button>
        </div>
      )}

      {/* Summary */}
      <aside id="booking-summary" className="scroll-mt-24 rounded-card border border-line bg-surface p-6 lg:sticky lg:top-28" data-testid="booking-summary">
        <p className="text-xs uppercase tracking-[0.15em] text-muted">{room.stay}</p>
        <p className="mt-1 font-heading text-2xl font-semibold">{room.name}</p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-muted" /><div>{checkIn ? <>{nice(checkIn)} → {checkOut ? nice(checkOut) : <span className="text-muted">choose check-out</span>}</> : <span className="text-muted">Choose check-in on the calendar</span>}{nights.length > 0 && <span className="block text-muted">{nights.length} night{nights.length > 1 ? 's' : ''}</span>}</div></div>
          <div className="flex items-start gap-3"><Users className="mt-0.5 h-4 w-4 text-muted" /><div>{adults} adult{adults > 1 ? 's' : ''}{childAges.length ? `, ${childAges.length} child${childAges.length > 1 ? 'ren' : ''}` : ''}</div></div>
        </dl>
        {price && (
          <div className="mt-5 space-y-2 border-t border-line pt-5 text-sm" data-testid="price-breakdown">
            {nights.length <= 7 ? (
              nights.map((n) => (
                <div key={n} className="flex justify-between"><span className="text-muted">{nice(n)}</span><span>{inr(days[n].price || 0)}</span></div>
              ))
            ) : (
              <div className="flex justify-between"><span className="text-muted">{nights.length} nights</span><span>{inr(price.roomTotal)}</span></div>
            )}
            {price.extraAdults > 0 && (
              <div className="flex justify-between"><span className="text-muted">{price.extraAdults} extra adult{price.extraAdults > 1 ? 's' : ''} × {nights.length} night{nights.length > 1 ? 's' : ''}</span><span>{inr(price.extraAdults * room.extraGuestPrice * nights.length)}</span></div>
            )}
            {price.extraChildren > 0 && (
              <div className="flex justify-between"><span className="text-muted">{price.extraChildren} extra child{price.extraChildren > 1 ? 'ren' : ''} × {nights.length} night{nights.length > 1 ? 's' : ''}</span><span>{inr(price.extraChildren * (room.extraChildPrice ?? room.extraGuestPrice) * nights.length)}</span></div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Total</span><span data-testid="total">{inr(price.total)}</span></div>
            {p.taxNote && <p className="text-right text-xs text-muted">Inclusive of all taxes (GST)</p>}
          </div>
        )}
        <div className="mt-5 max-h-40 overflow-auto rounded-lg bg-bg p-3 text-xs leading-relaxed text-muted">{p.policy}</div>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 h-4 w-4 accent-current" data-testid="accept-policy" />
          I accept the booking & cancellation policy.
        </label>
        {msg && <p role="alert" className={cn('mt-4 rounded-lg p-3 text-sm', msg.tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-bg text-ink')}>{msg.text}</p>}
        {!p.paymentsReady && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Online payment isn’t switched on yet — please <a href="/contact#enquiry" className="underline">send an enquiry</a>.</p>}
        <button
          type="button"
          onClick={pay}
          disabled={!ready || !detailsOk || paying || !p.paymentsReady}
          className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-btn bg-btn px-6 font-medium text-btn-ink transition disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="pay-btn"
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {price ? `Pay ${inr(price.total)}` : 'Pay & confirm'}
        </button>
        {!ready && <p className="mt-2 text-center text-xs text-muted">Choose dates and guests to see the price.</p>}
        {ready && !detailsOk && <p className="mt-2 text-center text-xs text-muted">Fill in your details and accept the policy to continue.</p>}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Secure payment by Razorpay · UPI, cards, net banking{p.testMode && ' · TEST MODE'}</p>
        <ul className="mt-4 space-y-1.5 text-xs text-muted">
          <li className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0" /> Instant confirmation by email</li>
          <li className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0" /> Best price — booking direct</li>
        </ul>
      </aside>
    </div>
  );
}
