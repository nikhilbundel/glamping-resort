'use client';

import { HomeLink } from '@/components/site/HomeLink';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { EffectFade, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import { useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import { HeroContent, type HeroAnimConfig, type HeroTextStyle } from './HeroContent';
import { Ctas } from '@/components/ui/Button';
import type { CTA, ImageValue } from '@/lib/types';
import { cn } from '@/lib/utils';

export type Slide = {
  image?: ImageValue | null; video?: string; mobileVideo?: string; badge?: string; subheading?: string; heading?: string; text?: string; ctas?: CTA[];
  contentType?: string; contentImage?: ImageValue | null; contentImageWidth?: number; contentImageMobileWidth?: number; animation?: string;
};

export type HeroText = HeroTextStyle & { textAlign?: string; verticalAlign?: string; maxWidth?: number; offsetX?: number; offsetY?: number; mobileOffsetX?: number; mobileOffsetY?: number };

const HEIGHT: Record<string, string> = { full: 'h-[100svh] min-h-[520px]', large: 'h-[75svh] min-h-[480px]', medium: 'h-[55svh] min-h-[400px]' };
const H_ALIGN: Record<string, string> = { center: 'justify-center text-center', left: 'justify-start text-left', right: 'justify-end text-right' };
const V_ALIGN: Record<string, string> = { center: 'items-center', top: 'items-start pt-36 md:pt-44', bottom: 'items-end pb-20 md:pb-28' };

/** Background video: muted, inline, autoplays on every device; swaps to a mobile file under 768px if provided. */
function BgVideo({ src, mobileSrc, poster, active, loop, onEnded, onBlocked }: { src: string; mobileSrc?: string; poster?: string; active: boolean; loop: boolean; onEnded: () => void; onBlocked: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const pick = () => setUrl(mobileSrc && mq.matches ? mobileSrc : src);
    pick();
    mq.addEventListener('change', pick);
    return () => mq.removeEventListener('change', pick);
  }, [src, mobileSrc]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().catch(onBlocked);
    } else v.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, url]);
  if (!url) return null;
  return (
    <video
      ref={ref}
      key={url}
      className="absolute inset-0 h-full w-full object-cover"
      src={url}
      poster={poster}
      muted
      loop={loop}
      playsInline
      autoPlay={active}
      preload={active ? 'auto' : 'metadata'}
      onEnded={() => active && onEnded()}
      onError={() => active && onBlocked()}
      aria-hidden="true"
    />
  );
}

export type HeroSet = { label: string; slides: Slide[] };
export type HeroTop = { image?: ImageValue | null; width?: number; mobileWidth?: number; offset?: number; gap?: number };

export function HeroSlider({ sets, showTabs, top = {}, height = 'full', overlay = 40, autoplay = 6, kenBurns = true, showScrollCue, firstIsH1, text = {}, anim = {}, homeLink }: {
  sets: HeroSet[]; showTabs?: boolean; top?: HeroTop; height?: string; overlay?: number; autoplay?: number; kenBurns?: boolean; showScrollCue?: boolean; firstIsH1: boolean; text?: HeroText; anim?: HeroAnimConfig; homeLink?: string | null;
}) {
  const reduce = useReducedMotion();
  const usable = sets.filter((s) => s.slides.length);
  const [setIdx, setSetIdx] = useState(0);
  const [active, setActive] = useState(0);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [switched, setSwitched] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);
  const current = usable[Math.min(setIdx, usable.length - 1)] || { label: '', slides: [] };
  const slides = current.slides;
  const multi = slides.length > 1;
  const tabs = showTabs && usable.length > 1;
  const hAlign = text.textAlign || 'center';
  const delay = Math.max(0, Number(autoplay) || 0) * 1000;
  const next = () => swiperRef.current?.slideNext();
  // Reserve room under the top image + links so the big text never overlaps them.
  const hasTop = !!(tabs || top.image?.url);
  const topSpace = hasTop ? Number(top.offset ?? 96) + (top.image?.url ? Math.round((Number(top.width) || 220) * ((top.image.height || 1) / (top.image.width || 3))) + Number(top.gap ?? 16) : 0) + (tabs ? 56 : 0) : 0;

  // Auto-advance: photos after `autoplay` seconds, videos when they end (or after the delay if the browser blocks autoplay).
  useEffect(() => {
    if (!multi || reduce) return;
    const slide = slides[active];
    const key = `${setIdx}-${active}`;
    const isVideo = !!slide?.video && blocked !== key;
    if (isVideo) {
      const safety = setTimeout(next, 120_000); // never get stuck on a broken video
      return () => clearTimeout(safety);
    }
    if (!delay) return;
    const t = setTimeout(next, delay);
    return () => clearTimeout(t);
  }, [setIdx, active, multi, reduce, delay, blocked, slides]);

  // Tell the rest of the page which link is active (sections can be tied to a link) and support #experiences links.
  useEffect(() => {
    if (!tabs) return;
    document.documentElement.dataset.heroTab = String(setIdx);
    return () => {
      delete document.documentElement.dataset.heroTab;
    };
  }, [setIdx, tabs]);

  useEffect(() => {
    if (!tabs) return;
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1)).toLowerCase();
      const i = usable.findIndex((s) => s.label.toLowerCase().replace(/\s+/g, '-') === h);
      if (i >= 0) {
        setSetIdx(i);
        setActive(0);
      }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  const switchSet = (i: number) => {
    if (i === setIdx) return;
    try {
      const slug = usable[i].label.toLowerCase().replace(/\s+/g, '-');
      history.replaceState(null, '', i === 0 ? window.location.pathname + window.location.search : `#${slug}`);
    } catch {}
    setSetIdx(i);
    setSwitched(true);
    setActive(0);
    setBlocked(null);
  };


  return (
    <section data-hero className={cn('relative w-full overflow-hidden bg-primary-dark text-white', HEIGHT[height] || HEIGHT.full)} aria-roledescription={multi ? 'carousel' : undefined} aria-label="Highlights">
      {(tabs || top.image?.url) && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center px-4"
          style={{ top: Number(top.offset ?? 96), gap: Number(top.gap ?? 16) } as CSSProperties}
        >
          {top.image?.url && (
            <Image
              src={top.image.url}
              alt={top.image.alt || ''}
              width={top.image.width || 600}
              height={top.image.height || 300}
              priority
              unoptimized={top.image.url.split('?')[0].endsWith('.svg')}
              sizes={`${Number(top.width) || 220}px`}
              className="pointer-events-auto h-auto w-[var(--top-w-m)] max-w-[80vw] select-none md:w-[var(--top-w-d)]"
              style={{ '--top-w-m': `${Number(top.mobileWidth) || 150}px`, '--top-w-d': `${Number(top.width) || 220}px` } as CSSProperties}
            />
          )}
          {tabs && (
        <div role="tablist" aria-label="Choose what to explore" className="pointer-events-auto flex justify-center gap-8 md:gap-14">
          {usable.map((s, i) => (
            <button
              key={s.label + i}
              type="button"
              role="tab"
              id={`hero-tab-${i}`}
              aria-selected={setIdx === i}
              aria-controls="hero-panel"
              onClick={() => switchSet(i)}
              className={cn(
                'group relative min-h-[44px] px-1 text-sm font-medium uppercase tracking-[0.25em] transition-colors md:text-base',
                setIdx === i ? 'text-white' : 'text-white/65 hover:text-white',
              )}
              style={{ textShadow: '0 1px 12px rgba(0,0,0,.35)' }}
            >
              {s.label}
              <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-1.5 h-px origin-center bg-white transition-transform duration-500', setIdx === i ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50')} />
            </button>
          ))}
        </div>
          )}
        </div>
      )}
      <div key={setIdx} id="hero-panel" role={tabs ? 'tabpanel' : undefined} aria-labelledby={tabs ? `hero-tab-${setIdx}` : undefined} className={cn('h-full', switched && 'animate-fadein')}>
        <Swiper
          modules={[EffectFade, A11y]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1200}
          rewind={multi}
          allowTouchMove={multi}
          onSwiper={(sw) => (swiperRef.current = sw)}
          onSlideChange={(sw) => setActive(sw.activeIndex)}
          className="h-full"
        >
          {slides.map((s, i) => {
            const H = i === 0 && firstIsH1 ? 'h1' : 'p';
            const isActive = active === i;
            return (
              <SwiperSlide key={i} className="relative h-full">
                <div className={cn('absolute inset-0', kenBurns && !reduce && !s.video && isActive && 'animate-kenburns')}>
                  <SmartImage image={s.image} priority={i === 0} sizes="100vw" fetchPriority={i === 0 && setIdx === 0 ? 'high' : undefined} />
                  {s.video && (
                    <BgVideo
                      src={s.video}
                      mobileSrc={s.mobileVideo}
                      poster={s.image?.url}
                      active={isActive}
                      loop={!multi}
                      onEnded={next}
                      onBlocked={() => setBlocked(`${setIdx}-${i}`)}
                    />
                  )}
                </div>
                <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Math.min(90, Math.max(0, Number(overlay) || 0)) / 100})` }} aria-hidden="true" />
                <div
                className={cn('container relative z-10 flex h-full', H_ALIGN[hAlign] || H_ALIGN.center, V_ALIGN[text.verticalAlign || 'center'] || V_ALIGN.center)}
                style={hasTop && (text.verticalAlign || 'center') !== 'bottom' ? { paddingTop: topSpace } : undefined}
              >
                  <div
                    style={{
                      maxWidth: Number(text.maxWidth) || 1100,
                      '--ox-m': `${Number(text.mobileOffsetX) || 0}px`,
                      '--oy-m': `${Number(text.mobileOffsetY) || 0}px`,
                      '--ox-d': `${Number(text.offsetX) || 0}px`,
                      '--oy-d': `${Number(text.offsetY) || 0}px`,
                    } as CSSProperties}
                    className={cn('w-full translate-x-[var(--ox-m)] translate-y-[var(--oy-m)] md:translate-x-[var(--ox-d)] md:translate-y-[var(--oy-d)]', hAlign === 'center' && 'mx-auto', hAlign === 'right' && 'ml-auto')}
                  >
                    {s.badge && <span className="mb-6 inline-block rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] backdrop-blur">{s.badge}</span>}
                    {s.subheading && <p className="eyebrow mb-4 text-white/85">{s.subheading}</p>}
                    {((s.contentType === 'image' && s.contentImage?.url) || (s.contentType !== 'image' && s.heading)) && (
                      <HeroContent
                        active={isActive}
                        as={H}
                        mode={s.contentType === 'image' ? 'image' : 'text'}
                        text={s.heading}
                        image={s.contentImage}
                        imageWidth={s.contentImageWidth}
                        imageMobileWidth={s.contentImageMobileWidth}
                        style={text}
                        anim={{ ...anim, animation: s.animation || anim.animation }}
                        align={hAlign}
                      />
                    )}
                    {s.text && <p className={cn('mt-6 max-w-2xl text-body text-white/85', hAlign === 'center' && 'mx-auto', hAlign === 'right' && 'ml-auto')}>{s.text}</p>}
                    <Ctas ctas={s.ctas} onDark className={cn('mt-9', hAlign === 'center' && 'justify-center', hAlign === 'right' && 'justify-end')} />
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
      {showScrollCue && (
        <a href="#main-after-hero" className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 text-white/80 md:block" aria-label="Scroll down">
          <ChevronDown className="h-7 w-7 animate-bounce" />
        </a>
      )}
      {homeLink != null && <HomeLink label={homeLink} />}
      <span id="main-after-hero" className="absolute bottom-0" aria-hidden="true" />
    </section>
  );
}
