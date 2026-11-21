'use server';

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { buildSchema, defaults, imageSchema } from '@/lib/fields';
import { getSectionDef } from '@/lib/sections';
import { logActivity, saveRevision, diff, snapshot } from '@/lib/audit';

/** "Home (/) › #4 A room with the whole sky [split]" — where a section sits, for the change log. */
async function sectionWhere(s: { id?: string; pageId: string; order: number; type: string; label: string | null; data?: unknown; page: { title: string; slug: string } }) {
  const pos = (await prisma.section.count({ where: { pageId: s.pageId, order: { lt: s.order } } })) + 1;
  const d = (s.data || {}) as Record<string, unknown>;
  const first = (d.heading || (Array.isArray(d.slides) && (d.slides[0] as { heading?: string })?.heading) || '') as string;
  const heading = typeof first === 'string' && first.trim() ? ` “${first.trim().slice(0, 60)}”` : '';
  return `${s.page.title} (/${s.page.slug}) › #${pos} ${s.label || getSectionDef(s.type)?.label || s.type}${heading} [${s.type}]`;
}
const pageWhere = (p: { title: string; slug: string }) => `${p.title} (/${p.slug})`;
const META = ['title', 'slug', 'published', 'seoTitle', 'seoDescription', 'ogImage', 'canonical', 'noindex'] as const;
const pickMeta = (p: Record<string, unknown>) => Object.fromEntries(META.map((k) => [k, p[k] ?? null]));
import { revalidateSite } from '@/lib/revalidate';

const pageSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(190),
  slug: z
    .string()
    .trim()
    .max(190)
    .transform((s) => s.replace(/^\/+|\/+$/g, '').toLowerCase())
    .refine((s) => s === '' || /^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(s), 'Slug may contain lowercase letters, numbers, hyphens and / for nesting')
    .refine((s) => !/^(admin|api|blog\/|experiences\/|special-arrangements\/|maintenance)/.test(s), 'This path is reserved'),
  published: z.boolean().default(true),
  seoTitle: z.string().max(190).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: imageSchema.nullable().optional(),
  canonical: z.string().max(1000).optional().nullable(),
  noindex: z.boolean().default(false),
});

const pathOf = (slug: string) => `/${slug}`;

export async function savePage(id: string | null, values: unknown) {
  return run(async () => {
    const user = await requireUser();
    const d = pageSchema.parse(values);
    const data = { ...d, ogImage: d.ogImage ?? Prisma.DbNull, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, canonical: d.canonical || null };
    let page;
    if (id) {
      const before = await prisma.page.findUniqueOrThrow({ where: { id } });
      if (before.isSystem && before.slug !== d.slug && before.slug === '') throw new Error('The home page slug cannot be changed');
      if (before.slug === '' && !d.published) throw new Error('The Home page can’t be hidden — visitors would see an error.');
      page = await prisma.page.update({ where: { id }, data });
      await logActivity(user, 'update', 'page', id, `Updated page "${d.title}"`, { where: pageWhere(before), changes: diff(pickMeta(before), pickMeta(page)) });
    } else {
      page = await prisma.page.create({ data });
      await logActivity(user, 'create', 'page', page.id, `Created page "${d.title}"`, { where: pageWhere(page), snapshot: snapshot(pickMeta(page)) });
    }
    revalidateSite(pathOf(page.slug));
    return { id: page.id };
  });
}

export async function deletePage(id: string) {
  return run(async () => {
    const user = await requireUser();
    const page = await prisma.page.findUniqueOrThrow({ where: { id }, include: { sections: { orderBy: { order: 'asc' } } } });
    if (page.slug === '') throw new Error('The Home page can’t be deleted — edit or hide its sections instead.');
    await prisma.page.delete({ where: { id } });
    await logActivity(user, 'delete', 'page', id, `Deleted page "${page.title}" (/${page.slug})`, {
      where: pageWhere(page),
      snapshot: snapshot({ ...pickMeta(page), sections: page.sections.map((x) => ({ type: x.type, label: x.label, isVisible: x.isVisible, data: x.data })) }),
    });
    revalidateSite(pathOf(page.slug));
  });
}

/** Show / hide a whole page. Hidden pages return 404 to visitors (admins can still preview them). */
export async function setPagePublished(id: string, published: boolean) {
  return run(async () => {
    const user = await requireUser();
    const page = await prisma.page.findUniqueOrThrow({ where: { id } });
    if (page.slug === '' && !published) throw new Error('The Home page can’t be hidden — visitors would see an error.');
    await prisma.page.update({ where: { id }, data: { published } });
    await logActivity(user, published ? 'publish' : 'unpublish', 'page', id, `${published ? 'Showed' : 'Hid'} page "${page.title}"`, { where: pageWhere(page), changes: [{ path: 'published', from: page.published, to: published }] });
    revalidateSite(pathOf(page.slug));
  });
}

/** Copy a page with all its sections (hidden until you publish it). */
export async function duplicatePage(id: string) {
  return run(async () => {
    const user = await requireUser();
    const page = await prisma.page.findUniqueOrThrow({ where: { id }, include: { sections: { orderBy: { order: 'asc' } } } });
    const base = page.slug === '' ? 'home-copy' : `${page.slug}-copy`;
    let slug = base;
    for (let i = 2; await prisma.page.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const copy = await prisma.page.create({
      data: {
        slug,
        title: `${page.title} (copy)`,
        published: false,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        ogImage: page.ogImage ?? Prisma.DbNull,
        noindex: page.noindex,
        sections: {
          create: page.sections.map((s) => ({ type: s.type, label: s.label, order: s.order, isVisible: s.isVisible, data: s.data as Prisma.InputJsonValue })),
        },
      },
    });
    await logActivity(user, 'create', 'page', copy.id, `Duplicated "${page.title}" as /${slug}`, { where: pageWhere(page), note: `New page /${slug} (hidden) with ${page.sections.length} copied sections` });
    return { id: copy.id, slug };
  });
}

export async function addSection(pageId: string, type: string) {
  return run(async () => {
    const user = await requireUser();
    const def = getSectionDef(type);
    if (!def) throw new Error('Unknown block type');
    const max = await prisma.section.aggregate({ where: { pageId }, _max: { order: true } });
    const s = await prisma.section.create({ data: { pageId, type, label: def.label, order: (max._max.order ?? -1) + 1, data: defaults(def.fields) as Prisma.InputJsonValue, isVisible: false }, include: { page: true } });
    await logActivity(user, 'create', 'section', s.id, `Added ${def.label} block (hidden until published)`, { where: await sectionWhere(s), note: 'Added at the bottom of the page with default content' });
    return { id: s.id };
  });
}

/** Auto-save: stores the draft only; the live site keeps showing published data. */
export async function saveSectionDraft(id: string, data: Record<string, unknown>) {
  return run(async () => {
    await requireUser();
    await prisma.section.update({ where: { id }, data: { draftData: data as Prisma.InputJsonValue } });
    return { savedAt: new Date().toISOString() };
  });
}

export async function publishSection(id: string, values: Record<string, unknown>, label?: string) {
  return run(async () => {
    const user = await requireUser();
    const section = await prisma.section.findUniqueOrThrow({ where: { id }, include: { page: true } });
    const def = getSectionDef(section.type);
    if (!def) throw new Error('Unknown block type');
    const data = buildSchema(def.fields).parse(values) as Prisma.InputJsonValue;
    // A newly added block starts hidden; its FIRST publish makes it visible ("hidden until published").
    // Later publishes keep whatever visibility the admin chose.
    const firstPublish = !section.isVisible && (await prisma.revision.count({ where: { entityType: 'section', entityId: id } })) === 0;
    await saveRevision('section', id, section.data, user);
    const newLabel = label?.trim() || section.label;
    await prisma.section.update({ where: { id }, data: { data, draftData: Prisma.DbNull, label: newLabel, ...(firstPublish ? { isVisible: true } : {}) } });
    const changes = diff(section.data, data);
    if (newLabel !== section.label) changes.unshift({ path: '(section name)', from: section.label, to: newLabel });
    if (firstPublish) changes.unshift({ path: 'isVisible', from: false, to: true });
    await logActivity(user, 'publish', 'section', id, `Published ${def.label} on "${section.page.title}"`, { where: await sectionWhere({ ...section, label: newLabel, data }), changes });
    revalidateSite(pathOf(section.page.slug));
  });
}

export async function discardDraft(id: string) {
  return run(async () => {
    await requireUser();
    await prisma.section.update({ where: { id }, data: { draftData: Prisma.DbNull } });
  });
}

export async function toggleSection(id: string, isVisible: boolean) {
  return run(async () => {
    const user = await requireUser();
    const s = await prisma.section.update({ where: { id }, data: { isVisible }, include: { page: true } });
    await logActivity(user, 'update', 'section', id, `${isVisible ? 'Showed' : 'Hid'} ${s.label || getSectionDef(s.type)?.label || s.type} on "${s.page.title}"`, { where: await sectionWhere(s), changes: [{ path: 'isVisible', from: !isVisible, to: isVisible }] });
    revalidateSite(pathOf(s.page.slug));
  });
}

export async function duplicateSection(id: string) {
  return run(async () => {
    const user = await requireUser();
    const s = await prisma.section.findUniqueOrThrow({ where: { id }, include: { page: true } });
    const where = await sectionWhere(s);
    await prisma.section.updateMany({ where: { pageId: s.pageId, order: { gt: s.order } }, data: { order: { increment: 1 } } });
    const copy = await prisma.section.create({ data: { pageId: s.pageId, type: s.type, label: `${s.label || getSectionDef(s.type)?.label || s.type} (copy)`, order: s.order + 1, isVisible: false, data: s.data as Prisma.InputJsonValue } });
    await logActivity(user, 'create', 'section', copy.id, `Duplicated ${s.label || getSectionDef(s.type)?.label || s.type}`, { where, note: `Copy "${copy.label}" placed directly below it (hidden)` });
    return { id: copy.id };
  });
}

export async function deleteSection(id: string) {
  return run(async () => {
    const user = await requireUser();
    const before = await prisma.section.findUniqueOrThrow({ where: { id }, include: { page: true } });
    const where = await sectionWhere(before);
    const s = await prisma.section.delete({ where: { id }, include: { page: true } });
    await logActivity(user, 'delete', 'section', id, `Deleted ${s.label || getSectionDef(s.type)?.label || s.type} from "${s.page.title}"`, { where, snapshot: snapshot({ type: s.type, label: s.label, isVisible: s.isVisible, data: s.data }) });
    revalidateSite(pathOf(s.page.slug));
  });
}

export async function reorderSections(pageId: string, ids: string[]) {
  return run(async () => {
    const user = await requireUser();
    const name = (x: { label: string | null; type: string }) => `${x.label || x.type} [${x.type}]`;
    const prev = await prisma.section.findMany({ where: { pageId }, orderBy: { order: 'asc' }, select: { id: true, label: true, type: true } });
    await prisma.$transaction(ids.map((id, order) => prisma.section.update({ where: { id, pageId }, data: { order } })));
    const page = await prisma.page.findUniqueOrThrow({ where: { id: pageId } });
    const byId = new Map(prev.map((x) => [x.id, x]));
    await logActivity(user, 'reorder', 'page', pageId, `Reordered sections on "${page.title}"`, {
      where: pageWhere(page),
      changes: [{ path: 'section order', from: prev.map(name), to: ids.map((i) => byId.get(i)).filter(Boolean).map((x) => name(x!)) }],
    });
    revalidateSite(pathOf(page.slug));
  });
}

export async function restoreRevision(revisionId: string) {
  return run(async () => {
    const user = await requireUser();
    const rev = await prisma.revision.findUniqueOrThrow({ where: { id: revisionId } });
    let details: Parameters<typeof logActivity>[5];
    if (rev.entityType === 'section') {
      const s = await prisma.section.findUniqueOrThrow({ where: { id: rev.entityId }, include: { page: true } });
      await saveRevision('section', s.id, s.data, user);
      await prisma.section.update({ where: { id: s.id }, data: { data: rev.data as Prisma.InputJsonValue, draftData: Prisma.DbNull } });
      details = { where: await sectionWhere(s), changes: diff(s.data, rev.data) };
      revalidateSite(pathOf(s.page.slug));
    } else if (rev.entityType === 'post') {
      const { tags, ...rest } = rev.data as Record<string, unknown> & { tags?: string[] };
      const current = await prisma.post.findUniqueOrThrow({ where: { id: rev.entityId }, include: { tags: { select: { id: true } } } });
      await saveRevision('post', current.id, { ...current, tags: current.tags.map((t) => t.id) }, user);
      const allowed = ['title', 'slug', 'excerpt', 'content', 'coverImage', 'authorId', 'categoryId', 'status', 'publishedAt', 'readingTime', 'seoTitle', 'seoDescription', 'ogImage', 'canonical', 'noindex'];
      const data: Record<string, unknown> = {};
      for (const k of allowed) if (k in rest) data[k] = rest[k] === null && ['coverImage', 'ogImage'].includes(k) ? Prisma.DbNull : k === 'publishedAt' && rest[k] ? new Date(rest[k] as string) : rest[k];
      await prisma.post.update({ where: { id: current.id }, data: { ...data, tags: { set: (tags || []).map((id) => ({ id })) } } });
      revalidateSite('/blog');
    }
    await logActivity(user, 'restore', rev.entityType, rev.entityId, `Restored a ${rev.entityType} revision from ${rev.createdAt.toISOString().slice(0, 16).replace('T', ' ')}`, details);
  });
}
