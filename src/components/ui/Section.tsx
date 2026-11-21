import type { ReactNode } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';
import { Reveal, RevealItem } from './Reveal';

export type SectionStyle = { background?: string; anchorId?: string; sizeEyebrow?: number | string; sizeHeading?: number | string; sizeTitle?: number | string; sizeBody?: number | string };

/** Per-section text size controls (percent, 100 = theme default) → CSS variables used by .eyebrow / text-h2 / text-h3 / body text. */
export function textSizeVars(d?: SectionStyle) {
  const v = (x: unknown) => {
    const n = Number(x);
    return Number.isFinite(n) && n > 0 && n !== 100 ? String(Math.min(400, Math.max(30, n)) / 100) : undefined;
  };
  const style: Record<string, string> = {};
  const map = { '--s-eyebrow': d?.sizeEyebrow, '--s-heading': d?.sizeHeading, '--s-title': d?.sizeTitle, '--s-body': d?.sizeBody };
  for (const [k, x] of Object.entries(map)) { const r = v(x); if (r) style[k] = r; }
  return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
}

export function isDark(bg?: string) {
  return bg === 'green' || bg === 'dark';
}

const BG: Record<string, string> = {
  cream: 'bg-bg text-ink',
  white: 'bg-surface text-ink',
  green: 'bg-primary text-white',
  dark: 'bg-[#1f1f1f] text-white',
};

export function Section({ data, children, className, id, bleed }: { data?: SectionStyle; children: ReactNode; className?: string; id?: string; bleed?: boolean }) {
  return (
    <section id={data?.anchorId || id || undefined} style={textSizeVars(data)} className={cn('section-y relative overflow-hidden', BG[data?.background || 'cream'] || BG.cream, className)}>
      {bleed ? children : <div className="container">{children}</div>}
    </section>
  );
}

export function Eyebrow({ children, className, onDark }: { children?: ReactNode; className?: string; onDark?: boolean }) {
  if (!children) return null;
  return <p className={cn('eyebrow mb-4', onDark ? 'text-white/80' : 'text-accent', className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  heading,
  intro,
  align = 'center',
  onDark,
  as: H = 'h2',
  className,
}: {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  align?: string;
  onDark?: boolean;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  if (!eyebrow && !heading && !intro) return null;
  return (
    <Reveal className={cn('mb-12 max-w-3xl md:mb-16', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
      {eyebrow && (
        <RevealItem>
          <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>
        </RevealItem>
      )}
      {heading && (
        <RevealItem>
          <H className={cn('font-heading font-semibold', H === 'h1' ? 'text-h1' : 'text-h2')}>{heading}</H>
        </RevealItem>
      )}
      {intro && (
        <RevealItem>
          <p className={cn('mt-5 text-body', onDark ? 'text-white/80' : 'text-muted')}>{intro}</p>
        </RevealItem>
      )}
    </Reveal>
  );
}
