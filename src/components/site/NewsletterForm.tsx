'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function NewsletterForm({ source, dark, buttonLabel = 'Subscribe' }: { source: string; dark?: boolean; buttonLabel?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('loading');
    const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), website: fd.get('website'), source }) });
    const json = await res.json().catch(() => ({}));
    setState(res.ok ? 'ok' : 'error');
    setMsg(json.message || (res.ok ? 'Thank you for subscribing!' : 'Something went wrong.'));
  }

  if (state === 'ok') return <p role="status" className={dark ? 'text-white' : 'text-primary'}>{msg}</p>;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row" noValidate>
      <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
      <input id={`nl-${source}`} name="email" type="email" required autoComplete="email" placeholder="Your email" className={cn('min-h-[48px] w-full min-w-0 flex-1 rounded-btn border px-5 text-base outline-none focus:ring-2 focus:ring-accent', dark ? 'border-white/25 bg-white/10 text-white placeholder:text-white/50' : 'border-line bg-surface')} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button type="submit" disabled={state === 'loading'} className="min-h-[48px] rounded-btn bg-btn px-6 text-sm font-medium text-btn-ink transition hover:brightness-110 disabled:opacity-60">
        {state === 'loading' ? '…' : buttonLabel}
      </button>
      {state === 'error' && <p role="alert" className="text-sm text-red-300 sm:basis-full">{msg}</p>}
    </form>
  );
}
