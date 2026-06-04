// DATA-ENRICHMENT-GOVERNANCE-1 — client-side translation surface.
// Real AR<->EN translation happens server-side inside the
// `data-enrichment-run` edge function (Lovable AI gateway).
// This file holds light pairing helpers used by the UI for previewing
// missing-language fields before approval.
import type { EnrichmentField } from "../types";

export const TRANSLATABLE_PAIRS: ReadonlyArray<[EnrichmentField, EnrichmentField]> = [
  ["name_ar", "name_en"],
  ["description_ar", "description_en"],
  ["activity_ar", "activity_en"],
];

export function missingLanguageFields(
  draft: Partial<Record<EnrichmentField, string | null>>,
): EnrichmentField[] {
  const out: EnrichmentField[] = [];
  TRANSLATABLE_PAIRS.forEach(([ar, en]) => {
    const hasAr = !!draft[ar];
    const hasEn = !!draft[en];
    if (hasAr && !hasEn) out.push(en);
    if (hasEn && !hasAr) out.push(ar);
  });
  return out;
}