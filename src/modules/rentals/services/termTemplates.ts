import { supabase } from '@/integrations/supabase/client';
import type { ServiceResult } from '@/modules/assets/types';

export interface TermPresetItem {
  ar: string;
  en: string;
}

export interface RentalTermTemplate {
  id: string;
  category_id: string;
  usage_terms: TermPresetItem[];
  late_terms: TermPresetItem[];
  penalty_terms: TermPresetItem[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Raw row shape from Supabase (typed loosely — types regen will replace `as never`).
interface RawRow {
  id: string;
  category_id: string;
  usage_terms: unknown;
  late_terms: unknown;
  penalty_terms: unknown;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const coerceList = (v: unknown): TermPresetItem[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map(it => {
      if (!it || typeof it !== 'object') return null;
      const r = it as Record<string, unknown>;
      const ar = typeof r.ar === 'string' ? r.ar.trim() : '';
      const en = typeof r.en === 'string' ? r.en.trim() : '';
      if (!ar && !en) return null;
      return { ar, en } as TermPresetItem;
    })
    .filter((x): x is TermPresetItem => Boolean(x));
};

const fromRow = (row: RawRow): RentalTermTemplate => ({
  id: row.id,
  category_id: row.category_id,
  usage_terms: coerceList(row.usage_terms),
  late_terms: coerceList(row.late_terms),
  penalty_terms: coerceList(row.penalty_terms),
  is_active: row.is_active,
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export async function listActiveTermTemplates(): Promise<ServiceResult<RentalTermTemplate[]>> {
  const { data, error } = await supabase
    .from('rental_term_templates' as never)
    .select('*')
    .eq('is_active' as never, true as never);
  if (error) return { data: [], error: error as Error };
  return { data: ((data as RawRow[] | null) ?? []).map(fromRow), error: null };
}

export async function listAllTermTemplates(): Promise<ServiceResult<RentalTermTemplate[]>> {
  const { data, error } = await supabase
    .from('rental_term_templates' as never)
    .select('*')
    .order('updated_at' as never, { ascending: false } as never);
  if (error) return { data: [], error: error as Error };
  return { data: ((data as RawRow[] | null) ?? []).map(fromRow), error: null };
}

export async function upsertTermTemplate(input: {
  id?: string;
  category_id: string;
  usage_terms: TermPresetItem[];
  late_terms: TermPresetItem[];
  penalty_terms: TermPresetItem[];
  is_active?: boolean;
  notes?: string | null;
}): Promise<ServiceResult<RentalTermTemplate>> {
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    category_id: input.category_id,
    usage_terms: input.usage_terms,
    late_terms: input.late_terms,
    penalty_terms: input.penalty_terms,
    is_active: input.is_active ?? true,
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase
    .from('rental_term_templates' as never)
    .upsert(payload as never, { onConflict: 'id' } as never)
    .select('*')
    .maybeSingle();
  if (error || !data) return { data: null, error: (error as Error) ?? new Error('upsert failed') };
  return { data: fromRow(data as RawRow), error: null };
}

export async function deleteTermTemplate(id: string): Promise<ServiceResult<true>> {
  const { error } = await supabase
    .from('rental_term_templates' as never)
    .delete()
    .eq('id' as never, id as never);
  return { data: error ? null : true, error: (error as Error) ?? null };
}

/** Convenience: map by category_id for fast lookup in the rentals form. */
export const indexByCategory = (
  rows: RentalTermTemplate[],
): Record<string, RentalTermTemplate> => {
  const out: Record<string, RentalTermTemplate> = {};
  for (const r of rows) out[r.category_id] = r;
  return out;
};