/**
 * Taxonomy & Reference Data Center — service layer.
 * All Supabase access for Phase 2 admin UI lives here.
 * RLS guarantees only admins can write; we do not use service-role keys.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  TaxonomyAlias,
  TaxonomyCategory,
  TaxonomyCategoryInput,
  TaxonomyRelation,
  TaxonomyType,
} from './types';

function unwrap<T>(data: T | null, error: unknown, ctx: string): T {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`[taxonomy:${ctx}] ${msg}`);
  }
  if (data === null) throw new Error(`[taxonomy:${ctx}] no data`);
  return data;
}

export async function getTaxonomyTypes(): Promise<TaxonomyType[]> {
  const { data, error } = await supabase
    .from('taxonomy_types')
    .select('*')
    .order('sort_order', { ascending: true });
  return unwrap(data, error, 'getTaxonomyTypes');
}

export async function getTaxonomyCategories(): Promise<TaxonomyCategory[]> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  return unwrap(data, error, 'getTaxonomyCategories');
}

export async function getTaxonomyAliases(): Promise<TaxonomyAlias[]> {
  const { data, error } = await supabase
    .from('taxonomy_aliases')
    .select('*')
    .order('created_at', { ascending: false });
  return unwrap(data, error, 'getTaxonomyAliases');
}

export async function getTaxonomyRelations(): Promise<TaxonomyRelation[]> {
  const { data, error } = await supabase
    .from('taxonomy_category_relations')
    .select('*')
    .order('created_at', { ascending: false });
  return unwrap(data, error, 'getTaxonomyRelations');
}

export async function createTaxonomyCategory(
  input: TaxonomyCategoryInput,
): Promise<TaxonomyCategory> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .insert(input)
    .select('*')
    .single();
  return unwrap(data, error, 'createTaxonomyCategory');
}

export async function updateTaxonomyCategory(
  id: string,
  patch: Partial<TaxonomyCategoryInput>,
): Promise<TaxonomyCategory> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  return unwrap(data, error, 'updateTaxonomyCategory');
}

export async function archiveTaxonomyCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('taxonomy_categories')
    .update({ is_archived: true, is_active: false })
    .eq('id', id);
  if (error) throw new Error(`[taxonomy:archiveTaxonomyCategory] ${error.message}`);
}

export async function deleteTaxonomyCategory(id: string): Promise<void> {
  const { error } = await supabase.from('taxonomy_categories').delete().eq('id', id);
  if (error) throw new Error(`[taxonomy:deleteTaxonomyCategory] ${error.message}`);
}

export async function updateTaxonomySortOrder(
  id: string,
  sort_order: number,
): Promise<void> {
  const { error } = await supabase
    .from('taxonomy_categories')
    .update({ sort_order })
    .eq('id', id);
  if (error) throw new Error(`[taxonomy:updateTaxonomySortOrder] ${error.message}`);
}

export async function updateTaxonomyParent(
  id: string,
  parent_id: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('taxonomy_categories')
    .update({ parent_id })
    .eq('id', id);
  if (error) throw new Error(`[taxonomy:updateTaxonomyParent] ${error.message}`);
}

export async function createTaxonomyAlias(input: {
  category_id: string;
  alias_ar: string;
  alias_en: string | null;
  normalized_alias: string | null;
}): Promise<TaxonomyAlias> {
  const { data, error } = await supabase
    .from('taxonomy_aliases')
    .insert({ ...input, source: 'manual' })
    .select('*')
    .single();
  return unwrap(data, error, 'createTaxonomyAlias');
}

export async function deleteTaxonomyAlias(id: string): Promise<void> {
  const { error } = await supabase.from('taxonomy_aliases').delete().eq('id', id);
  if (error) throw new Error(`[taxonomy:deleteTaxonomyAlias] ${error.message}`);
}

export async function createTaxonomyRelation(input: {
  category_id: string;
  related_category_id: string;
  relation_type: string;
}): Promise<TaxonomyRelation> {
  const { data, error } = await supabase
    .from('taxonomy_category_relations')
    .insert(input)
    .select('*')
    .single();
  return unwrap(data, error, 'createTaxonomyRelation');
}

export async function deleteTaxonomyRelation(id: string): Promise<void> {
  const { error } = await supabase.from('taxonomy_category_relations').delete().eq('id', id);
  if (error) throw new Error(`[taxonomy:deleteTaxonomyRelation] ${error.message}`);
}