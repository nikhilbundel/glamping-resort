'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Save, Users } from 'lucide-react';
import { Btn, Card, Input, Label } from '@/components/admin/ui';
import { saveRoomGuests } from '@/app/admin/_actions/bookings';
import { guestCharges, occupancySummary } from '@/lib/pricing';

export type RoomGuests = {
  basePrice: number | null;
  baseGuests: number;
  maxGuests: number;
  maxAdults: number | null;
  maxChildren: number | null;
  extraGuestPrice: number;
  extraChildPrice: number | null;
  minNights: number;
  occupancyNote: string;
};
type Form = Record<keyof RoomGuests, string>;
const toForm = (g: RoomGuests): Form => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v == null ? '' : String(v)])) as Form;
const num = (s: string) => (s === '' ? null : Number(s));
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Price & guest rules for one room — the numbers guests see on the booking page. */
export function RoomGuestsCard({ roomId, roomName, guests, childFreeAge, onSaved }: { roomId: string; roomName: string; guests: RoomGuests; childFreeAge: number; onSaved: () => void }) {
  const [f, setF] = useState<Form>(toForm(guests));
  const [pending, start] = useTransition();
  useEffect(() => setF(toForm(guests)), [guests, roomId]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const occ = {
    name: roomName,
    baseGuests: Number(f.baseGuests) || 1,
    maxGuests: Number(f.maxGuests) || 1,
    maxAdults: num(f.maxAdults),
    maxChildren: num(f.maxChildren),
    extraGuestPrice: Number(f.extraGuestPrice) || 0,
    extraChildPrice: num(f.extraChildPrice),
  };
  const fixed = occ.maxGuests <= occ.baseGuests;
  // a worked example so the numbers are easy to check
  const exAdults = Math.min(occ.maxAdults ?? occ.maxGuests, occ.maxGuests);
  const ex = guestCharges(occ, exAdults, [], childFreeAge);

  const save = () =>
    start(async () => {
      const r = await saveRoomGuests(roomId, { ...f });
      if (!r.ok) return void toast.error(r.error);
      toast.success('Saved — the booking page uses these now');
      onSaved();
    });

  return (
    <div data-testid="room-guests"><Card title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Guests & price — {roomName}</span>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="rg-price">Normal price per night (₹)</Label><Input id="rg-price" type="number" min={0} value={f.basePrice} onChange={set('basePrice')} placeholder="e.g. 9500" /></div>
        <div><Label htmlFor="rg-min">Minimum nights</Label><Input id="rg-min" type="number" min={1} value={f.minNights} onChange={set('minNights')} /></div>
        <div><Label htmlFor="rg-base">Guests included in the price</Label><Input id="rg-base" type="number" min={1} value={f.baseGuests} onChange={set('baseGuests')} /></div>
        <div><Label htmlFor="rg-max">Maximum guests in total</Label><Input id="rg-max" type="number" min={1} value={f.maxGuests} onChange={set('maxGuests')} /></div>
        <div><Label htmlFor="rg-maxa">Maximum adults <span className="font-normal text-zinc-400">(optional)</span></Label><Input id="rg-maxa" type="number" min={1} value={f.maxAdults} onChange={set('maxAdults')} placeholder="no separate limit" /></div>
        <div><Label htmlFor="rg-maxc">Maximum children <span className="font-normal text-zinc-400">(0 = adults only)</span></Label><Input id="rg-maxc" type="number" min={0} value={f.maxChildren} onChange={set('maxChildren')} placeholder="no separate limit" /></div>
        <div><Label htmlFor="rg-xa">Extra adult, per night (₹)</Label><Input id="rg-xa" type="number" min={0} value={f.extraGuestPrice} onChange={set('extraGuestPrice')} disabled={fixed} /></div>
        <div><Label htmlFor="rg-xc">Extra child, per night (₹) <span className="font-normal text-zinc-400">(empty = same)</span></Label><Input id="rg-xc" type="number" min={0} value={f.extraChildPrice} onChange={set('extraChildPrice')} disabled={fixed || occ.maxChildren === 0} placeholder="same as adult" /></div>
        <div className="sm:col-span-2"><Label htmlFor="rg-note">Note shown to guests <span className="font-normal text-zinc-400">(optional)</span></Label><Input id="rg-note" value={f.occupancyNote} onChange={set('occupancyNote')} placeholder="e.g. Perfect for couples — 2 guests only" maxLength={200} /></div>
      </div>
      <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900" data-testid="guests-preview">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Guests will see</p>
        {f.occupancyNote && <p className="mt-1 font-medium">{f.occupancyNote}</p>}
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">{occupancySummary(occ, childFreeAge)}.</p>
        {!fixed && f.basePrice !== '' && ex.perNight > 0 && (
          <p className="mt-1 text-xs text-zinc-500">Example: {exAdults} adults → {inr(Number(f.basePrice))} + {inr(ex.perNight)} = <b>{inr(Number(f.basePrice) + ex.perNight)}</b> per night.</p>
        )}
        {fixed && <p className="mt-1 text-xs text-zinc-500">Fixed size: maximum = included, so there is no extra-guest charge.</p>}
      </div>
      <Btn variant="primary" className="mt-4" loading={pending} onClick={save} data-testid="save-guests"><Save className="h-4 w-4" /> Save</Btn>
    </Card></div>
  );
}
