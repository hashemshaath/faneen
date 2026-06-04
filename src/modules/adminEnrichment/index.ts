// ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 — public module API.
// All page/component code MUST import from here, never call
// supabase.functions.invoke directly.
export { fetchEnrichment } from "./services/fetchEnrichment";
export { enhanceEnrichment } from "./services/enhanceEnrichment";
export {
  applyEnrichment,
  saveEnrichmentDraft,
  listEnrichmentDrafts,
  loadEnrichmentDraft,
  deleteEnrichmentDraft,
} from "./services/applyEnrichment";
export { searchPlaces } from "./services/searchPlaces";
export type { PlaceCandidate, SearchPlacesResult } from "./services/searchPlaces";
export { clearEnrichmentCache } from "./services/clearCache";
export type { ClearCacheResult } from "./services/clearCache";
export type {
  EnrichmentDraft,
  EnrichmentField,
  EnrichmentFieldKey,
  EnrichmentSource,
  EnrichmentConfidence,
  EnrichmentFetchResult,
  EnrichmentEnhanceResult,
  EnrichmentApplyResult,
  EnrichmentDraftSummary,
  EnrichmentSessionRow,
} from "./types";
export type { ApplyEnrichmentInput, EnrichmentExtra } from "./services/applyEnrichment";