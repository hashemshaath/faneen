import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { BUSINESS_ASSETS_BUCKET } from '../constants/buckets';

export interface UploadAvatarParams {
  userId: string;
  file: File;
}

export interface UploadAvatarResult {
  publicUrl: string;
  path: string;
  error: Error | null;
}

/**
 * Avatar upload helper. Preserves the exact path / options used previously
 * in `DashboardLayout.tsx`:
 *
 *   path:    `${userId}/avatar.${ext}`
 *   bucket:  business-assets
 *   options: { upsert: true, contentType: file.type }
 */
export async function uploadAvatar({ userId, file }: UploadAvatarParams): Promise<UploadAvatarResult> {
  const ext = file.name.split('.').pop() || 'webp';
  const path = `${userId}/avatar.${ext}`;
  const { error } = await uploadPublicImage({
    bucket: BUSINESS_ASSETS_BUCKET,
    path,
    file,
    options: { upsert: true, contentType: file.type },
  });
  if (error) {
    return { publicUrl: '', path, error: error as Error };
  }
  const { data: urlData } = getPublicImageUrl({ bucket: BUSINESS_ASSETS_BUCKET, path });
  return { publicUrl: urlData.publicUrl, path, error: null };
}