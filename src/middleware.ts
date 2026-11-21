import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { getToken } from 'next-auth/jwt';

type Meta = { redirects: Record<string, { id: string; to: string; type: number }>; maintenance: boolean };
let cache: { at: number; meta: Meta } | null = null;
const TTL = 30_000;

async function getMeta(req: NextRequest): Promise<Meta | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.meta;
  try {
    const res = await fetch(new URL('/api/site-meta', req.nextUrl.origin), { headers: { 'x-mw': '1' }, cache: 'no-store' });
    if (!res.ok) return cache?.meta ?? null;
    const meta = (await res.json()) as Meta;
    cache = { at: Date.now(), meta };
    return meta;
  } catch {
    return cache?.meta ?? null;
  }
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // ── Admin protection ──
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL('/admin/login', req.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Public site: redirects + maintenance ──
  const meta = await getMeta(req);
  if (meta) {
    const key = pathname.replace(/\/+$/, '') || '/';
    const r = meta.redirects[key] || meta.redirects[pathname];
    if (r) {
      event.waitUntil(fetch(new URL(`/api/site-meta?hit=${r.id}`, req.nextUrl.origin), { method: 'POST', headers: { 'x-mw': '1' } }).catch(() => undefined));
      const target = /^https?:\/\//.test(r.to) ? r.to : new URL(r.to, req.url);
      return NextResponse.redirect(target, r.type === 302 ? 302 : 301);
    }
    if (meta.maintenance && pathname !== '/maintenance') {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) return NextResponse.rewrite(new URL('/maintenance', req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|uploads|media|favicon.ico|robots.txt|sitemap.xml|placeholder.svg|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|pdf|mp4|webm|mov|txt|xml|js|css|woff2?)$).*)'],
};
