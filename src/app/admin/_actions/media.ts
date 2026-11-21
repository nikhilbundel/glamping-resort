'use server';

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { cropStored, deleteStoredFile } from '@/lib/media';
import { logActivity, diff } from '@/lib/audit';
import { slugify } from '@/lib/utils';

export async function listMedia(params: { q?: string; folder?: string; type?: 'image' | 'file' | 'video' | 'all'; take?: number; skip?: number }) {
  return run(async () => {
    await requireUser();
    const where: Prisma.MediaWhereInput = {};
    if (params.q) where.OR = [{ alt: { contains: params.q } }, { filename: { contains: params.q } }];
    if (params.folder) where.folder = params.folder;
    if (params.type === 'image') where.mime = { startsWith: 'image/' };
    if (params.type === 'file') where.mime = { startsWith: 'application/' };
    if (params.type === 'video') where.mime = { startsWith: 'video/' };
    const [items, total, folders] = await Promise.all([
      prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, take: params.take ?? 60, skip: params.skip ?? 0 }),
      prisma.media.count({ where }),
      prisma.media.findMany({ distinct: ['folder'], select: { folder: true }, orderBy: { folder: 'asc' } }),
    ]);
    return { items, total, folders: folders.map((f) => f.folder) };
  });
}

const updateSchema = z.object({
  alt: z.string().trim().min(1, 'Alt text is required').max(500),
  folder: z.string().trim().min(1).max(60).transform((f) => slugify(f) || 'general'),
  focalX: z.coerce.number().min(0).max(100),
  focalY: z.coerce.number().min(0).max(100),
});

export async function updateMedia(id: string, values: unknown) {
  return run(async () => {
    const user = await requireUser();
    const d = updateSchema.parse(values);
    const before = await prisma.media.findUnique({ where: { id } });
    const m = await prisma.media.update({ where: { id }, data: d });
    await logActivity(user, 'update', 'media', id, `Updated media "${m.filename}"`, { where: `Media › ${m.url}`, changes: diff(before && { alt: before.alt, folder: before.folder, focalX: before.focalX, focalY: before.focalY }, d) });
    return m;
  });
}

/** Find every place a media URL is referenced (sections, settings, all collection rows). */
async function findUsage(url: string) {
  const needle = url;
  const hits: string[] = [];
  const check = (label: string, value: unknown) => {
    if (value && JSON.stringify(value).includes(needle)) hits.push(label);
  };
  const [sections, settings, menus, pages] = await Promise.all([
    prisma.section.findMany({ include: { page: { select: { title: true } } } }),
    prisma.setting.findMany(),
    prisma.menu.findMany(),
    prisma.page.findMany({ select: { title: true, ogImage: true } }),
  ]);
  sections.forEach((s) => check(`Page "${s.page.title}" → ${s.label || s.type}`, [s.data, s.draftData]));
  settings.forEach((s) => check(`Settings → ${s.key}`, s.value));
  menus.forEach((m) => check(`Menu → ${m.location}`, m.items));
  pages.forEach((p) => check(`Page SEO → ${p.title}`, p.ogImage));
  const collections: [string, Promise<Record<string, unknown>[]>][] = [
    ['Stay', prisma.stay.findMany()], ['Room', prisma.room.findMany()], ['Activity', prisma.activity.findMany()], ['Special arrangement', prisma.specialArrangement.findMany()],
    ['Testimonial', prisma.testimonial.findMany()], ['Media mention', prisma.mediaMention.findMany()], ['Award', prisma.award.findMany()], ['Team', prisma.teamMember.findMany()],
    ['Instagram', prisma.instagramPost.findMany()], ['Post', prisma.post.findMany()], ['Author', prisma.author.findMany()], ['FAQ', prisma.faq.findMany()],
  ];
  for (const [label, p] of collections) {
    for (const row of await p) check(`${label} → ${String(row.title || row.name || row.question || row.caption || row.id).slice(0, 60)}`, row);
  }
  return hits;
}

export async function mediaUsage(id: string) {
  return run(async () => {
    await requireUser();
    const m = await prisma.media.findUniqueOrThrow({ where: { id } });
    return findUsage(m.url);
  });
}

export async function deleteMedia(id: string, force = false) {
  return run(async () => {
    const user = await requireUser();
    const m = await prisma.media.findUniqueOrThrow({ where: { id } });
    const usage = await findUsage(m.url);
    if (usage.length && !force) return { deleted: false, usage };
    if (usage.length && user.role !== 'SUPER_ADMIN') throw new Error('This file is in use. Only a Super Admin can force-delete it.');
    const sameFileElsewhere = m.publicId ? await prisma.media.count({ where: { publicId: m.publicId, id: { not: id } } }) : 0;
    await prisma.media.delete({ where: { id } });
    if (!sameFileElsewhere) await deleteStoredFile(m.url, m.publicId, m.mime);
    await logActivity(user, 'delete', 'media', id, `Deleted media "${m.filename}"${usage.length ? ' (forced)' : ''}`, { where: `Media › ${m.url}`, note: usage.length ? `Was still used in: ${usage.join('; ')}` : undefined });
    return { deleted: true, usage: [] as string[] };
  });
}

export async function cropMedia(id: string, rect: { x: number; y: number; width: number; height: number }) {
  return run(async () => {
    const user = await requireUser();
    const m = await prisma.media.findUniqueOrThrow({ where: { id } });
    if (!m.mime.startsWith('image/')) throw new Error('Only images can be cropped');
    const stored = await cropStored(m, rect);
    const created = await prisma.media.create({ data: { ...stored, mime: stored.mime || m.mime, alt: m.alt, folder: m.folder } });
    await logActivity(user, 'create', 'media', created.id, `Cropped "${m.filename}" into a new image`, { where: `Media › ${created.url}`, note: `Cropped from ${m.url}` });
    return created;
  });
}
