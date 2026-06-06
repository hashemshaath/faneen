/**
 * useContractPricingRules — extracted from DashboardContracts.tsx
 *
 * Loads `contract_template_pricing_rules` for the distinct
 * template_version_ids referenced by the visible contracts, and exposes
 * two derived maps used for display:
 *   - allowedMethodsByVersion: version_id → string[] of pricing methods
 *   - vatHandlingByVersionMethod: version_id → (method → vat_handling)
 * Same query key as before so cache hits are preserved.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContractLike {
  template_version_id?: string | null;
}

export function useContractPricingRules(contracts: ContractLike[]) {
  const contractTemplateVersionIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of contracts) {
      const v = c.template_version_id;
      if (v) set.add(v);
    }
    return Array.from(set);
  }, [contracts]);

  const { data: contractPricingRules = [] } = useQuery({
    queryKey: ['dashboard-contract-pricing-rules', contractTemplateVersionIds],
    queryFn: async () => {
      if (contractTemplateVersionIds.length === 0) return [];
      const { data } = await supabase
        .from('contract_template_pricing_rules')
        .select('version_id, method, vat_handling')
        .in('version_id', contractTemplateVersionIds);
      return data ?? [];
    },
    enabled: contractTemplateVersionIds.length > 0,
  });

  const allowedMethodsByVersion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of contractPricingRules) {
      const list = map.get(r.version_id) ?? [];
      list.push(r.method);
      map.set(r.version_id, list);
    }
    return map;
  }, [contractPricingRules]);

  const vatHandlingByVersionMethod = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const r of contractPricingRules as Array<{ version_id: string; method: string; vat_handling?: string | null }>) {
      const inner = map.get(r.version_id) ?? new Map<string, string>();
      inner.set(r.method, (r.vat_handling || 'inherit'));
      map.set(r.version_id, inner);
    }
    return map;
  }, [contractPricingRules]);

  return { contractPricingRules, allowedMethodsByVersion, vatHandlingByVersionMethod };
}