'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { buildSchema } from '@/lib/fields';
import { getCollection, includeFor, toDb } from '@/lib/collections-server';
import { logActivity, saveRevision, diff, snapshot } from '@/lib/audit';

/** Comparable copy of a record: relations reduced to ids / names. */
const plain = (r: Record<string, unknown> | null) => {
  if (!r) return r;
  const o: Record<string, unknown> = { ...r };
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v) && v.every((x) => x && typeof x === 'object' && 'id' in x)) o[k] = (v as { id: string; name?: string; title?: string }[]).map((x) => x.name || x.title || x.id);
    else if (v && typeof v === 'object' && !Array.isArray(v) && 'id' in v && ('name' in v || 'title' in v)) o[k] = (v as { name?: string; title?: string }).name || (v as { title?: string }).title;
  }
  return o;
};
import { revalidateSite } from '@/lib/revalidate';

export async function saveRecord(key: string, id: string | null, values: Record<string, unknown>) {
  return run(async () => {
    const user = await requireUser();
    const { def, model } = getCollection(key);
    const parsed = buildSchema(def.fields).parse(values);
    const data = toDb(def, parsed, !id);
    const title = String(parsed[def.titleField] || def.singular).slice(0, 80);
    let rec;
    if (id) {
      const before = await model.findUnique({ where: { id }, include: includeFor(key) });
      if (def.revisions && before) await saveRevision(key === 'posts' ? 'post' : key, id, { ...before, tags: Array.isArray(before.tags) ? (before.tags as { id: string }[]).map((t) => t.id) : undefined }, user);
      rec = await model.update({ where: { id }, data });
      const after = await model.findUnique({ where: { id }, include: includeFor(key) });
      await logActivity(user, 'update', key, id, `Updated ${def.singular.toLowerCase()} "${title}"`, { where: `${def.label} › ${title}`, changes: diff(plain(before), plain(after)) });
    } else {
      if (def.orderable) {
        const agg = await model.aggregate({ _max: { order: true } });
        data.order = (agg._max.order ?? -1) + 1;
      }
      rec = await model.create({ data });
      const after = await model.findUnique({ where: { id: rec.id }, include: includeFor(key) });
      await logActivity(user, 'create', key, String(rec.id), `Created ${def.singular.toLowerCase()} "${title}"`, { where: `${def.label} › ${title}`, snapshot: snapshot(plain(after)) });
    }
    revalidateSite();
    return { id: String(rec.id) };
  });
}

export async function deleteRecord(key: string, id: string) {
  return run(async () => {
    const user = await requireUser();
    const { def, model } = getCollection(key);
    const before = await model.findUnique({ where: { id }, include: includeFor(key) });
    const rec = await model.delete({ where: { id } });
    const t = String(rec[def.titleField] || id).slice(0, 80);
    await logActivity(user, 'delete', key, id, `Deleted ${def.singular.toLowerCase()} "${t}"`, { where: `${def.label} › ${t}`, snapshot: snapshot(plain(before)) });
    revalidateSite();
  });
}

export async function togglePublish(key: string, id: string, value: boolean) {
  return run(async () => {
    const user = await requireUser();
    const { def, model } = getCollection(key);
    if (!def.publishField) throw new Error('This collection has no publish toggle');
    const data = def.publishField === 'status' ? { status: value ? 'PUBLISHED' : 'DRAFT', ...(value ? { publishedAt: new Date() } : {}) } : { published: value };
    if (def.publishField === 'status' && value) {
      const cur = await model.findUnique({ where: { id } });
      if (cur?.publishedAt) delete (data as Record<string, unknown>).publishedAt;
    }
    const rec = await model.update({ where: { id }, data });
    const t = String(rec[def.titleField] || id).slice(0, 80);
    await logActivity(user, value ? 'publish' : 'unpublish', key, id, `${value ? 'Published' : 'Unpublished'} "${t}"`, { where: `${def.label} › ${t}`, changes: [{ path: def.publishField, from: def.publishField === 'status' ? (value ? 'DRAFT' : 'PUBLISHED') : !value, to: def.publishField === 'status' ? (value ? 'PUBLISHED' : 'DRAFT') : value }] });
    revalidateSite();
  });
}

export async function reorderRecords(key: string, ids: string[]) {
  return run(async () => {
    const user = await requireUser();
    const { def, model } = getCollection(key);
    if (!def.orderable) throw new Error('Not sortable');
    await prisma.$transaction(ids.map((id, order) => model.update({ where: { id }, data: { order } }) as never));
    const rows = (await model.findMany({ where: { id: { in: ids } } })) as Record<string, unknown>[];
    const byId = new Map(rows.map((r) => [String(r.id), String(r[def.titleField] || r.id)]));
    await logActivity(user, 'reorder', key, null, `Reordered ${def.label.toLowerCase()}`, { where: def.label, order: ids.map((i) => byId.get(i) || i) });
    revalidateSite();
  });
}
