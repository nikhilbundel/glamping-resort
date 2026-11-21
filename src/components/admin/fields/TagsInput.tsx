'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { inputCls } from '../ui';
import { cn } from '@/lib/utils';

/** Free-form string list: Enter or comma adds, Backspace removes the last. Supports reordering via arrows. */
export function TagsInput({ value, onChange, id, placeholder = 'Type and press Enter' }: { value: string[]; onChange: (v: string[]) => void; id: string; placeholder?: string }) {
  const [text, setText] = useState('');
  const list = value || [];
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    onChange([...list, v]);
    setText('');
  };
  return (
    <div className={cn(inputCls, 'flex min-h-10 flex-wrap items-center gap-1.5 py-1.5')}>
      {list.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
          <span className="truncate">{t}</span>
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-600">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || (e.key === ',' && !text.includes(' '))) {
            e.preventDefault();
            add(text);
          } else if (e.key === 'Backspace' && !text && list.length) onChange(list.slice(0, -1));
        }}
        onBlur={() => add(text)}
        placeholder={list.length ? '' : placeholder}
        className="min-w-[160px] flex-1 bg-transparent py-1 outline-none"
      />
    </div>
  );
}
