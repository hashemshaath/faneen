// ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 — public module API.
// All page/component code MUST import from here, never call
// supabase.functions.invoke directly.
export { fetchEnrichment } from "./services/fetchEnrichment";
export { enhanceEnrichment } from "./services/enhanceEnrichment";
export { applyEnrichment } from "./services/applyEnrichment";
export type {
  EnrichmentDraft,
  EnrichmentField,
  EnrichmentFieldKey,
  EnrichmentSource,
  EnrichmentConfidence,
  EnrichmentFetchResult,
  EnrichmentEnhanceResult,
  EnrichmentApplyResult,
} from "./types";
export type { ApplyEnrichmentInput } from "./services/applyEnrichment";