/**
 * Phase 4H — Pure resolver for Work Order taxonomy inherited from a Contract.
 *
 * Priority chain (no random selection on ambiguity):
 *   1. contract_taxonomy_categories where is_primary = true
 *   2. contract_taxonomy_categories single row (no primary flagged)
 *   3. contracts.service_category_id fallback
 *   4. null (ambiguous-multiple, or no taxonomy on contract)
 *
 * No DB calls, no side effects, no randomness.
 */

export interface ContractTaxonomyJunctionRow {
  category_id: string | null;
  is_primary: boolean | null;
}

export interface ResolveContractWorkOrderTaxonomyInput {
  junctionRows: ReadonlyArray<ContractTaxonomyJunctionRow> | null | undefined;
  serviceCategoryId?: string | null;
}

export type ContractTaxonomyResolutionReason =
  | "junction_primary"
  | "junction_single"
  | "junction_ambiguous_multiple"
  | "service_category_fallback"
  | "none";

export interface ResolveContractWorkOrderTaxonomyResult {
  taxonomy_category_id: string | null;
  reason: ContractTaxonomyResolutionReason;
}

export function resolveContractWorkOrderTaxonomy(
  input: ResolveContractWorkOrderTaxonomyInput,
): ResolveContractWorkOrderTaxonomyResult {
  const rows = (input.junctionRows ?? []).filter(
    (r): r is ContractTaxonomyJunctionRow & { category_id: string } =>
      !!r && typeof r.category_id === "string" && r.category_id.length > 0,
  );

  // 1. primary wins
  const primaries = rows.filter((r) => r.is_primary === true);
  if (primaries.length === 1) {
    return { taxonomy_category_id: primaries[0].category_id, reason: "junction_primary" };
  }
  // multiple primaries are treated as ambiguous — never guess
  if (primaries.length > 1) {
    return { taxonomy_category_id: null, reason: "junction_ambiguous_multiple" };
  }

  // 2. single junction row, no primary flag
  if (rows.length === 1) {
    return { taxonomy_category_id: rows[0].category_id, reason: "junction_single" };
  }

  // 3. multiple junction rows with no primary → ambiguous, do not guess
  if (rows.length > 1) {
    return { taxonomy_category_id: null, reason: "junction_ambiguous_multiple" };
  }

  // 4. service_category_id fallback
  const svc = (input.serviceCategoryId ?? "").trim();
  if (svc) {
    return { taxonomy_category_id: svc, reason: "service_category_fallback" };
  }

  return { taxonomy_category_id: null, reason: "none" };
}
