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
  activity_ar: EnrichmentField;
  activity_en: EnrichmentField;
  description_ar: EnrichmentField;
  description_en: EnrichmentField;
  phone: EnrichmentField;
  phone_mobile: EnrichmentField;
  phone_landline: EnrichmentField;
  unified_number: EnrichmentField;
  whatsapp: EnrichmentField;
  customer_service: EnrichmentField;
  email: EnrichmentField;
  website: EnrichmentField;
  city: EnrichmentField;
  city_en: EnrichmentField;
  district: EnrichmentField;
  district_en: EnrichmentField;
  street: EnrichmentField;
  street_en: EnrichmentField;
  national_address: EnrichmentField;
  national_address_en: EnrichmentField;
  latitude: EnrichmentField;
  longitude: EnrichmentField;
  working_hours: EnrichmentField;
  logo_url: EnrichmentField;
  social_links: EnrichmentField;
  facebook: EnrichmentField;
  instagram: EnrichmentField;
  twitter: EnrichmentField;
  linkedin: EnrichmentField;
  youtube: EnrichmentField;
  tiktok: EnrichmentField;
  snapchat: EnrichmentField;
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
  diagnostics?: {
    place_id: string | null;
    addressComponents: Array<Record<string, unknown>>;
    geocoding_used: boolean;
    geocoding_components: Array<Record<string, unknown>>;
  };
  db_matches?: {
    city: { id: string; name_ar: string; name_en: string } | null;
    district: { id: string; name_ar: string; name_en: string | null } | null;
    region: { name_ar: string | null; name_en: string | null } | null;
  };
}

export interface EnrichmentEnhanceResult {
  ok?: boolean;
  ai_enhanced?: Partial<Record<EnrichmentFieldKey, string>> & {
    category_slug?: string;
    services_ar?: string;
    services_en?: string;
  };
  deferred?: boolean;
  missing?: string[];
}

export interface EnrichmentApplyResult {
  ok?: boolean;
  saved?: boolean;
  session_id?: string;
  status?: "draft" | "reviewed" | "applied" | "discarded";
  applied_entity_type?: string | null;
  applied_entity_id?: string | null;
  error?: string;
}

export interface EnrichmentDraftSummary {
  id: string;
  status: "reviewed" | "applied";
  name: string | null;
  city: string | null;
  activity: string | null;
  applied_entity_type: string | null;
  applied_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentSessionRow {
  id: string;
  status: string;
  website_url: string | null;
  maps_url: string | null;
  sources: Record<string, unknown> | null;
  merged: {
    approved?: Record<string, string>;
    category_slug?: string | null;
    services_ar?: string | null;
    services_en?: string | null;
    ai_enhanced?: Record<string, string> | null;
    selected_place?: Record<string, unknown> | null;
    db_matches?: Record<string, unknown> | null;
    diagnostics?: Record<string, unknown> | null;
  } | null;
  applied_entity_type: string | null;
  applied_entity_id: string | null;
  created_at: string;
  updated_at: string;
}