/**
 * Phase 2.1 — Project image domain.
 *
 * Centralized upload helper for project cover + gallery images. Uses
 * the same `processImage` pipeline as Showcase and records an
 * `image_assets` row per upload, then returns the public URL of the
 * largest variant for the legacy `*_image_url` columns.
 *
 * Folder convention:
 *   ${userId}/project/${kind}/${ts}-${rand}/${variant}.webp
 * where kind = 'cover' | 'gallery'.
 *
 * On any pipeline/upload/DB failure the function falls back to the
 * legacy single-rendition path so user uploads are never blocked.
 * The caller can detect this via `fallback: true`.
 *
 * TODO Phase 2.2: backfill existing `projects.cover_image_url` and
 *   `project_images.image_url` into `image_assets` (server script).
 * TODO Phase 2.3: generalize to business logos / services / products /
 *   articles using this same shape.
 */
import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { PROJECT_IMAGES_BUCKET } from '../constants/buckets';
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

export type ProjectImageKind = 'cover' | 'gallery';

export interface UploadProjectImageParams {
  userId: string;
  file: File;
  kind: ProjectImageKind;
}

export interface UploadProjectImageResult {
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

export async function uploadProjectImage({
  userId,
  file,
  kind,
}: UploadProjectImageParams): Promise<UploadProjectImageResult> {
  const v = validateImage(file);
  if (v.ok === false) {
    return { publicUrl: '', path: '', error: new Error(v.message) };
  }

  const ts = Date.now();
  const folder = `${userId}/project/${kind}/${ts}-${rand()}`;

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
          bucket: PROJECT_IMAGES_BUCKET,
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
          bucket: PROJECT_IMAGES_BUCKET,
          path,
        });
        variantUrls[variant.key] = pub.publicUrl;
        largestPath = path;
        largestKey = variant.key;
      }

      const { data: asset, error: assetErr } = await supabase
        .from('image_assets')
        .insert({
          bucket: PROJECT_IMAGES_BUCKET,
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

      const _largest = largestKey; // keep reference for clarity
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
      console.warn('[projects] pipeline upload failed, using fallback', err);
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
  const path = `${userId}/project/${kind}/${ts}-${rand()}.webp`;
  const { error } = await uploadPublicImage({
    bucket: PROJECT_IMAGES_BUCKET,
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
    bucket: PROJECT_IMAGES_BUCKET,
    path,
  });
  return { publicUrl: pub.publicUrl, path, error: null, fallback: true };
}