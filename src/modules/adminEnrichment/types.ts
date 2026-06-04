export type EnrichmentSource =
  | "website"
  | "google_maps"
  | "ai_enhanced"
  | "manual";
export type EnrichmentConfidence = "high" | "medium" | "low";

export interface EnrichmentField {
  value: string | null;
  source: EnrichmentSource;
  confidence: EnrichmentConfidence;
}

export interface EnrichmentDraft {
  name_ar: EnrichmentField;
  name_en: EnrichmentField;
  activity: EnrichmentField;
  description_ar: EnrichmentField;
  description_en: EnrichmentField;
  phone: EnrichmentField;
  website: EnrichmentField;
  city: EnrichmentField;
  district: EnrichmentField;
  street: EnrichmentField;
  national_address: EnrichmentField;
  latitude: EnrichmentField;
  longitude: EnrichmentField;
  working_hours: EnrichmentField;
  logo_url: EnrichmentField;
  social_links: EnrichmentField;
}

export type EnrichmentFieldKey = keyof EnrichmentDraft;

export interface EnrichmentFetchResult {
  ok?: boolean;
  session_id?: string;
  sources?: {
    website?: Record<string, string | null>;
    google_maps?: Record<string, string | null>;
  };
  merged?: EnrichmentDraft;
  conflicts?: Record<string, { website: string | null; google_maps: string | null }>;
  deferred?: boolean;
  missing?: string[];
  error?: string;
}

export interface EnrichmentEnhanceResult {
  ok?: boolean;
  ai_enhanced?: Partial<Record<EnrichmentFieldKey, string>>;
  deferred?: boolean;
  missing?: string[];
}

export interface EnrichmentApplyResult {
  ok?: boolean;
  applied_entity_type?: string | null;
  applied_entity_id?: string | null;
  error?: string;
}