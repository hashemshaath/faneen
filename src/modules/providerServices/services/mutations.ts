/**
 * SERVICE-ACTIVATION-GOVERNANCE-1 — provider-facing mutations.
 *
 * Only provider-controlled fields are written here:
 *  - provider_status  (active | paused)
 *  - provider_note
 *
 * Admin fields (admin_status, admin_note, required_plan_tier, …) are
 * deliberately NOT writable through this module. Admin mutations will
 * live in a separate `services/admin.ts` (Phase D) that talks to a
 * SECURITY DEFINER RPC.
 *
 * Legacy `is_active` is kept in sync so existing read sites (search,
 * profile, business card) continue to work until they are migrated.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ProviderActivationStatus } from '../resolveServiceEntitlement';

export interface SetProviderServiceStatusArgs {
  serviceRowId: string;
  status: ProviderActivationStatus;
  providerNote?: string | null;
}

export async function setProviderServiceStatus(args: SetProviderServiceStatusArgs): Promise<void> {
  const patch: Record<string, unknown> = {
    provider_status: args.status,
    is_active: args.status === 'active',
  };
  if (args.providerNote !== undefined) patch.provider_note = args.providerNote;

  const { error } = await supabase
    .from('business_services')
    .update(patch)
    .eq('id', args.serviceRowId);
  if (error) throw error;
}

export function activateProviderService(serviceRowId: string): Promise<void> {
  return setProviderServiceStatus({ serviceRowId, status: 'active' });
}

export function pauseProviderService(serviceRowId: string): Promise<void> {
  return setProviderServiceStatus({ serviceRowId, status: 'paused' });
}