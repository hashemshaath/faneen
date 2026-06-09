/**
 * Home FAQ service — sole owner of Supabase calls for `home_faq_items`.
 * UI must consume this via hooks/services, never import supabase directly.
 */
import { supabase } from '@/integrations/supabase/client';
import type { HomeFaqItem, HomeFaqInput } from '../types';

const TABLE = 'home_faq_items';

/** Public: enabled items only, sorted by sort_order then created_at. */
export async function fetchPublicHomeFaq(): Promise<HomeFaqItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, sort_order, question_ar, answer_ar, question_en, answer_en, is_enabled')
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeFaqItem[];
}

/** Admin: all items including disabled. */
export async function fetchAllHomeFaq(): Promise<HomeFaqItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeFaqItem[];
}

export async function createHomeFaq(input: HomeFaqInput): Promise<HomeFaqItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      question_ar: input.question_ar,
      answer_ar: input.answer_ar,
      question_en: input.question_en ?? null,
      answer_en: input.answer_en ?? null,
      sort_order: input.sort_order ?? 0,
      is_enabled: input.is_enabled ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as HomeFaqItem;
}

export async function updateHomeFaq(id: string, patch: Partial<HomeFaqInput>): Promise<HomeFaqItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as HomeFaqItem;
}

export async function deleteHomeFaq(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}