/**
 * Browser-side image compression and validation utilities.
 *
 * - validateImage(file): MIME + size guard with friendly Arabic messages.
 * - compressImage(file): single compressed WebP (≤1MB, ≤1920px, q=0.8).
 * - generateImageSizes(file): responsive set (thumbnail/medium/large).
 *
 * Uses browser-image-compression (Web Worker) so the UI never freezes.
 * HEIC (iPhone) inputs are transparently converted to JPEG via heic2any.
 */
import imageCompression from 'browser-image-compression';

export type ValidateImageResult =
  | { ok: true }
  | { ok: false; message: string };

const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const ACCEPTED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(0, i) : name;
}

/** Validate before compression. Arabic, friendly messages. */
export function validateImage(file: File): ValidateImageResult {
  const ext = getExt(file.name);
  const mime = (file.type || '').toLowerCase();
  const isImage =
    mime.startsWith('image/') || ACCEPTED_EXT.includes(ext);
  if (!isImage) {
    return { ok: false, message: 'الملف يجب أن يكون صورة' };
  }
  const mimeOk = mime === '' ? true : ACCEPTED_MIME.includes(mime);
  const extOk = ext === '' ? true : ACCEPTED_EXT.includes(ext);
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      message: 'صيغة غير مدعومة — استخدم JPG أو PNG أو WebP أو HEIC',
    };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      message: 'حجم الصورة كبير، الحد الأقصى 15 ميجابايت',
    };
  }
  return { ok: true };
}

/** Convert HEIC/HEIF to JPEG. Returns original file for other formats. */
async function ensureCompressible(file: File): Promise<File> {
  const ext = getExt(file.name);
  const mime = (file.type || '').toLowerCase();
  const isHeic =
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    ext === 'heic' ||
    ext === 'heif';
  if (!isHeic) return file;
  const { default: heic2any } = await import('heic2any');
  const blob = (await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  })) as Blob;
  return new File([blob], `${stripExt(file.name)}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  /** Override output base name (no extension). */
  baseName?: string;
  /** Suffix to append to base name, e.g. "-thumb". */
  suffix?: string;
}

/**
 * Compress an image in-browser to WebP using a Web Worker.
 * Defaults: ≤1MB, max dimension 1920px, quality 0.8.
 * On failure, logs a warning and returns the original file.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  try {
    const validation = validateImage(file);
    if (!validation.ok) {
      // eslint-disable-next-line no-console
      console.warn('[imageCompression] validation failed:', validation.message);
      return file;
    }
    const source = await ensureCompressible(file);
    const {
      maxSizeMB = 1,
      maxWidthOrHeight = 1920,
      quality = 0.8,
      baseName,
      suffix = '',
    } = options;

    const compressedBlob = await imageCompression(source, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: quality,
    });

    const finalBase = baseName ?? stripExt(source.name);
    const outName = `${finalBase}${suffix}.webp`;
    return new File([compressedBlob], outName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[imageCompression] failed, returning original file', err);
    return file;
  }
}

export interface ResponsiveImageSet {
  thumbnail: File;
  medium: File;
  large: File;
}

/**
 * Generate 3 responsive WebP renditions from a single input.
 * Aspect ratio is preserved (browser-image-compression scales by the
 * larger dimension, never distorts).
 */
export async function generateImageSizes(
  file: File,
): Promise<ResponsiveImageSet> {
  const validation = validateImage(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  const base = stripExt(file.name);
  const [thumbnail, medium, large] = await Promise.all([
    compressImage(file, {
      maxWidthOrHeight: 400,
      quality: 0.7,
      maxSizeMB: 0.15,
      baseName: base,
      suffix: '-thumb',
    }),
    compressImage(file, {
      maxWidthOrHeight: 1080,
      quality: 0.8,
      maxSizeMB: 0.6,
      baseName: base,
      suffix: '-medium',
    }),
    compressImage(file, {
      maxWidthOrHeight: 1920,
      quality: 0.82,
      maxSizeMB: 1,
      baseName: base,
      suffix: '-large',
    }),
  ]);
  return { thumbnail, medium, large };
}