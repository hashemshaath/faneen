/**
 * RENTAL-ASSET-FINAL-POLISH-3 — Per-asset operational utilization summary.
 * Delegates to `asset_utilization_summary` RPC. No PII, no customer data.
 */
import { supabase } from '@/integrations/supabase/client';
import type { AssetStatus } from '../types';

export interface AssetUtilizationSummary {
  asset_id: string;
  window_days: number;
  days_rented: number;
  days_idle: number;
  utilization_pct: number;
  current_status: AssetStatus;
  last_rental_ref: string | null;
  next_available_date: string | null;
}

export async function getAssetUtilizationSummary(
  assetId: string,
  windowDays = 90,
): Promise<AssetUtilizationSummary | null> {
  if (!assetId) return null;
  const { data, error } = await supabase.rpc('asset_utilization_summary' as never, {
    _asset_id: assetId,
    _window_days: windowDays,
  } as never);
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  if (r.error) return null;
  return {
    asset_id: String(r.asset_id ?? assetId),
    window_days: Number(r.window_days ?? windowDays),
    days_rented: Number(r.days_rented ?? 0),
    days_idle: Number(r.days_idle ?? 0),
    utilization_pct: Number(r.utilization_pct ?? 0),
    current_status: (r.current_status as AssetStatus) ?? 'available',
    last_rental_ref: (r.last_rental_ref as string | null) ?? null,
    next_available_date: (r.next_available_date as string | null) ?? null,
  };
}

export interface RentalAssetPolishCounts {
  low_utilization_assets: number;
  assets_without_qr: number;
  inspections_overdue: number;
  post_rental_inspection_queue: number;
  repeated_overrides: number;
}

export async function getRentalAssetPolishCounts(): Promise<RentalAssetPolishCounts> {
  const { data } = await supabase.rpc('rental_asset_polish_counts' as never);
  const r = (data ?? {}) as Record<string, number>;
  return {
    low_utilization_assets: Number(r.low_utilization_assets ?? 0),
    assets_without_qr: Number(r.assets_without_qr ?? 0),
    inspections_overdue: Number(r.inspections_overdue ?? 0),
    post_rental_inspection_queue: Number(r.post_rental_inspection_queue ?? 0),
    repeated_overrides: Number(r.repeated_overrides ?? 0),
  };
}