import 'server-only';
import type { Metadata } from 'next';
import type { Settings } from './data';
import type { ImageValue } from './types';
import { siteUrl } from './utils';

type SeoInput = {
  title?: string | null;
  seoTitle?: string | null;
  description?: string | null;
  ogImage?: ImageValue | null;
  canonical?: string | null;
  noindex?: boolean;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
};

export function buildMetadata(s: Settings, input: SeoInput): Metadata {
  const rawTitle = input.seoTitle || input.title;
  const title = rawTitle ? (s.seo.titleTemplate || '%s').replace('%s', rawTitle) : s.seo.defaultTitle;
  const description = input.description || s.seo.defaultDescription;
  const img = input.ogImage?.url ? input.ogImage : s.seo.ogImage;
  const imageUrl = img?.url ? (img.url.startsWith('http') ? img.url : siteUrl(img.url)) : undefined;
  const noindex = input.noindex || s.seo.noindexSite;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: input.canonical || siteUrl(input.path) },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: siteUrl(input.path),
      siteName: s.general.siteName,
      type: input.type || 'website',
      images: imageUrl ? [{ url: imageUrl, width: img?.width || 1200, height: img?.height || 630, alt: img?.alt }] : undefined,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
      site: s.seo.twitterHandle || undefined,
    },
  };
}

export function lodgingJsonLd(s: Settings) {
  const sameAs = s.social.links.map((l) => l.url).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: s.general.siteName,
    description: s.seo.defaultDescription,
    url: siteUrl('/'),
    telephone: s.contact.phones[0],
    email: s.contact.email,
    priceRange: s.seo.priceRange || undefined,
    image: s.seo.ogImage?.url ? [s.seo.ogImage.url.startsWith('http') ? s.seo.ogImage.url : siteUrl(s.seo.ogImage.url)] : undefined,
    address: { '@type': 'PostalAddress', streetAddress: s.contact.address, addressLocality: s.general.location },
    ...(s.contact.latitude && s.contact.longitude ? { geo: { '@type': 'GeoCoordinates', latitude: s.contact.latitude, longitude: s.contact.longitude } } : {}),
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
}
