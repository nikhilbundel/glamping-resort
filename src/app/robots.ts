import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { siteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await prisma.setting.findUnique({ where: { key: 'seo' } }).catch(() => null);
  const block = !!(seo?.value as { noindexSite?: boolean } | null)?.noindexSite;
  return {
    rules: block ? [{ userAgent: '*', disallow: '/' }] : [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: siteUrl('/sitemap.xml'),
  };
}
