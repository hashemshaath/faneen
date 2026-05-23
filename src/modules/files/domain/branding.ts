import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { BRAND_ASSETS_BUCKET } from '../constants/buckets';

export interface UploadBrandAssetParams {
  /** Slot identifier (e.g. brand_logo_full_light). Used as the path prefix. */
  slot: string;
  file: File;
}

export interface UploadBrandAssetResult {
  publicUrl: string;
  path: string;
  error: Error | null;
}

/**
 * Brand asset upload helper. Preserves the exact path + options used
 * previously in `AdminBranding.tsx`:
 *
 *   ext:     `file.name.split('.').pop() || 'png'`
 *   path:    `${slot}-${Date.now()}.${ext}`
 *   bucket:  brand-assets
 *   options: { upsert: true, contentType: file.type, cacheControl: '3600' }
 *
 * SVG allowlist / size / compression / DOMPurify decisions remain in the
 * caller — this helper is a pure storage operation and does not validate.
 */
export async function uploadBrandAsset({
  slot,
  file,
}: UploadBrandAssetParams): Promise<UploadBrandAssetResult> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${slot}-${Date.now()}.${ext}`;
  const { error } = await uploadPublicImage({
    bucket: BRAND_ASSETS_BUCKET,
    path,
    file,
    options: { upsert: true, contentType: file.type, cacheControl: '3600' },
  });
  if (error) {
    return { publicUrl: '', path, error: error as Error };
  }
  const { data: pub } = getPublicImageUrl({ bucket: BRAND_ASSETS_BUCKET, path });
  return { publicUrl: pub.publicUrl, path, error: null };
}