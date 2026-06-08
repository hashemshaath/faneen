import { supabase } from '@/integrations/supabase/client';
import type { RentalCategory, ServiceResult } from '../types';

export async function listCategories(): Promise<ServiceResult<RentalCategory[]>> {
  const { data, error } = await supabase
    .from('rental_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return { data: (data as RentalCategory[] | null) ?? [], error: error as Error | null };
}

export async function getCategoryBySlug(slug: string): Promise<ServiceResult<RentalCategory>> {
  const { data, error } = await supabase
    .from('rental_categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return { data: (data as RentalCategory | null), error: error as Error | null };
}