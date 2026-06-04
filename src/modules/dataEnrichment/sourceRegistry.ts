// DATA-ENRICHMENT-GOVERNANCE-1 — in-code mirror of public.data_enrichment_sources.
// Keep keys/weights in sync with the migration seed.
import type { SourceDefinition, SourceKey, EnrichmentField } from "./types";

const ALL_FIELDS: ReadonlyArray<EnrichmentField> = [
  "name_ar","name_en","description_ar","description_en",
  "activity_ar","activity_en",
  "phone","whatsapp","email","website",
  "city","district","street","national_address",
  "latitude","longitude","cr_number","vat_number",
  "social_facebook","social_instagram","social_twitter",
  "social_linkedin","social_youtube","social_tiktok",
];

const CONTACT_FIELDS: ReadonlyArray<EnrichmentField> = [
  "phone","whatsapp","email","website",
];

const ADDRESS_FIELDS: ReadonlyArray<EnrichmentField> = [
  "city","district","street","national_address","latitude","longitude",
];

export const SOURCE_REGISTRY: Readonly<Record<SourceKey, SourceDefinition>> = Object.freeze({
  google_places:        { key: "google_places",        label_ar: "جوجل بليسز",  label_en: "Google Places",         kind: "external_api", trust_weight: 0.90, requires_review: true,  supports: ALL_FIELDS },
  google_maps:          { key: "google_maps",          label_ar: "جوجل ماب",     label_en: "Google Maps",           kind: "external_api", trust_weight: 0.85, requires_review: true,  supports: ADDRESS_FIELDS },
  firecrawl_website:    { key: "firecrawl_website",    label_ar: "فايركرول",     label_en: "Firecrawl Website",     kind: "crawler",      trust_weight: 0.70, requires_review: true,  supports: ALL_FIELDS },
  website_crawl:        { key: "website_crawl",        label_ar: "زحف الموقع",   label_en: "Website Crawl",         kind: "crawler",      trust_weight: 0.65, requires_review: true,  supports: ALL_FIELDS },
  national_address:     { key: "national_address",     label_ar: "العنوان الوطني",label_en: "National Address",     kind: "external_api", trust_weight: 0.95, requires_review: false, supports: ADDRESS_FIELDS },
  manual_admin:         { key: "manual_admin",         label_ar: "إدخال يدوي",   label_en: "Manual Admin Entry",    kind: "manual",       trust_weight: 0.80, requires_review: false, supports: ALL_FIELDS },
  provider_registration:{ key: "provider_registration",label_ar: "تسجيل مزود",   label_en: "Provider Registration", kind: "registration", trust_weight: 0.75, requires_review: true,  supports: ALL_FIELDS },
  supplier_import:      { key: "supplier_import",      label_ar: "استيراد مورد", label_en: "Supplier Import",       kind: "import",       trust_weight: 0.60, requires_review: true,  supports: ALL_FIELDS },
  csv_import:           { key: "csv_import",           label_ar: "استيراد CSV",  label_en: "CSV Import",            kind: "import",       trust_weight: 0.55, requires_review: true,  supports: ALL_FIELDS },
  brand_import:         { key: "brand_import",         label_ar: "استيراد علامة",label_en: "Brand Import",          kind: "import",       trust_weight: 0.65, requires_review: true,  supports: CONTACT_FIELDS },
  future_api:           { key: "future_api",           label_ar: "واجهة مستقبلية",label_en: "Future API",           kind: "external_api", trust_weight: 0.50, requires_review: true,  supports: ALL_FIELDS },
});

export function listSources(): SourceDefinition[] {
  return Object.values(SOURCE_REGISTRY);
}

export function getSource(key: SourceKey): SourceDefinition {
  return SOURCE_REGISTRY[key];
}