/**
 * ORG-RBAC-STRUCTURE-9D — React Query mutation hook for the
 * primary-manager transfer RPC.
 *
 * Wraps the canonical `transferPrimaryManager` service wrapper. On a
 * successful (`ok=true`) transfer, invalidates the staff/workspace query
 * keys so consumers re-fetch. Does NOT navigate or toast — the call site
 * decides UX. Always resolves with a `TransferPrimaryManagerResult`
 * (never throws on RPC envelope failures).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  transferPrimaryManager,
  type TransferPrimaryManagerOptions,
  type TransferPrimaryManagerResult,
} from '@/modules/businesses/services/transferPrimaryManager';

export function useTransferPrimaryManagerMutation() {
  const qc = useQueryClient();
  return useMutation<TransferPrimaryManagerResult, Error, TransferPrimaryManagerOptions>({
    mutationFn: async (input) => {
      const { data, error } = await transferPrimaryManager(input);
      if (error) {
        // RPC transport-level error: normalize to a safe envelope.
        return { ok: false, code: 'unknown' };
      }
      return data ?? { ok: false, code: 'unknown' };
    },
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      const bid = variables.businessId;
      qc.invalidateQueries({ queryKey: ['business-staff', bid] });
      qc.invalidateQueries({ queryKey: ['business_staff', bid] });
      qc.invalidateQueries({ queryKey: ['businesses', bid] });
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['admin', 'company-access'] });
    },
  });
}
