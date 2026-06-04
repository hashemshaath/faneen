// DATA-ENRICHMENT-GOVERNANCE-1 — confidence scoring.
import { SOURCE_REGISTRY } from "../sourceRegistry";
import type { EnrichmentField, SourceKey } from "../types";

/**
 * Compute a 0..100 confidence for a field given the sources reporting it
 * and whether their normalized values agree.
 *
 * Rules:
 *  - Google + Website agree → 95+
 *  - Website only → 70
 *  - Manual admin only → 60
 *  - AI-only / future-api only → 50
 *  - Multiple sources disagree → max(trust_weight)*70 (capped at 75)
 */
export function scoreField(
  field: EnrichmentField,
  inputs: ReadonlyArray<{ source: SourceKey; value: string | null }>,
): number {
  void field;
  const present = inputs.filter((i) => i.value != null && i.value !== "");
  if (present.length === 0) return 0;

  const values = new Set(present.map((p) => p.value));
  const allAgree = values.size === 1;

  if (allAgree) {
    const hasGoogle = present.some((p) => p.source === "google_places" || p.source === "google_maps");
    const hasWebsite = present.some((p) => p.source === "firecrawl_website" || p.source === "website_crawl");
    if (hasGoogle && hasWebsite) return 96;
    if (present.some((p) => p.source === "national_address")) return 95;
    if (hasGoogle) return 88;
    if (hasWebsite) return 70;
    if (present.some((p) => p.source === "manual_admin")) return 60;
    // AI / future / import only
    return 50;
  }

  // Disagreement — take max trust * 70, cap 75
  const maxTrust = Math.max(...present.map((p) => SOURCE_REGISTRY[p.source].trust_weight));
  return Math.min(75, Math.round(maxTrust * 70));
}

export function scoreRecord(
  fields: ReadonlyArray<EnrichmentField>,
  bySource: Partial<Record<SourceKey, Partial<Record<EnrichmentField, string | null>>>>,
): Partial<Record<EnrichmentField, number>> {
  const out: Partial<Record<EnrichmentField, number>> = {};
  fields.forEach((f) => {
    const inputs = (Object.keys(bySource) as SourceKey[]).map((s) => ({
      source: s,
      value: bySource[s]?.[f] ?? null,
    }));
    out[f] = scoreField(f, inputs);
  });
  return out;
}