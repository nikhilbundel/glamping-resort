'use client';

import Image from 'next/image';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
import { useReducedMotion } from 'framer-motion';
import { HERO_ANIMATIONS, HERO_EASINGS } from '@/lib/hero-options';
import type { ImageValue } from '@/lib/types';
import { cn } from '@/lib/utils';

export type HeroAnimConfig = {
  animation?: string;
  easing?: string;
  duration?: number;
  delay?: number;
  stagger?: number;
  distance?: number;
  repeat?: number;
  repeatGap?: number;
  fadeOut?: boolean;
};

export type HeroTextStyle = {
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  mobileFontSize?: number;
  textColor?: string;
  textColor2?: string;
  textEffect?: string;
  outlineWidth?: number;
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  italic?: boolean;
  textShadow?: boolean;
};

function fontStack(f?: string) {
  if (!f || f === 'heading') return 'var(--font-heading), Georgia, serif';
  if (f === 'body') return 'var(--font-body), system-ui, sans-serif';
  return `'${f}', var(--font-heading), sans-serif`;
}

export function textStyleCss(t: HeroTextStyle): CSSProperties {
  const desktop = Number(t.fontSize) || 80;
  const mobile = Number(t.mobileFontSize) || Math.round(desktop * 0.55);
  const c1 = t.textColor || '#FFFFFF';
  const c2 = t.textColor2 || '#E8C9A0';
  const effect = t.textEffect || 'solid';
  const shadows: string[] = [];
  if (t.textShadow && effect !== 'gradient' && effect !== 'outline') shadows.push('0 2px 24px rgba(0,0,0,.35)');
  if (effect === 'glow') shadows.push(`0 0 18px ${c2}`, `0 0 42px ${c2}`);
  return {
    '--hero-fs-m': `${mobile}px`,
    '--hero-fs-d': `${desktop}px`,
    fontFamily: fontStack(t.fontFamily),
    fontWeight: Number(t.fontWeight) || 600,
    lineHeight: Number(t.lineHeight) || 1.08,
    letterSpacing: t.letterSpacing ? `${t.letterSpacing}em` : undefined,
    textTransform: t.uppercase ? 'uppercase' : undefined,
    fontStyle: t.italic ? 'italic' : undefined,
    textShadow: shadows.length ? shadows.join(', ') : undefined,
    ...(effect === 'outline' ? { color: 'transparent', WebkitTextStroke: `${Number(t.outlineWidth) || 1.5}px ${c1}` } : {}),
    ...(effect === 'gradient' ? { '--hx-grad': `linear-gradient(90deg, ${c1}, ${c2})`, backgroundImage: `linear-gradient(90deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : {}),
    ...(effect === 'solid' || effect === 'glow' ? { color: c1 } : {}),
  } as CSSProperties;
}

/**
 * Renders a slide's main content (text or image) with the chosen entrance animation.
 * Replays every time the slide becomes active, and can loop with a pause (and optional fade-out) between runs.
 */
export function HeroContent({
  active,
  as: H,
  mode,
  text,
  image,
  imageWidth,
  imageMobileWidth,
  style,
  anim,
  align,
  children,
}: {
  active: boolean;
  as: 'h1' | 'p';
  mode: 'text' | 'image';
  text?: string;
  image?: ImageValue | null;
  imageWidth?: number;
  imageMobileWidth?: number;
  style: HeroTextStyle;
  anim: HeroAnimConfig;
  align: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const def = HERO_ANIMATIONS.find((a) => a.value === anim.animation) || HERO_ANIMATIONS[2];
  const animate = !reduce && def.value !== 'none';
  const split = mode === 'text' && animate ? def.split : undefined;
  const [run, setRun] = useState(0);
  // 'wait' = invisible until the web font has loaded, so the text never re-wraps mid-animation
  const [phase, setPhase] = useState<'in' | 'out' | 'idle' | 'wait'>(active ? 'wait' : 'idle');
  const count = useRef(1);
  const gradient = (style.textEffect || 'solid') === 'gradient';
  const hRef = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);

  const duration = Math.max(0.05, Number(anim.duration) || 1.2);
  const delay = Math.max(0, Number(anim.delay ?? 0.3));
  const stagger = Math.max(0, Number(anim.stagger ?? 45)) / 1000;
  const ease = def.value === 'typewriter' ? 'steps(1, end)' : HERO_EASINGS[anim.easing || 'smooth'] || HERO_EASINGS.smooth;
  const pieceDuration = def.value === 'typewriter' ? 0.01 : duration;

  const lines = useMemo(() => (text || '').split('\n'), [text]);
  const pieceCount = useMemo(() => {
    if (!split) return 1;
    return split === 'words' ? lines.join(' ').split(/\s+/).filter(Boolean).length : lines.join('').replace(/\s/g, '').length;
  }, [split, lines]);
  const total = delay + (split ? (pieceCount - 1) * (def.value === 'typewriter' ? Math.max(stagger, 0.03) : stagger) + pieceDuration : duration);

  // (Re)start when the slide becomes active — after the font is ready; hide when it leaves so it animates again next time.
  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      count.current = 1;
      setRun((r) => r + 1);
      setPhase('in');
    };
    const h = hRef.current;
    if (mode !== 'text' || !h || !document.fonts) return start();
    const cs = getComputedStyle(h);
    const spec = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) || 48}px ${cs.fontFamily}`;
    const timeout = new Promise((r) => setTimeout(r, 2500));
    Promise.race([document.fonts.load(spec, text || 'A').then(() => document.fonts.ready), timeout]).then(start, start);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Looping
  useEffect(() => {
    if (!active || !animate || phase !== 'in') return;
    const repeat = Math.max(0, Math.floor(Number(anim.repeat ?? 1)));
    if (repeat === 1 || (repeat > 1 && count.current >= repeat)) return;
    const gap = Math.max(0, Number(anim.repeatGap ?? 2));
    const t = setTimeout(() => {
      if (anim.fadeOut !== false) {
        setPhase('out');
        setTimeout(() => {
          count.current += 1;
          setRun((r) => r + 1);
          setPhase('in');
        }, 450);
      } else {
        count.current += 1;
        setRun((r) => r + 1);
      }
    }, (total + gap) * 1000);
    return () => clearTimeout(t);
  }, [active, animate, phase, run, total, anim.repeat, anim.repeatGap, anim.fadeOut]);

  // Continuous gradient across split letters/words: size each piece's background to the whole heading and offset it.
  useIsoLayoutEffect(() => {
    const h = hRef.current;
    if (!h || !gradient || !split) return;
    const place = () => {
      const W = h.offsetWidth;
      const Hh = h.offsetHeight;
      h.querySelectorAll<HTMLElement>('.hx-piece').forEach((el) => {
        let x = 0;
        let y = 0;
        let n: HTMLElement | null = el;
        while (n && n !== h) {
          x += n.offsetLeft;
          y += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        el.style.backgroundSize = `${W}px ${Hh}px`;
        el.style.backgroundPosition = `${-x}px ${-y}px`;
      });
    };
    place();
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place).catch(() => undefined);
    return () => window.removeEventListener('resize', place);
  });

  const vars = { '--hx-dist': `${Number(anim.distance ?? 40)}px` } as CSSProperties;
  const playing = phase === 'in' || phase === 'out';
  const anim1 = (kf: string, d: number, dur = duration): CSSProperties => (playing ? { animation: `${kf} ${dur}s ${ease} ${d}s both` } : {});
  const hidden = (phase === 'idle' && animate) || phase === 'wait';
  const isReveal = def.value === 'reveal-up' || def.value === 'reveal-down';
  const textCss = textStyleCss(style);

  let body: ReactNode;
  if (mode === 'image') {
    const w = Number(imageWidth) || 600;
    const mw = Number(imageMobileWidth) || 300;
    body = image?.url ? (
      <Image
        src={image.url}
        alt={image.alt || ''}
        width={image.width || w}
        height={image.height || Math.round(w / 2)}
        priority={H === 'h1'}
        sizes={`(max-width: 767px) ${mw}px, ${w}px`}
        unoptimized={image.url.split('?')[0].endsWith('.svg')}
        className={cn('inline-block h-auto max-w-[90vw] w-[var(--ci-m)] md:w-[var(--ci-d)]', align === 'center' && 'mx-auto', align === 'right' && 'ml-auto')}
        style={{ '--ci-m': `${mw}px`, '--ci-d': `${w}px` } as CSSProperties}
      />
    ) : null;
  } else if (split) {
    let i = 0;
    const step = def.value === 'typewriter' ? Math.max(stagger, 0.03) : stagger;
    const piece = (content: string, key: string) => {
      const d = delay + i++ * step;
      return (
        <span key={key} aria-hidden="true" className="hx-piece inline-block" style={animate ? anim1(def.keyframe, d, pieceDuration) : undefined}>
          {content}
        </span>
      );
    };
    const caretLine = def.value === 'typewriter' ? lines.length - 1 : -1;
    body = lines.map((line, li) => (
      <span key={li} className="block">
        {line.split(/(\s+)/).map((w, wi) => {
          if (!w) return null;
          if (/^\s+$/.test(w)) return <Fragment key={wi}> </Fragment>;
          return split === 'words' ? (
            piece(w, `${li}-${wi}`)
          ) : (
            <span key={wi} className="hx-word inline-block whitespace-nowrap">
              {[...w].map((ch, ci) => piece(ch, `${li}-${wi}-${ci}`))}
            </span>
          );
        })}
        {li === caretLine && <span className="hx-caret" aria-hidden="true" />}
      </span>
    ));
  } else {
    body = <span className="whitespace-pre-line">{text}</span>;
  }

  const wrapperAnim = animate && !split && !isReveal ? anim1(def.keyframe, delay) : undefined;
  const content = (
    <H
      ref={hRef}
      aria-label={mode === 'text' && split ? text : undefined}
      className={cn(
        'hx-anim relative',
        mode === 'text' && 'text-[length:var(--hero-fs-m)] md:text-[length:var(--hero-fs-d)]',
        gradient && 'hx-grad',
        def.value === 'flip-up' && '[transform-origin:50%_100%]',
      )}
      style={{ ...(mode === 'text' ? textCss : {}), ...vars, ...wrapperAnim }}
    >
      {isReveal && animate ? (
        <span className="block overflow-hidden pb-[0.08em]">
          <span className="block" style={anim1(def.keyframe, delay)}>
            {body}
          </span>
        </span>
      ) : (
        body
      )}
    </H>
  );

  return (
    <div key={run} className={cn(hidden && 'hx-hidden', phase === 'out' && 'hx-out')}>
      {content}
      {children}
    </div>
  );
}
