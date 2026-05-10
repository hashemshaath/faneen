/**
 * Image validation helpers — Phase 5 hardening.
 *
 * Provides:
 *  - ALLOWED_PUBLIC_IMAGE_MIMES: canonical allow-list for user-facing image uploads.
 *  - sniffImageMime: reads first bytes to detect actual image type (magic bytes).
 *  - validateImageFile: enforces allow-list + magic-byte match.
 *  - getImageRejectionMessage: unified bilingual rejection messages.
 *
 * EXIF stripping is achieved by re-encoding through canvas in `compressImage`.
 * This module never logs file names, contents, or EXIF data.
 */

export const ALLOWED_PUBLIC_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMime = (typeof ALLOWED_PUBLIC_IMAGE_MIMES)[number];

export type ImageRejectionReason = 'unsupported_type' | 'too_large' | 'processing_failed';

export function getImageRejectionMessage(
  reason: ImageRejectionReason,
  isRTL: boolean,
): string {
  if (reason === 'unsupported_type') {
    return isRTL
      ? 'صيغة الصورة غير مدعومة. يرجى رفع JPG أو PNG أو WebP.'
      : 'Unsupported image format. Please upload JPG, PNG, or WebP.';
  }
  if (reason === 'too_large') {
    return isRTL
      ? 'حجم الصورة كبير جدًا. يرجى رفع صورة أصغر.'
      : 'Image is too large. Please upload a smaller image.';
  }
  return isRTL
    ? 'تعذر معالجة الصورة. حاول بصورة أخرى.'
    : 'Could not process the image. Please try another file.';
}

/** Read the first 12 bytes of a file and return a normalized MIME, or null. */
export async function sniffImageMime(file: File): Promise<string | null> {
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (buf.length < 4) return null;

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) return 'image/png';

    // WebP: "RIFF" .... "WEBP"
    if (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) return 'image/webp';

    // GIF: "GIF8"
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';

    // SVG / XML — text starts
    if (buf[0] === 0x3c) return 'image/svg+xml';

    return null;
  } catch {
    return null;
  }
}

export interface ValidateImageOptions {
  /** MIME allow-list. Defaults to JPG/PNG/WebP. */
  allowed?: readonly string[];
  /** Max size in bytes. */
  maxBytes?: number;
}

export interface ValidateImageResult {
  ok: boolean;
  reason?: ImageRejectionReason;
}

/**
 * Verify both the declared MIME and the magic bytes match an allow-listed image type.
 * Rejects mismatches and SVG by default.
 */
export async function validateImageFile(
  file: File,
  opts: ValidateImageOptions = {},
): Promise<ValidateImageResult> {
  const allowed = opts.allowed ?? ALLOWED_PUBLIC_IMAGE_MIMES;
  const maxBytes = opts.maxBytes;

  if (maxBytes && file.size > maxBytes) {
    return { ok: false, reason: 'too_large' };
  }

  if (!file.type || !allowed.includes(file.type)) {
    return { ok: false, reason: 'unsupported_type' };
  }

  const sniffed = await sniffImageMime(file);
  if (!sniffed || !allowed.includes(sniffed) || sniffed !== file.type) {
    return { ok: false, reason: 'unsupported_type' };
  }

  return { ok: true };
}