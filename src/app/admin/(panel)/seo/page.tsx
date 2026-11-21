import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { Badge, Card, PageHeader } from '@/components/admin/ui';
import { SeoDefaultsForm } from '@/components/admin/forms/SeoDefaultsForm';

export default async function SeoPage() {
  await requirePageUser();
  const [s, pages, posts] = await Promise.all([
    getSettings(),
    prisma.page.findMany({ orderBy: { slug: 'asc' }, select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true, ogImage: true, noindex: true } }),
    prisma.post.findMany({ orderBy: { publishedAt: 'desc' }, select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true, excerpt: true, noindex: true } }),
  ]);
  const check = (desc?: string | null) => (desc ? (desc.length < 70 ? <Badge tone="amber">short</Badge> : desc.length > 160 ? <Badge tone="amber">long</Badge> : <Badge tone="green">good</Badge>) : <Badge tone="red">missing</Badge>);
  return (
    <>
      <PageHeader title="SEO" description="Global defaults, plus an overview of per-page and per-post meta. sitemap.xml, robots.txt and JSON-LD (LodgingBusiness, FAQPage, BlogPosting) are generated automatically." actions={<><a href="/sitemap.xml" target="_blank" className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">sitemap.xml</a><a href="/robots.txt" target="_blank" className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">robots.txt</a></>} />
      <div className="grid gap-6 2xl:grid-cols-2">
        <Card title="Global defaults">
          <SeoDefaultsForm values={s.seo as unknown as Record<string, unknown>} />
        </Card>
        <div className="space-y-6">
          <Card title="Pages">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="py-2">Page</th><th>Description</th><th>Share image</th><th /></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2"><Link className="text-emerald-800 hover:underline dark:text-emerald-300" href={`/admin/pages/${p.id}`}>{p.title}</Link><span className="block font-mono text-xs text-zinc-500">/{p.slug}</span></td>
                    <td>{check(p.seoDescription)}{p.noindex && <span className="ml-1"><Badge tone="red">noindex</Badge></span>}</td>
                    <td>{p.ogImage ? <Badge tone="green">set</Badge> : <Badge>default</Badge>}</td>
                    <td className="text-right"><Link href={`/admin/pages/${p.id}`} className="text-xs text-emerald-700">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Blog posts">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="py-2">Post</th><th>Description</th><th /></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.title}</td>
                    <td>{check(p.seoDescription || p.excerpt)}{p.noindex && <span className="ml-1"><Badge tone="red">noindex</Badge></span>}</td>
                    <td className="text-right"><Link href={`/admin/collections/posts/${p.id}`} className="text-xs text-emerald-700">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
