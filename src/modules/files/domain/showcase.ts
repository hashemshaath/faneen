import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { SHOWCASE_BUCKET } from '../constants/buckets';

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
 *   ext:     `form.file.name.split(".").pop()?.toLowerCase() || "jpg"`
 *   path:    `${userId}/${Date.now()}.${ext}`
 *   bucket:  showcase
 *   options: { cacheControl: "3600", upsert: false }
 */
export async function uploadShowcaseImage({
  userId,
  file,
}: UploadShowcaseImageParams): Promise<UploadShowcaseImageResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await uploadPublicImage({
    bucket: SHOWCASE_BUCKET,
    path,
    file,
    options: { cacheControl: '3600', upsert: false },
  });
  if (error) {
    return { publicUrl: '', path, error: error as Error };
  }
  const { data: pub } = getPublicImageUrl({ bucket: SHOWCASE_BUCKET, path });
  return { publicUrl: pub.publicUrl, path, error: null };
}