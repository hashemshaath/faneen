/**
 * Phase 3F — Quote CSV taxonomy widening tests.
 *
 * Asserts that the follow-up CSV row builder includes both the legacy
 * `sector` column and the new canonical taxonomy columns, and that the
 * canonical/legacy_resolved/unclassified semantics flow through unchanged
 * from `resolveQuoteRequestTaxonomyDisplay`.
 */
import { describe, expect, it } from 'vitest';
import {
  buildFollowUpCsvRow,
  FOLLOW_UP_CSV_HEADERS,
  type FollowUpQuoteInput,
} from '@/modules/quotes/services/buildFollowUpCsv';

const NOW = new Date('2026-06-28T00:00:00.000Z').getTime();

function makeQuote(overrides: Partial<FollowUpQuoteInput> = {}): FollowUpQuoteInput {
  return {
    id: 'aaaaaaaaaaaa1234567890',
    ref_id: 'QR-0000001',
    sector: 'aluminum',
    city: 'Riyadh',
    status: 'new',
    created_at: new Date(NOW - 5 * 3600000).toISOString(),
    taxonomy_category_id: null,
    taxonomy_category: null,
    ...overrides,
  };
}

describe('Phase 3F — follow-up CSV taxonomy widening', () => {
  it('headers retain `sector` and include new taxonomy columns', () => {
    expect(FOLLOW_UP_CSV_HEADERS).toContain('sector');
    expect(FOLLOW_UP_CSV_HEADERS).toContain('taxonomy_slug');
    expect(FOLLOW_UP_CSV_HEADERS).toContain('taxonomy_label_ar');
    expect(FOLLOW_UP_CSV_HEADERS).toContain('taxonomy_label_en');
    expect(FOLLOW_UP_CSV_HEADERS).toContain('taxonomy_status');
  });

  it('uses FK-first canonical taxonomy when FK is present', () => {
    const row = buildFollowUpCsvRow(
      makeQuote({
        sector: 'aluminum',
        taxonomy_category_id: 'fk-1',
        taxonomy_category: {
          slug: 'aluminum-doors-windows',
          name_ar: 'ألمنيوم أبواب وشبابيك',
          name_en: 'Aluminum Doors & Windows',
        },
      }),
      { reason: 'r', now: NOW, origin: 'https://x' },
    );
    expect(row.taxonomy_status).toBe('canonical');
    expect(row.taxonomy_slug).toBe('aluminum-doors-windows');
    expect(row.taxonomy_label_ar).toBe('ألمنيوم أبواب وشبابيك');
    expect(row.taxonomy_label_en).toBe('Aluminum Doors & Windows');
    expect(row.sector).toBeTruthy();
  });

  it('falls back to legacy sector mapping when FK is absent', () => {
    const row = buildFollowUpCsvRow(
      makeQuote({ sector: 'aluminum', taxonomy_category_id: null, taxonomy_category: null }),
      { reason: 'r', now: NOW },
    );
    expect(row.taxonomy_status).toBe('legacy_resolved');
    expect(row.taxonomy_slug).toBeTruthy();
    expect(row.taxonomy_label_ar.length).toBeGreaterThan(0);
  });

  it('marks `other`/unknown as unclassified', () => {
    const row = buildFollowUpCsvRow(
      makeQuote({ sector: 'other', taxonomy_category_id: null, taxonomy_category: null }),
      { reason: 'r', now: NOW },
    );
    expect(row.taxonomy_status).toBe('unclassified');
    expect(row.taxonomy_slug).toBe('');
  });

  it('preserves legacy `sector` column in output row', () => {
    const row = buildFollowUpCsvRow(makeQuote({ sector: 'aluminum' }), {
      reason: 'r',
      now: NOW,
    });
    expect(row).toHaveProperty('sector');
  });

  it('computes request_age_hours and admin_url deterministically', () => {
    const row = buildFollowUpCsvRow(
      makeQuote({ ref_id: 'QR-9', created_at: new Date(NOW - 2 * 3600000).toISOString() }),
      { reason: 'late', lastEventType: 'matched', now: NOW, origin: 'https://q' },
    );
    expect(row.request_age_hours).toBe(2);
    expect(row.admin_url).toBe('https://q/admin/quote-requests/QR-9');
    expect(row.last_event_type).toBe('matched');
  });
});