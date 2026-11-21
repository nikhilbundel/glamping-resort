'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { ArrowUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WhatsAppButton({ number, message, label }: { number: string; message: string; label: string }) {
  const href = `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message || '')}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="floating-btn group fixed bottom-5 left-5 z-40 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[#25D366] px-4 text-white shadow-lift transition hover:-translate-y-0.5" aria-label={`${label} — chat on WhatsApp`}>
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      <span className="hidden text-sm font-medium sm:inline">{label}</span>
    </a>
  );
}

export function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <button type="button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={cn('floating-btn fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lift transition-all duration-300 hover:bg-accent', show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0')}>
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

const KEY = 'cookie-consent';

function Analytics({ gaId, pixelId }: { gaId: string; pixelId: string }) {
  return (
    <>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId.replace(/[^A-Z0-9-]/gi, '')}');`}</Script>
        </>
      )}
      {pixelId && (
        <Script id="fbq" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId.replace(/\D/g, '')}');fbq('track','PageView');`}</Script>
      )}
    </>
  );
}

/** Cookie consent + consent-gated analytics. */
export function ConsentAndAnalytics({
  cookie,
  gaId,
  pixelId,
}: {
  cookie: { enabled: boolean; text: string; acceptLabel: string; declineLabel: string; policyUrl: string };
  gaId: string;
  pixelId: string;
}) {
  const [consent, setConsent] = useState<'unknown' | 'yes' | 'no'>('unknown');
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setConsent(v === 'yes' || v === 'no' ? v : 'unknown');
    } catch {
      setConsent('unknown');
    }
  }, []);
  const choose = (v: 'yes' | 'no') => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setConsent(v);
  };
  const hasTracking = !!(gaId || pixelId);
  const allowed = !cookie.enabled || consent === 'yes';
  return (
    <>
      {hasTracking && allowed && <Analytics gaId={gaId} pixelId={pixelId} />}
      {cookie.enabled && consent === 'unknown' && (
        <div role="dialog" aria-live="polite" aria-label="Cookie consent" className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl rounded-card border border-line bg-surface p-5 text-sm shadow-lift sm:bottom-6">
          <p className="text-ink/80">
            {cookie.text}{' '}
            {cookie.policyUrl && (
              <a href={cookie.policyUrl} className="text-accent underline underline-offset-4">
                Learn more
              </a>
            )}
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => choose('no')} className="min-h-[44px] rounded-btn border border-line px-5">
              {cookie.declineLabel || 'Decline'}
            </button>
            <button type="button" onClick={() => choose('yes')} className="min-h-[44px] rounded-btn bg-btn px-5 text-btn-ink">
              {cookie.acceptLabel || 'Accept'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
