import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the active barcode_code for a given entity.
 * Returns null if not yet provisioned or caller is unauthenticated.
 * Safe — exposes only the public-shareable barcode_code (used by /q/:code).
 */
export function useEntityBarcode(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const enabled = (options?.enabled ?? true) && !!entityType && !!entityId;
  return useQuery({
    queryKey: ['entity-barcode', entityType, entityId],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_entity_barcode_code', {
        _entity_type: entityType as string,
        _entity_id: entityId as string,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}