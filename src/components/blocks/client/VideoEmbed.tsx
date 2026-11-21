'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { SmartImage } from '@/components/ui/SmartImage';
import type { ImageValue } from '@/lib/types';

function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
  return null;
}

/** Click-to-load video (keeps third-party iframes out of the initial page load). */
export function VideoEmbed({ url, poster, title }: { url: string; poster?: ImageValue | null; title: string }) {
  const [play, setPlay] = useState(false);
  const embed = embedUrl(url);
  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-black shadow-soft">
      {play ? (
        embed ? (
          <iframe src={embed} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
        ) : (
          <video src={url} controls autoPlay className="absolute inset-0 h-full w-full" />
        )
      ) : (
        <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0" aria-label={`Play video: ${title}`}>
          <SmartImage image={poster} sizes="(min-width:1280px) 1200px, 100vw" loading="lazy" />
          <span className="absolute inset-0 bg-black/30" />
          <span className="absolute left-1/2 top-1/2 inline-flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-primary shadow-lift transition group-hover:scale-110">
            <Play className="ml-1 h-8 w-8" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
