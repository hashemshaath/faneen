// DATA-ENRICHMENT-GOVERNANCE-1 — observability event names.
import type { ObservabilityEvent } from "./types";

export const ENRICHMENT_EVENTS: ReadonlyArray<ObservabilityEvent> = [
  "enrichment_started",
  "enrichment_completed",
  "enrichment_failed",
  "conflict_detected",
  "conflict_resolved",
  "enrichment_approved",
];