import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { UPLOAD_DIR } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

async function resolveFile(parts: string[]) {
  let decoded: string[];
  try {
    decoded = parts.map((p) => decodeURIComponent(p));
  } catch {
    return null; // malformed %-encoding → 404, not a server error
  }
  if (decoded.some((p) => p.includes('\0'))) return null;
  const full = path.resolve(UPLOAD_DIR, ...decoded);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null; // no path traversal
  const type = TYPES[path.extname(full).toLowerCase()];
  if (!type) return null;
  try {
    const stat = await fs.stat(full);
    return stat.isFile() ? { full, stat, type } : null;
  } catch {
    return null;
  }
}

/**
 * Serves locally stored uploads (when Cloudinary isn't configured).
 * Supports HTTP Range requests so videos stream, seek and play on iOS Safari.
 */
async function serve(req: Request, { params }: { params: { path: string[] } }, head = false) {
  const f = await resolveFile(params.path);
  if (!f) return new Response('Not found', { status: 404 });
  const size = f.stat.size;
  const etag = `"${size.toString(16)}-${f.stat.mtimeMs.toString(16)}"`;
  const base: Record<string, string> = {
    'Content-Type': f.type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
    'Last-Modified': f.stat.mtime.toUTCString(),
    'X-Content-Type-Options': 'nosniff',
  };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: base });

  const range = req.headers.get('range');
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let start = m && m[1] ? Number(m[1]) : NaN;
    let end = m && m[2] ? Number(m[2]) : NaN;
    if (Number.isNaN(start)) {
      start = Math.max(0, size - (Number.isNaN(end) ? 0 : end));
      end = size - 1;
    } else if (Number.isNaN(end) || end >= size) end = size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${size}` } });
    const headers = { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) };
    if (head) return new Response(null, { status: 206, headers });
    const stream = Readable.toWeb(createReadStream(f.full, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }
  const headers = { ...base, 'Content-Length': String(size) };
  if (head) return new Response(null, { status: 200, headers });
  return new Response(Readable.toWeb(createReadStream(f.full)) as ReadableStream, { status: 200, headers });
}

export function GET(req: Request, ctx: { params: { path: string[] } }) {
  return serve(req, ctx);
}
export function HEAD(req: Request, ctx: { params: { path: string[] } }) {
  return serve(req, ctx, true);
}
