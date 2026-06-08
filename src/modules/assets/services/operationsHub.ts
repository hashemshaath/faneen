import { supabase } from '@/integrations/supabase/client';
import type { AssetOpsCounts, ServiceResult } from '../types';

export async function getAssetOpsCounts(): Promise<ServiceResult<AssetOpsCounts>> {
  const { data, error } = await supabase.rpc('assets_ops_counts' as never);
  if (error) return { data: null, error: error as Error };
  const r = (data ?? {}) as Record<string, number>;
  return {
    data: {
      total: Number(r.total ?? 0),
      available: Number(r.available ?? 0),
      rented: Number(r.rented ?? 0),
      maintenance: Number(r.maintenance ?? 0),
      inspection: Number(r.inspection ?? 0),
      retired: Number(r.retired ?? 0),
      maintenance_overdue: Number(r.maintenance_overdue ?? 0),
      maintenance_due_soon: Number(r.maintenance_due_soon ?? 0),
      inspections_overdue: Number(r.inspections_overdue ?? 0),
      open_alerts: Number(r.open_alerts ?? 0),
      low_utilization: Number(r.low_utilization ?? 0),
    },
    error: null,
  };
}