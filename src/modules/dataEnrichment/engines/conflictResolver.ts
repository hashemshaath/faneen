// DATA-ENRICHMENT-GOVERNANCE-1 — detect + resolve cross-source conflicts.
import { SOURCE_REGISTRY } from "../sourceRegistry";
import type { Conflict, EnrichmentField, SourceKey } from "../types";

export function detectConflicts(
  bySource: Partial<Record<SourceKey, Partial<Record<EnrichmentField, string | null>>>>,
  fields: ReadonlyArray<EnrichmentField>,
): Conflict[] {
  const out: Conflict[] = [];
  fields.forEach((field) => {
    const values = (Object.keys(bySource) as SourceKey[])
      .map((s) => ({
        source: s,
        value: bySource[s]?.[field] ?? null,
        confidence: Math.round(SOURCE_REGISTRY[s].trust_weight * 100),
      }))
      .filter((v) => v.value != null && v.value !== "");
    if (values.length < 2) return;
    const distinct = new Set(values.map((v) => v.value));
    if (distinct.size > 1) {
      out.push({ field, values, resolved: null });
    }
  });
  return out;
}

export function autoResolve(conflict: Conflict): Conflict {
  if (conflict.values.length === 0) return conflict;
  const winner = [...conflict.values].sort((a, b) => b.confidence - a.confidence)[0];
  return { ...conflict, resolved: { source: winner.source, value: winner.value } };
}

export function applyResolution(
  conflict: Conflict,
  choice: { source: SourceKey; value: string | null },
): Conflict {
  return { ...conflict, resolved: choice };
}