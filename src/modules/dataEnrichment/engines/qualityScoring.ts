// DATA-ENRICHMENT-GOVERNANCE-1 — 0..100 quality scoring.
import type { EnrichmentField, QualityBreakdown, QualityScore } from "../types";

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

const PROFILE: EnrichmentField[] = ["name_ar","name_en","description_ar","description_en","activity_ar","activity_en"];
const CONTACT: EnrichmentField[] = ["phone","whatsapp","email","website"];
const ADDRESS: EnrichmentField[] = ["city","district","street","national_address","latitude","longitude"];
const SEO: EnrichmentField[] = ["description_ar","description_en","name_en"];
const VERIFICATION: EnrichmentField[] = ["cr_number","vat_number"];

export function computeQuality(
  draft: Partial<Record<EnrichmentField, string | null>>,
  opts: { hasEnrichmentRecord?: boolean } = {},
): QualityScore {
  const count = (fs: EnrichmentField[]) => fs.filter((f) => !!draft[f]).length;
  const breakdown: QualityBreakdown = {
    profile: pct(count(PROFILE), PROFILE.length),
    contact: pct(count(CONTACT), CONTACT.length),
    address: pct(count(ADDRESS), ADDRESS.length),
    seo: pct(count(SEO), SEO.length),
    verification: pct(count(VERIFICATION), VERIFICATION.length),
    enrichment: opts.hasEnrichmentRecord ? 100 : 0,
  };
  const score = Math.round(
    breakdown.profile * 0.25 +
    breakdown.contact * 0.20 +
    breakdown.address * 0.20 +
    breakdown.seo * 0.15 +
    breakdown.verification * 0.10 +
    breakdown.enrichment * 0.10,
  );
  return { score, breakdown };
}