import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { toCsv } from '@/lib/utils';
import type { EnquiryStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { type: string } }) {
  try {
    await requireUser();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  let csv = '';
  if (params.type === 'enquiries') {
    const where: Prisma.EnquiryWhereInput = {};
    const status = sp.get('status');
    if (status) where.status = status as EnquiryStatus;
    const rows = await prisma.enquiry.findMany({ where, orderBy: { createdAt: 'desc' } });
    csv = toCsv(
      ['Created', 'Name', 'Email', 'Phone', 'Check-in', 'Check-out', 'Guests', 'Stay type', 'Message', 'Status', 'Notes', 'Page'],
      rows.map((r) => [r.createdAt, r.name, r.email, r.phone, r.checkIn?.toISOString().slice(0, 10), r.checkOut?.toISOString().slice(0, 10), r.guests, r.stayType, r.message, r.status, r.notes, r.sourceUrl]),
    );
  } else if (params.type === 'subscribers') {
    const rows = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
    csv = toCsv(['Email', 'Source', 'Subscribed'], rows.map((r) => [r.email, r.source, r.createdAt]));
  } else {
    return new Response('Not found', { status: 404 });
  }
  return new Response('﻿' + csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${params.type}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
