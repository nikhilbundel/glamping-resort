'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, Save } from 'lucide-react';
import { Btn, Card, Label, Modal, Textarea } from '@/components/admin/ui';
import { cancelBooking, saveBookingNote } from '@/app/admin/_actions/bookings';

export function BookingActions({ id, status, note, paid }: { id: string; status: string; note: string; paid: boolean }) {
  const router = useRouter();
  const [n, setN] = useState(note);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <Card title="Internal note">
        <Label htmlFor="bnote">Only visible to admins</Label>
        <Textarea id="bnote" rows={6} value={n} onChange={(e) => setN(e.target.value)} />
        <Btn className="mt-3" loading={pending} onClick={() => start(async () => { const r = await saveBookingNote(id, n); if (r.ok) { toast.success('Saved'); router.refresh(); } else toast.error(r.error); })}>
          <Save className="h-4 w-4" /> Save note
        </Btn>
      </Card>
      {(status === 'CONFIRMED' || status === 'PENDING') && (
        <Card title="Cancel booking">
          <p className="text-sm text-zinc-500">Frees the dates so they can be booked again. {paid && 'Online refunds are switched off — if you decide to refund, do it from your Razorpay dashboard (Transactions → Payments → Refund).'}</p>
          <Btn variant="danger" className="mt-3" onClick={() => setOpen(true)} data-testid="cancel-booking"><Ban className="h-4 w-4" /> Cancel booking</Btn>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Cancel this booking?"
            footer={
              <>
                <Btn onClick={() => setOpen(false)}>Keep it</Btn>
                <Btn variant="danger" loading={pending} data-testid="confirm-cancel" onClick={() => start(async () => { const r = await cancelBooking(id, reason); if (r.ok) { toast.success('Booking cancelled'); setOpen(false); router.refresh(); } else toast.error(r.error); })}>Cancel booking</Btn>
              </>
            }
          >
            <Label htmlFor="reason">Reason (optional, saved in the note)</Label>
            <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Modal>
        </Card>
      )}
    </div>
  );
}
