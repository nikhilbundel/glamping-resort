import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "← Home" link shown on every page except the home page.
 * overlay = bottom-left of the page's main image; bar = just under the header on pages without a main image.
 */
export function HomeLink({ label, variant = 'overlay' }: { label?: string; variant?: 'overlay' | 'bar' }) {
  const text = label?.trim() || 'Home';
  const link = (
    <Link
      href="/"
      data-testid="home-link"
      className={cn(
        'group pointer-events-auto inline-flex min-h-[44px] items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] transition sm:text-sm',
        variant === 'overlay' ? 'text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,.45)] hover:text-white' : 'text-ink/70 hover:text-ink',
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
      {text}
    </Link>
  );
  if (variant === 'bar') return <div className="container pt-5 md:pt-7">{link}</div>;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 md:bottom-7">
      <div className="container">{link}</div>
    </div>
  );
}
