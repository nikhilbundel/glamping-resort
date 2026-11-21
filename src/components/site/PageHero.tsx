import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SmartImage } from '@/components/ui/SmartImage';
import { InViewVideo } from '@/components/blocks/client/InViewVideo';
import { HomeLink } from './HomeLink';
import type { ImageValue } from '@/lib/types';

export function PageHero({ title, eyebrow, image, video, crumbs, meta }: { title: string; eyebrow?: string; image?: ImageValue | null; video?: string | null; crumbs?: { label: string; href?: string }[]; meta?: React.ReactNode }) {
  return (
    <section data-hero className="relative flex min-h-[460px] items-end overflow-hidden bg-primary-dark pb-20 pt-40 md:pb-24 text-white md:min-h-[560px]">
      <SmartImage image={image} priority sizes="100vw" />
      {video && <InViewVideo src={video} />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/30" aria-hidden="true" />
      <div className="container relative">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-white/75">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {c.href ? <Link href={c.href} className="hover:text-white">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                  {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="eyebrow mb-4 text-white/80">{eyebrow}</p>}
        <h1 className="max-w-4xl font-heading text-h1 font-semibold [text-wrap:balance]">{title}</h1>
        {meta && <div className="mt-5 text-white/80">{meta}</div>}
      </div>
      <HomeLink />
    </section>
  );
}
