import 'server-only';
import { prisma } from './db';
import type { Field, OptionSource } from './fields';

export type Options = Partial<Record<OptionSource, { value: string; label: string }[]>>;

function collectSources(fields: Field[], acc = new Set<OptionSource>()) {
  for (const f of fields) {
    if ((f.type === 'select' || f.type === 'multiselect') && f.source) acc.add(f.source);
    if (f.type === 'list' || f.type === 'group') collectSources(f.fields, acc);
  }
  return acc;
}

export async function loadOptions(fields: Field[], extra: OptionSource[] = []): Promise<Options> {
  const sources = collectSources(fields);
  extra.forEach((s) => sources.add(s));
  const out: Options = {};
  await Promise.all(
    [...sources].map(async (s) => {
      out[s] = await loadSource(s);
    }),
  );
  return out;
}

export async function loadSource(s: OptionSource) {
  switch (s) {
    case 'stays':
      return (await prisma.stay.findMany({ orderBy: { order: 'asc' } })).map((r) => ({ value: r.id, label: r.name }));
    case 'faqCategories':
      return (await prisma.faqCategory.findMany({ orderBy: { order: 'asc' } })).map((r) => ({ value: r.id, label: r.name }));
    case 'menuCategories':
      return (await prisma.menuCategory.findMany({ orderBy: { order: 'asc' } })).map((r) => ({ value: r.id, label: r.name }));
    case 'authors':
      return (await prisma.author.findMany({ orderBy: { name: 'asc' } })).map((r) => ({ value: r.id, label: r.name }));
    case 'blogCategories':
      return (await prisma.blogCategory.findMany({ orderBy: { order: 'asc' } })).map((r) => ({ value: r.id, label: r.name }));
    case 'tags':
      return (await prisma.tag.findMany({ orderBy: { name: 'asc' } })).map((r) => ({ value: r.id, label: r.name }));
    case 'pages':
      return (await prisma.page.findMany({ orderBy: { slug: 'asc' } })).map((r) => ({ value: r.slug, label: `${r.title} (/${r.slug})` }));
    case 'amenityGroups': {
      const groups = await prisma.amenity.findMany({ distinct: ['group'], select: { group: true } });
      return groups.map((g) => ({ value: g.group, label: g.group }));
    }
  }
}
