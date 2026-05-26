import { supabase } from '@/integrations/supabase/client';

/**
 * Registration duplicate-detection wrapper used by
 * `findPossibleDuplicateEntities` in the entities module.
 *
 * Encapsulates three independent, public-safe lookups on the `businesses`
 * table (no PII columns):
 *
 *   1. Exact CR  (`national_id`)
 *   2. Exact VAT/Unified number (`vat_number` OR `unified_number`)
 *   3. Normalized name (`name_ar` OR `name_en` ILIKE)
 *
 * Behavior is preserved byte-identically to the previous inline queries.
 */
export type FindBusinessDuplicateCandidatesKind = 'cr' | 'vat' | 'name';

export interface FindBusinessDuplicateCandidatesOptions {
  kind: FindBusinessDuplicateCandidatesKind;
  value: string;
  select: string;
  limit?: number;
}

export async function findBusinessDuplicateCandidates<T = unknown>(
  options: FindBusinessDuplicateCandidatesOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { kind, value, select, limit = 5 } = options;
  if (kind === 'cr') {
    const { data, error } = await supabase
      .from('businesses')
      .select(select)
      .eq('national_id', value)
      .limit(limit);
    return { data: (data as unknown as T[] | null), error };
  }
  if (kind === 'vat') {
    const { data, error } = await supabase
      .from('businesses')
      .select(select)
      .or(`vat_number.eq.${value},unified_number.eq.${value}`)
      .limit(limit);
    return { data: (data as unknown as T[] | null), error };
  }
  // name
  const { data, error } = await supabase
    .from('businesses')
    .select(select)
    .or(`name_ar.ilike.${value},name_en.ilike.${value}`)
    .limit(limit);
  return { data: (data as unknown as T[] | null), error };
}