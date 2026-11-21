import 'server-only';
import { revalidatePath } from 'next/cache';

/** Content is shared across many pages (menus, footer, collections in blocks), so revalidate the whole site layout. */
export function revalidateSite(...paths: string[]) {
  revalidatePath('/', 'layout');
  for (const p of paths) revalidatePath(p);
}
