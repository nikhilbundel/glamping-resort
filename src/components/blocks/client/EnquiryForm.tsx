'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { enquirySchema, type EnquiryInput } from '@/lib/forms';
import { cn } from '@/lib/utils';

function F({ name, label, children, className, error }: { name: string; label: string; children: React.ReactNode; className?: string; error?: string }) {
  return (
    <div className={className}>
      <label htmlFor={`enq-${name}`} className="field-label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`enq-${name}-err`} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function EnquiryForm({ stayTypes, submitLabel = 'Send enquiry', successMessage = 'Thank you! We’ll get back to you within 24 hours.' }: { stayTypes: string[]; submitLabel?: string; successMessage?: string }) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EnquiryInput>({ resolver: zodResolver(enquirySchema) });
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(values: EnquiryInput) {
    setServerError('');
    const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, sourceUrl: window.location.href }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setServerError(json.message || 'Something went wrong. Please try again.');
    setDone(true);
  }

  if (done)
    return (
      <div role="status" className="flex flex-col items-center rounded-card bg-surface p-10 text-center shadow-soft">
        <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
        <p className="mt-4 font-heading text-h3">{successMessage}</p>
      </div>
    );

  const err = (k: keyof EnquiryInput) => errors[k]?.message as string | undefined;
  const a = (k: keyof EnquiryInput) => ({ id: `enq-${k}`, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `enq-${k}-err` : undefined });

  return (
    <form id="enquiry" onSubmit={handleSubmit(onSubmit)} noValidate className="grid scroll-mt-32 gap-5 rounded-card bg-surface p-6 shadow-soft sm:grid-cols-2 md:p-8">
      <F name="name" label="Full name *" error={err('name')}>
        <input {...register('name')} {...a('name')} autoComplete="name" className="field" />
      </F>
      <F name="email" label="Email *" error={err('email')}>
        <input {...register('email')} {...a('email')} type="email" autoComplete="email" className="field" />
      </F>
      <F name="phone" label="Phone" error={err('phone')}>
        <input {...register('phone')} {...a('phone')} type="tel" autoComplete="tel" className="field" />
      </F>
      <F name="guests" label="Guests" error={err('guests')}>
        <input {...register('guests')} {...a('guests')} type="number" min={1} max={50} inputMode="numeric" className="field" />
      </F>
      <F name="checkIn" label="Check-in" error={err('checkIn')}>
        <input {...register('checkIn')} {...a('checkIn')} type="date" min={today} className="field" />
      </F>
      <F name="checkOut" label="Check-out" error={err('checkOut')}>
        <input {...register('checkOut')} {...a('checkOut')} type="date" min={today} className="field" />
      </F>
      <F name="stayType" label="Stay type" className="sm:col-span-2" error={err('stayType')}>
        <select {...register('stayType')} {...a('stayType')} className="field">
          <option value="">No preference</option>
          {stayTypes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </F>
      <F name="message" label="Message" className="sm:col-span-2" error={err('message')}>
        <textarea {...register('message')} {...a('message')} rows={5} className="field" />
      </F>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="enq-website">Leave this empty</label>
        <input id="enq-website" {...register('website')} tabIndex={-1} autoComplete="off" />
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {serverError}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={isSubmitting} className={cn('inline-flex min-h-[48px] items-center rounded-btn bg-btn px-8 text-sm font-medium text-btn-ink transition hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60')}>
          {isSubmitting ? 'Sending…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
