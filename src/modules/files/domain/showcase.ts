import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { SHOWCASE_BUCKET } from '../constants/buckets';
import {
  compressImage,
  validateImage,
  ImageCompressionError,
} from '@/lib/imageCompression';
import { supabase } from '@/integrations/supabase/client';
import {
  processImage,
  type VariantUrls,
  type VariantKey,
} from '../services/image-pipeline';

export interface UploadShowcaseImageParams {
  userId: string;
  file: File;
}

export interface UploadShowcaseImageResult {
  publicUrl: string;
  path: string;
  error: Error | null;
  /** Set when the central pipeline succeeded. */
  imageAssetId?: string;
  /** Variant URLs map ({thumbnail, card, medium, hero}); empty on fallback. */
  variants?: VariantUrls;
  /** True when the pipeline failed and we fell back to the original upload. */
  fallback?: boolean;
}

/**
 * Showcase image upload helper.
 *
 * Phase 2 pipeline:
 *   1. Run the central `processImage` pipeline to generate
 *      thumbnail/card/medium/hero WebP variants.
 *   2. Upload each variant under `${userId}/${ts}/${variant}.webp`.
 *   3. Record an `image_assets` row with full metadata.
 *   4. Return `publicUrl` pointing to the largest variant for backward
 *      compatibility with the existing `image_url` column.
 *
 * If ANY step fails we fall back to the legacy single-rendition upload,
 * so the user never loses the ability to submit work. The caller is
 * informed via `fallback: true`.
 */
export async function uploadShowcaseImage({
  userId,
  file,
}: UploadShowcaseImageParams): Promise<UploadShowcaseImageResult> {
  const v = validateImage(file);
  if (v.ok === false) {
    return { publicUrl: '', path: '', error: new Error(v.message) };
  }

  const ts = Date.now();
  const folder = `${userId}/${ts}`;

  // 1) Try the central pipeline first.
  const pipeline = await processImage(file);
  if (pipeline.ok) {
    const variantUrls: VariantUrls = {};
    let largestPath = '';
    let largestKey: VariantKey | undefined;
    try {
      for (const variant of pipeline.variants) {
        const path = `${folder}/${variant.key}.webp`;
        const { error } = await uploadPublicImage({
          bucket: SHOWCASE_BUCKET,
          path,
          file: variant.file,
          skipCompression: true,
          options: {
            cacheControl: '31536000, immutable',
            upsert: false,
            contentType: 'image/webp',
          },
        });
        if (error) throw error;
        const { data: pub } = getPublicImageUrl({ bucket: SHOWCASE_BUCKET, path });
        variantUrls[variant.key] = pub.publicUrl;
        largestPath = path;
        largestKey = variant.key;
      }

      // 2) Record the asset.
      const largestVariant =
        pipeline.variants.find((x) => x.key === largestKey) ?? pipeline.variants[0];
      const { data: asset, error: assetErr } = await supabase
        .from('image_assets')
        .insert({
          bucket: SHOWCASE_BUCKET,
          owner_user_id: userId,
          original_path: largestPath,
          variants: variantUrls,
          original_width: pipeline.original.width,
          original_height: pipeline.original.height,
          original_size: pipeline.original.size,
          optimized_total_size: pipeline.optimizedTotalSize,
          format: pipeline.format,
        })
        .select('id')
        .single();
      if (assetErr) throw assetErr;

      return {
        publicUrl: variantUrls.hero ?? variantUrls.medium ?? variantUrls.card ?? variantUrls.thumbnail ?? '',
        path: largestPath,
        error: null,
        imageAssetId: asset.id,
        variants: variantUrls,
        fallback: false,
      };
    } catch (err) {
      // Pipeline upload or DB insert failed — fall through to legacy path.
      // eslint-disable-next-line no-console
      console.warn('[showcase] pipeline upload failed, using fallback', err);
    }
  }

  // Fallback: single-rendition upload (legacy behavior).
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
    return { publicUrl: '', path: '', error: new Error(msg), fallback: true };
  }
  const path = `${userId}/${ts}.webp`;
  const { error } = await uploadPublicImage({
    bucket: SHOWCASE_BUCKET,
    path,
    file: compressed,
    skipCompression: true,
    options: {
      cacheControl: '31536000, immutable',
      upsert: false,
      contentType: 'image/webp',
    },
  });
  if (error) {
    return { publicUrl: '', path, error: error as Error, fallback: true };
  }
  const { data: pub } = getPublicImageUrl({ bucket: SHOWCASE_BUCKET, path });
  return { publicUrl: pub.publicUrl, path, error: null, fallback: true };
}