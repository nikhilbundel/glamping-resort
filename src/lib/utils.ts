export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function slugify(input: string) {
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function readingTime(html: string) {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-GB', opts).format(date);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function hexToRgbTriplet(hex: string) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return '0 0 0';
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function isExternal(href?: string | null) {
  return !!href && /^(https?:)?\/\//.test(href);
}

export function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function siteUrl(path = '') {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\r\n');
}
