'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Accordion } from './Accordion';
import { cn } from '@/lib/utils';

export type FaqCat = { id: string; name: string; faqs: { id: string; question: string; html: string; text: string }[] };

export function FaqBrowser({ categories, placeholder = 'Search questions…' }: { categories: FaqCat[]; placeholder?: string }) {
  const [tab, setTab] = useState(categories[0]?.id || '');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return null;
    return categories.flatMap((c) => c.faqs.filter((f) => f.question.toLowerCase().includes(query) || f.text.toLowerCase().includes(query)));
  }, [categories, query]);
  const current = results ?? categories.find((c) => c.id === tab)?.faqs ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <label htmlFor="faq-search" className="sr-only">Search FAQs</label>
        <input id="faq-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="field rounded-btn pl-12" />
      </div>
      {!results && (
        <div role="tablist" aria-label="FAQ categories" className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button key={c.id} role="tab" type="button" aria-selected={tab === c.id} aria-controls="faq-panel" onClick={() => setTab(c.id)} className={cn('min-h-[44px] shrink-0 rounded-btn border px-5 text-sm transition', tab === c.id ? 'border-primary bg-primary text-white' : 'border-line bg-surface hover:border-primary')}>
              {c.name} <span className="opacity-60">({c.faqs.length})</span>
            </button>
          ))}
        </div>
      )}
      <div id="faq-panel" role={results ? 'region' : 'tabpanel'} aria-live="polite">
        {results && <p className="mb-4 text-sm text-muted">{results.length} result{results.length === 1 ? '' : 's'} for “{q}”</p>}
        <Accordion key={results ? 'search' : tab} items={current.map((f) => ({ id: f.id, title: f.question, content: <div className="prose max-w-none prose-headings:font-heading prose-p:text-ink/80" dangerouslySetInnerHTML={{ __html: f.html }} /> }))} />
      </div>
    </div>
  );
}
