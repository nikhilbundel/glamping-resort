'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import type { ImageValue } from '@/lib/types';
import { cn } from '@/lib/utils';

const BLUR =
  'data:image/svg+xml;base64,' +
  (typeof window === 'undefined'
    ? Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="5"><rect width="8" height="5" fill="#d9d0c1"/></svg>').toString('base64')
    : btoa('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="5"><rect width="8" height="5" fill="#d9d0c1"/></svg>'));

type Props = Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'> & {
  image?: ImageValue | null;
  alt?: string;
  /** fill parent (parent must be relative) — default true */
  fill?: boolean;
  width?: number;
  height?: number;
};

/**
 * next/image wrapper: blur placeholder, focal point, mobile art-direction variant and a graceful fallback
 * if a remote image fails to load.
 */
export function SmartImage({ image, alt, fill = true, className, sizes = '100vw', width, height, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const [mobileFailed, setMobileFailed] = useState(false);
  if (!image?.url) return <div className={cn('bg-line/60', fill && 'absolute inset-0', className)} aria-hidden="true" />;

  const common = (img: ImageValue | NonNullable<ImageValue['mobile']>, isFailed: boolean, onErr: () => void, extra?: string) => {
    const style = { objectPosition: `${img.focalX ?? 50}% ${img.focalY ?? 50}%`, ...(rest.style || {}) };
    const src = isFailed ? '/placeholder.svg' : img.url;
    const isSvg = src.split('?')[0].endsWith('.svg');
    // Remote photos (demo Unsplash images, Instagram…) are loaded straight by the browser instead of being fetched by
    // our server first — a slow / unreachable host can then never hang the server or return a 500.
    // Cloudinary already serves optimised images, and our own uploads (/media/…) still go through next/image.
    const direct = isSvg || /^https?:\/\//.test(src);
    const placeholder = isSvg ? 'empty' : 'blur';
    return fill ? (
      <Image {...rest} src={src} alt={alt ?? img.alt ?? ''} fill sizes={sizes} placeholder={placeholder} blurDataURL={BLUR} unoptimized={direct} onError={onErr} className={cn('object-cover', className, extra)} style={style} />
    ) : (
      <Image {...rest} src={src} alt={alt ?? img.alt ?? ''} width={width || img.width || 1200} height={height || img.height || 800} sizes={sizes} placeholder={placeholder} blurDataURL={BLUR} unoptimized={direct} onError={onErr} className={cn(className, extra)} style={style} />
    );
  };

  if (image.mobile?.url) {
    return (
      <>
        {common(image, failed, () => setFailed(true), 'hidden md:block')}
        {common(image.mobile, mobileFailed, () => setMobileFailed(true), 'md:hidden')}
      </>
    );
  }
  return common(image, failed, () => setFailed(true));
}
