/**
 * Phase 2.4 — Image Optimization Audit (read-only).
 *
 * Thin client wrapper around the `preview_image_optimization_backfill`
 * SQL function. Returns counts per source table + a 20-row sample of
 * legacy images that have no `image_asset_id` / variants yet.
 *
 * NOTE: This module is intentionally read-only. The backfill itself is
 * NOT implemented in this phase. See {@link BACKFILL_PLAN} below for
 * the planned approach.
 *
 * Future backfill plan:
 *   - Run as a server-side script / edge function, batches of 25–50.
 *   - Idempotent: skip any row that already has `image_asset_id`.
 *   - Re-uses the same `processImage` pipeline so variants are
 *     identical to fresh uploads.
 *   - On success: insert one `image_assets` row + update the source
 *     table's `image_asset_id` and `image_variants` (when present).
 *   - On failure: log into a small `image_backfill_failures` table
 *     (NOT created here) with reason + retry count.
 *   - Never deletes the original image (legacy URL stays as fallback
 *     for `ResponsiveImage`).
 *   - Never touches Hero / static assets, category icons, articles.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ImageAuditCounts {
  showcase_legacy: number;
  projects_cover_legacy: number;
  project_images_legacy: number;
  business_logos_legacy: number;
  business_covers_legacy: number;
  brand_products_legacy: number;
  business_services_legacy: number;
  total_legacy: number;
}

export type ImageAuditSuggestedKind =
  | 'showcase'
  | 'project_cover'
  | 'project_gallery'
  | 'business_logo'
  | 'business_cover'
  | 'product'
  | 'service';

export interface ImageAuditSampleRow {
  source_table: string;
  record_id: string;
  image_url: string;
  suggested_kind: ImageAuditSuggestedKind;
  estimated_priority: number;
}

export interface ImageAuditPayload {
  generated_at: string;
  counts: ImageAuditCounts;
  sample: ImageAuditSampleRow[];
}

export const BACKFILL_PLAN = {
  batchSize: 50,
  minBatchSize: 25,
  idempotent: true,
  preservesOriginal: true,
  logsFailures: true,
  scope: [
    'showcase_submissions',
    'projects',
    'project_images',
    'businesses (logo + cover)',
    'brand_products',
    'business_services',
  ],
  excluded: ['hero static images', 'category icons', 'articles', 'edge resize'],
} as const;

export async function loadImageOptimizationAudit(): Promise<ImageAuditPayload> {
  // The function is `STABLE SECURITY DEFINER` with an admin gate;
  // non-admin callers receive a `forbidden` error.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    'preview_image_optimization_backfill',
  );
  if (error) throw error;
  return data as ImageAuditPayload;
}