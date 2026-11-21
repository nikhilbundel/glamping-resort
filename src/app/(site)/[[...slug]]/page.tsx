import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { draftMode } from 'next/headers';
import { getPage, getSettings } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { RenderSections } from '@/components/blocks';
import type { ImageValue } from '@/lib/types';

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // pages render on first request and are cached (ISR); admin saves call revalidatePath
}

type Props = { params: { slug?: string[] } };
const toSlug = (p: Props['params']) => (p.slug || []).map(decodeURIComponent).join('/');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = toSlug(params);
  const [page, s] = await Promise.all([getPage(slug, draftMode().isEnabled), getSettings()]);
  if (!page) return {};
  return buildMetadata(s, {
    title: slug === '' ? null : page.title,
    seoTitle: page.seoTitle,
    description: page.seoDescription,
    ogImage: page.ogImage as ImageValue | null,
    canonical: page.canonical,
    noindex: page.noindex,
    path: `/${slug}`,
  });
}

export default async function CmsPage({ params }: Props) {
  const slug = toSlug(params);
  const draft = draftMode().isEnabled;
  const [page, settings] = await Promise.all([getPage(slug, draft), getSettings()]);
  if (!page) notFound();
  return <RenderSections sections={page.sections} ctx={{ pageSlug: slug, settings, draft, pageTitle: page.title }} />;
}
