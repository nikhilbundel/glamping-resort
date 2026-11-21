'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Search, Trash2, StickyNote } from 'lucide-react';
import type { Enquiry } from '@prisma/client';
import { updateEnquiry, deleteEnquiry } from '@/app/admin/_actions/admin-misc';
import { Btn, Empty, Input, Modal, Select, Textarea, Badge } from '../ui';
import { formatDate } from '@/lib/utils';

const STATUSES = ['NEW', 'CONTACTED', 'BOOKED', 'CLOSED'] as const;
const TONE = { NEW: 'blue', CONTACTED: 'amber', BOOKED: 'green', CLOSED: 'zinc' } as const;

export function EnquiriesTable({ initial }: { initial: Enquiry[] }) {
  const [rows, setRows] = useState(initial);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState('');

  const shown = useMemo(() => rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (q && !`${r.name} ${r.email} ${r.phone} ${r.message} ${r.stayType}`.toLowerCase().includes(q.toLowerCase())) return false;
    const created = new Date(r.createdAt).getTime();
    if (from && created < new Date(from).getTime()) return false;
    if (to && created > new Date(to).getTime() + 86400000) return false;
    return true;
  }), [rows, status, q, from, to]);

  const patch = async (id: string, data: { status?: string; notes?: string }) => {
    const r = await updateEnquiry(id, data);
    if (!r.ok) return toast.error(r.error);
    setRows((all) => all.map((x) => (x.id === id ? ({ ...x, ...data } as Enquiry) : x)));
    toast.success('Updated');
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, message" className="pl-9" aria-label="Search enquiries" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter" className="lg:w-40">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Received from" className="lg:w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Received to" className="lg:w-40" />
        <a href={`/api/export/enquiries${status ? `?status=${status}` : ''}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>
      {!shown.length ? <Empty>No enquiries match.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-3 font-medium">Received</th>
                <th className="px-3 py-3 font-medium">Guest</th>
                <th className="px-3 py-3 font-medium">Stay</th>
                <th className="px-3 py-3 font-medium">Dates</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shown.map((r) => (
                <tr key={r.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{formatDate(r.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => { setOpen(r); setNotes(r.notes || ''); }} className="text-left">
                      <span className="font-medium text-emerald-800 hover:underline dark:text-emerald-300">{r.name}</span>
                      <span className="block text-xs text-zinc-500">{r.email}{r.phone && ` · ${r.phone}`}</span>
                      {r.message && <span className="mt-1 line-clamp-1 block max-w-xs text-xs text-zinc-500">{r.message}</span>}
                    </button>
                  </td>
                  <td className="px-3 py-3">{r.stayType || '—'}{r.guests ? <span className="block text-xs text-zinc-500">{r.guests} guests</span> : null}</td>
                  <td className="whitespace-nowrap px-3 py-3">{r.checkIn ? `${formatDate(r.checkIn, { day: 'numeric', month: 'short' })} → ${formatDate(r.checkOut, { day: 'numeric', month: 'short', year: 'numeric' })}` : '—'}</td>
                  <td className="px-3 py-3">
                    <Select aria-label={`Status for ${r.name}`} value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })} className="h-8 w-32 text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                    </Select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Btn size="sm" variant="ghost" aria-label="Notes" onClick={() => { setOpen(r); setNotes(r.notes || ''); }}>
                        <StickyNote className="h-4 w-4" />{r.notes ? <span className="sr-only">has notes</span> : null}
                      </Btn>
                      <Btn size="sm" variant="ghost" className="text-red-600" aria-label="Delete" onClick={async () => {
                        if (!confirm(`Delete enquiry from ${r.name}?`)) return;
                        const res = await deleteEnquiry(r.id);
                        if (!res.ok) return toast.error(res.error);
                        setRows((all) => all.filter((x) => x.id !== r.id));
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Enquiry from ${open.name}` : ''} footer={open && <><Btn onClick={() => setOpen(null)}>Close</Btn><Btn variant="primary" onClick={async () => { await patch(open.id, { notes }); setOpen(null); }}>Save notes</Btn></>}>
        {open && (
          <div className="space-y-4 text-sm">
            <Badge tone={TONE[open.status]}>{open.status.toLowerCase()}</Badge>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2">
              <dt className="text-zinc-500">Email</dt><dd><a className="text-emerald-700 underline" href={`mailto:${open.email}`}>{open.email}</a></dd>
              <dt className="text-zinc-500">Phone</dt><dd>{open.phone ? <a className="text-emerald-700 underline" href={`tel:${open.phone}`}>{open.phone}</a> : '—'}</dd>
              <dt className="text-zinc-500">Stay type</dt><dd>{open.stayType || '—'}</dd>
              <dt className="text-zinc-500">Guests</dt><dd>{open.guests ?? '—'}</dd>
              <dt className="text-zinc-500">Dates</dt><dd>{open.checkIn ? `${formatDate(open.checkIn)} → ${formatDate(open.checkOut)}` : '—'}</dd>
              <dt className="text-zinc-500">From page</dt><dd className="break-all">{open.sourceUrl || '—'}</dd>
              <dt className="text-zinc-500">Message</dt><dd className="whitespace-pre-wrap">{open.message || '—'}</dd>
            </dl>
            <div>
              <label htmlFor="enq-notes" className="mb-1 block font-medium">Internal notes</label>
              <Textarea id="enq-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
