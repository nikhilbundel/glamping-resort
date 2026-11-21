'use client';

import { useId, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AccordionItem = { id: string; title: string; content: ReactNode };

/** Accessible accordion with smooth height (CSS grid rows) animation. */
export function Accordion({ items, onDark, defaultOpen }: { items: AccordionItem[]; onDark?: boolean; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const base = useId();
  return (
    <div className={cn('divide-y border-y', onDark ? 'divide-white/15 border-white/15' : 'divide-line border-line')}>
      {items.map((it) => {
        const isOpen = open === it.id;
        const btn = `${base}-${it.id}-b`;
        const panel = `${base}-${it.id}-p`;
        return (
          <div key={it.id}>
            <h3 className="m-0">
              <button id={btn} type="button" aria-expanded={isOpen} aria-controls={panel} onClick={() => setOpen(isOpen ? null : it.id)} className="flex min-h-[56px] w-full items-center justify-between gap-6 py-5 text-left font-body text-lg font-medium">
                <span>{it.title}</span>
                <Plus className={cn('h-5 w-5 shrink-0 text-accent transition-transform duration-300', isOpen && 'rotate-45')} aria-hidden="true" />
              </button>
            </h3>
            <div id={panel} role="region" aria-labelledby={btn} className={cn('grid transition-all duration-300 ease-out', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
              <div className={cn('min-h-0 overflow-hidden transition-[visibility] duration-300', !isOpen && 'invisible')}>
                <div className="pb-6 pr-10">{it.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
