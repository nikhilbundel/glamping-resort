import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { draftMode } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { formatDate, siteUrl } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';
import { PageHero } from '@/components/site/PageHero';
import { ShareButtons } from '@/components/site/ShareButtons';
import { RichText } from '@/components/ui/RichText';
import { SmartImage } from '@/components/ui/SmartImage';
import { PostCards } from '@/components/blocks/collection-blocks';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

const getPost = cache(async (slug: string, draft: boolean) => {
  const post = await prisma.post.findUnique({ where: { slug }, include: { author: true, category: true, tags: true } });
  if (!post) return null;
  if (!draft && (post.status !== 'PUBLISHED' || (post.publishedAt && post.publishedAt > new Date()))) return null;
  return post;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const [post, s] = await Promise.all([getPost(params.slug, draftMode().isEnabled), getSettings()]);
  if (!post) return {};
  return buildMetadata(s, {
    title: post.title,
    seoTitle: post.seoTitle,
    description: post.seoDescription || post.excerpt,
    ogImage: (post.ogImage || post.coverImage) as ImageValue | null,
    canonical: post.canonical,
    noindex: post.noindex,
    path: `/blog/${post.slug}`,
    type: 'article',
    publishedTime: post.publishedAt?.toISOString(),
  });
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug, draftMode().isEnabled);
  if (!post) notFound();
  const s = await getSettings();
  const tagIds = post.tags.map((t) => t.id);
  const related = await prisma.post.findMany({
    where: { status: 'PUBLISHED', publishedAt: { lte: new Date() }, id: { not: post.id }, OR: [{ categoryId: post.categoryId || undefined }, { tags: { some: { id: { in: tagIds } } } }] },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    include: { category: true },
  });
  const url = siteUrl(`/blog/${post.slug}`);
  const cover = post.coverImage as ImageValue | null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: cover?.url ? [cover.url.startsWith('http') ? cover.url : siteUrl(cover.url)] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.author ? { '@type': 'Person', name: post.author.name } : undefined,
    publisher: { '@type': 'Organization', name: s.general.siteName },
    mainEntityOfPage: url,
  };
  return (
    <article>
      <PageHero
        title={post.title}
        eyebrow={post.category?.name}
        image={cover}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Journal', href: '/blog' }, { label: post.title }]}
        meta={
          <p className="text-sm">
            {post.author && <>By {post.author.name} · </>}
            <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time> · {post.readingTime} min read
          </p>
        }
      />
      <div className="section-y">
        <div className="container max-w-3xl">
          {post.excerpt && <p className="mb-10 font-heading text-2xl leading-relaxed text-ink/80">{post.excerpt}</p>}
          <RichText html={post.content} className="prose-lg" />
          {!!post.tags.length && (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t.id}>
                  <Link href={`/blog?tag=${t.slug}`} className="inline-flex min-h-[36px] items-center rounded-full border border-line px-4 text-sm hover:border-accent">
                    #{t.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-10 border-t border-line pt-8">
            <ShareButtons url={url} title={post.title} />
          </div>
          {post.author && (
            <div className="mt-10 flex items-center gap-5 rounded-card bg-surface p-6 shadow-soft">
              {(post.author.avatar as ImageValue | null)?.url && (
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
                  <SmartImage image={post.author.avatar as ImageValue} sizes="64px" />
                </span>
              )}
              <div>
                <p className="font-medium">{post.author.name}</p>
                {post.author.bio && <p className="mt-1 text-sm text-muted">{post.author.bio}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      {!!related.length && (
        <section className="section-y bg-surface" aria-labelledby="related-heading">
          <div className="container">
            <h2 id="related-heading" className="mb-12 text-center font-heading text-h2 font-semibold">Keep reading</h2>
            <PostCards posts={related} />
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}
