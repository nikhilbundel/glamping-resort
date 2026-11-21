'use client';

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { ChevronLeft, ChevronRight, Pause, Play, Star, Volume2, VolumeX } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { ImageValue } from '@/lib/types';
import { SmartImage } from '@/components/ui/SmartImage';
import { cn } from '@/lib/utils';

export type VideoReview = { video?: string; poster?: ImageValue | null; name?: string; location?: string; caption?: string; rating?: number | string };

const EVT = 'video-review-play';

function ReviewCard({ r, index, hoverPreview, onDark }: { r: VideoReview; index: number; hoverPreview: boolean; onDark?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [mode, setMode] = useState<'idle' | 'preview' | 'playing' | 'paused'>('idle');
  const [muted, setMuted] = useState(false);
  const reduce = useReducedMotion();
  const id = useRef(`vr-${index}-${Math.random().toString(36).slice(2)}`).current;

  // Only download when close to the screen; pause when scrolled/slid out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setNear(true);
    const load = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px' });
    const vis = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio < 0.5 && ref.current && !ref.current.paused) {
        ref.current.pause();
        setMode((m) => (m === 'playing' ? 'paused' : 'idle'));
      }
    }, { threshold: [0, 0.5, 1] });
    load.observe(el);
    vis.observe(el);
    return () => { load.disconnect(); vis.disconnect(); };
  }, []);

  // Only one review plays with sound at a time.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail === id) return;
      const v = ref.current;
      if (v && !v.paused) v.pause();
      setMode((m) => (m === 'playing' ? 'paused' : m === 'preview' ? 'idle' : m));
    };
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, [id]);

  const playWithSound = () => {
    const v = ref.current;
    if (!v) return;
    window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
    if (mode !== 'paused' && mode !== 'playing') v.currentTime = 0;
    v.muted = muted;
    v.play().then(() => setMode('playing')).catch(() => {
      // Browser refused sound (no user gesture yet) — fall back to muted.
      v.muted = true;
      setMuted(true);
      v.play().then(() => setMode('playing')).catch(() => undefined);
    });
  };
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (mode === 'playing') { v.pause(); setMode('paused'); }
    else playWithSound();
  };
  const enter = () => {
    const v = ref.current;
    if (!hoverPreview || reduce || !v || mode === 'playing' || mode === 'paused') return;
    v.muted = true;
    v.play().then(() => setMode('preview')).catch(() => undefined);
  };
  const leave = () => {
    const v = ref.current;
    if (v && mode === 'preview') { v.pause(); v.currentTime = 0; setMode('idle'); }
  };

  const rating = Math.max(0, Math.min(5, Number(r.rating) || 0));
  const active = mode === 'playing' || mode === 'paused';
  return (
    <div
      ref={wrap}
      onMouseEnter={enter}
      onMouseLeave={leave}
      className={cn('group relative aspect-[9/16] w-full overflow-hidden rounded-card bg-black text-white shadow-lg', onDark ? 'ring-1 ring-white/10' : '')}
      data-testid="video-review"
      data-state={mode}
    >
      {r.poster?.url && <SmartImage image={r.poster} alt={r.name ? `Video review by ${r.name}` : 'Guest video review'} sizes="(min-width:1024px) 25vw, 70vw" className={cn('object-cover transition-opacity duration-500', mode !== 'idle' && 'opacity-0')} loading="lazy" />}
      {r.video && (
        <video
          ref={ref}
          src={near ? (r.poster?.url ? r.video : `${r.video}#t=0.1`) : undefined}
          preload={near ? 'metadata' : 'none'}
          playsInline
          loop={mode === 'preview'}
          onEnded={() => setMode('paused')}
          className={cn('absolute inset-0 h-full w-full object-cover', r.poster?.url && mode === 'idle' && 'opacity-0')}
          aria-label={r.name ? `Video review by ${r.name}` : 'Guest video review'}
        />
      )}
      {r.video && <button
        type="button"
        onClick={toggle}
        aria-label={mode === 'playing' ? 'Pause review' : `Play review${r.name ? ` by ${r.name}` : ''} with sound`}
        className="absolute inset-0 z-[1] flex items-center justify-center focus-visible:outline-none"
      >
        <span className={cn('flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-md transition', mode === 'playing' ? 'scale-90 opacity-0 group-hover:opacity-100' : 'opacity-100 group-hover:scale-110')}>
          {mode === 'playing' ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7 fill-white" />}
        </span>
      </button>}
      {active && (
        <button
          type="button"
          onClick={() => { const v = ref.current; if (v) v.muted = !muted; setMuted(!muted); }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="absolute right-3 top-3 z-[2] rounded-full bg-black/45 p-2 backdrop-blur hover:bg-black/65"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
      {(r.name || r.caption || rating > 0) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-16">
          {rating > 0 && (
            <div className="mb-1.5 flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('h-3.5 w-3.5', i < rating ? 'fill-amber-400 text-amber-400' : 'text-white/40')} />)}
            </div>
          )}
          {r.caption && <p className="line-clamp-3 text-sm leading-snug text-white/90">“{r.caption}”</p>}
          {r.name && <p className="mt-2 text-sm font-semibold">{r.name}{r.location && <span className="font-normal text-white/70"> · {r.location}</span>}</p>}
        </div>
      )}
    </div>
  );
}

/** Reel-style (9:16) guest video reviews. Hover the left / right edge to slide; click a video to play it with sound. */
export function VideoReviews({ items, perView = 4, hoverPreview = true, edgeHover = true, onDark }: { items: VideoReview[]; perView?: number; hoverPreview?: boolean; edgeHover?: boolean; onDark?: boolean }) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  const start = (dir: -1 | 1) => {
    stop();
    if (!swiper) return;
    const step = () => (dir < 0 ? swiper.slidePrev(600) : swiper.slideNext(600));
    step();
    timer.current = setInterval(step, 1100);
  };
  useEffect(() => stop, []);
  const list = items.filter((i) => i.video || i.poster?.url);
  if (!list.length) return null;

  const update = (s: SwiperType) => setEdges({ start: s.isBeginning, end: s.isEnd });
  const zone = 'absolute inset-y-0 z-10 hidden w-[12%] min-w-[56px] cursor-pointer items-center md:flex transition-opacity';
  const arrow = cn('flex h-11 w-11 items-center justify-center rounded-full shadow-md backdrop-blur', onDark ? 'bg-white/20 text-white' : 'bg-white/90 text-ink');

  return (
    <div className="relative min-w-0 max-w-full" data-testid="video-reviews" style={{ '--vr-per': perView, '--vr-per-sm': Math.min(2.4, perView) } as React.CSSProperties}>
      <Swiper
        modules={[A11y, Keyboard]}
        observer
        observeParents
        keyboard={{ enabled: true }}
        spaceBetween={16}
        slidesPerView={1.35}
        breakpoints={{ 640: { slidesPerView: Math.min(2.4, perView) }, 1024: { slidesPerView: perView } }}
        onSwiper={(s) => {
          setSwiper(s);
          update(s);
          // re-measure once fonts / images have settled (avoids wrong sizes on slow first loads)
          requestAnimationFrame(() => !s.destroyed && s.update());
          window.addEventListener('load', () => !s.destroyed && s.update(), { once: true });
        }}
        onSlideChange={update}
        onResize={update}
        a11y={{ containerMessage: 'Guest video reviews' }}
      >
        {list.map((r, i) => (
          <SwiperSlide key={i} className="vr-slide !h-auto">
            <ReviewCard r={r} index={i} hoverPreview={hoverPreview} onDark={onDark} />
          </SwiperSlide>
        ))}
      </Swiper>
      {edgeHover && list.length > 1 && (
        <>
          <div
            className={cn(zone, 'left-0 justify-start bg-gradient-to-r pl-2', onDark ? 'from-black/40' : 'from-bg/80', 'to-transparent', edges.start && 'pointer-events-none opacity-0')}
            onMouseEnter={() => start(-1)}
            onMouseLeave={stop}
            onClick={() => swiper?.slidePrev()}
            data-testid="vr-edge-prev"
            aria-hidden="true"
          >
            <span className={arrow}><ChevronLeft className="h-5 w-5" /></span>
          </div>
          <div
            className={cn(zone, 'right-0 justify-end bg-gradient-to-l pr-2', onDark ? 'from-black/40' : 'from-bg/80', 'to-transparent', edges.end && 'pointer-events-none opacity-0')}
            onMouseEnter={() => start(1)}
            onMouseLeave={stop}
            onClick={() => swiper?.slideNext()}
            data-testid="vr-edge-next"
            aria-hidden="true"
          >
            <span className={arrow}><ChevronRight className="h-5 w-5" /></span>
          </div>
        </>
      )}
      {list.length > 1 && (
        <div className="mt-6 flex justify-center gap-3 md:hidden">
          <button type="button" aria-label="Previous review" onClick={() => swiper?.slidePrev()} disabled={edges.start} className={cn(arrow, 'disabled:opacity-40')}><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Next review" onClick={() => swiper?.slideNext()} disabled={edges.end} className={cn(arrow, 'disabled:opacity-40')}><ChevronRight className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}
