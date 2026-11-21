import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Wrap a server action body so errors become a serialisable result for toasts. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ') };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: false, error: `That ${(e.meta?.target as string[] | undefined)?.join(', ') || 'value'} is already in use.` };
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    console.error(e);
    return { ok: false, error: (e as Error).message || 'Something went wrong' };
  }
}
