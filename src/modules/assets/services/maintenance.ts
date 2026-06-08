import { supabase } from '@/integrations/supabase/client';
import type { AssetMaintenance, AssetMaintenanceStatus, AssetMaintenanceKind, ServiceResult } from '../types';

export async function listForAsset(assetId: string): Promise<ServiceResult<AssetMaintenance[]>> {
  const { data, error } = await supabase
    .from('asset_maintenance' as never).select('*')
    .eq('asset_id', assetId)
    .order('scheduled_for', { ascending: false, nullsFirst: false });
  return { data: (data as AssetMaintenance[] | null) ?? [], error: error as Error | null };
}

export async function listOpenForBusiness(businessId: string): Promise<ServiceResult<AssetMaintenance[]>> {
  const { data, error } = await supabase
    .from('asset_maintenance' as never)
    .select('*, assets!inner(owner_business_id)')
    .eq('assets.owner_business_id' as never, businessId)
    .in('status', ['planned', 'in_progress', 'overdue'])
    .order('scheduled_for', { ascending: true, nullsFirst: false });
  return { data: (data as AssetMaintenance[] | null) ?? [], error: error as Error | null };
}

export interface CreateMaintenanceInput {
  asset_id: string;
  title: string;
  kind?: AssetMaintenanceKind;
  description?: string;
  scheduled_for?: string;
  cost?: number;
  performed_by?: string;
}

export async function createRecord(input: CreateMaintenanceInput): Promise<ServiceResult<AssetMaintenance>> {
  const { data, error } = await supabase
    .from('asset_maintenance' as never)
    .insert(input as never).select('*').maybeSingle();
  return { data: data as AssetMaintenance | null, error: error as Error | null };
}

export async function setStatus(id: string, status: AssetMaintenanceStatus): Promise<ServiceResult<AssetMaintenance>> {
  const patch: Partial<AssetMaintenance> = { status };
  if (status === 'in_progress') patch.started_at = new Date().toISOString();
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('asset_maintenance' as never)
    .update(patch as never).eq('id', id).select('*').maybeSingle();
  return { data: data as AssetMaintenance | null, error: error as Error | null };
}