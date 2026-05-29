import { supabase } from '@/integrations/supabase/client';
import type { HelpCategory } from './types';

export async function listHelpCategories(): Promise<HelpCategory[]> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HelpCategory[];
}

export async function getHelpCategoryBySlug(slug: string): Promise<HelpCategory | null> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as HelpCategory | null) ?? null;
}

export async function adminListAllCategories(): Promise<HelpCategory[]> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HelpCategory[];
}

export interface UpdateHelpCategoryInput {
  is_active?: boolean;
  sort_order?: number;
  audience?: 'general' | 'provider' | 'customer' | 'admin';
  title_ar?: string;
  title_en?: string;
  description_ar?: string | null;
  description_en?: string | null;
}

export async function updateHelpCategory(id: string, patch: UpdateHelpCategoryInput): Promise<void> {
  const { error } = await supabase.from('help_categories').update(patch).eq('id', id);
  if (error) throw error;
}