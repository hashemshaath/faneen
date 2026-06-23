/**
 * PROJECT ↔ PROVIDER LINKING — client-scope service wrapper.
 *
 * Sole caller of `link_project_provider_as_client`. UI components must
 * go through this wrapper — never call the RPC directly. The RPC is
 * `SECURITY DEFINER` with `search_path=public` and validates project
 * ownership + provider eligibility server-side.
 *
 * This wrapper does NOT create or modify contracts. Linking a provider
 * only unlocks the contract-creation eligibility gate; the actual
 * contract creation goes through a separate, gated RPC.
 */
import { supabase } from '@/integrations/supabase/client';

export type LinkProjectProviderErrorCode =
  | 'AUTH_REQUIRED'
  | 'NOT_PROJECT_OWNER'
  | 'PROJECT_NOT_FOUND'
  | 'PROVIDER_NOT_ELIGIBLE'
  | 'CLIENT_CANNOT_BE_PROVIDER'
  | 'UNKNOWN';

export interface LinkProjectProviderResult {
  ok: boolean;
  errorCode: LinkProjectProviderErrorCode | null;
  errorMessage: string | null;
}

function mapErrorCode(message: string): LinkProjectProviderErrorCode {
  const known: LinkProjectProviderErrorCode[] = [
    'AUTH_REQUIRED',
    'NOT_PROJECT_OWNER',
    'PROJECT_NOT_FOUND',
    'PROVIDER_NOT_ELIGIBLE',
    'CLIENT_CANNOT_BE_PROVIDER',
  ];
  const hit = known.find((k) => message.includes(k));
  return hit ?? 'UNKNOWN';
}

export async function linkProjectProviderAsClient(
  projectId: string,
  providerBusinessId: string | null,
): Promise<LinkProjectProviderResult> {
  const { error } = await supabase.rpc('link_project_provider_as_client', {
    p_project_id: projectId,
    p_provider_business_id: providerBusinessId,
  });
  if (error) {
    return {
      ok: false,
      errorCode: mapErrorCode(error.message ?? ''),
      errorMessage: error.message ?? null,
    };
  }
  return { ok: true, errorCode: null, errorMessage: null };
}