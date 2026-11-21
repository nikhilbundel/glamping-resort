'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { SmartImage } from '@/components/ui/SmartImage';
import { InViewVideo } from './InViewVideo';
import type { ImageValue } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ActivityCard = { id: string; title: string; slug: string; excerpt: string; image: ImageValue | null; video?: string | null; tags: string[]; featured: boolean; seasonal: boolean; duration: string; price: string };

export function ActivitiesGrid({ items, showFilters }: { items: ActivityCard[]; showFilters?: boolean }) {
  const tags = useMemo(() => {
    const t = new Set<string>();
    items.forEach((a) => {
      if (a.featured) t.add('Featured');
      if (a.seasonal) t.add('Seasonal');
      a.tags.forEach((x) => t.add(x));
    });
    return ['All', ...t];
  }, [items]);
  const [tag, setTag] = useState('All');
  const shown = items.filter((a) => tag === 'All' || (tag === 'Featured' && a.featured) || (tag === 'Seasonal' && a.seasonal) || a.tags.includes(tag));

  return (
    <>
      {showFilters && tags.length > 2 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter activities">
          {tags.map((t) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={cn('min-h-[44px] rounded-btn border px-5 text-sm transition', tag === t ? 'border-btn bg-btn text-btn-ink' : 'border-line bg-surface hover:border-accent')}>
              {t}
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => (
          <li key={a.id} className="card group flex flex-col transition-shadow duration-300 hover:shadow-lift">
            <Link href={`/experiences/${a.slug}`} className="relative block aspect-[4/3] overflow-hidden" tabIndex={-1} aria-hidden="true">
              <SmartImage image={a.image} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              {a.video && <InViewVideo src={a.video} className="transition-[opacity,transform] group-hover:scale-105" />}
              <div className="absolute left-4 top-4 flex gap-2">
                {a.featured && <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">Featured</span>}
                {a.seasonal && <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">Seasonal</span>}
              </div>
            </Link>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-heading text-h3 font-semibold">
                <Link href={`/experiences/${a.slug}`} className="hover:text-accent">
                  {a.title}
                </Link>
              </h3>
              {(a.duration || a.price) && (
                <p className="mt-2 flex items-center gap-4 text-sm text-muted">
                  {a.duration && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {a.duration}
                    </span>
                  )}
                  {a.price && <span>{a.price}</span>}
                </p>
              )}
              <p className="mt-3 flex-1 text-muted">{a.excerpt}</p>
              <Link href={`/experiences/${a.slug}`} className="group/l mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent" aria-label={`Read more about ${a.title}`}>
                Read more <ArrowRight className="h-4 w-4 transition-transform group-hover/l:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {!shown.length && <p className="text-center text-muted">No activities in this category yet.</p>}
    </>
  );
}
