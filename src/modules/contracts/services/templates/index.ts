/**
 * CT-5 — Contract template admin/editor service wrappers.
 * Thin pass-through wrappers around contract_template* tables and
 * contract_measurement_methods. Returns raw Supabase `{ data, error }`
 * shapes to preserve existing callsite branching.
 */
import { supabase } from '@/integrations/supabase/client';

// ── contract_templates ───────────────────────────────────────────────
export async function updateContractTemplateById(
  id: string,
  payload: Record<string, unknown>,
) {
  return await supabase
    .from('contract_templates')
    .update(payload as never)
    .eq('id', id);
}

// ── contract_template_versions ───────────────────────────────────────
export async function listContractTemplateVersions(templateId: string) {
  return await supabase
    .from('contract_template_versions')
    .select('*')
    .eq('template_id', templateId)
    .order('version_number', { ascending: false });
}

export async function createContractTemplateVersion<TRow = { id: string }>(
  payload: Record<string, unknown>,
  select = '*',
) {
  return await supabase
    .from('contract_template_versions')
    .insert(payload as never)
    .select(select)
    .single() as unknown as { data: TRow | null; error: unknown };
}

// ── contract_template_sections ───────────────────────────────────────
export async function listContractTemplateSections(
  versionId: string,
  opts: { select?: string; ascending?: boolean } = {},
) {
  const { select = '*', ascending = true } = opts;
  return await supabase
    .from('contract_template_sections')
    .select(select)
    .eq('version_id', versionId)
    .order('sort_order', { ascending });
}

export async function listContractTemplateSectionsByVersionIds(
  versionIds: string[],
  select = 'id,version_id',
) {
  return await supabase
    .from('contract_template_sections')
    .select(select)
    .in('version_id', versionIds);
}

export async function createContractTemplateSection<TRow = unknown>(
  payload: Record<string, unknown>,
  select?: string,
) {
  let q = supabase.from('contract_template_sections').insert(payload as never);
  if (select !== undefined) {
    return await q.select(select).single() as unknown as { data: TRow | null; error: unknown };
  }
  return await q;
}

export async function updateContractTemplateSection(
  id: string,
  payload: Record<string, unknown>,
) {
  return await supabase
    .from('contract_template_sections')
    .update(payload as never)
    .eq('id', id);
}

export async function deleteContractTemplateSection(id: string) {
  return await supabase
    .from('contract_template_sections')
    .delete()
    .eq('id', id);
}

// ── contract_template_clauses ────────────────────────────────────────
export async function listContractTemplateClausesBySectionIds(
  sectionIds: string[],
  opts: { select?: string; ascending?: boolean; orderBy?: string | null } = {},
) {
  const { select = '*', ascending = true, orderBy = 'sort_order' } = opts;
  let q = supabase
    .from('contract_template_clauses')
    .select(select)
    .in('section_id', sectionIds);
  if (orderBy) q = q.order(orderBy, { ascending });
  return await q;
}

export async function createContractTemplateClause(
  payload: Record<string, unknown>,
) {
  return await supabase
    .from('contract_template_clauses')
    .insert(payload as never);
}

export async function updateContractTemplateClause(
  id: string,
  payload: Record<string, unknown>,
) {
  return await supabase
    .from('contract_template_clauses')
    .update(payload as never)
    .eq('id', id);
}

export async function deleteContractTemplateClause(id: string) {
  return await supabase
    .from('contract_template_clauses')
    .delete()
    .eq('id', id);
}

// ── contract_measurement_methods ─────────────────────────────────────
export async function listContractMeasurementMethods(
  opts: { select?: string; orderBy?: string } = {},
) {
  const { select = 'id,label_ar,label_en,symbol,decimals,is_active', orderBy = 'id' } = opts;
  return await supabase
    .from('contract_measurement_methods')
    .select(select)
    .order(orderBy);
}