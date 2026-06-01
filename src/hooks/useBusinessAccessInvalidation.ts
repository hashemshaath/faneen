/**
 * SYSTEM-ACCESS-MEMBERSHIP-SYNC-1 — broad invalidation hook.
 *
 * One call after a `/admin/system-access` write triggers React Query
 * invalidations for every consumer of effective access:
 *   - workspace / active business context
 *   - membership subscription + usage
 *   - system-access overrides + visibility catalog
 *   - sidebar / route / module visibility
 *   - feature gates (`['feature-gate', userId, key, businessId]`)
 *   - command palette + dashboard module surfaces
 *
 * The user sees the access change without logout.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface InvalidateBusinessAccessOptions {
  businessId?: string | null;
  /** When true, also invalidate audit log queries. */
  includeAudit?: boolean;
}

export function useBusinessAccessInvalidation() {
  const qc = useQueryClient();

  return useCallback(
    (opts: InvalidateBusinessAccessOptions = {}) => {
      const keys: ReadonlyArray<ReadonlyArray<unknown>> = [
        ['system-modules'],
        ['system-module-overrides'],
        ['system-access'],
        ['system-access', 'visible-modules'],
        ['system-access', 'catalog'],
        ['feature-gate'],
        ['membership-subscription'],
        ['membership-usage'],
        ['workspace'],
        ['active-workspace'],
        ['dashboard-modules'],
        ['command-palette'],
      ];
      for (const k of keys) qc.invalidateQueries({ queryKey: k as unknown[] });

      if (opts.businessId) {
        qc.invalidateQueries({ queryKey: ['business', opts.businessId] });
        qc.invalidateQueries({ queryKey: ['membership-subscription', opts.businessId] });
      }
      if (opts.includeAudit) {
        qc.invalidateQueries({ queryKey: ['system-module-audit'] });
      }
    },
    [qc],
  );
}

export default useBusinessAccessInvalidation;