'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Lock, LockOpen, RotateCcw, Tag } from 'lucide-react';
import { Btn, Card, Input, Label, Select } from '@/components/admin/ui';
import { loadRatesMonth, setRates, type AdminDay } from '@/app/admin/_actions/bookings';
import { cn } from '@/lib/utils';
import { RoomGuestsCard, type RoomGuests } from './RoomGuestsCard';

const monthLabel = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dkey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function RatesCalendar({ rooms, initialRoom, today, childFreeAge }: { rooms: { id: string; name: string }[]; initialRoom: string; today: string; childFreeAge: number }) {
  const [roomId, setRoomId] = useState(initialRoom);
  const [cur, setCur] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const [data, setData] = useState<{ days: AdminDay[]; units: number; basePrice: number | null; name: string; guests: RoomGuests } | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [pending, start] = useTransition();

  const month = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}`;
  const load = useCallback(async () => {
    const r = await loadRatesMonth(roomId, month);
    if (r.ok) setData(r.data!);
    else toast.error(r.error);
  }, [roomId, month]);
  useEffect(() => {
    load();
  }, [load]);

  const byDate = new Map((data?.days || []).map((d) => [d.date, d]));
  const all = (data?.days || []).map((d) => d.date);

  const click = (k: string, e: React.MouseEvent) => {
    if (e.shiftKey && anchor) {
      const [a, b] = [anchor, k].sort();
      setSel(all.filter((x) => x >= a && x <= b));
    } else {
      setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
      setAnchor(k);
    }
  };
  const quick = (fn: (d: Date) => boolean) => setSel(all.filter((k) => k >= today && fn(new Date(`${k}T00:00:00Z`))));

  const apply = (action: 'price' | 'close' | 'open' | 'reset') =>
    start(async () => {
      if (!sel.length) return void toast.error('Select some nights first');
      const r = await setRates({ roomId, dates: sel, action, price: action === 'price' ? Number(price) : undefined });
      if (!r.ok) return void toast.error(r.error);
      toast.success(action === 'price' ? `Price set for ${sel.length} night(s)` : action === 'close' ? 'Closed' : action === 'open' ? 'Opened' : 'Back to normal price');
      setSel([]);
      load();
    });

  const months = [cur, { y: cur.m === 11 ? cur.y + 1 : cur.y, m: (cur.m + 1) % 12 }];
  return (
    <div className="grid gap-6 2xl:grid-cols-[1fr_340px]" data-testid="rates">
      <div className="min-w-0 space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Select value={roomId} onChange={(e) => { setRoomId(e.target.value); setSel([]); }} className="w-auto min-w-64" aria-label="Room">
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Btn size="sm" aria-label="Previous month" onClick={() => setCur((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}><ChevronLeft className="h-4 w-4" /></Btn>
            <Btn size="sm" aria-label="Next month" onClick={() => setCur((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}><ChevronRight className="h-4 w-4" /></Btn>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {months.map(({ y, m }) => {
            const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
            const len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            return (
              <div key={`${y}-${m}`}>
                <p className="mb-2 text-center font-medium">{monthLabel(y, m)}</p>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-zinc-500">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d}>{d}</span>)}</div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from({ length: lead }, (_, i) => <span key={i} />)}
                  {Array.from({ length: len }, (_, i) => {
                    const k = dkey(y, m, i + 1);
                    const d = byDate.get(k);
                    const past = k < today;
                    const full = !!d && d.booked >= Math.max(1, data?.units || 1);
                    const on = sel.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={past || !d}
                        onClick={(e) => click(k, e)}
                        title={d?.guests.length ? `Booked: ${d.guests.join(', ')}` : undefined}
                        data-date={k}
                        className={cn(
                          'relative flex min-h-[64px] flex-col items-start rounded-lg border p-1.5 text-left text-xs transition',
                          past ? 'border-transparent opacity-30' : 'border-zinc-200 hover:border-emerald-600 dark:border-zinc-800',
                          d?.closed && 'bg-zinc-200/70 dark:bg-zinc-800',
                          full && !d?.closed && 'bg-sky-50 dark:bg-sky-950/40',
                          on && '!border-emerald-600 ring-2 ring-emerald-600/40',
                        )}
                      >
                        <span className="font-medium">{i + 1}</span>
                        {d && (d.closed ? <span className="mt-auto text-[10px] font-medium uppercase text-zinc-500">Closed</span> : <span className={cn('mt-auto', d.custom ? 'font-semibold text-emerald-700' : 'text-zinc-500')}>{d.price != null ? `₹${d.price.toLocaleString('en-IN')}` : '—'}</span>)}
                        {!!d?.booked && <span className="absolute right-1 top-1 rounded bg-sky-600 px-1 text-[9px] font-semibold text-white">{data && data.units > 1 ? `${d.booked}/${data.units}` : 'BOOKED'}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
          <span><b className="text-emerald-700">₹ green</b> = your price for that night</span><span>grey ₹ = normal price{data?.basePrice != null ? ` (₹${data.basePrice.toLocaleString('en-IN')})` : ' (not set!)'}</span><span className="rounded bg-sky-600 px-1 text-white">BOOKED</span><span>grey box = closed</span>
        </div>
      </Card>
      {data && <RoomGuestsCard roomId={roomId} roomName={data.name} guests={data.guests} childFreeAge={childFreeAge} onSaved={load} />}
      </div>
      <Card title={`Change ${sel.length || 'selected'} night${sel.length === 1 ? '' : 's'}`} className="h-fit 2xl:sticky 2xl:top-6">
        <p className="text-sm text-zinc-500">Click nights to select them. Shift + click selects a range. The date is the night that starts that day.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn size="sm" onClick={() => quick((d) => d.getUTCDay() === 5 || d.getUTCDay() === 6)}>All Fri & Sat</Btn>
          <Btn size="sm" onClick={() => quick((d) => d.getUTCDay() >= 0 && d.getUTCDay() <= 4)}>All Sun–Thu</Btn>
          <Btn size="sm" onClick={() => quick(() => true)}>Both months</Btn>
          {sel.length > 0 && <Btn size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Btn>}
        </div>
        <div className="mt-5">
          <Label htmlFor="rate-price">Price per night (₹, incl. GST)</Label>
          <div className="flex gap-2">
            <Input id="rate-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 9500" />
            <Btn variant="primary" loading={pending} onClick={() => apply('price')} disabled={!sel.length || price === ''} data-testid="set-price"><Tag className="h-4 w-4" /> Set</Btn>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Btn onClick={() => apply('close')} disabled={!sel.length || pending}><Lock className="h-4 w-4" /> Close (not bookable)</Btn>
          <Btn onClick={() => apply('open')} disabled={!sel.length || pending}><LockOpen className="h-4 w-4" /> Open again</Btn>
          <Btn onClick={() => apply('reset')} disabled={!sel.length || pending}><RotateCcw className="h-4 w-4" /> Back to normal price</Btn>
        </div>
        <p className="mt-5 text-xs text-zinc-500">
          Booked nights can’t be sold again automatically. To block dates for a guest who booked elsewhere, <Link href="/admin/bookings/new" className="underline">add a booking</Link>.
        </p>
      </Card>
    </div>
  );
}
