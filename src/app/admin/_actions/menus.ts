'use server';

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { logActivity } from '@/lib/audit';

/** Menu as readable lines: "- Label → /link (hidden)" with indentation for sub-items. */
const menuLines = (items: unknown, depth = 0): string[] =>
  (Array.isArray(items) ? (items as MenuNode[]) : []).flatMap((n) => [`${'  '.repeat(depth)}- ${n.label} → ${n.href}${n.hidden ? ' (hidden)' : ''}${n.newTab ? ' (new tab)' : ''}`, ...menuLines(n.children, depth + 1)]);
import { revalidateSite } from '@/lib/revalidate';
import type { MenuNode } from '@/lib/types';

const node: z.ZodType<MenuNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().trim().min(1, 'Every item needs a label').max(80),
    href: z.string().trim().min(1, 'Every item needs a link').max(1000).refine((v) => /^(https?:\/\/|\/|#|mailto:|tel:)/.test(v), 'Links must start with /, #, https://, mailto: or tel:'),
    newTab: z.boolean().optional(),
    hidden: z.boolean().optional(),
    children: z.array(node).optional(),
  }),
);

export async function saveMenu(location: string, items: MenuNode[]) {
  return run(async () => {
    const user = await requireUser();
    const parsed = z.array(node).parse(items);
    const value = parsed as unknown as Prisma.InputJsonValue;
    const before = await prisma.menu.findUnique({ where: { location } });
    await prisma.menu.upsert({ where: { location }, update: { items: value }, create: { location, name: location, items: value } });
    await logActivity(user, 'update', 'menu', location, `Updated ${location} menu`, { where: `Menu Builder › ${location} menu`, changes: [{ path: 'menu', from: menuLines(before?.items).join('\n'), to: menuLines(parsed).join('\n') }] });
    revalidateSite();
  });
}
