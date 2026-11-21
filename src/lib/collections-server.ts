import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { COLLECTION_MAP, type CollectionDef } from './collections';
import type { Field } from './fields';
import { readingTime, slugify } from './utils';

export const MODEL: Record<string, string> = {
  stays: 'stay',
  rooms: 'room',
  amenities: 'amenity',
  activities: 'activity',
  specialArrangements: 'specialArrangement',
  spaTreatments: 'spaTreatment',
  menuCategories: 'menuCategory',
  menuItems: 'menuItem',
  cafeTimings: 'cafeTiming',
  testimonials: 'testimonial',
  mediaMentions: 'mediaMention',
  awards: 'award',
  stats: 'stat',
  faqCategories: 'faqCategory',
  faqs: 'faq',
  team: 'teamMember',
  instagramPosts: 'instagramPost',
  posts: 'post',
  blogCategories: 'blogCategory',
  tags: 'tag',
  authors: 'author',
};

/** Fields that are Prisma relations (many-to-many) rather than JSON. */
const M2M: Record<string, string[]> = { posts: ['tags'] };

type Delegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
  aggregate: (args: unknown) => Promise<{ _max: { order: number | null } }>;
};

export function getCollection(key: string): { def: CollectionDef; model: Delegate } {
  const def = COLLECTION_MAP[key];
  const name = MODEL[key];
  if (!def || !name) throw new Error(`Unknown collection: ${key}`);
  return { def, model: (prisma as unknown as Record<string, Delegate>)[name] };
}

function jsonValue(v: unknown) {
  return v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);
}

function toDbField(def: CollectionDef, f: Field, v: unknown, isCreate: boolean) {
  if (M2M[def.key]?.includes(f.name)) {
    const ids = (Array.isArray(v) ? v : []).map((id) => ({ id: String(id) }));
    return isCreate ? { connect: ids } : { set: ids };
  }
  switch (f.type) {
    case 'date':
    case 'datetime':
      return v ? new Date(String(v)) : null;
    case 'select':
      return v === '' || v === undefined ? null : v;
    case 'number':
      if (v === undefined || v === '' || v === null) return f.nullable ? null : undefined;
      return Number(v);
    case 'image':
    case 'images':
    case 'list':
    case 'tags':
    case 'multiselect':
    case 'ctas':
    case 'cta':
    case 'group':
      return jsonValue(v);
    default:
      return v ?? null;
  }
}

/** Convert validated form data into a Prisma data object. */
export function toDb(def: CollectionDef, data: Record<string, unknown>, isCreate: boolean) {
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (!(f.name in data)) continue;
    const v = toDbField(def, f, data[f.name], isCreate);
    if (v !== undefined) out[f.name] = v;
  }
  if (def.slugFrom && typeof out.slug === 'string') out.slug = slugify(out.slug) || slugify(String(data[def.slugFrom] || ''));
  if (def.slugFrom && !out.slug && data[def.slugFrom]) out.slug = slugify(String(data[def.slugFrom]));

  // collection-specific hooks
  if (def.key === 'posts') {
    out.readingTime = readingTime(String(data.content || ''));
    if (out.status === 'PUBLISHED' && !out.publishedAt) out.publishedAt = new Date();
    if (!out.status) out.status = 'DRAFT';
  }
  if (def.key === 'stays' && !out.pageSlug && out.slug) out.pageSlug = `stays/${out.slug}`;
  return out;
}

function toInputDate(d: unknown, withTime: boolean) {
  if (!d) return '';
  const date = new Date(d as string);
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return withTime ? iso.slice(0, 16) : iso.slice(0, 10);
}

/** Convert a Prisma row into form values. */
export function fromDb(def: CollectionDef, row: Record<string, unknown>) {
  const out: Record<string, unknown> = { id: row.id };
  for (const f of def.fields) {
    if (f.type === 'heading') continue;
    const v = row[f.name];
    if (M2M[def.key]?.includes(f.name)) out[f.name] = Array.isArray(v) ? v.map((x: { id: string }) => x.id) : [];
    else if (f.type === 'datetime') out[f.name] = toInputDate(v, true);
    else if (f.type === 'date') out[f.name] = toInputDate(v, false);
    else if (['images', 'list', 'tags', 'multiselect', 'ctas'].includes(f.type)) out[f.name] = Array.isArray(v) ? v : [];
    else if (f.type === 'boolean') out[f.name] = !!v;
    else if (f.type === 'number') out[f.name] = v ?? '';
    else out[f.name] = v ?? (f.type === 'image' || f.type === 'cta' ? null : '');
  }
  return out;
}

export function includeFor(key: string) {
  return M2M[key] ? Object.fromEntries(M2M[key].map((n) => [n, { select: { id: true } }])) : undefined;
}
