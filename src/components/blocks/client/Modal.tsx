'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Accessible modal built on <dialog> (native focus trap + Esc). */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={title} className="w-[min(92vw,720px)] rounded-card bg-surface p-0 text-ink shadow-lift backdrop:bg-black/60">
      <div className="relative max-h-[85vh] overflow-y-auto">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 shadow-soft">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
