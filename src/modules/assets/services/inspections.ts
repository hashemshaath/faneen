import { supabase } from '@/integrations/supabase/client';
import type { AssetInspection, AssetInspectionFrequency, AssetInspectionResult, ServiceResult } from '../types';

export async function listForAsset(assetId: string): Promise<ServiceResult<AssetInspection[]>> {
  const { data, error } = await supabase
    .from('asset_inspections' as never).select('*')
    .eq('asset_id', assetId)
    .order('scheduled_for', { ascending: false, nullsFirst: false });
  return { data: (data as AssetInspection[] | null) ?? [], error: error as Error | null };
}

export interface CreateInspectionInput {
  asset_id: string;
  frequency: AssetInspectionFrequency;
  scheduled_for?: string;
  inspector_name?: string;
  notes?: string;
}

export async function createRecord(input: CreateInspectionInput): Promise<ServiceResult<AssetInspection>> {
  const { data, error } = await supabase
    .from('asset_inspections' as never)
    .insert(input as never).select('*').maybeSingle();
  return { data: data as AssetInspection | null, error: error as Error | null };
}

export async function recordResult(
  id: string, result: AssetInspectionResult, notes?: string,
): Promise<ServiceResult<AssetInspection>> {
  const patch: Partial<AssetInspection> = {
    result,
    inspected_at: new Date().toISOString(),
    ...(notes !== undefined ? { notes } : {}),
  };
  const { data, error } = await supabase
    .from('asset_inspections' as never)
    .update(patch as never).eq('id', id).select('*').maybeSingle();
  return { data: data as AssetInspection | null, error: error as Error | null };
}