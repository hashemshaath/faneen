import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveQuoteRequestTaxonomyDisplay,
} from '@/modules/taxonomy/resolveQuoteRequestTaxonomyDisplay';
import { CANONICAL_PRIMARY_SLUGS } from '@/modules/taxonomy/canonical-primaries';

describe('Phase 3C — quote taxonomy observability', () => {
  it('uses FK-joined taxonomy labels when canonical slug is present', () => {
    const out = resolveQuoteRequestTaxonomyDisplay({
      taxonomyCategoryId: 'cat-1',
      taxonomyCategorySlug: 'aluminum-works',
      taxonomyCategoryNameAr: 'أعمال الألمنيوم (DB)',
      taxonomyCategoryNameEn: 'Aluminum (DB)',
      sector: 'aluminum',
    });
    expect(out.status).toBe('canonical');
    expect(out.canonicalSlug).toBe('aluminum-works');
    expect(out.labelAr).toBe('أعمال الألمنيوم (DB)');
    expect(out.labelEn).toBe('Aluminum (DB)');
  });

  it('falls back to canonical default labels when FK present without joined labels', () => {
    const out = resolveQuoteRequestTaxonomyDisplay({
      taxonomyCategoryId: 'cat-2',
      taxonomyCategorySlug: 'kitchens-works',
    });
    expect(out.status).toBe('canonical');
    expect(out.labelAr).toBe('المطابخ');
  });

  it('falls back to legacy sector mapping when FK is missing', () => {
    const out = resolveQuoteRequestTaxonomyDisplay({ sector: 'iron' });
    expect(out.status).toBe('legacy_resolved');
    expect(out.canonicalSlug).toBe('steel-metal-works');
    expect(out.legacySector).toBe('iron');
  });

  it('marks unknown / other / empty as unclassified without throwing', () => {
    expect(resolveQuoteRequestTaxonomyDisplay({ sector: 'other' }).status).toBe('unclassified');
    expect(resolveQuoteRequestTaxonomyDisplay({ sector: 'totally-unknown' }).status).toBe('unclassified');
    expect(resolveQuoteRequestTaxonomyDisplay({}).status).toBe('unclassified');
    expect(resolveQuoteRequestTaxonomyDisplay({ sector: null }).status).toBe('unclassified');
  });

  it('every canonical primary has labels available', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      const out = resolveQuoteRequestTaxonomyDisplay({
        taxonomyCategoryId: 'x',
        taxonomyCategorySlug: slug,
      });
      expect(out.canonicalSlug).toBe(slug);
      expect(out.labelAr.length).toBeGreaterThan(0);
      expect(out.labelEn.length).toBeGreaterThan(0);
    }
  });

  it('ignores FK slug that is not canonical and falls back to sector', () => {
    const out = resolveQuoteRequestTaxonomyDisplay({
      taxonomyCategoryId: 'cat-3',
      taxonomyCategorySlug: 'aluminum-glass-facades', // legacy primary, forbidden in UI
      sector: 'aluminum',
    });
    expect(out.status).toBe('legacy_resolved');
    expect(out.canonicalSlug).toBe('aluminum-works');
  });
});

describe('Phase 3C — guards: no scope creep', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('submit-quote-request edge function unchanged in scope (still dual-writes)', () => {
    const src = read('supabase/functions/submit-quote-request/index.ts');
    expect(src).toMatch(/taxonomy_category_id/);
    expect(src).toMatch(/sector/);
  });

  it('match-quote-request edge function still references taxonomy FK and sector fallback', () => {
    const src = read('supabase/functions/match-quote-request/index.ts');
    expect(src).toMatch(/taxonomy_category_id/);
    expect(src).toMatch(/sector/);
  });

  it('observability helper is pure — no supabase client import', () => {
    const src = read('src/modules/taxonomy/resolveQuoteRequestTaxonomyDisplay.ts');
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/service_role/i);
  });
});