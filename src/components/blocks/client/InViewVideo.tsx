'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Muted, looping, inline video that only downloads when it is near the screen,
 * plays while at least ~35% visible and pauses when scrolled away.
 * Sits on top of a poster image (rendered by the parent) and fades in once it is actually playing.
 */
export function InViewVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v || reduce || typeof IntersectionObserver === 'undefined') return;
    const loadObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300px 0px' });
    const playObs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.35) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: [0, 0.35, 0.7] },
    );
    loadObs.observe(v);
    playObs.observe(v);
    return () => {
      loadObs.disconnect();
      playObs.disconnect();
    };
  }, [reduce]);

  if (reduce) return null;
  return (
    <video
      ref={ref}
      src={near ? src : undefined}
      muted
      loop
      playsInline
      preload={near ? 'metadata' : 'none'}
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-700', playing ? 'opacity-100' : 'opacity-0', className)}
    />
  );
}
