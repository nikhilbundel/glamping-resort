'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { run } from '@/lib/action';
import { logActivity } from '@/lib/audit';
import { escapeHtml, sendMail } from '@/lib/mail';
import { siteUrl } from '@/lib/utils';

// ── Enquiries ──
export async function updateEnquiry(id: string, values: { status?: string; notes?: string }) {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ status: z.enum(['NEW', 'CONTACTED', 'BOOKED', 'CLOSED']).optional(), notes: z.string().max(5000).optional() }).parse(values);
    const e = await prisma.enquiry.update({ where: { id }, data: d });
    await logActivity(user, 'update', 'enquiry', id, `Updated enquiry from ${e.name}${d.status ? ` → ${d.status}` : ''}`);
  });
}

export async function deleteEnquiry(id: string) {
  return run(async () => {
    const user = await requireUser();
    const e = await prisma.enquiry.delete({ where: { id } });
    await logActivity(user, 'delete', 'enquiry', id, `Deleted enquiry from ${e.name}`);
  });
}

// ── Subscribers ──
export async function deleteSubscriber(id: string) {
  return run(async () => {
    const user = await requireUser();
    const s = await prisma.subscriber.delete({ where: { id } });
    await logActivity(user, 'delete', 'subscriber', id, `Removed subscriber ${s.email}`);
  });
}

// ── Redirects ──
const redirectSchema = z.object({
  from: z.string().trim().min(2).max(190).refine((v) => v.startsWith('/') && !v.startsWith('/admin') && !v.startsWith('/api'), 'From must be a path like /old-page (not /admin or /api)').transform((v) => v.replace(/\/+$/, '') || '/'),
  to: z.string().trim().min(1).max(1000).refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'To must be a path or full URL'),
  type: z.coerce.number().refine((v) => v === 301 || v === 302, 'Type must be 301 or 302'),
  active: z.boolean().default(true),
});

export async function saveRedirect(id: string | null, values: unknown) {
  return run(async () => {
    const user = await requireUser();
    const d = redirectSchema.parse(values);
    if (d.from === d.to) throw new Error('From and To cannot be the same');
    const r = id ? await prisma.redirect.update({ where: { id }, data: d }) : await prisma.redirect.create({ data: d });
    await logActivity(user, id ? 'update' : 'create', 'redirect', r.id, `${d.type} ${d.from} → ${d.to}`);
  });
}

export async function deleteRedirect(id: string) {
  return run(async () => {
    const user = await requireUser();
    const r = await prisma.redirect.delete({ where: { id } });
    await logActivity(user, 'delete', 'redirect', id, `Deleted redirect ${r.from}`);
  });
}

// ── Users ──
const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['SUPER_ADMIN', 'EDITOR']),
  active: z.boolean().default(true),
});

function tempPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

export async function inviteUser(values: unknown) {
  return run(async () => {
    const actor = await requireUser('SUPER_ADMIN');
    const d = userSchema.parse(values);
    const password = tempPassword();
    const u = await prisma.user.create({ data: { ...d, passwordHash: await bcrypt.hash(password, 12) } });
    let emailed = false;
    try {
      emailed = await sendMail({
        to: u.email,
        subject: 'You have been invited to the website admin',
        html: `<p>Hi ${escapeHtml(u.name)},</p><p>${escapeHtml(actor.name)} invited you to manage the website.</p><p>Sign in at <a href="${siteUrl('/admin/login')}">${siteUrl('/admin/login')}</a> with<br>Email: <b>${escapeHtml(u.email)}</b><br>Temporary password: <b>${password}</b></p><p>Please change your password after signing in (Users → My account).</p>`,
      });
    } catch (e) {
      console.error(e);
    }
    await logActivity(actor, 'create', 'user', u.id, `Invited ${u.email} as ${u.role}`);
    return { password, emailed };
  });
}

export async function updateUser(id: string, values: unknown) {
  return run(async () => {
    const actor = await requireUser('SUPER_ADMIN');
    const d = userSchema.parse(values);
    if (id === actor.id && (d.role !== 'SUPER_ADMIN' || !d.active)) throw new Error('You cannot demote or deactivate yourself');
    const before = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (before.role === 'SUPER_ADMIN' && (d.role !== 'SUPER_ADMIN' || !d.active)) {
      const others = await prisma.user.count({ where: { role: 'SUPER_ADMIN', active: true, id: { not: id } } });
      if (!others) throw new Error('At least one active Super Admin must remain');
    }
    // a changed email, role or deactivation signs that user out of every open session
    const signOut = before.email !== d.email || before.role !== d.role || !d.active;
    await prisma.user.update({ where: { id }, data: { ...d, ...(signOut ? { sessionVersion: { increment: 1 } } : {}) } });
    await logActivity(actor, 'update', 'user', id, `Updated user ${d.email}`);
  });
}

export async function resetUserPassword(id: string) {
  return run(async () => {
    const actor = await requireUser('SUPER_ADMIN');
    const password = tempPassword();
    const u = await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } } });
    await logActivity(actor, 'update', 'user', id, `Reset password for ${u.email} (signed out of all sessions)`);
    return { password };
  });
}

export async function deleteUser(id: string) {
  return run(async () => {
    const actor = await requireUser('SUPER_ADMIN');
    if (id === actor.id) throw new Error('You cannot delete yourself');
    const supers = await prisma.user.count({ where: { role: 'SUPER_ADMIN', active: true, id: { not: id } } });
    const target = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (target.role === 'SUPER_ADMIN' && supers === 0) throw new Error('At least one Super Admin must remain');
    await prisma.user.delete({ where: { id } });
    await logActivity(actor, 'delete', 'user', id, `Deleted user ${target.email}`);
  });
}

export async function changeOwnPassword(values: unknown) {
  return run(async () => {
    const actor = await requireUser();
    const d = z
      .object({ current: z.string().min(1), next: z.string().min(10, 'Use at least 10 characters'), confirm: z.string() })
      .refine((v) => v.next === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })
      .parse(values);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await bcrypt.compare(d.current, u.passwordHash))) throw new Error('Current password is incorrect');
    // signs this account out everywhere (including here) — sign in again with the new password
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(d.next, 12), sessionVersion: { increment: 1 } } });
    await logActivity(actor, 'update', 'user', u.id, 'Changed own password (signed out of all sessions)');
  });
}
