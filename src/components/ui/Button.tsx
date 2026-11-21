import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CTA } from '@/lib/types';
import { cn, isExternal } from '@/lib/utils';

const styles: Record<string, string> = {
  primary: 'bg-btn text-btn-ink hover:-translate-y-0.5 hover:shadow-lift hover:brightness-110',
  secondary: 'border border-current text-inherit hover:-translate-y-0.5 hover:bg-ink/5',
  light: 'border border-white/80 text-white hover:-translate-y-0.5 hover:bg-white hover:text-ink',
  link: 'px-0 text-accent underline-offset-4 hover:underline group',
};

export function ButtonLink({ cta, className, onDark }: { cta: CTA; className?: string; onDark?: boolean }) {
  if (!cta?.label || !cta?.href) return null;
  const style = cta.style === 'secondary' && onDark ? 'light' : cta.style || 'primary';
  const cls = cn(
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-btn text-sm font-medium tracking-wide transition-all duration-[250ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    style !== 'link' && 'px-7 py-3',
    styles[style],
    className,
  );
  const inner = (
    <>
      {cta.label}
      {style === 'link' && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
    </>
  );
  if (isExternal(cta.href) || cta.newTab) {
    return (
      <a href={cta.href} className={cls} target={cta.newTab ? '_blank' : undefined} rel={cta.newTab ? 'noopener noreferrer' : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={cls}>
      {inner}
    </Link>
  );
}

export function Ctas({ ctas, className, onDark }: { ctas?: CTA[] | null; className?: string; onDark?: boolean }) {
  const list = (ctas || []).filter((c) => c?.label && c?.href);
  if (!list.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {list.map((c, i) => (
        <ButtonLink key={i} cta={c} onDark={onDark} />
      ))}
    </div>
  );
}
