import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/image-compress';

export interface UploadPublicImageParams {
  bucket: string;
  path: string;
  file: File | Blob;
  options?: {
    cacheControl?: string;
    upsert?: boolean;
    contentType?: string;
  };
  /**
   * Skip the built-in WebP compression pass. Set to `true` when the caller
   * has already produced an optimized rendition (e.g. `generateImageSizes`
   * or a pre-compressed asset). Defaults to `false`.
   */
  skipCompression?: boolean;
}

/**
 * Upload an image to a public Storage bucket with **automatic WebP
 * compression** for raw uploads.
 *
 * Behavior:
 * - If `file` is a `File` with an `image/*` MIME (excluding `image/svg+xml`
 *   and `image/gif`) and NOT already `image/webp`, it is re-encoded to
 *   WebP (max 1600px, q=0.82) before upload. EXIF/metadata is stripped.
 * - SVG, GIF, already-WebP files, and non-`File` blobs are uploaded as-is.
 * - The upload path's extension is rewritten to `.webp` when compression
 *   produced a WebP output, so the stored object matches its content-type.
 * - Pass `skipCompression: true` to bypass (e.g. when the caller already
 *   produced responsive renditions).
 *
 * Returns the raw Supabase storage envelope plus the **effective path**
 * that was actually uploaded (callers should persist this path).
 */
export async function uploadPublicImage({
  bucket,
  path,
  file,
  options,
  skipCompression,
}: UploadPublicImageParams) {
  let finalFile: File | Blob = file;
  let finalPath = path;
  let finalContentType = options?.contentType;

  if (
    !skipCompression &&
    file instanceof File &&
    (file.type || '').startsWith('image/') &&
    file.type !== 'image/svg+xml' &&
    file.type !== 'image/gif' &&
    file.type !== 'image/webp'
  ) {
    const compressed = await compressImage(file);
    finalFile = compressed;
    if (compressed.type === 'image/webp') {
      finalContentType = 'image/webp';
      finalPath = path.replace(/\.(png|jpe?g|webp|heic|heif)$/i, '.webp');
      if (finalPath === path && !/\.webp$/i.test(path)) {
        finalPath = `${path}.webp`;
      }
    }
  }

  return supabase.storage.from(bucket).upload(finalPath, finalFile, {
    ...options,
    contentType: finalContentType,
  });
}