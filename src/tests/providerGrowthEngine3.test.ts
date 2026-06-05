/**
 * PROVIDER-GROWTH-ENGINE-3 — Observability + insight drawer guardrails.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';
import {
  PROVIDER_GROWTH_EVENTS,
  GROWTH_EVENT_SAFE_KEYS,
  buildSafeGrowthEventPayload,
  emitProviderGrowthEvent,
  isSafeGrowthEventPayload,
  setProviderGrowthEventSink,
  type GrowthEventPayload,
  type ProviderGrowthEvent,
} from '@/modules/providers/growthEvents';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const DASHBOARD = 'src/pages/admin/AdminProviderGrowth.tsx';
const QUEUE = 'src/pages/admin/AdminProviderGrowthQueue.tsx';
const DRAWER = 'src/components/admin/provider-growth/ProviderInsightDrawer.tsx';

describe('PROVIDER-GROWTH-ENGINE-3', () => {
  describe('Part A — Observability events', () => {
    it('exposes the seven canonical lifecycle events', () => {
      const required: ProviderGrowthEvent[] = [
        'provider_discovered', 'provider_imported', 'provider_enriched',
        'provider_review_requested', 'provider_verified', 'provider_published',
        'provider_archived',
      ];
      for (const e of required) expect(PROVIDER_GROWTH_EVENTS).toContain(e);
    });

    it('payload only contains safe allow-listed keys', () => {
      const p = buildSafeGrowthEventPayload('provider_verified', {
        business_ref: 'BIZ-1000001',
        stage: 'verified',
        source: 'google_places:abc',
        readiness_score: 87,
        quality_score: 92,
      });
      expect(isSafeGrowthEventPayload(p as unknown as Record<string, unknown>)).toBe(true);
      for (const k of Object.keys(p)) {
        expect(GROWTH_EVENT_SAFE_KEYS).toContain(k as typeof GROWTH_EVENT_SAFE_KEYS[number]);
      }
    });

    it('strips PII / never carries phone / email / address fields', () => {
      const dirty = {
        business_ref: 'BIZ-1', stage: 'review_pending', source: 'lead:LD-1',
        readiness_score: 70, quality_score: 80,
        // intentionally pass unsafe fields — they must NOT be projected through
        phone: '+966500000000', email: 'leak@example.com', address: 'leak st',
      } as unknown as Parameters<typeof buildSafeGrowthEventPayload>[1];
      const p = buildSafeGrowthEventPayload('provider_review_requested', dirty);
      const json = JSON.stringify(p);
      expect(json).not.toContain('+966500000000');
      expect(json).not.toContain('leak@example.com');
      expect(json).not.toContain('leak st');
    });

    it('clamps scores into 0..100 and tolerates nulls', () => {
      const p = buildSafeGrowthEventPayload('provider_published', {
        readiness_score: 999, quality_score: -50, business_ref: null, source: null, stage: null,
      });
      expect(p.readiness_score).toBe(100);
      expect(p.quality_score).toBe(0);
      expect(p.business_ref).toBeNull();
    });

    it('emit pipes payload through the configurable sink', () => {
      const seen: GrowthEventPayload[] = [];
      setProviderGrowthEventSink((p) => seen.push(p));
      try {
        emitProviderGrowthEvent('provider_verified', { business_ref: 'BIZ-2', stage: 'verified', source: 'manual', readiness_score: 85, quality_score: 90 });
        expect(seen.length).toBe(1);
        expect(seen[0].event).toBe('provider_verified');
        expect(seen[0].business_ref).toBe('BIZ-2');
      } finally {
        setProviderGrowthEventSink(() => undefined);
      }
    });

    it('admin pages emit growth events when opening an insight', () => {
      for (const p of [DASHBOARD, QUEUE]) {
        const src = read(p);
        expect(src).toContain('emitProviderGrowthEvent');
      }
    });
  });

  describe('Part B — Insight drawer', () => {
    it('drawer component exists with the required sections', () => {
      expect(existsSync(resolve(DRAWER))).toBe(true);
      const src = read(DRAWER);
      for (const id of [
        'provider-insight-drawer',
        'insight-headline-scores',
        'insight-readiness-breakdown',
        'insight-quality-breakdown',
        'insight-missing-items',
        'insight-enrichment-status',
        'insight-gaps',
      ]) {
        expect(src).toContain(`data-testid="${id}"`);
      }
    });

    it('dashboard + queue mount the drawer', () => {
      for (const p of [DASHBOARD, QUEUE]) {
        const src = read(p);
        expect(src).toContain('ProviderInsightDrawer');
      }
    });
  });

  describe('Part C — Help mappings', () => {
    it('admin.provider-growth maps cover readiness / publishing pipeline articles', () => {
      const slugs = contextualHelpRegistry['admin.provider-growth'] ?? [];
      expect(slugs).toContain('readiness-checklist');
      expect(slugs).toContain('how-publishing-works');
    });
    it('admin.provider-growth-queue maps cover approval / readiness articles', () => {
      const slugs = contextualHelpRegistry['admin.provider-growth-queue'] ?? [];
      expect(slugs).toContain('approve-providers');
      expect(slugs).toContain('readiness-checklist');
    });
  });

  describe('Guardrails — no scope creep, no direct supabase, no bulk publish', () => {
    it('pages + drawer never import the supabase client', () => {
      for (const p of [DASHBOARD, QUEUE, DRAWER]) {
        const s = read(p);
        expect(s.includes('@/integrations/supabase/client')).toBe(false);
        expect(s.includes('supabase.from')).toBe(false);
      }
    });
    it('no bulk publish action introduced', () => {
      for (const p of [DASHBOARD, QUEUE, DRAWER]) {
        const s = read(p).toLowerCase();
        expect(s).not.toContain('bulk publish');
        expect(s).not.toContain('bulkpublish');
        expect(s).not.toContain('auto_publish');
        expect(s).not.toContain('autopublish');
      }
    });
    it('no crawler / outreach scope creep', () => {
      const forbidden = ['crawler', 'outreach', 'twilio', 'whatsapp ', 'WhatsApp '];
      for (const p of [DASHBOARD, QUEUE, DRAWER, 'src/modules/providers/growthEvents.ts']) {
        const s = read(p);
        for (const bad of forbidden) {
          expect(s.includes(bad), `${p} must not contain "${bad}"`).toBe(false);
        }
      }
    });
  });
});