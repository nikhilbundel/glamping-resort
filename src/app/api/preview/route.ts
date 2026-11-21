import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Enable draft mode (admins only) and open the requested path. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const path = new URL(req.url).searchParams.get('path') || '/';
  const safe = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  draftMode().enable();
  redirect(safe);
}
