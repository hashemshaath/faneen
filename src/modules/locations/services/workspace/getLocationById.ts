/**
 * WORKSPACE-CONTEXT-2 — Single-location lookup wrapper.
 * RLS authoritative; returns null when the row is not visible to the caller.
 */
import { supabase } from '@/integrations/supabase/client';
import type { WorkspaceLocationRow } from './listLocationsForEntity';

export interface GetLocationByIdOptions {
  locationId: string;
}

export async function getLocationById(
  options: GetLocationByIdOptions,
): Promise<{ data: WorkspaceLocationRow | null; error: unknown }> {
  const { locationId } = options;
  const { data, error } = await supabase
    .from('business_branches')
    .select('id, name_ar, name_en, is_main, is_active')
    .eq('id', locationId)
    .maybeSingle();
  return { data: (data as unknown as WorkspaceLocationRow | null), error };
}