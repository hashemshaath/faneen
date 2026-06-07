/**
 * Phase 8 — Project ↔ taxonomy linking services.
 *
 * Reads / writes `project_taxonomy_categories` (the link table created in
 * the Phase 8 migration). Mirrors the shape of `business-services.ts`.
 *
 * Contract:
 * - Never touches `projects.category_id`. That column stays as a legacy
 *   read-only field for backward compatibility.
 * - Writes go through the `set_project_taxonomy_categories` RPC so
 *   ownership / admin checks run server-side.
 */
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';

export type ProjectTaxonomyRole = 'primary_activity' | 'secondary_activity';

export interface ProjectTaxonomyLink {
  id: string;
  project_id: string;
  category_id: string;
  role: ProjectTaxonomyRole | string;
  is_primary: boolean;
}

function fail(error: unknown, ctx: string): never {
  const msg = error instanceof Error ? error.message : String(error);
  throw new Error(`[taxonomy:${ctx}] ${msg}`);
}

export async function getProjectTaxonomyCategories(
  projectId: string,
): Promise<ProjectTaxonomyLink[]> {
  const { data, error } = await supabase
    .from('project_taxonomy_categories')
    .select('id, project_id, category_id, role, is_primary')
    .eq('project_id', projectId);
  if (error) fail(error, 'getProjectTaxonomyCategories');
  return (data ?? []) as ProjectTaxonomyLink[];
}

export async function getProjectTaxonomyCategoriesByProjects(
  projectIds: string[],
): Promise<ProjectTaxonomyLink[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from('project_taxonomy_categories')
    .select('id, project_id, category_id, role, is_primary')
    .in('project_id', projectIds);
  if (error) fail(error, 'getProjectTaxonomyCategoriesByProjects');
  return (data ?? []) as ProjectTaxonomyLink[];
}

export async function setProjectTaxonomyCategories(
  projectId: string,
  payload: {
    primaryCategoryId: string | null;
    secondaryCategoryIds?: string[];
  },
): Promise<void> {
  const { error } = await supabase.rpc('set_project_taxonomy_categories', {
    p_project_id: projectId,
    p_primary_category_id: payload.primaryCategoryId,
    p_secondary_category_ids: payload.secondaryCategoryIds ?? [],
  });
  if (error) fail(error, 'setProjectTaxonomyCategories');
}

/**
 * Picker list — primary-activity / sector categories that are public and
 * visible in registration. Reused for both the dashboard form and the
 * public `/projects` filter.
 */
export async function getProjectTaxonomyPickerCategories(): Promise<TaxonomyCategory[]> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .or('show_in_registration.eq.true,show_in_search.eq.true')
    .order('sort_order', { ascending: true });
  if (error) fail(error, 'getProjectTaxonomyPickerCategories');
  return (data ?? []) as TaxonomyCategory[];
}