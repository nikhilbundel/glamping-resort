'use client';

import { Children, useId, type ReactNode } from 'react';
import type React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Keyboard, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Generic carousel with arrow buttons. Children are server-rendered slides. */
export function Carousel({ children, perView = 3, onDark, autoplay, pagination, className }: { children: ReactNode; perView?: number; onDark?: boolean; autoplay?: number; pagination?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const slides = Children.toArray(children);
  return (
    <div className={cn('relative min-w-0 max-w-full', className)} style={{ '--cs-per': perView, '--cs-per-sm': Math.min(2, perView) } as React.CSSProperties}>
      <Swiper
        modules={[Navigation, A11y, Keyboard, Pagination, Autoplay]}
        navigation={{ prevEl: `.prev-${id}`, nextEl: `.next-${id}` }}
        observer
        observeParents
        keyboard={{ enabled: true }}
        pagination={pagination ? { clickable: true } : false}
        autoplay={autoplay ? { delay: autoplay * 1000, pauseOnMouseEnter: true, disableOnInteraction: false } : false}
        spaceBetween={20}
        slidesPerView={1.15}
        breakpoints={{ 640: { slidesPerView: Math.min(2, perView) }, 1024: { slidesPerView: perView } }}
        className={cn(pagination && '!pb-12')}
      >
        {slides.map((s, i) => (
          <SwiperSlide key={i} className="cs-slide !h-auto">
            {s}
          </SwiperSlide>
        ))}
      </Swiper>
      {slides.length > 1 && (
        <div className="mt-8 flex justify-center gap-3">
          {[
            [`prev-${id}`, 'Previous', ArrowLeft],
            [`next-${id}`, 'Next', ArrowRight],
          ].map(([cls, label, I]) => {
            const Ico = I as typeof ArrowLeft;
            return (
              <button key={cls as string} type="button" aria-label={label as string} className={cn(cls as string, 'inline-flex h-12 w-12 items-center justify-center rounded-full border transition disabled:opacity-30', onDark ? 'border-white/30 hover:bg-white hover:text-ink' : 'border-line bg-surface hover:border-accent hover:bg-accent hover:text-white')}>
                <Ico className="h-5 w-5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Small image slider used in room cards. */
/** Image slider used inside split sections: arrows, visible dots, counter, optional auto-advance and swipe. */
export function MiniSlider({ children, label, autoplay = 5 }: { children: ReactNode; label: string; autoplay?: number }) {
  const id = useId().replace(/:/g, '');
  const slides = Children.toArray(children);
  const many = slides.length > 1;
  return (
    <div className="group/ms relative h-full" data-testid="mini-slider">
      <Swiper
        modules={[Pagination, A11y, Navigation, Autoplay, Keyboard]}
        observer
        observeParents
        loop={many}
        speed={700}
        keyboard={{ enabled: true }}
        autoplay={many && autoplay > 0 ? { delay: autoplay * 1000, pauseOnMouseEnter: true, disableOnInteraction: false } : false}
        navigation={many ? { prevEl: `.msp-${id}`, nextEl: `.msn-${id}` } : false}
        pagination={many ? { clickable: true, el: `.msd-${id}`, bulletClass: 'ms-dot', bulletActiveClass: 'ms-dot-active' } : false}
        a11y={{ containerMessage: label, prevSlideMessage: 'Previous image', nextSlideMessage: 'Next image' }}
        className="h-full"
      >
        {slides.map((s, i) => (
          <SwiperSlide key={i} className="relative h-full">
            {s}
          </SwiperSlide>
        ))}
      </Swiper>
      {many && (
        <>
          <button type="button" aria-label="Previous image" className={`msp-${id} absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover/ms:opacity-100`}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next image" className={`msn-${id} absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover/ms:opacity-100`}>
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className={`msd-${id} absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5`} />
        </>
      )}
    </div>
  );
}
