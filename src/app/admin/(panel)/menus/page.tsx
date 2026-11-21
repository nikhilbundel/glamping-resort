import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { asArray } from '@/lib/utils';
import type { MenuNode } from '@/lib/types';
import { PageHeader } from '@/components/admin/ui';
import { MenuBuilder } from '@/components/admin/forms/MenuBuilder';

export default async function MenusPage() {
  await requirePageUser();
  const [menuRows, pages, posts, activities] = await Promise.all([
    prisma.menu.findMany(),
    prisma.page.findMany({ orderBy: { slug: 'asc' }, select: { slug: true, title: true } }),
    prisma.post.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 20, select: { slug: true, title: true } }),
    prisma.activity.findMany({ where: { published: true }, select: { slug: true, title: true } }),
  ]);
  // Unfiltered: hidden items must stay editable here
  const menus = Object.fromEntries(['header', 'utility', 'footer', 'legal'].map((loc) => [loc, asArray<MenuNode>(menuRows.find((r) => r.location === loc)?.items)]));
  const options = [
    ...pages.map((p) => ({ value: `/${p.slug}`, label: `${p.title} (/${p.slug})` })),
    { value: '/blog', label: 'Blog index (/blog)' },
    ...posts.map((p) => ({ value: `/blog/${p.slug}`, label: `Post: ${p.title}` })),
    ...activities.map((a) => ({ value: `/experiences/${a.slug}`, label: `Experience: ${a.title}` })),
  ];
  return (
    <>
      <PageHeader title="Menu Builder" description="Header, utility bar and footer navigation." />
      <MenuBuilder menus={menus} pages={options} />
    </>
  );
}
