/**
 * Phase 2.2 — Business image domain.
 *
 * Centralized upload helper for business `logo` and `cover` images.
 * Reuses the same `processImage` pipeline as Showcase and Projects:
 * generates up to 4 WebP renditions (thumbnail/card/medium/hero) and
 * records one `image_assets` row per upload. Returns the public URL
 * of the largest variant for the legacy `*_url` columns plus the
 * `image_asset_id` + `variants` map so the caller can persist the
 * denormalized `*_image_asset_id` / `*_image_variants` columns.
 *
 * Folder convention:
 *   ${userId}/business/${kind}/${ts}-${rand}/${variant}.webp
 * where kind = 'logo' | 'cover'.
 *
 * On any pipeline failure the function falls back to a single
 * compressed rendition so user uploads are never blocked. Callers
 * detect this via `fallback: true` and skip persisting variants.
 *
 * TODO Phase 2.3: backfill existing `businesses.logo_url` /
 *   `cover_url` into `image_assets` (server-side script).
 * TODO Phase 2.3+: generalize this pipeline to services / products /
 *   articles using the same shape.
 */
import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { BUSINESS_ASSETS_BUCKET } from '../constants/buckets';
import {
  validateImage,
  compressImage,
  ImageCompressionError,
} from '@/lib/imageCompression';
import { supabase } from '@/integrations/supabase/client';
import {
  processImage,
  type VariantUrls,
  type VariantKey,
} from '../services/image-pipeline';

export type BusinessImageKind = 'logo' | 'cover';

export interface UploadBusinessImageParams {
  userId: string;
  file: File;
  kind: BusinessImageKind;
}

export interface UploadBusinessImageResult {
  publicUrl: string;
  path: string;
  error: Error | null;
  imageAssetId?: string;
  variants?: VariantUrls;
  fallback?: boolean;
}

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function uploadBusinessImage({
  userId,
  file,
  kind,
}: UploadBusinessImageParams): Promise<UploadBusinessImageResult> {
  const v = validateImage(file);
  if (v.ok === false) {
    return { publicUrl: '', path: '', error: new Error(v.message) };
  }

  const ts = Date.now();
  const folder = `${userId}/business/${kind}/${ts}-${rand()}`;

  // 1) Pipeline path.
  const pipeline = await processImage(file);
  if (pipeline.ok) {
    const variantUrls: VariantUrls = {};
    let largestPath = '';
    let largestKey: VariantKey | undefined;
    try {
      for (const variant of pipeline.variants) {
        const path = `${folder}/${variant.key}.webp`;
        const { error } = await uploadPublicImage({
          bucket: BUSINESS_ASSETS_BUCKET,
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
        const { data: pub } = getPublicImageUrl({
          bucket: BUSINESS_ASSETS_BUCKET,
          path,
        });
        variantUrls[variant.key] = pub.publicUrl;
        largestPath = path;
        largestKey = variant.key;
      }

      const { data: asset, error: assetErr } = await supabase
        .from('image_assets')
        .insert({
          bucket: BUSINESS_ASSETS_BUCKET,
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

      void largestKey;
      return {
        publicUrl:
          variantUrls.hero ??
          variantUrls.medium ??
          variantUrls.card ??
          variantUrls.thumbnail ??
          '',
        path: largestPath,
        error: null,
        imageAssetId: asset.id,
        variants: variantUrls,
        fallback: false,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[businesses] pipeline upload failed, using fallback', err);
    }
  }

  // 2) Legacy single-rendition fallback — never break the upload.
  let compressed: File;
  try {
    compressed = await compressImage(file, {
      maxWidthOrHeight: kind === 'logo' ? 1024 : 1920,
      quality: 0.82,
      maxSizeMB: 1,
    });
  } catch (err) {
    const msg =
      err instanceof ImageCompressionError
        ? err.userMessage
        : err instanceof Error
          ? err.message
          : 'Compression failed';
    return { publicUrl: '', path: '', error: new Error(msg), fallback: true };
  }
  const path = `${userId}/business/${kind}/${ts}-${rand()}.webp`;
  const { error } = await uploadPublicImage({
    bucket: BUSINESS_ASSETS_BUCKET,
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
  const { data: pub } = getPublicImageUrl({
    bucket: BUSINESS_ASSETS_BUCKET,
    path,
  });
  return { publicUrl: pub.publicUrl, path, error: null, fallback: true };
}