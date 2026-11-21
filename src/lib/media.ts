import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { slugify, uid } from './utils';

export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
export const DOC_MIME = ['application/pdf'];
export const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_MIME = [...IMAGE_MIME, ...DOC_MIME, ...VIDEO_MIME];

export const maxUploadBytes = () => Number(process.env.UPLOAD_MAX_MB || 8) * 1024 * 1024;
export const maxVideoBytes = () => Number(process.env.VIDEO_MAX_MB || 150) * 1024 * 1024;
/** Largest file accepted by the upload route (per-type limits are enforced in storeFile). */
export const maxAnyUploadBytes = () => Math.max(maxUploadBytes(), maxVideoBytes());

/** Local uploads live outside /public so they are served immediately (via /media/...) without a restart. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(process.cwd(), 'storage', 'uploads');

/** Map a stored local URL (/media/... or legacy /uploads/...) to a safe absolute file path, or null. */
export function localPathFromUrl(url: string) {
  const m = url.match(/^\/(media|uploads)\/(.+)$/);
  if (!m) return null;
  const rel = decodeURIComponent(m[2]).split('?')[0];
  const root = m[1] === 'media' ? UPLOAD_DIR : path.join(process.cwd(), 'public', 'uploads');
  const full = path.resolve(root, rel);
  return full.startsWith(root + path.sep) ? full : null;
}

export function cloudinaryEnabled() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Detect real type from magic bytes — never trust the browser-supplied MIME alone. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 6).toString() === 'GIF87a' || buf.subarray(0, 6).toString() === 'GIF89a') return 'image/gif';
  const ftyp = buf.subarray(4, 12).toString('latin1');
  if (ftyp.startsWith('ftypavi') || ftyp.startsWith('ftypavis')) return 'image/avif';
  if (ftyp.startsWith('ftypqt')) return 'video/quicktime';
  if (ftyp.startsWith('ftyp')) return 'video/mp4'; // isom, mp41, mp42, M4V, dash…
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  if (buf.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

export type StoredFile = { url: string; publicId: string | null; width: number; height: number; mime: string; size: number; filename: string };

export async function storeFile(buf: Buffer, originalName: string, folder: string): Promise<StoredFile> {
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_MIME.includes(mime)) throw new Error('Unsupported file type. Allowed: JPG, PNG, WEBP, AVIF, GIF, PDF, MP4, WEBM, MOV.');
  const isVideo = VIDEO_MIME.includes(mime);
  if (isVideo && buf.length > maxVideoBytes()) throw new Error(`Video too large (max ${process.env.VIDEO_MAX_MB || 150} MB). Compress it (e.g. HandBrake, 1080p, ~5 Mbps).`);
  if (!isVideo && buf.length > maxUploadBytes()) throw new Error(`File too large (max ${process.env.UPLOAD_MAX_MB || 8} MB).`);

  const base = slugify(originalName.replace(/\.[^.]+$/, '')).slice(0, 60) || 'file';
  const safeFolder = slugify(folder) || 'general';
  const isImage = IMAGE_MIME.includes(mime);

  if (cloudinaryEnabled()) {
    configureCloudinary();
    const result = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number; bytes: number }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${process.env.CLOUDINARY_FOLDER || 'glamping-resort'}/${safeFolder}`,
            public_id: `${base}-${uid()}`,
            resource_type: isImage ? 'image' : isVideo ? 'video' : 'raw',
          },
          (err, res) => (err || !res ? reject(err || new Error('Upload failed')) : resolve(res as never)),
        )
        .end(buf);
    });
    return { url: result.secure_url, publicId: result.public_id, width: result.width || 0, height: result.height || 0, mime, size: result.bytes, filename: originalName };
  }

  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }[mime]!;
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${base}-${uid()}.${ext}`;
  let width = 0;
  let height = 0;
  if (isImage) {
    const meta = await sharp(buf).metadata();
    width = meta.width || 0;
    height = meta.height || 0;
  }
  await fs.writeFile(path.join(dir, name), buf);
  return { url: `/media/${safeFolder}/${name}`, publicId: null, width, height, mime, size: buf.length, filename: originalName };
}

export async function deleteStoredFile(url: string, publicId: string | null, mime: string) {
  try {
    if (publicId && cloudinaryEnabled()) {
      configureCloudinary();
      await cloudinary.uploader.destroy(publicId, { resource_type: IMAGE_MIME.includes(mime) ? 'image' : VIDEO_MIME.includes(mime) ? 'video' : 'raw' });
    } else {
      const file = localPathFromUrl(url);
      if (file) await fs.unlink(file);
    }
  } catch (e) {
    console.warn('delete file failed', e);
  }
}

/** Crop an image (pixel rect). Returns a new stored file. */
export async function cropStored(media: { url: string; publicId: string | null; filename: string; folder: string }, rect: { x: number; y: number; width: number; height: number }): Promise<StoredFile> {
  const r = { left: Math.max(0, Math.round(rect.x)), top: Math.max(0, Math.round(rect.y)), width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) };
  if (media.publicId && cloudinaryEnabled()) {
    configureCloudinary();
    const url = cloudinary.url(media.publicId, { secure: true, transformation: [{ crop: 'crop', x: r.left, y: r.top, width: r.width, height: r.height }] });
    return { url, publicId: media.publicId, width: r.width, height: r.height, mime: 'image/jpeg', size: 0, filename: `cropped-${media.filename}` };
  }
  const file = localPathFromUrl(media.url);
  if (!file) throw new Error('Only uploaded images can be cropped.');
  const src = await fs.readFile(file);
  const out = await sharp(src).extract(r).toBuffer();
  return storeFile(out, `cropped-${media.filename}`, media.folder);
}
