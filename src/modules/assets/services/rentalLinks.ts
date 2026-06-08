import { supabase } from '@/integrations/supabase/client';
import type { ServiceResult } from '../types';

export interface AssetRentalLink {
  id: string;
  asset_id: string;
  rental_item_id: string;
  created_at: string;
}

export async function listLinksForAsset(assetId: string): Promise<ServiceResult<AssetRentalLink[]>> {
  const { data, error } = await supabase
    .from('asset_rental_links' as never).select('*').eq('asset_id', assetId);
  return { data: (data as AssetRentalLink[] | null) ?? [], error: error as Error | null };
}

export async function listLinksForRentalItem(rentalItemId: string): Promise<ServiceResult<AssetRentalLink[]>> {
  const { data, error } = await supabase
    .from('asset_rental_links' as never).select('*').eq('rental_item_id', rentalItemId);
  return { data: (data as AssetRentalLink[] | null) ?? [], error: error as Error | null };
}

export async function listLinksForRentalItems(rentalItemIds: string[]): Promise<ServiceResult<AssetRentalLink[]>> {
  if (!rentalItemIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('asset_rental_links' as never).select('*').in('rental_item_id', rentalItemIds);
  return { data: (data as AssetRentalLink[] | null) ?? [], error: error as Error | null };
}

export async function linkAssetToRental(assetId: string, rentalItemId: string): Promise<ServiceResult<AssetRentalLink>> {
  const { data, error } = await supabase
    .from('asset_rental_links' as never)
    .insert({ asset_id: assetId, rental_item_id: rentalItemId } as never)
    .select('*').maybeSingle();
  return { data: data as AssetRentalLink | null, error: error as Error | null };
}

export async function unlink(id: string): Promise<ServiceResult<true>> {
  const { error } = await supabase.from('asset_rental_links' as never).delete().eq('id', id);
  return { data: error ? null : true, error: error as Error | null };
}