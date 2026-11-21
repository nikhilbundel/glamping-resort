import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { siteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, activities, arrangements] = await Promise.all([
    prisma.page.findMany({ where: { published: true, noindex: false }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: { status: 'PUBLISHED', noindex: false, publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
    prisma.activity.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.specialArrangement.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...pages.map((p) => ({ url: siteUrl(`/${p.slug}`), lastModified: p.updatedAt, priority: p.slug === '' ? 1 : 0.7 })),
    ...posts.map((p) => ({ url: siteUrl(`/blog/${p.slug}`), lastModified: p.updatedAt, priority: 0.6 })),
    ...activities.map((p) => ({ url: siteUrl(`/experiences/${p.slug}`), lastModified: p.updatedAt, priority: 0.5 })),
    ...arrangements.map((p) => ({ url: siteUrl(`/special-arrangements/${p.slug}`), lastModified: p.updatedAt, priority: 0.4 })),
  ];
}
