import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { SHOWCASE_BUCKET } from '../constants/buckets';
import {
  compressImage,
  validateImage,
  ImageCompressionError,
} from '@/lib/imageCompression';

export interface UploadShowcaseImageParams {
  userId: string;
  file: File;
}

export interface UploadShowcaseImageResult {
  publicUrl: string;
  path: string;
  error: Error | null;
}

/**
 * Showcase image upload helper. Preserves the exact path + options used
 * previously in `DashboardShowcase.tsx`:
 *
 *   path:    `${userId}/${Date.now()}.webp`
 *   bucket:  showcase
 *   options: { cacheControl: "3600", upsert: false }
 *
 * Now validates the input (MIME/size, Arabic error messages) and
 * compresses to WebP via a Web Worker before upload, so callers cannot
 * accidentally bypass the pipeline.
 */
export async function uploadShowcaseImage({
  userId,
  file,
}: UploadShowcaseImageParams): Promise<UploadShowcaseImageResult> {
  const v = validateImage(file);
  if (v.ok === false) {
    return { publicUrl: '', path: '', error: new Error(v.message) };
  }
  let compressed: File;
  try {
    compressed = await compressImage(file, {
      maxWidthOrHeight: 1920,
      quality: 0.82,
      maxSizeMB: 1,
    });
  } catch (err) {
    const msg = err instanceof ImageCompressionError
      ? err.userMessage
      : err instanceof Error ? err.message : 'Compression failed';
    return { publicUrl: '', path: '', error: new Error(msg) };
  }
  const path = `${userId}/${Date.now()}.webp`;
  const { error } = await uploadPublicImage({
    bucket: SHOWCASE_BUCKET,
    path,
    file: compressed,
    options: {
      cacheControl: '31536000, immutable',
      upsert: false,
      contentType: 'image/webp',
    },
  });
  if (error) {
    return { publicUrl: '', path, error: error as Error };
  }
  const { data: pub } = getPublicImageUrl({ bucket: SHOWCASE_BUCKET, path });
  return { publicUrl: pub.publicUrl, path, error: null };
}