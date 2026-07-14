/**
 * F1.2 — Data hook for the provider Activation Checklist.
 *
 * One React Query per business that fetches only the counts the pure
 * `computeProviderActivation` helper needs. The queryKey first-segment
 * `provider-activation` is intentionally NOT in the queryPersist
 * allowlist, so this per-user, per-business state never lands in
 * localStorage on shared devices.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  computeProviderActivation,
  type ActivationResult,
} from '@/modules/providers/activation/computeActivation';

export interface UseProviderActivationOptions {
  businessId: string | null | undefined;
  enabled?: boolean;
}

export function useProviderActivation({
  businessId,
  enabled = true,
}: UseProviderActivationOptions) {
  return useQuery<ActivationResult | null>({
    queryKey: ['provider-activation', businessId],
    enabled: !!businessId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      if (!businessId) return null;

      // Business row — approval_status + logo + description(s).
      const bizPromise = supabase
        .from('businesses')
        .select('approval_status, logo_url, description_ar, description_en')
        .eq('id', businessId)
        .maybeSingle();

      // Coverage rows.
      const coveragePromise = supabase
        .from('business_service_areas')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);

      // Active services (id list — we need ids to count taxonomy coverage).
      const servicesPromise = supabase
        .from('business_services')
        .select('id')
        .eq('business_id', businessId)
        .eq('is_active', true);

      const [{ data: biz }, coverageRes, servicesRes] = await Promise.all([
        bizPromise,
        coveragePromise,
        servicesPromise,
      ]);

      const serviceIds = (servicesRes.data ?? []).map((r) => r.id as string);

      let servicesWithTaxonomyCount = 0;
      if (serviceIds.length > 0) {
        const { data: taxRows } = await supabase
          .from('business_service_taxonomy_categories')
          .select('service_id')
          .in('service_id', serviceIds);
        const uniq = new Set<string>();
        for (const r of taxRows ?? []) uniq.add(r.service_id as string);
        servicesWithTaxonomyCount = uniq.size;
      }

      return computeProviderActivation({
        approvalStatus: biz?.approval_status ?? null,
        coverageCount: coverageRes.count ?? 0,
        activeServicesCount: serviceIds.length,
        servicesWithTaxonomyCount,
        logoUrl: biz?.logo_url ?? null,
        descriptionAr: biz?.description_ar ?? null,
        descriptionEn: biz?.description_en ?? null,
      });
    },
  });
}