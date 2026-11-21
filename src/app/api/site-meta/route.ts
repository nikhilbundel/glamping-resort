import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [redirects, maintenance] = await Promise.all([
    prisma.redirect.findMany({ where: { active: true } }),
    prisma.setting.findUnique({ where: { key: 'maintenance' } }),
  ]);
  const map: Record<string, { id: string; to: string; type: number }> = {};
  for (const r of redirects) map[r.from.replace(/\/+$/, '') || '/'] = { id: r.id, to: r.to, type: r.type };
  return NextResponse.json({ redirects: map, maintenance: !!(maintenance?.value as { enabled?: boolean } | null)?.enabled });
}

export async function POST(req: Request) {
  const id = new URL(req.url).searchParams.get('hit');
  if (id && req.headers.get('x-mw') === '1') {
    await prisma.redirect.update({ where: { id }, data: { hits: { increment: 1 } } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
