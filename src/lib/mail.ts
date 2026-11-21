import 'server-only';
import nodemailer from 'nodemailer';

export function mailConfigured() {
  return !!process.env.SMTP_HOST;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string; replyTo?: string }) {
  if (!mailConfigured()) {
    console.info('[mail] SMTP not configured — skipping email:', opts.subject);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, ...opts });
  return true;
}

export function escapeHtml(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
