/**
 * PROVIDER-GROWTH-ENGINE-2 — Admin UI guardrails.
 * File-system + source-text checks (no rendering).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';
import {
  filterGrowthInsights,
  GROWTH_QUEUE_FILTERS,
  buildProviderInsight,
  computeGrowthKPIs,
  type GrowthBusinessRow,
} from '@/modules/providers/services/providerGrowthQueries';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const DASHBOARD = 'src/pages/admin/AdminProviderGrowth.tsx';
const QUEUE = 'src/pages/admin/AdminProviderGrowthQueue.tsx';
const WIDGETS = 'src/components/admin/provider-growth/GrowthDashboardWidgets.tsx';
const APP = 'src/App.tsx';
const SERVICE = 'src/modules/providers/services/providerGrowthQueries.ts';

describe('PROVIDER-GROWTH-ENGINE-2 — Admin UI', () => {
  describe('Routes', () => {
    it('registers /admin/provider-growth and /admin/provider-growth/queue under ProtectedRoute requireAdmin', () => {
      const src = read(APP);
      expect(src).toMatch(/path="\/admin\/provider-growth"[\s\S]+ProtectedRoute requireAdmin[\s\S]+AdminProviderGrowth\b/);
      expect(src).toMatch(/path="\/admin\/provider-growth\/queue"[\s\S]+ProtectedRoute requireAdmin[\s\S]+AdminProviderGrowthQueue\b/);
    });
    it('page files exist', () => {
      expect(existsSync(resolve(DASHBOARD))).toBe(true);
      expect(existsSync(resolve(QUEUE))).toBe(true);
      expect(existsSync(resolve(WIDGETS))).toBe(true);
    });
  });

  describe('Service wrappers', () => {
    it('pages import from the providerGrowthQueries service wrapper', () => {
      for (const p of [DASHBOARD, QUEUE]) {
        expect(read(p)).toContain("@/modules/providers/services/providerGrowthQueries");
      }
    });
    it('pages NEVER import the supabase client directly', () => {
      for (const p of [DASHBOARD, QUEUE, WIDGETS]) {
        const src = read(p);
        expect(src.includes('@/integrations/supabase/client')).toBe(false);
        expect(src.includes('supabase.from')).toBe(false);
      }
    });
    it('service wrapper centralises supabase access', () => {
      const src = read(SERVICE);
      expect(src).toContain("@/integrations/supabase/client");
      expect(src).toContain('provider_growth_pipeline');
    });
  });

  describe('Dashboard widgets', () => {
    const src = read(DASHBOARD);
    it('mounts all five required widgets', () => {
      expect(src).toContain('KpiSummary');
      expect(src).toContain('PipelineFunnelWidget');
      expect(src).toContain('ReadinessDistribution');
      expect(src).toContain('QualityDistribution');
      expect(src).toContain('MissingDataWidget');
      expect(src).toContain('TopPriorityWidget');
    });
    it('widgets file exposes the expected testids', () => {
      const w = read(WIDGETS);
      for (const id of [
        'growth-kpi-summary',
        'widget-pipeline-funnel',
        'widget-readiness-distribution',
        'widget-quality-distribution',
        'widget-missing-data',
        'widget-top-priority',
        'provider-insight-card',
      ]) {
        expect(w).toContain(`data-testid="${id}"`);
      }
    });
  });

  describe('Queue', () => {
    const src = read(QUEUE);
    it('renders all eight queue filters', () => {
      const required = [
        'missing_logo','missing_services','missing_brands','missing_address',
        'low_quality','low_readiness','pending_verification','pending_enrichment',
      ];
      for (const f of required) expect(GROWTH_QUEUE_FILTERS).toContain(f);
      // Source contains the GROWTH_QUEUE_FILTERS constant used by .map((f) => `queue-filter-${f}`).
      expect(src).toContain('GROWTH_QUEUE_FILTERS');
      expect(src).toContain('queue-filter-${f}');
      // FILTER_LABEL covers each required filter.
      for (const f of required) expect(src).toContain(`${f}:`);
    });
    it('offers bulk assign / enrichment / verification — never bulk publish', () => {
      expect(src).toContain('Assign reviewer');
      expect(src).toContain('Request enrichment');
      expect(src).toContain('Request verification');
      expect(src.toLowerCase()).not.toContain('bulk publish');
      expect(src.toLowerCase()).not.toContain('bulkpublish');
    });
    it('queue + dashboard contain no scope-creep imports', () => {
      const forbidden = [
        'autoPublish', 'auto_publish', 'forcePublish',
        'crawler', 'outreach', 'twilio', 'whatsapp', 'WhatsApp',
        '@/modules/inventory', '@/modules/accounting',
      ];
      for (const p of [DASHBOARD, QUEUE, WIDGETS, SERVICE]) {
        const s = read(p);
        for (const bad of forbidden) {
          expect(s.includes(bad), `${p} must not contain "${bad}"`).toBe(false);
        }
      }
    });
  });

  describe('Filter logic', () => {
    const base: GrowthBusinessRow = {
      id: 'b', ref_id: 'BIZ-1000001', name_ar: 'Test', name_en: null, username: 'test',
      logo_url: null, cover_url: null, phone: '+966', email: 'a@b.com', website: null,
      city: null, city_id: null, address: null, latitude: null, longitude: null,
      is_active: true, is_verified: false, approval_status: 'draft', updated_at: null,
      sectors: [], sub_services: [], brands_count: 0, gallery_count: 0,
    };
    it('missing_logo filter matches rows without a logo', () => {
      const i1 = buildProviderInsight({ ...base, id: 'a', logo_url: null });
      const i2 = buildProviderInsight({ ...base, id: 'b', logo_url: '/x.png' });
      const r = filterGrowthInsights([i1, i2], 'missing_logo');
      expect(r.map((x) => x.business.id)).toEqual(['a']);
    });
    it('low_readiness and low_quality narrow the list', () => {
      // A near-empty record scores low on both dimensions.
      const weak = buildProviderInsight({
        ...base, id: 'weak', name_ar: null, name_en: null, username: null,
        phone: null, email: null, sectors: [],
      });
      expect(weak.readiness.score).toBeLessThan(60);
      expect(weak.quality.score).toBeLessThan(80);
      expect(filterGrowthInsights([weak], 'low_readiness').length).toBe(1);
      expect(filterGrowthInsights([weak], 'low_quality').length).toBe(1);
    });
    it('computeGrowthKPIs returns all required metric keys', () => {
      const k = computeGrowthKPIs([base]);
      for (const key of [
        'totalProviders','publishedProviders','verifiedProviders','readyToPublish',
        'withWebsite','withImages','withServices','withBrands','withFullAddress',
        'averageReadiness','averageQuality',
      ]) {
        expect(Object.prototype.hasOwnProperty.call(k, key)).toBe(true);
      }
    });
  });

  describe('Help mappings', () => {
    it('registers admin.provider-growth and admin.provider-growth-queue', () => {
      expect(Array.isArray(contextualHelpRegistry['admin.provider-growth'])).toBe(true);
      expect(contextualHelpRegistry['admin.provider-growth']!.length).toBeGreaterThan(0);
      expect(Array.isArray(contextualHelpRegistry['admin.provider-growth-queue'])).toBe(true);
      expect(contextualHelpRegistry['admin.provider-growth-queue']!.length).toBeGreaterThan(0);
    });
    it('pages mount HelpLauncher with the correct pageKey', () => {
      expect(read(DASHBOARD)).toMatch(/HelpLauncher[^/]*pageKey=["']admin\.provider-growth["']/);
      expect(read(QUEUE)).toMatch(/HelpLauncher[^/]*pageKey=["']admin\.provider-growth-queue["']/);
    });
  });
});