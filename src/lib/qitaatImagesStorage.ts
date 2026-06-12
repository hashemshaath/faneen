/**
 * Helpers for the `qitaat-images` Supabase Storage bucket.
 *
 * Path layout: `{userId}/{providerId}/{imageId}-{size}.webp`
 *
 * URLs are served via Supabase Storage's public CDN endpoint (resolved
 * through `getPublicImageUrl` in the files module — never parsed here),
 * which sits behind a global CDN with long-lived caching. We request a
 * 1-year browser/edge cache via `cacheControl` on upload and fetch through
 * the public URL so visitors get the nearest edge.
 */
import type { ResponsiveImageSet } from '@/lib/imageCompression';
import { BUSINESS_ASSETS_BUCKET } from '@/modules/files/constants/buckets';
import {
  uploadPublicImage,
  getPublicImageUrl,
  removePublicImages,
} from '@/modules/files/services/public';

/**
 * Public images for the qitaat directory are stored inside the shared
 * `business-assets` bucket because workspace policy blocks new public
 * buckets. The first path segment is the owner's user id (required by
 * the `business-assets` RLS policy), followed by a `qitaat/` namespace
 * prefix, then `{providerId}/{imageId}-{size}.webp`.
 */
export const QITAAT_IMAGES_BUCKET = BUSINESS_ASSETS_BUCKET;
export const QITAAT_IMAGES_PREFIX = 'qitaat';

/** Cache for 1 year, immutable — file names embed a UUID so they never change. */
export const LONG_CACHE_CONTROL = '31536000, immutable';

export type ImageSizeKey = 'thumbnail' | 'medium' | 'large';

export interface UploadedImageUrls {
  imageId: string;
  pathPrefix: string; // `{userId}/{providerId}/{imageId}`
  thumbnail: string;
  medium: string;
  large: string;
}

export interface UploadResponsiveOptions {
  userId: string;
  providerId: string;
  imageId: string; // typically crypto.randomUUID()
  set: ResponsiveImageSet;
  onProgress?: (percent: number) => void;
}

const sizeSuffix: Record<ImageSizeKey, string> = {
  thumbnail: 'thumb',
  medium: 'medium',
  large: 'large',
};

export function buildImagePath(
  userId: string,
  providerId: string,
  imageId: string,
  size: ImageSizeKey,
): string {
  return `${userId}/${QITAAT_IMAGES_PREFIX}/${providerId}/${imageId}-${sizeSuffix[size]}.webp`;
}

/** Public CDN URL for an object in the bucket. */
export function cdnUrl(path: string): string {
  const { data } = getPublicImageUrl({ bucket: QITAAT_IMAGES_BUCKET, path });
  return data.publicUrl;
}

/** Upload the 3 responsive renditions in parallel. */
export async function uploadResponsiveSet({
  userId,
  providerId,
  imageId,
  set,
  onProgress,
}: UploadResponsiveOptions): Promise<UploadedImageUrls> {
  const entries: Array<[ImageSizeKey, File]> = [
    ['thumbnail', set.thumbnail],
    ['medium', set.medium],
    ['large', set.large],
  ];

  let done = 0;
  const total = entries.length;

  const results = await Promise.all(
    entries.map(async ([size, file]) => {
      const path = buildImagePath(userId, providerId, imageId, size);
      const { error } = await uploadPublicImage({
        bucket: QITAAT_IMAGES_BUCKET,
        path,
        file,
        skipCompression: true,
        options: {
          contentType: 'image/webp',
          cacheControl: LONG_CACHE_CONTROL,
          upsert: true,
        },
      });
      if (error) throw error;
      done += 1;
      onProgress?.(Math.round((done / total) * 100));
      return [size, cdnUrl(path)] as const;
    }),
  );

  const urls = Object.fromEntries(results) as Record<ImageSizeKey, string>;
  return {
    imageId,
    pathPrefix: `${userId}/${providerId}/${imageId}`,
    thumbnail: urls.thumbnail,
    medium: urls.medium,
    large: urls.large,
  };
}

/** Remove all 3 renditions for an image (best-effort). */
export async function removeResponsiveSet(
  userId: string,
  providerId: string,
  imageId: string,
): Promise<void> {
  const paths: string[] = (['thumbnail', 'medium', 'large'] as ImageSizeKey[]).map(
    (s) => buildImagePath(userId, providerId, imageId, s),
  );
  await removePublicImages({ bucket: QITAAT_IMAGES_BUCKET, paths });
}