import { supabase } from '@/integrations/supabase/client';
import type { AssetUtilization, ServiceResult } from '../types';
import { computeUtilization } from '../utils/utilization';

export async function listForAsset(assetId: string): Promise<ServiceResult<AssetUtilization[]>> {
  const { data, error } = await supabase
    .from('asset_utilization' as never).select('*')
    .eq('asset_id', assetId).order('period_start', { ascending: false });
  return { data: (data as AssetUtilization[] | null) ?? [], error: error as Error | null };
}

export interface UpsertUtilizationInput {
  asset_id: string;
  period_start: string;
  period_end: string;
  days_rented: number;
  days_idle: number;
  days_maintenance?: number;
  revenue: number;
  currency?: string;
}

export async function upsertSnapshot(input: UpsertUtilizationInput): Promise<ServiceResult<AssetUtilization>> {
  const totalDays = (input.days_rented + input.days_idle + (input.days_maintenance ?? 0));
  const rate = computeUtilization(input.days_rented, totalDays);
  const payload = {
    ...input,
    days_maintenance: input.days_maintenance ?? 0,
    currency: input.currency ?? 'SAR',
    utilization_rate: rate,
  };
  const { data, error } = await supabase
    .from('asset_utilization' as never)
    .upsert(payload as never, { onConflict: 'asset_id,period_start,period_end' })
    .select('*').maybeSingle();
  return { data: data as AssetUtilization | null, error: error as Error | null };
}