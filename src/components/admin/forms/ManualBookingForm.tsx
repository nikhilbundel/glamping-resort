'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Btn, Card, Input, Label, Select, Textarea } from '@/components/admin/ui';
import { adminQuote, createManualBooking } from '@/app/admin/_actions/bookings';

export function ManualBookingForm({ rooms }: { rooms: { id: string; label: string; bookable: boolean }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ roomId: rooms.find((r) => r.bookable)?.id || rooms[0]?.id || '', checkIn: '', checkOut: '', adults: 2, children: 0, name: '', email: '', phone: '', amount: '', paid: false, allowOverlap: false, note: '' });
  const [q, setQ] = useState<{ total: number; available: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, val: unknown) => setV((x) => ({ ...x, [k]: val }));

  useEffect(() => {
    if (!v.roomId || !v.checkIn || !v.checkOut || v.checkOut <= v.checkIn) return setQ(null);
    let live = true;
    adminQuote(v.roomId, v.checkIn, v.checkOut, Number(v.adults), Number(v.children)).then((r) => {
      if (!live || !r.ok) return;
      setQ(r.data);
      setV((x) => (x.amount === '' || x.amount === String(q?.total ?? '') ? { ...x, amount: String(r.data.total) } : x));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.roomId, v.checkIn, v.checkOut, v.adults, v.children]);

  const submit = () =>
    start(async () => {
      const r = await createManualBooking({ ...v, adults: Number(v.adults), children: Number(v.children), amount: Number(v.amount || 0) });
      if (!r.ok) return void toast.error(r.error);
      toast.success('Booking added — those dates are now blocked online');
      router.push(`/admin/bookings/${r.data!.id}`);
    });

  return (
    <Card className="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="m-room" required>Room</Label><Select id="m-room" value={v.roomId} onChange={(e) => set('roomId', e.target.value)}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select></div>
        <div><Label htmlFor="m-in" required>Check-in</Label><Input id="m-in" type="date" value={v.checkIn} onChange={(e) => set('checkIn', e.target.value)} /></div>
        <div><Label htmlFor="m-out" required>Check-out</Label><Input id="m-out" type="date" value={v.checkOut} onChange={(e) => set('checkOut', e.target.value)} /></div>
        <div><Label htmlFor="m-ad">Adults</Label><Input id="m-ad" type="number" min={1} value={v.adults} onChange={(e) => set('adults', e.target.value)} /></div>
        <div><Label htmlFor="m-ch">Children</Label><Input id="m-ch" type="number" min={0} value={v.children} onChange={(e) => set('children', e.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="m-name" required>Guest name</Label><Input id="m-name" value={v.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><Label htmlFor="m-email">Email</Label><Input id="m-email" type="email" value={v.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div><Label htmlFor="m-phone">Phone</Label><Input id="m-phone" value={v.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        <div><Label htmlFor="m-amt">Amount (₹)</Label><Input id="m-amt" type="number" min={0} value={v.amount} onChange={(e) => set('amount', e.target.value)} />{q && <p className="mt-1 text-xs text-zinc-500">Website price for these dates: ₹{q.total.toLocaleString('en-IN')}</p>}</div>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.paid} onChange={(e) => set('paid', e.target.checked)} className="h-4 w-4 accent-emerald-700" /> Already paid (offline)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.allowOverlap} onChange={(e) => set('allowOverlap', e.target.checked)} className="h-4 w-4 accent-emerald-700" /> Allow overlap / ignore guest limits</label>
        </div>
        <div className="sm:col-span-2"><Label htmlFor="m-note">Note</Label><Textarea id="m-note" rows={3} value={v.note} onChange={(e) => set('note', e.target.value)} /></div>
      </div>
      {q && !q.available && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{q.message}</p>}
      <Btn variant="primary" className="mt-5" loading={pending} onClick={submit} disabled={!v.name || !v.checkIn || !v.checkOut} data-testid="add-booking">Add booking</Btn>
    </Card>
  );
}
