/**
 * CT-11 — Thin wrappers over the contract analytics SECURITY DEFINER RPCs.
 * Raw `{ data, error }` pass-through; callers keep their own error handling
 * (FORBIDDEN/UNAUTHENTICATED branching, React Query retry policy, etc.).
 */
import { supabase } from '@/integrations/supabase/client';

export interface GetContractAnalyticsDashboardArgs {
  _business_id?: string | undefined;
  _period: string;
  _scope: string;
}

export async function getContractAnalyticsDashboard(args: GetContractAnalyticsDashboardArgs) {
  return await supabase.rpc('get_contract_analytics_dashboard', args);
}

export interface GetAdminContractAnalyticsDashboardArgs {
  _period: string;
  _business_id?: string | undefined;
  _include_demo: boolean;
}

export async function getAdminContractAnalyticsDashboard(args: GetAdminContractAnalyticsDashboardArgs) {
  return await supabase.rpc('get_admin_contract_analytics_dashboard', args);
}