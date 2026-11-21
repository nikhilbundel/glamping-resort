'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';

/** Remember "everything up to now has been sent to Claude", so next time only newer changes are shown. */
export async function markChangesSent() {
  return run(async () => {
    await requireUser();
    const value = { sentAt: new Date().toISOString() };
    await prisma.setting.upsert({ where: { key: 'changelog' }, update: { value }, create: { key: 'changelog', value } });
    return value;
  });
}
