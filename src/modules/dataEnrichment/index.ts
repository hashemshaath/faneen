// DATA-ENRICHMENT-GOVERNANCE-1 — public module API.
// Pages, components, and hooks MUST import only from here.
export * from "./types";
export { SOURCE_REGISTRY, listSources, getSource } from "./sourceRegistry";
export {
  normalizePhone, normalizeEmail, normalizeUrl, normalizeCity,
  normalizeCrNumber, normalizeVatNumber, normalizeNationalAddress,
  normalizeText, normalizeField, normalizeRecord,
} from "./engines/normalizationEngine";
export { scoreField, scoreRecord } from "./engines/confidenceEngine";
export { detectConflicts, autoResolve, applyResolution } from "./engines/conflictResolver";
export { missingLanguageFields, TRANSLATABLE_PAIRS } from "./engines/translationEngine";
export { computeQuality } from "./engines/qualityScoring";
export { ingestSource } from "./services/ingestSource";
export { runEnrichment } from "./services/runEnrichment";
export { resolveConflict } from "./services/resolveConflict";
export { approveRecord } from "./services/approveRecord";
export {
  listRecords, listAudit, listSourcesFromDb, listQualitySnapshots,
} from "./services/queries";
export { ENRICHMENT_EVENTS } from "./observability";