import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getPage, getSettings } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { RenderSections } from '@/components/blocks';
import { PostCards } from '@/components/blocks/collection-blocks';
import { PageHero } from '@/components/site/PageHero';
import { cn } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';

export const dynamic = 'force-dynamic'; // search, filters and pagination are per-request

const PER_PAGE = 9;
type SP = { category?: string; tag?: string; q?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const [s, page] = await Promise.all([getSettings(), getPage('blog')]);
  return buildMetadata(s, { title: page?.title || 'Journal', seoTitle: page?.seoTitle, description: page?.seoDescription, ogImage: page?.ogImage as ImageValue | null, path: '/blog', noindex: !!(searchParams.q || searchParams.page) });
}

export default async function BlogIndex({ searchParams }: { searchParams: SP }) {
  const current = Math.max(1, Number(searchParams.page) || 1);
  const where: Prisma.PostWhereInput = { status: 'PUBLISHED', publishedAt: { lte: new Date() } };
  if (searchParams.category) where.category = { slug: searchParams.category };
  if (searchParams.tag) where.tags = { some: { slug: searchParams.tag } };
  if (searchParams.q) where.OR = [{ title: { contains: searchParams.q } }, { excerpt: { contains: searchParams.q } }, { content: { contains: searchParams.q } }];

  const [s, page, total, posts, categories, tags] = await Promise.all([
    getSettings(),
    getPage('blog'),
    prisma.post.count({ where }),
    prisma.post.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (current - 1) * PER_PAGE, take: PER_PAGE, include: { category: true } }),
    prisma.blogCategory.findMany({ orderBy: { order: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' }, where: { posts: { some: { status: 'PUBLISHED' } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { ...searchParams, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, String(v)));
    const str = p.toString();
    return `/blog${str ? `?${str}` : ''}`;
  };

  return (
    <>
      {page?.sections.length ? (
        <RenderSections sections={page.sections} ctx={{ pageSlug: 'blog', settings: s, draft: false, pageTitle: page.title }} />
      ) : (
        <PageHero title={page?.title || 'Journal'} />
      )}
      <section className="section-y">
        <div className="container">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Blog categories" className="flex flex-wrap gap-2">
              <Link href={qs({ category: undefined, page: undefined })} className={cn('min-h-[44px] rounded-btn border px-5 py-2.5 text-sm', !searchParams.category ? 'border-primary bg-primary text-white' : 'border-line bg-surface hover:border-primary')}>All</Link>
              {categories.map((c) => (
                <Link key={c.id} href={qs({ category: c.slug, page: undefined })} aria-current={searchParams.category === c.slug ? 'page' : undefined} className={cn('min-h-[44px] rounded-btn border px-5 py-2.5 text-sm', searchParams.category === c.slug ? 'border-primary bg-primary text-white' : 'border-line bg-surface hover:border-primary')}>
                  {c.name}
                </Link>
              ))}
            </nav>
            <form action="/blog" role="search" className="relative w-full lg:w-80">
              {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
              <label htmlFor="blog-q" className="sr-only">Search the journal</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="blog-q" name="q" defaultValue={searchParams.q} type="search" placeholder="Search stories…" className="field rounded-btn pl-11" />
            </form>
          </div>
          {(searchParams.q || searchParams.tag) && (
            <p className="mb-8 text-muted">
              {total} result{total === 1 ? '' : 's'}
              {searchParams.q && <> for “{searchParams.q}”</>}
              {searchParams.tag && <> tagged “{tags.find((t) => t.slug === searchParams.tag)?.name || searchParams.tag}”</>} · <Link href="/blog" className="text-accent underline">Clear</Link>
            </p>
          )}
          {posts.length ? <PostCards posts={posts} /> : <p className="py-16 text-center text-muted">No stories found.</p>}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex flex-wrap justify-center gap-2">
              {Array.from({ length: pages }).map((_, i) => (
                <Link key={i} href={qs({ page: i === 0 ? undefined : String(i + 1) })} aria-current={current === i + 1 ? 'page' : undefined} className={cn('inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border px-3', current === i + 1 ? 'border-btn bg-btn text-btn-ink' : 'border-line bg-surface hover:border-accent')}>
                  {i + 1}
                </Link>
              ))}
            </nav>
          )}

          {!!tags.length && (
            <div className="mt-16 border-t border-line pt-8">
              <p className="eyebrow mb-4 text-muted">Tags</p>
              <ul className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <li key={t.id}>
                    <Link href={qs({ tag: t.slug, page: undefined })} className={cn('inline-flex min-h-[36px] items-center rounded-full border px-4 text-sm', searchParams.tag === t.slug ? 'border-btn bg-btn text-btn-ink' : 'border-line hover:border-accent')}>
                      #{t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
