/**
 * CLIENT CONTRACT CREATION FROM WORKSPACE — Phase 4 service wrapper.
 *
 * Sole caller of `create_contract_from_workspace_as_client`. UI code
 * must go through this wrapper — never call the RPC directly from a
 * component. The wrapper never accepts `client_id` or `provider_id`
 * from the caller; those are derived server-side from `auth.uid()`
 * and the workspace ownership chain.
 */
import { supabase } from '@/integrations/supabase/client';

export type CreateContractFromWorkspaceKind = 'project' | 'site';

export interface CreateContractFromWorkspaceInput {
  kind: CreateContractFromWorkspaceKind;
  workspaceId: string;
  templateVersionId: string | null;
  /** Non-sensitive editable fields only. */
  payload: {
    title_ar?: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    total_amount?: number;
    currency_code?: string;
    start_date?: string | null;
    end_date?: string | null;
  };
}

export type CreateContractFromWorkspaceErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_WORKSPACE_KIND'
  | 'WORKSPACE_NOT_FOUND'
  | 'NOT_WORKSPACE_OWNER'
  | 'PROVIDER_NOT_DERIVABLE'
  | 'CLIENT_CANNOT_BE_PROVIDER'
  | 'UNKNOWN';

export interface CreateContractFromWorkspaceResult {
  ok: boolean;
  contractId: string | null;
  errorCode: CreateContractFromWorkspaceErrorCode | null;
  errorMessage: string | null;
}

function mapErrorCode(message: string): CreateContractFromWorkspaceErrorCode {
  const known: CreateContractFromWorkspaceErrorCode[] = [
    'AUTH_REQUIRED',
    'INVALID_WORKSPACE_KIND',
    'WORKSPACE_NOT_FOUND',
    'NOT_WORKSPACE_OWNER',
    'PROVIDER_NOT_DERIVABLE',
    'CLIENT_CANNOT_BE_PROVIDER',
  ];
  const hit = known.find((k) => message.includes(k));
  return hit ?? 'UNKNOWN';
}

export async function createContractFromWorkspace(
  input: CreateContractFromWorkspaceInput,
): Promise<CreateContractFromWorkspaceResult> {
  const { data, error } = await supabase.rpc(
    'create_contract_from_workspace_as_client',
    {
      _workspace_kind: input.kind,
      _workspace_id: input.workspaceId,
      _template_version_id: input.templateVersionId,
      _payload: input.payload as unknown as Record<string, unknown>,
    },
  );

  if (error) {
    return {
      ok: false,
      contractId: null,
      errorCode: mapErrorCode(error.message ?? ''),
      errorMessage: error.message ?? null,
    };
  }

  return {
    ok: true,
    contractId: (data as string | null) ?? null,
    errorCode: null,
    errorMessage: null,
  };
}