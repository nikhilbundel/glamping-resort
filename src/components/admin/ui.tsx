'use client';

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; loading?: boolean };

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-emerald-700 text-white hover:bg-emerald-800',
        variant === 'secondary' && 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
        variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

export const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, 'h-10', className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(inputCls, 'min-h-[90px]', className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(inputCls, 'h-10', className)} {...p} />;
});

export function Label({ children, htmlFor, required }: { children: ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {children}
      {required && <span className="text-red-600"> *</span>}
    </label>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: 'zinc' | 'green' | 'amber' | 'blue' | 'red' }) {
  const tones = {
    zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    blue: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50', checked ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn('w-[min(96vw,640px)] rounded-xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100', wide && 'w-[min(96vw,1100px)]')}
    >
      {open && (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <h2 className="font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">{children}</div>;
}
