'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import type { ImageValue } from '@/lib/types';
import { Modal } from './Modal';

export type ArrangementCard = { id: string; title: string; slug: string; excerpt: string; price: string; image: ImageValue | null; html: string };

export function Arrangements({ items, booking }: { items: ArrangementCard[]; booking: { href: string; label: string } }) {
  const [active, setActive] = useState<ArrangementCard | null>(null);
  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <li key={a.id} className="card group flex flex-col">
            <div className="relative aspect-[4/3] overflow-hidden">
              <SmartImage image={a.image} sizes="(min-width:1024px) 33vw, 50vw" className="transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              {a.price && <span className="absolute bottom-4 left-4 rounded-full bg-surface/95 px-3 py-1 text-sm font-medium text-ink">{a.price}</span>}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-heading text-h3 font-semibold">{a.title}</h3>
              <p className="mt-3 flex-1 text-muted">{a.excerpt}</p>
              <button type="button" onClick={() => setActive(a)} className="mt-5 inline-flex min-h-[44px] items-center self-start text-sm font-medium text-accent underline-offset-4 hover:underline">
                View details
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title || ''}>
        {active && (
          <>
            <div className="relative aspect-[16/9]">
              <SmartImage image={active.image} sizes="720px" />
            </div>
            <div className="p-6 md:p-8">
              <h3 className="font-heading text-h3 font-semibold">{active.title}</h3>
              {active.price && <p className="mt-1 text-accent">{active.price}</p>}
              <div className="prose mt-4 max-w-none text-ink/80" dangerouslySetInnerHTML={{ __html: active.html }} />
              <div className="mt-6 flex flex-wrap gap-4">
                <a href={booking.href} className="inline-flex min-h-[44px] items-center rounded-btn bg-btn px-6 text-sm text-btn-ink">
                  {booking.label}
                </a>
                <Link href={`/special-arrangements/${active.slug}`} className="inline-flex min-h-[44px] items-center rounded-btn border border-line px-6 text-sm">
                  Open full page
                </Link>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
