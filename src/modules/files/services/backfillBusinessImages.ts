/**
 * Phase 2.4.1 — Limited backfill for Business logos/covers only.
 *
 * Admin-only client-side action. The image pipeline relies on browser
 * Canvas APIs (`createImageBitmap`, `compressImageStrict`), so the
 * backfill runs in the admin's browser rather than as a server RPC.
 *
 * For each legacy business image (logo or cover) returned by the
 * `list_business_image_backfill_candidates` RPC, we:
 *   1) fetch the original public image as a Blob,
 *   2) wrap it as a File and run it through `processImage`,
 *   3) upload each variant to the business-assets bucket,
 *   4) insert one `image_assets` row,
 *   5) call `apply_business_image_backfill` to link the asset on the
 *      business row. The RPC is idempotent — it only writes if the
 *      column is still NULL.
 *
 * Constraints:
 *   - Never deletes the original `logo_url` / `cover_url` (legacy URL
 *     stays as a fallback for `ResponsiveImage`).
 *   - On per-image failure: collect the error and continue with the rest.
 *   - Scope: businesses logo/cover ONLY (Showcase / Projects / Products
 *     / Services intentionally not touched in this phase).
 */
import { supabase } from '@/integrations/supabase/client';
import { processImage, type VariantUrls, type VariantKey } from './image-pipeline';
import { uploadPublicImage } from './public/uploadPublicImage';
import { getPublicImageUrl } from './public/getPublicImageUrl';
import { BUSINESS_ASSETS_BUCKET } from '../constants/buckets';

export type BackfillKind = 'logo' | 'cover';

export interface BackfillCandidate {
  business_id: string;
  owner_user_id: string;
  kind: BackfillKind;
  image_url: string;
}

export interface BackfillFailure {
  business_id: string;
  kind: BackfillKind;
  image_url: string;
  reason: string;
}

export interface BackfillResult {
  processed: number;
  succeeded: number;
  failed: number;
  failures: BackfillFailure[];
}

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

function inferExt(url: string, fallback = 'jpg'): string {
  const m = url.match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i);
  return m ? m[1].toLowerCase() : fallback;
}

async function fetchAsFile(url: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const blob = await res.blob();
  const ext = inferExt(url);
  const name = `legacy-${Date.now()}-${rand()}.${ext}`;
  const type = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return new File([blob], name, { type });
}

async function backfillOne(c: BackfillCandidate): Promise<void> {
  const file = await fetchAsFile(c.image_url);

  const pipeline = await processImage(file);
  if (pipeline.ok === false) {
    throw new Error(pipeline.message);
  }

  const ts = Date.now();
  const folder = `${c.owner_user_id}/business/${c.kind}/${ts}-${rand()}-backfill`;

  const variantUrls: VariantUrls = {};
  let largestPath = '';
  let largestKey: VariantKey | undefined;

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
  void largestKey;

  const { data: asset, error: assetErr } = await supabase
    .from('image_assets')
    .insert({
      bucket: BUSINESS_ASSETS_BUCKET,
      owner_user_id: c.owner_user_id,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: applyErr } = await (supabase.rpc as any)(
    'apply_business_image_backfill',
    {
      p_business_id: c.business_id,
      p_kind: c.kind,
      p_image_asset_id: asset.id,
      p_variants: variantUrls,
    },
  );
  if (applyErr) throw applyErr;
}

export async function backfillBusinessImagesOnce(): Promise<BackfillResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    'list_business_image_backfill_candidates',
  );
  if (error) throw error;

  const candidates = (data ?? []) as BackfillCandidate[];
  const failures: BackfillFailure[] = [];
  let succeeded = 0;

  for (const c of candidates) {
    try {
      await backfillOne(c);
      succeeded += 1;
    } catch (err) {
      failures.push({
        business_id: c.business_id,
        kind: c.kind,
        image_url: c.image_url,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    processed: candidates.length,
    succeeded,
    failed: failures.length,
    failures,
  };
}