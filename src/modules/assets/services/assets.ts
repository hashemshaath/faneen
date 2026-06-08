import { supabase } from '@/integrations/supabase/client';
import type { Asset, AssetStatus, ServiceResult } from '../types';

export async function listAssetsForBusiness(businessId: string): Promise<ServiceResult<Asset[]>> {
  const { data, error } = await supabase
    .from('assets' as never)
    .select('*')
    .eq('owner_business_id', businessId)
    .order('created_at', { ascending: false });
  return { data: (data as Asset[] | null) ?? [], error: error as Error | null };
}

export async function listAllAssets(): Promise<ServiceResult<Asset[]>> {
  const { data, error } = await supabase
    .from('assets' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: (data as Asset[] | null) ?? [], error: error as Error | null };
}

export async function getAsset(id: string): Promise<ServiceResult<Asset>> {
  const { data, error } = await supabase
    .from('assets' as never).select('*').eq('id', id).maybeSingle();
  return { data: data as Asset | null, error: error as Error | null };
}

export interface CreateAssetInput {
  owner_business_id: string;
  category_id?: string | null;
  name_ar: string;
  name_en?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  year_manufactured?: number;
  purchase_date?: string;
  purchase_cost?: number;
  currency?: string;
  current_location?: string;
  status?: AssetStatus;
  condition_rating?: number;
  notes?: string;
}

export async function createAsset(input: CreateAssetInput): Promise<ServiceResult<Asset>> {
  const { data, error } = await supabase
    .from('assets' as never)
    .insert(input as never)
    .select('*').maybeSingle();
  return { data: data as Asset | null, error: error as Error | null };
}

export async function updateAsset(id: string, patch: Partial<Asset>): Promise<ServiceResult<Asset>> {
  const { data, error } = await supabase
    .from('assets' as never)
    .update(patch as never).eq('id', id)
    .select('*').maybeSingle();
  return { data: data as Asset | null, error: error as Error | null };
}

export async function setAssetStatus(id: string, status: AssetStatus): Promise<ServiceResult<Asset>> {
  const patch: Partial<Asset> = { status };
  if (status === 'retired') patch.retired_at = new Date().toISOString();
  return updateAsset(id, patch);
}

export async function deleteAsset(id: string): Promise<ServiceResult<true>> {
  const { error } = await supabase.from('assets' as never).delete().eq('id', id);
  return { data: error ? null : true, error: error as Error | null };
}