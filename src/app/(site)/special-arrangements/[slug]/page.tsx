import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { bookingLink, getSettings } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import type { ImageValue } from '@/lib/types';
import { PageHero } from '@/components/site/PageHero';
import { RichText } from '@/components/ui/RichText';
import { Ctas } from '@/components/ui/Button';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

const get = cache((slug: string) => prisma.specialArrangement.findFirst({ where: { slug, published: true } }));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const [a, s] = await Promise.all([get(params.slug), getSettings()]);
  if (!a) return {};
  return buildMetadata(s, { title: a.title, description: a.excerpt, ogImage: a.image as ImageValue | null, path: `/special-arrangements/${a.slug}` });
}

export default async function ArrangementPage({ params }: { params: { slug: string } }) {
  const a = await get(params.slug);
  if (!a) notFound();
  const s = await getSettings();
  const book = bookingLink(s);
  return (
    <>
      <PageHero title={a.title} eyebrow={a.price || 'Special arrangement'} image={a.image as ImageValue | null} crumbs={[{ label: 'Home', href: '/' }, { label: 'Special arrangements', href: '/special-arrangements' }, { label: a.title }]} />
      <section className="section-y">
        <div className="container max-w-3xl">
          {a.excerpt && <p className="mb-8 font-heading text-2xl leading-relaxed text-ink/80">{a.excerpt}</p>}
          <RichText html={a.content} className="prose-lg" />
          <Ctas className="mt-10" ctas={[{ label: book.label, href: book.href, newTab: book.newTab }, { label: 'Enquire', href: '/contact#enquiry', style: 'secondary' }]} />
        </div>
      </section>
    </>
  );
}
