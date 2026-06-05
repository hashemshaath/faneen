/**
 * PSG-1 — Product & Service Governance guardrails.
 * File-system + source-text checks (no rendering).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';
import { computeProductReadinessScore } from '@/modules/catalog/productReadinessScore';
import { computeServiceReadinessScore } from '@/modules/catalog/serviceReadinessScore';
import { computeProductQualityScore } from '@/modules/catalog/productQualityScore';
import { computeServiceQualityScore } from '@/modules/catalog/serviceQualityScore';
import {
  CATALOG_GOVERNANCE_EVENTS,
  CATALOG_EVENT_SAFE_KEYS,
  buildSafeCatalogEventPayload,
  mapServiceToLifecycleStage,
} from '@/modules/catalog/governanceEvents';
import {
  CATALOG_QUEUE_FILTERS,
  filterCatalogInsights,
  buildServiceInsight,
  countDuplicateNames,
  computeCatalogKPIs,
  type CatalogServiceRow,
} from '@/modules/catalog/services/catalogGovernanceQueries';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const DASH = 'src/pages/admin/AdminCatalogGovernance.tsx';
const QUEUE = 'src/pages/admin/AdminCatalogGovernanceQueue.tsx';
const WIDGETS = 'src/components/admin/catalog-governance/CatalogGovernanceWidgets.tsx';
const SERVICE = 'src/modules/catalog/services/catalogGovernanceQueries.ts';
const APP = 'src/App.tsx';

describe('PSG-1 — Catalog Governance', () => {
  it('readiness + quality engines exist and clamp to 0..100', () => {
    const empty = computeProductReadinessScore({});
    expect(empty.score).toBeGreaterThanOrEqual(0);
    expect(empty.score).toBeLessThanOrEqual(100);
    expect(empty.band).toBe('poor');
    const full = computeProductReadinessScore({
      name_ar: 'منتج', name_en: 'Product',
      description_ar: 'وصف مطول كافٍ يصف المنتج بدقة وتفاصيل واضحة.',
      description_en: 'A sufficiently long description that explains the product in detail.',
      images_count: 5, category_id: 'c', brand_id: 'b', brand_status: 'approved',
      specifications_count: 6,
      seo_title: 'Quality product title', seo_description: 'A long seo description over forty chars for sure.',
      slug: 'product', is_verified: true,
    });
    expect(full.score).toBe(100);
    expect(full.band).toBe('ready');

    const sr = computeServiceReadinessScore({});
    expect(sr.score).toBeLessThan(100);

    const pq = computeProductQualityScore({ duplicate_name_count: 0 });
    expect(pq.score).toBeGreaterThanOrEqual(0);
    expect(pq.score).toBeLessThanOrEqual(100);

    const sq = computeServiceQualityScore({ duplicate_name_count: 5 });
    expect(sq.components.find((c) => c.key === 'duplicate_risk')?.earned).toBe(0);
  });

  it('lifecycle stage mapper covers the full vocabulary', () => {
    expect(mapServiceToLifecycleStage({ admin_status: 'allowed', is_active: true })).toBe('published');
    expect(mapServiceToLifecycleStage({ admin_status: 'allowed', is_active: false })).toBe('approved');
    expect(mapServiceToLifecycleStage({ admin_status: 'pending_review' })).toBe('review');
    expect(mapServiceToLifecycleStage({ admin_status: 'rejected' })).toBe('archived');
    expect(mapServiceToLifecycleStage({})).toBe('draft');
  });

  it('routes registered under ProtectedRoute requireAdmin', () => {
    const src = read(APP);
    expect(src).toMatch(/path="\/admin\/catalog-governance"[\s\S]+ProtectedRoute requireAdmin[\s\S]+AdminCatalogGovernance\b/);
    expect(src).toMatch(/path="\/admin\/catalog-governance\/queue"[\s\S]+ProtectedRoute requireAdmin[\s\S]+AdminCatalogGovernanceQueue\b/);
  });

  it('page + widget files exist', () => {
    for (const p of [DASH, QUEUE, WIDGETS, SERVICE]) expect(existsSync(resolve(p))).toBe(true);
  });

  it('pages NEVER import the supabase client directly', () => {
    for (const p of [DASH, QUEUE, WIDGETS]) {
      const src = read(p);
      expect(src.includes('@/integrations/supabase/client')).toBe(false);
      expect(src.includes('supabase.from')).toBe(false);
    }
  });

  it('service wrapper centralises Supabase access', () => {
    const src = read(SERVICE);
    expect(src).toContain('@/integrations/supabase/client');
    expect(src).toContain('business_services');
    expect(src).toContain('business_service_brands');
  });

  it('queue exposes all required filters', () => {
    const required = [
      'draft', 'review', 'approved', 'published', 'archived',
      'missing_brand', 'missing_category', 'low_readiness', 'low_quality', 'seo_issues',
    ];
    for (const f of required) expect(CATALOG_QUEUE_FILTERS).toContain(f);
    const src = read(QUEUE);
    expect(src).toContain('catalog-queue-filter-${f}');
    expect(src).toContain('CATALOG_QUEUE_FILTERS');
    for (const f of required) expect(src).toContain(`${f}:`);
  });

  it('queue offers bulk assign/enrichment/revision — never bulk publish', () => {
    const src = read(QUEUE);
    expect(src).toContain('Assign reviewer');
    expect(src).toContain('Request enrichment');
    expect(src).toContain('Request revision');
    expect(src.toLowerCase()).not.toContain('bulk publish');
    expect(src.toLowerCase()).not.toContain('bulkpublish');
    expect(src.toLowerCase()).not.toContain('autopublish');
  });

  it('help mappings exist for both admin surfaces', () => {
    expect(contextualHelpRegistry['admin.catalog-governance']?.length).toBeGreaterThan(0);
    expect(contextualHelpRegistry['admin.catalog-governance-queue']?.length).toBeGreaterThan(0);
  });

  it('observability events vocabulary covers products + services lifecycle', () => {
    for (const e of [
      'product_created', 'product_review_requested', 'product_approved',
      'product_published', 'product_archived',
      'service_created', 'service_review_requested', 'service_approved',
      'service_published', 'service_archived',
    ]) {
      expect(CATALOG_GOVERNANCE_EVENTS).toContain(e);
    }
  });

  it('event payload only contains safe allow-listed keys (no PII)', () => {
    const payload = buildSafeCatalogEventPayload('service_review_requested', {
      entity: 'service', entity_ref: 'svc-123', stage: 'review',
      readiness_score: 72, quality_score: 64,
    });
    const keys = Object.keys(payload).sort();
    expect(keys).toEqual([...CATALOG_EVENT_SAFE_KEYS].sort());
    expect(payload.readiness_score).toBe(72);
  });

  it('approved-brand enforcement: brand_status != approved yields no readiness credit', () => {
    const ok = computeProductReadinessScore({ brand_id: 'b', brand_status: 'approved' });
    const bad = computeProductReadinessScore({ brand_id: 'b', brand_status: 'pending' });
    const okBrand = ok.components.find((c) => c.key === 'brand')!;
    const badBrand = bad.components.find((c) => c.key === 'brand')!;
    expect(okBrand.earned).toBeGreaterThan(badBrand.earned);
  });

  it('no scope creep in pages / wrapper / widgets', () => {
    const forbidden = [
      'crawler', 'autoPublish', 'auto_publish', 'forcePublish',
      '@/modules/accounting', '@/modules/inventory', 'twilio', 'WhatsApp',
    ];
    for (const p of [DASH, QUEUE, WIDGETS, SERVICE]) {
      const s = read(p);
      for (const bad of forbidden) {
        expect(s.includes(bad), `${p} must not contain "${bad}"`).toBe(false);
      }
    }
  });

  it('queries helpers work end-to-end', () => {
    const rows: CatalogServiceRow[] = [
      { id: 's1', business_id: 'b1', name_ar: 'تصنيع', name_en: 'Mfg', description_ar: 'وصف طويل كافٍ للوصف المفصل.', description_en: null, category_id: 'c1', admin_status: 'allowed', provider_status: 'active', is_active: true, is_demo: false, price_from: 100, price_to: 200, updated_at: null },
      { id: 's2', business_id: 'b1', name_ar: 'تصنيع', name_en: null, description_ar: null, description_en: null, category_id: null, admin_status: 'pending_review', provider_status: 'active', is_active: false, is_demo: false, price_from: null, price_to: null, updated_at: null },
    ];
    const dup = countDuplicateNames(rows);
    expect(dup.get('s1')).toBe(1);
    const insights = rows.map((r) => buildServiceInsight(r, 0, dup.get(r.id) ?? 0));
    const kpis = computeCatalogKPIs(insights);
    expect(kpis.total).toBe(2);
    expect(kpis.missingBrand).toBe(2);
    expect(kpis.missingCategory).toBe(1);
    const review = filterCatalogInsights(insights, 'review');
    expect(review).toHaveLength(1);
    expect(review[0].row.id).toBe('s2');
  });
});