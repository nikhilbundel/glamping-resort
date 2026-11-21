import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { newsletterSchema } from '@/lib/forms';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(`newsletter:${clientIp(req.headers)}`, 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ message: 'Too many requests. Please try later.' }, { status: 429 });
  const parsed = newsletterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Invalid email' }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true, message: 'Thank you for subscribing!' });
  const email = parsed.data.email.toLowerCase();
  await prisma.subscriber.upsert({ where: { email }, update: {}, create: { email, source: parsed.data.source } });
  return NextResponse.json({ ok: true, message: 'Thank you for subscribing!' });
}
