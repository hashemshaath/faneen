import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `warranties` (CAT-3 — provider).
 */

export type WarrantyInsertPayload =
  Database['public']['Tables']['warranties']['Insert'];
export type WarrantyUpdatePayload =
  Database['public']['Tables']['warranties']['Update'];

export async function insertWarranty(payload: WarrantyInsertPayload) {
  return await supabase.from('warranties').insert(payload);
}

export async function updateWarrantyById(id: string, values: WarrantyUpdatePayload) {
  return await supabase.from('warranties').update(values).eq('id', id);
}

export async function deleteWarrantyById(id: string) {
  return await supabase.from('warranties').delete().eq('id', id);
}