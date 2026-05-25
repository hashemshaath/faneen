import { supabase } from '@/integrations/supabase/client';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 — light client-side duplicate detection.
 *
 * Lookup strategy (all safe-fields-only, no PII):
 *  1. Exact match by `national_id` (CR) or `vat_number` / `unified_number`
 *     if the caller provides one.
 *  2. Otherwise, a normalized name match on `name_ar` / `name_en` against a
 *     trimmed, lower-cased query.
 *
 * The query relies on the existing public-readable RLS on `businesses`
 * (only safe identity columns are projected). It never returns emails,
 * phones, tokens, or internal UUIDs as user-facing references.
 */
export interface FindPossibleDuplicateEntitiesInput {
  name?: string | null;
  cityId?: string | null;
  cr?: string | null;
  vat?: string | null;
}

export interface PossibleDuplicateEntity {
  id: string;
  ref_id: string | null;
  legacy_ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  city_id: string | null;
  match_reason: 'cr' | 'vat' | 'name';
}

const SELECT = 'id, ref_id, legacy_ref_id, name_ar, name_en, city_id';

export async function findPossibleDuplicateEntities(
  input: FindPossibleDuplicateEntitiesInput,
): Promise<PossibleDuplicateEntity[]> {
  const out: PossibleDuplicateEntity[] = [];

  // 1) Exact CR
  const cr = (input.cr ?? '').trim();
  if (cr.length >= 4) {
    const { data } = await supabase
      .from('businesses')
      .select(SELECT)
      .eq('national_id', cr)
      .limit(5);
    (data ?? []).forEach((r) => out.push({ ...(r as Omit<PossibleDuplicateEntity, 'match_reason'>), match_reason: 'cr' }));
  }

  // 2) Exact VAT/unified
  const vat = (input.vat ?? '').trim();
  if (vat.length >= 4) {
    const { data } = await supabase
      .from('businesses')
      .select(SELECT)
      .or(`vat_number.eq.${vat},unified_number.eq.${vat}`)
      .limit(5);
    (data ?? []).forEach((r) => out.push({ ...(r as Omit<PossibleDuplicateEntity, 'match_reason'>), match_reason: 'vat' }));
  }

  // 3) Normalized name
  const name = (input.name ?? '').trim();
  if (out.length === 0 && name.length >= 3) {
    const safe = name.replace(/[,()*%]/g, ' ').trim();
    const { data } = await supabase
      .from('businesses')
      .select(SELECT)
      .or(`name_ar.ilike.${safe},name_en.ilike.${safe}`)
      .limit(5);
    (data ?? []).forEach((r) => out.push({ ...(r as Omit<PossibleDuplicateEntity, 'match_reason'>), match_reason: 'name' }));
  }

  // De-duplicate by id
  const seen = new Set<string>();
  return out.filter((r) => {
    if (!r.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}