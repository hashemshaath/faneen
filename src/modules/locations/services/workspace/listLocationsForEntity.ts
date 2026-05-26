/**
 * WORKSPACE-CONTEXT-2 — Location wrapper.
 *
 * Canonical read for "locations belonging to an entity" used by the active
 * workspace hook. Source of truth: `public.business_branches` (see
 * docs/workspace-context.md — Step 2). RLS on `business_branches` is
 * authoritative; this wrapper never bypasses it.
 */
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceLocationRow {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  is_main: boolean | null;
  is_active: boolean | null;
}

export interface ListLocationsForEntityOptions {
  entityId: string;
  activeOnly?: boolean;
}

export async function listLocationsForEntity(
  options: ListLocationsForEntityOptions,
): Promise<{ data: WorkspaceLocationRow[] | null; error: unknown }> {
  const { entityId, activeOnly = true } = options;
  let q = supabase
    .from('business_branches')
    .select('id, name_ar, name_en, is_main, is_active')
    .eq('business_id', entityId);
  if (activeOnly) q = q.eq('is_active', true);
  q = q.order('is_main', { ascending: false }).order('sort_order', { ascending: true });
  const { data, error } = await q;
  return { data: (data as unknown as WorkspaceLocationRow[] | null), error };
}