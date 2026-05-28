import { supabase } from '@/integrations/supabase/client';

/**
 * Thin wrappers for ORG-RBAC governance tables (Step 4).
 * All wrappers return raw `{ data, error }` from Supabase — no throwing,
 * no transformation. Pages MUST go through these wrappers; direct
 * `supabase.from('business_teams' | ...)` access in components is forbidden.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ListBusinessTeamsOptions {
  businessId: string;
  select?: string;
  includeInactive?: boolean;
}

export async function listBusinessTeams(
  options: ListBusinessTeamsOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { businessId, select = '*', includeInactive = false } = options;
  let q = db.from('business_teams').select(select).eq('business_id', businessId);
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  return { data, error };
}

export interface CreateBusinessTeamPayload {
  business_id: string;
  name: string;
  description?: string | null;
  created_by?: string | null;
}

export async function createBusinessTeam(
  payload: CreateBusinessTeamPayload,
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await db.from('business_teams').insert(payload);
  return { data, error };
}

export interface UpdateBusinessTeamOptions {
  id: string;
  values: Partial<{ name: string; description: string | null; is_active: boolean }>;
}

export async function updateBusinessTeam(
  options: UpdateBusinessTeamOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { id, values } = options;
  const { data, error } = await db.from('business_teams').update(values).eq('id', id);
  return { data, error };
}