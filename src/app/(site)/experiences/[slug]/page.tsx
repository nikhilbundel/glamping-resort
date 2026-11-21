import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Clock, Tag } from 'lucide-react';
import { prisma } from '@/lib/db';
import { bookingLink, getSettings } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { asArray } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';
import { PageHero } from '@/components/site/PageHero';
import { RichText } from '@/components/ui/RichText';
import { Ctas } from '@/components/ui/Button';
import { Gallery } from '@/components/blocks/client/Gallery';
import { ActivitiesGrid } from '@/components/blocks/client/ActivitiesGrid';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

const get = cache((slug: string) => prisma.activity.findFirst({ where: { slug, published: true } }));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const [a, s] = await Promise.all([get(params.slug), getSettings()]);
  if (!a) return {};
  return buildMetadata(s, { title: a.title, seoTitle: a.seoTitle, description: a.seoDescription || a.excerpt, ogImage: a.image as ImageValue | null, path: `/experiences/${a.slug}` });
}

export default async function ExperiencePage({ params }: { params: { slug: string } }) {
  const a = await get(params.slug);
  if (!a) notFound();
  const [s, others] = await Promise.all([getSettings(), prisma.activity.findMany({ where: { published: true, id: { not: a.id } }, orderBy: { order: 'asc' }, take: 3 })]);
  const book = bookingLink(s);
  return (
    <>
      <PageHero title={a.title} eyebrow={a.featured ? 'Featured experience' : a.seasonal ? 'Seasonal experience' : 'Experience'} image={a.image as ImageValue | null} video={a.video} crumbs={[{ label: 'Home', href: '/' }, { label: 'Experiences', href: '/experiences' }, { label: a.title }]} />
      <section className="section-y">
        <div className="container grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {a.excerpt && <p className="mb-8 font-heading text-2xl leading-relaxed text-ink/80">{a.excerpt}</p>}
            <RichText html={a.content} className="prose-lg" />
          </div>
          <aside className="h-fit rounded-card bg-surface p-7 shadow-soft lg:sticky lg:top-32">
            <dl className="space-y-4">
              {a.duration && (
                <div className="flex gap-3"><Clock className="mt-1 h-5 w-5 text-accent" aria-hidden="true" /><div><dt className="eyebrow text-muted">Duration</dt><dd>{a.duration}</dd></div></div>
              )}
              {a.price && (
                <div className="flex gap-3"><Tag className="mt-1 h-5 w-5 text-accent" aria-hidden="true" /><div><dt className="eyebrow text-muted">Price</dt><dd>{a.price}</dd></div></div>
              )}
            </dl>
            {!!asArray(a.tags).length && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {asArray<string>(a.tags).map((t) => <li key={t} className="rounded-full bg-bg px-3 py-1 text-xs">{t}</li>)}
              </ul>
            )}
            <Ctas className="mt-7" ctas={[{ label: book.label, href: book.href, newTab: book.newTab }, { label: 'Ask on WhatsApp', href: `https://wa.me/${s.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'd like to know more about ${a.title}.`)}`, style: 'secondary', newTab: true }]} />
          </aside>
        </div>
        {!!asArray(a.gallery).length && (
          <div className="container mt-16">
            <Gallery images={asArray<ImageValue>(a.gallery)} layout="grid" columns="3" />
          </div>
        )}
      </section>
      {!!others.length && (
        <section className="section-y bg-surface" aria-labelledby="more-exp">
          <div className="container">
            <h2 id="more-exp" className="mb-12 text-center font-heading text-h2 font-semibold">More to explore</h2>
            <ActivitiesGrid items={others.map((o) => ({ id: o.id, title: o.title, slug: o.slug, excerpt: o.excerpt || '', image: o.image as unknown as ImageValue, video: o.video, tags: asArray<string>(o.tags), featured: o.featured, seasonal: o.seasonal, duration: o.duration || '', price: o.price || '' }))} />
          </div>
        </section>
      )}
    </>
  );
}
