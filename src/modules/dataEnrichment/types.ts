// DATA-ENRICHMENT-GOVERNANCE-1 — shared types.

export type SourceKey =
  | "google_places"
  | "google_maps"
  | "firecrawl_website"
  | "website_crawl"
  | "national_address"
  | "manual_admin"
  | "provider_registration"
  | "supplier_import"
  | "csv_import"
  | "brand_import"
  | "future_api";

export type SourceKind =
  | "external_api"
  | "crawler"
  | "manual"
  | "import"
  | "registration";

export type RecordStatus =
  | "imported"
  | "normalized"
  | "enriched"
  | "pending_review"
  | "approved"
  | "rejected"
  | "applied";

export interface SourceDefinition {
  key: SourceKey;
  label_ar: string;
  label_en: string;
  kind: SourceKind;
  trust_weight: number; // 0..1
  requires_review: boolean;
  supports: ReadonlyArray<EnrichmentField>;
}

export type EnrichmentField =
  | "name_ar" | "name_en"
  | "description_ar" | "description_en"
  | "activity_ar" | "activity_en"
  | "phone" | "whatsapp" | "email" | "website"
  | "city" | "district" | "street"
  | "national_address"
  | "latitude" | "longitude"
  | "cr_number" | "vat_number"
  | "social_facebook" | "social_instagram" | "social_twitter"
  | "social_linkedin" | "social_youtube" | "social_tiktok";

export interface FieldValue {
  value: string | null;
  source: SourceKey;
  confidence: number; // 0..100
}

export interface Conflict {
  field: EnrichmentField;
  values: Array<{ source: SourceKey; value: string | null; confidence: number }>;
  resolved?: { source: SourceKey; value: string | null } | null;
}

export interface QualityBreakdown {
  profile: number;
  contact: number;
  address: number;
  seo: number;
  verification: number;
  enrichment: number;
}

export interface QualityScore {
  score: number; // 0..100
  breakdown: QualityBreakdown;
}

export interface EnrichmentRecord {
  id: string;
  source_key: SourceKey;
  external_ref: string | null;
  raw: Record<string, unknown>;
  normalized: Partial<Record<EnrichmentField, string | null>>;
  translated: Partial<Record<EnrichmentField, string | null>>;
  confidence: Partial<Record<EnrichmentField, number>>;
  conflicts: Conflict[];
  quality_score: number;
  status: RecordStatus;
  target_entity_type: string | null;
  target_entity_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ObservabilityEvent =
  | "enrichment_started"
  | "enrichment_completed"
  | "enrichment_failed"
  | "conflict_detected"
  | "conflict_resolved"
  | "enrichment_approved";