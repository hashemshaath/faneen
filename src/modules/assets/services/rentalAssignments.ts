/**
 * RENTAL-ASSET-INTEGRATION-1 — order-level link CRUD.
 * All writes flow through this service; never call supabase directly from pages.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ServiceResult } from '../types';
import { checkAssetRentalAvailability } from './checkAssetRentalAvailability';

export type AssignmentStatus = 'reserved' | 'active' | 'returned' | 'cancelled';

export interface AssetRentalAssignment {
  id: string;
  ref_id: string;
  rental_order_id: string;
  rental_item_id: string;
  asset_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  status: AssignmentStatus;
  post_rental_inspection_required: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentInput {
  rental_order_id: string;
  rental_item_id: string;
  asset_id: string;
  start_date: string;
  end_date: string;
  quantity?: number;
  post_rental_inspection_required?: boolean;
  notes?: string;
}

export async function listAssignmentsForOrder(
  rentalOrderId: string,
): Promise<ServiceResult<AssetRentalAssignment[]>> {
  const { data, error } = await supabase
    .from('asset_rental_assignments' as never)
    .select('*')
    .eq('rental_order_id', rentalOrderId)
    .order('created_at', { ascending: false });
  return { data: (data as AssetRentalAssignment[] | null) ?? [], error: error as Error | null };
}

export async function listAssignmentsForAsset(
  assetId: string,
): Promise<ServiceResult<AssetRentalAssignment[]>> {
  const { data, error } = await supabase
    .from('asset_rental_assignments' as never)
    .select('*')
    .eq('asset_id', assetId)
    .order('end_date', { ascending: false });
  return { data: (data as AssetRentalAssignment[] | null) ?? [], error: error as Error | null };
}

/**
 * Validates availability first, then inserts. Returns a structured error if
 * the asset is not available. Status defaults to `reserved`.
 */
export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<ServiceResult<AssetRentalAssignment>> {
  const avail = await checkAssetRentalAvailability({
    assetId: input.asset_id,
    startDate: input.start_date,
    endDate: input.end_date,
  });
  if (!avail.available) {
    return {
      data: null,
      error: new Error(`asset_unavailable:${avail.reason ?? 'unknown'}`),
    };
  }
  const { data, error } = await supabase
    .from('asset_rental_assignments' as never)
    .insert({
      ...input,
      quantity: input.quantity ?? 1,
      status: 'reserved',
      post_rental_inspection_required: input.post_rental_inspection_required ?? true,
    } as never)
    .select('*')
    .maybeSingle();
  return { data: data as AssetRentalAssignment | null, error: error as Error | null };
}

export async function setAssignmentStatus(
  id: string,
  status: AssignmentStatus,
): Promise<ServiceResult<AssetRentalAssignment>> {
  const { data, error } = await supabase
    .from('asset_rental_assignments' as never)
    .update({ status } as never)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  return { data: data as AssetRentalAssignment | null, error: error as Error | null };
}

export async function deleteAssignment(id: string): Promise<ServiceResult<true>> {
  const { error } = await supabase
    .from('asset_rental_assignments' as never)
    .delete()
    .eq('id', id);
  return { data: error ? null : true, error: error as Error | null };
}

export interface AssetCurrentRentalInfo {
  current_rental_ref: string | null;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number | null;
  overdue: boolean;
  link_status: AssignmentStatus | null;
}

export async function getAssetCurrentRental(
  assetId: string,
): Promise<AssetCurrentRentalInfo | null> {
  const { data, error } = await supabase.rpc('asset_current_rental_info' as never, {
    _asset_id: assetId,
  } as never);
  if (error || !data) return null;
  return data as AssetCurrentRentalInfo;
}

export interface RentalAssetOpsCounts {
  orders_without_assets: number;
  orders_active_asset_not_rented: number;
  orders_closed_asset_still_rented: number;
  overdue_with_assets: number;
  post_rental_inspections_pending: number;
  overlapping_assignments: number;
  overrides_last_24h: number;
  overrides_total: number;
  blocked_assignments_today: number;
}

export async function getRentalAssetOpsCounts(): Promise<RentalAssetOpsCounts> {
  const { data } = await supabase.rpc('rental_asset_ops_counts' as never);
  const r = (data ?? {}) as Record<string, number>;
  return {
    orders_without_assets: Number(r.orders_without_assets ?? 0),
    orders_active_asset_not_rented: Number(r.orders_active_asset_not_rented ?? 0),
    orders_closed_asset_still_rented: Number(r.orders_closed_asset_still_rented ?? 0),
    overdue_with_assets: Number(r.overdue_with_assets ?? 0),
    post_rental_inspections_pending: Number(r.post_rental_inspections_pending ?? 0),
    overlapping_assignments: Number(r.overlapping_assignments ?? 0),
    overrides_last_24h: Number(r.overrides_last_24h ?? 0),
    overrides_total: Number(r.overrides_total ?? 0),
    blocked_assignments_today: Number(r.blocked_assignments_today ?? 0),
  };
}
