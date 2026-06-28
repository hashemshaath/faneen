/**
 * Phase 3F — Pure CSV row builder for the follow-up export.
 *
 * Widens the legacy follow-up export with canonical taxonomy columns while
 * preserving the existing `sector` column. No aggregation/KPI/filter/matching
 * logic is involved — strictly export-shape mapping.
 */
import { QUOTE_STATUS_LABEL_AR, SECTOR_LABEL_AR, type QuoteStatus } from '@/lib/quoteRequests';
import {
  resolveQuoteRequestTaxonomyDisplay,
  type QuoteTaxonomyDisplayStatus,
} from '@/modules/taxonomy/resolveQuoteRequestTaxonomyDisplay';

export interface FollowUpQuoteInput {
  id: string;
  ref_id: string | null;
  sector: string;
  city: string;
  status: string;
  created_at: string;
  taxonomy_category_id: string | null;
  taxonomy_category: {
    slug: string | null;
    name_ar: string | null;
    name_en: string | null;
  } | null;
}

export interface FollowUpRowOptions {
  reason: string;
  lastEventType?: string | null;
  now?: number;
  origin?: string;
}

export interface FollowUpCsvRow {
  quote_ref: string;
  sector: string;
  taxonomy_slug: string;
  taxonomy_label_ar: string;
  taxonomy_label_en: string;
  taxonomy_status: QuoteTaxonomyDisplayStatus;
  city: string;
  status: string;
  reason: string;
  request_age_hours: number;
  last_event_type: string;
  admin_url: string;
}

export const FOLLOW_UP_CSV_HEADERS = [
  'quote_ref',
  'sector',
  'taxonomy_slug',
  'taxonomy_label_ar',
  'taxonomy_label_en',
  'taxonomy_status',
  'city',
  'status',
  'reason',
  'request_age_hours',
  'last_event_type',
  'admin_url',
] as const;

export function buildFollowUpCsvRow(
  quote: FollowUpQuoteInput,
  options: FollowUpRowOptions,
): FollowUpCsvRow {
  const now = options.now ?? Date.now();
  const taxonomy = resolveQuoteRequestTaxonomyDisplay({
    taxonomyCategoryId: quote.taxonomy_category_id,
    taxonomyCategorySlug: quote.taxonomy_category?.slug ?? null,
    taxonomyCategoryNameAr: quote.taxonomy_category?.name_ar ?? null,
    taxonomyCategoryNameEn: quote.taxonomy_category?.name_en ?? null,
    sector: quote.sector,
  });
  const origin = options.origin ?? '';
  return {
    quote_ref: quote.ref_id ?? `#${quote.id.slice(-6)}`,
    sector: SECTOR_LABEL_AR[quote.sector] ?? quote.sector,
    taxonomy_slug: taxonomy.canonicalSlug ?? '',
    taxonomy_label_ar: taxonomy.labelAr,
    taxonomy_label_en: taxonomy.labelEn,
    taxonomy_status: taxonomy.status,
    city: quote.city,
    status: QUOTE_STATUS_LABEL_AR[quote.status as QuoteStatus] ?? quote.status,
    reason: options.reason,
    request_age_hours: Math.round((now - new Date(quote.created_at).getTime()) / 3600000),
    last_event_type: options.lastEventType ?? '',
    admin_url: `${origin}/admin/quote-requests/${quote.ref_id ?? quote.id}`,
  };
}