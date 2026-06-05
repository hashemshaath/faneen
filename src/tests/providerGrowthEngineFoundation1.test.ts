/**
 * PROVIDER-GROWTH-ENGINE-1 — Foundation (Parts A, B, C, D, K).
 * Pure unit tests + migration text checks. Runtime trigger behaviour is
 * exercised by admin integration tests in later phases.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeProviderReadinessScore,
  PROVIDER_READINESS_BANDS,
  type ReadinessInput,
} from '@/modules/providers/providerReadinessScore';
import {
  computeProviderQualityScore,
  PROVIDER_QUALITY_BANDS,
} from '@/modules/providers/providerQualityScore';
import {
  PROVIDER_GROWTH_EVENTS,
  isProviderGrowthEvent,
} from '@/modules/providers/growthEvents';

const ready: ReadinessInput = {
  name_ar: 'منشأة جاهزة',
  username: 'ready-co',
  username_status: 'approved',
  description_ar: 'وصف طويل بما يكفي لاجتياز عتبة الأربعين حرفًا ومحركات البحث.',
  sectors: ['aluminum'],
  sub_services: ['windows', 'doors', 'facades'],
  phone: '+966500000000',
  email: 'hello@example.com',
  website: 'https://example.com',
  city: 'Riyadh',
  address: '123 King Fahd Rd',
  latitude: 24.7,
  longitude: 46.7,
  logo_url: '/logo.png',
  banner_url: '/banner.png',
  gallery_count: 5,
  brands_count: 4,
  verified: true,
  seo_title: 'Ready Co — Aluminum specialists',
  seo_description: 'Ready Co is a top aluminum contractor serving Riyadh and the Eastern Province.',
  slug: 'ready-co',
};

describe('PROVIDER-GROWTH-ENGINE-1 — Foundation', () => {
  describe('Part B — providerReadinessScore', () => {
    it('module file exists', () => {
      expect(existsSync(resolve('src/modules/providers/providerReadinessScore.ts'))).toBe(true);
    });
    it('empty input → poor band with missing requirements', () => {
      const r = computeProviderReadinessScore({});
      expect(r.score).toBeLessThanOrEqual(5);
      expect(r.band).toBe('poor');
      expect(r.missingRequirements.length).toBeGreaterThan(0);
      expect(r.nextRecommendedAction).not.toBeNull();
    });
    it('fully-completed profile → ready band', () => {
      const r = computeProviderReadinessScore(ready);
      expect(r.score).toBeGreaterThanOrEqual(80);
      expect(r.band).toBe('ready');
    });
    it('component weights sum to 100 with the eight required keys', () => {
      const r = computeProviderReadinessScore({});
      expect(r.components.reduce((s, c) => s + c.weight, 0)).toBe(100);
      expect(r.components.map((c) => c.key).sort()).toEqual([
        'address_quality', 'brands', 'contact_quality', 'images',
        'profile_completeness', 'seo', 'services', 'verification',
      ]);
    });
    it('exposes the four bands', () => {
      expect(PROVIDER_READINESS_BANDS).toEqual(['poor', 'needs_work', 'good', 'ready']);
    });
    it('next recommended action prioritises a heavy weak component', () => {
      const r = computeProviderReadinessScore({ ...ready, sectors: [], sub_services: [] });
      expect(r.nextRecommendedAction?.key).toMatch(/sectors|services/);
    });
  });

  describe('Part C — providerQualityScore', () => {
    it('module file exists', () => {
      expect(existsSync(resolve('src/modules/providers/providerQualityScore.ts'))).toBe(true);
    });
    it('clean record scores excellent', () => {
      const q = computeProviderQualityScore({
        name_ar: 'منشأة',
        phone: '+966500000000',
        email: 'a@b.com',
        website: 'https://x.com',
        logo_url: '/l.png',
        city: 'Riyadh',
        address: '123 KFR',
        latitude: 24.7,
        longitude: 46.7,
        sectors: ['aluminum'],
        updated_at: new Date().toISOString(),
        enrichment_confidence: 0.95,
      });
      expect(q.score).toBeGreaterThanOrEqual(85);
      expect(q.band).toBe('excellent');
      expect(q.issues.length).toBe(0);
    });
    it('penalises invalid contact formats', () => {
      const q = computeProviderQualityScore({
        name_ar: 'X', phone: 'not-a-phone', email: 'not-an-email', website: 'ftp://nope',
      });
      const keys = q.issues.filter((i) => i.category === 'invalid').map((i) => i.key);
      expect(keys).toEqual(expect.arrayContaining(['phone_format', 'email_format', 'website_format']));
      expect(q.penalties.invalid).toBeGreaterThan(0);
    });
    it('penalises duplicates and missing data', () => {
      const q = computeProviderQualityScore({ duplicate_score: 0.8, duplicate_candidates: 2 });
      expect(q.penalties.duplicate).toBeGreaterThan(0);
      expect(q.penalties.missing).toBeGreaterThan(0);
      expect(q.score).toBeLessThan(60);
    });
    it('caps each penalty category', () => {
      const q = computeProviderQualityScore({
        duplicate_score: 1, duplicate_candidates: 999, enrichment_confidence: 0,
      });
      expect(q.penalties.duplicate).toBeLessThanOrEqual(25);
      expect(q.penalties.enrichment).toBeLessThanOrEqual(10);
      expect(q.score).toBeGreaterThanOrEqual(0);
    });
    it('flags outdated profiles', () => {
      const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
      const q = computeProviderQualityScore({
        name_ar: 'X', phone: '+966500000000', email: 'a@b.com', website: 'https://x.com',
        logo_url: '/l.png', city: 'R', address: '1', sectors: ['s'], updated_at: old,
      });
      expect(q.issues.some((i) => i.category === 'outdated')).toBe(true);
    });
    it('exposes the four bands', () => {
      expect(PROVIDER_QUALITY_BANDS).toEqual(['poor', 'fair', 'good', 'excellent']);
    });
  });

  describe('Part D — provider_growth_pipeline migration', () => {
    const dir = resolve('supabase/migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const all = files.map((f) => readFileSync(resolve(dir, f), 'utf8')).join('\n');

    it('introduces the table, stage enum, and guard trigger', () => {
      expect(all).toContain('provider_growth_pipeline');
      expect(all).toContain('provider_growth_stage');
      expect(all).toContain('enforce_provider_growth_stage');
    });
    it('enforces no direct publish + verification gate', () => {
      expect(all).toContain('cannot publish without prior verification');
      expect(all).toContain('cannot verify before review');
      expect(all).toContain('cannot insert a row directly in published stage');
    });
    it('locks writes behind has_role admin and grants service_role', () => {
      expect(all).toMatch(/has_role\(auth\.uid\(\),\s*'admin'\)/);
      expect(all).toMatch(/GRANT[^;]+provider_growth_pipeline[^;]+service_role/i);
    });
  });

  describe('Part K — growthEvents', () => {
    it('exports the seven canonical events', () => {
      expect([...PROVIDER_GROWTH_EVENTS]).toEqual([
        'provider_discovered', 'provider_imported', 'provider_enriched',
        'provider_review_requested', 'provider_verified', 'provider_published', 'provider_archived',
      ]);
    });
    it('isProviderGrowthEvent narrows correctly', () => {
      expect(isProviderGrowthEvent('provider_verified')).toBe(true);
      expect(isProviderGrowthEvent('nope')).toBe(false);
    });
  });

  describe('Part A — architecture doc', () => {
    it('docs/provider-growth-engine-1.md exists and describes the lifecycle', () => {
      const p = resolve('docs/provider-growth-engine-1.md');
      expect(existsSync(p)).toBe(true);
      const src = readFileSync(p, 'utf8');
      for (const stage of ['Discovered','Imported','Enriched','Review Pending','Verified','Published','Optimized']) {
        expect(src).toContain(stage);
      }
    });
  });
});