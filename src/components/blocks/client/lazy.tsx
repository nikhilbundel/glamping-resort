'use client';

/**
 * Heavier interactive widgets are code-split so they only download on pages that use them.
 * They are still server-rendered (ssr: true) to avoid layout shift.
 */
import dynamic from 'next/dynamic';

export const LazyEnquiryForm = dynamic(() => import('./EnquiryForm').then((m) => m.EnquiryForm));
export const LazyFaqBrowser = dynamic(() => import('./FaqBrowser').then((m) => m.FaqBrowser));
export const LazyGallery = dynamic(() => import('./Gallery').then((m) => m.Gallery));
export const LazyThumbStrip = dynamic(() => import('./Gallery').then((m) => m.ThumbStrip));
export const LazyArrangements = dynamic(() => import('./Arrangements').then((m) => m.Arrangements));
export const LazyVideoEmbed = dynamic(() => import('./VideoEmbed').then((m) => m.VideoEmbed));
export const LazyVideoReviews = dynamic(() => import('./VideoReviews').then((m) => m.VideoReviews));
