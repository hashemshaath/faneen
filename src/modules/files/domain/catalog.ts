/**
 * Phase 2.3 — Catalog (services + products) image domain.
 *
 * Centralized upload helpers for business-service and brand-product
 * images. Reuses the same `processImage` pipeline as Showcase /
 * Projects / Businesses: generates up to 4 WebP renditions
 * (thumbnail/card/medium/hero) and records one `image_assets` row
 * per upload. Returns the public URL of the largest variant for the
 * legacy `image_url` columns plus `image_asset_id` + `variants`
 * so callers can persist the denormalized `image_variants` column.
 *
 * Folder convention:
 *   ${userId}/service/${ts}-${rand}/${variant}.webp
 *   ${userId}/product/${ts}-${rand}/${variant}.webp
 *
 * On any pipeline/upload/DB failure the helper falls back to a
 * single compressed rendition so user uploads are never blocked.
 * Callers detect this via `fallback: true` and skip persisting
 * variants.
 *
 * TODO Phase 2.4: backfill existing `business_services.image_url` and
 *   `brand_products.image_url` / `brand_products.gallery` into
 *   `image_assets` (server-side script).
 * TODO Phase 2.4+: generalize this pipeline to articles using the
 *   same shape (no Hero/static images, no Edge resize).
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
} from '../services/image-pipeline';

export type CatalogImageKind = 'service' | 'product';

export interface UploadCatalogImageParams {
  userId: string;
  file: File;
  kind: CatalogImageKind;
}

export interface UploadCatalogImageResult {
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

async function uploadCatalogImage({
  userId,
  file,
  kind,
}: UploadCatalogImageParams): Promise<UploadCatalogImageResult> {
  const v = validateImage(file);
  if (v.ok === false) {
    return { publicUrl: '', path: '', error: new Error(v.message) };
  }

  const ts = Date.now();
  const folder = `${userId}/${kind}/${ts}-${rand()}`;

  // 1) Pipeline path.
  const pipeline = await processImage(file);
  if (pipeline.ok) {
    const variantUrls: VariantUrls = {};
    let largestPath = '';
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
      console.warn(`[catalog:${kind}] pipeline upload failed, using fallback`, err);
    }
  }

  // 2) Legacy single-rendition fallback — never break the upload.
  let compressed: File;
  try {
    compressed = await compressImage(file, {
      maxWidthOrHeight: 1920,
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
  const path = `${folder}.webp`;
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

export function uploadServiceImage(
  params: Omit<UploadCatalogImageParams, 'kind'>,
) {
  return uploadCatalogImage({ ...params, kind: 'service' });
}

export function uploadProductImage(
  params: Omit<UploadCatalogImageParams, 'kind'>,
) {
  return uploadCatalogImage({ ...params, kind: 'product' });
}