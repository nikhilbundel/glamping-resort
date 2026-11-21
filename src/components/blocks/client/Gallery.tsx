'use client';

import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { SmartImage } from '@/components/ui/SmartImage';
import type { ImageValue } from '@/lib/types';
import { cn } from '@/lib/utils';

const COLS: Record<string, string> = { '2': 'sm:columns-2', '3': 'sm:columns-2 lg:columns-3', '4': 'sm:columns-2 lg:columns-4' };
const GRID: Record<string, string> = { '2': 'sm:grid-cols-2', '3': 'grid-cols-2 lg:grid-cols-3', '4': 'grid-cols-2 lg:grid-cols-4' };

/** Masonry / grid gallery with keyboard-accessible lightbox. */
export function Gallery({ images, layout = 'masonry', columns = '3' }: { images: ImageValue[]; layout?: string; columns?: string }) {
  const [index, setIndex] = useState(-1);
  const list = images.filter((i) => i?.url);
  return (
    <>
      {layout === 'masonry' ? (
        <div className={cn('columns-1 gap-4 [&>*]:mb-4', COLS[columns] || COLS['3'])}>
          {list.map((img, i) => (
            <button key={i} type="button" onClick={() => setIndex(i)} className="group relative block w-full overflow-hidden rounded-card" aria-label={`Open image ${i + 1}: ${img.alt}`}>
              <SmartImage image={img} fill={false} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="h-auto w-full transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            </button>
          ))}
        </div>
      ) : (
        <div className={cn('grid grid-cols-1 gap-3 md:gap-4', GRID[columns] || GRID['3'])}>
          {list.map((img, i) => (
            <button key={i} type="button" onClick={() => setIndex(i)} className="group relative aspect-[4/3] overflow-hidden rounded-card" aria-label={`Open image ${i + 1}: ${img.alt}`}>
              <SmartImage image={img} sizes="(min-width:1024px) 33vw, 50vw" className="transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <Lightbox open={index >= 0} index={index} close={() => setIndex(-1)} slides={list.map((i) => ({ src: i.url, alt: i.alt, width: i.width, height: i.height }))} />
    </>
  );
}

/** Thumbnail strip that opens a lightbox (used inside split sections). */
export function ThumbStrip({ images }: { images: ImageValue[] }) {
  const [index, setIndex] = useState(-1);
  const list = images.filter((i) => i?.url);
  if (!list.length) return null;
  return (
    <>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {list.slice(0, 4).map((img, i) => (
          <button key={i} type="button" onClick={() => setIndex(i)} className="group relative aspect-square overflow-hidden rounded-card" aria-label={`Open gallery image ${i + 1}`}>
            <SmartImage image={img} sizes="150px" className="transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            {i === 3 && list.length > 4 && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg text-white">+{list.length - 4}</span>}
          </button>
        ))}
      </div>
      <Lightbox open={index >= 0} index={index} close={() => setIndex(-1)} slides={list.map((i) => ({ src: i.url, alt: i.alt }))} />
    </>
  );
}
