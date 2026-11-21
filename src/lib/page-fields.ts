import type { Field } from './fields';

export const PAGE_FIELDS: Field[] = [
  { name: 'title', label: 'Page title', type: 'text', required: true, half: true },
  { name: 'slug', label: 'URL path (blank = home, use / for nesting, e.g. about/our-story)', type: 'text', half: true },
  { name: 'published', label: 'Visible to visitors (switch off to hide the page)', type: 'boolean' },
  { name: 'seoTitle', label: 'SEO title (defaults to page title)', type: 'text', half: true },
  { name: 'canonical', label: 'Canonical URL (optional)', type: 'url', half: true },
  { name: 'seoDescription', label: 'Meta description', type: 'textarea', max: 500 },
  { name: 'ogImage', label: 'Social share image (1200×630)', type: 'image' },
  { name: 'noindex', label: 'noindex (hide from search engines)', type: 'boolean' },
];
