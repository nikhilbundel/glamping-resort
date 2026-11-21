'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { buildSchema } from '@/lib/fields';
import { SETTINGS_DEFS, SEO_FIELDS } from '@/lib/settings-defs';
import { DEFAULT_THEME, normalizeTheme, COLOR_TOKENS, type Theme } from '@/lib/theme';
import { logActivity, diff } from '@/lib/audit';
import { revalidateSite } from '@/lib/revalidate';
import { z } from 'zod';

export async function saveSettings(key: string, values: Record<string, unknown>) {
  return run(async () => {
    const def = key === 'seo' ? { key: 'seo', label: 'SEO defaults', fields: SEO_FIELDS, superAdminOnly: false } : SETTINGS_DEFS.find((d) => d.key === key);
    if (!def) throw new Error('Unknown settings group');
    const user = await requireUser(def.superAdminOnly ? 'SUPER_ADMIN' : undefined);
    const data = buildSchema(def.fields).parse(values) as Prisma.InputJsonValue;
    const before = await prisma.setting.findUnique({ where: { key } });
    await prisma.setting.upsert({ where: { key }, update: { value: data }, create: { key, value: data } });
    await logActivity(user, 'update', 'settings', key, `Updated ${def.label} settings`, { where: `Settings › ${def.label}`, changes: diff(before?.value ?? {}, data) });
    revalidateSite();
  });
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color');
const themeSchema = z.object({
  colors: z.object(Object.fromEntries(COLOR_TOKENS.map((t) => [t, hex])) as Record<(typeof COLOR_TOKENS)[number], typeof hex>),
  headingFont: z.string().min(1).max(60).regex(/^[\w\s]+$/),
  bodyFont: z.string().min(1).max(60).regex(/^[\w\s]+$/),
  buttonRadius: z.coerce.number().min(0).max(999),
  cardRadius: z.coerce.number().min(0).max(40),
  sectionSpacing: z.enum(['compact', 'normal', 'airy']),
  buttonStyle: z.enum(['solid', 'outline']).optional().default('solid'),
  textSizes: z.object({ eyebrow: z.coerce.number().min(30).max(400), heading: z.coerce.number().min(30).max(300), title: z.coerce.number().min(50).max(250), body: z.coerce.number().min(50).max(250) }).optional(),
});

export async function saveTheme(theme: Theme) {
  return run(async () => {
    const user = await requireUser('SUPER_ADMIN');
    const data = themeSchema.parse(theme) as unknown as Prisma.InputJsonValue;
    const before = await prisma.setting.findUnique({ where: { key: 'theme' } });
    await prisma.setting.upsert({ where: { key: 'theme' }, update: { value: data }, create: { key: 'theme', value: data } });
    await logActivity(user, 'update', 'theme', null, 'Updated theme', { where: 'Theme', changes: diff(normalizeTheme(before?.value), normalizeTheme(data)) });
    revalidateSite();
    return normalizeTheme(data);
  });
}

export async function resetTheme() {
  return run(async () => {
    const user = await requireUser('SUPER_ADMIN');
    const value = DEFAULT_THEME as unknown as Prisma.InputJsonValue;
    const before = await prisma.setting.findUnique({ where: { key: 'theme' } });
    await prisma.setting.upsert({ where: { key: 'theme' }, update: { value }, create: { key: 'theme', value } });
    await logActivity(user, 'update', 'theme', null, 'Reset theme to defaults', { where: 'Theme', changes: diff(normalizeTheme(before?.value), DEFAULT_THEME) });
    revalidateSite();
    return DEFAULT_THEME;
  });
}
