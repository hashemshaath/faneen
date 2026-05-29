/**
 * PROVIDER-GROWTH-ENGINE-1 — Pure helper math + integration guardrails.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeProviderFunnel,
  computeProviderProfileScore,
  computeDirectoryQuality,
  computeProviderSeoScore,
  helpLinkForKey,
  type GrowthBusiness,
} from '@/modules/growth/providerGrowth';

const draft: GrowthBusiness = {
  id: 'd1',
  name_ar: 'منشأة',
  approval_status: 'draft',
};

const ready: GrowthBusiness = {
  id: 'r1',
  name_ar: 'منشأة جاهزة',
  name_en: 'Ready Co',
  username: 'ready-co',
  username_status: 'approved',
  sectors: ['aluminum'],
  sub_services: ['windows', 'doors'],
  email: 'r@example.com',
  phone: '+966500000000',
  logo_url: 'https://x/y.png',
  description_ar: 'وصف مختصر يحتوي على معلومات كافية لمحركات البحث ولزوار الموقع المهتمين بالخدمات.',
  city: 'Riyadh',
  approval_status: 'published',
  is_active: true,
  is_demo: false,
  verified: true,
  gallery_count: 5,
  onboarding_completion: 100,
};

const pendingUsername: GrowthBusiness = { ...ready, id: 'u1', username_status: 'pending', approval_status: 'submitted' };

describe('PROVIDER-GROWTH-ENGINE-1', () => {
  describe('computeProviderFunnel', () => {
    it('returns 7 stages with monotonic conversion math', () => {
      const f = computeProviderFunnel([draft, ready, pendingUsername]);
      expect(f.stages.map((s) => s.stage)).toEqual([
        'registered', 'onboarding_started', 'profile_completed',
        'username_approved', 'published', 'active', 'verified',
      ]);
      expect(f.stages[0].count).toBe(3);
      expect(f.stages[4].count).toBe(1); // only `ready` is published
      expect(f.overallConversion).toBeCloseTo(1 / 3, 5);
      expect(f.stages.every((s) => s.conversionFromPrev >= 0 && s.conversionFromPrev <= 1)).toBe(true);
    });

    it('identifies the largest drop-off stage', () => {
      const f = computeProviderFunnel([draft, draft, draft, ready]);
      expect(f.largestDropOffStage).not.toBeNull();
      const stage = f.stages.find((s) => s.stage === f.largestDropOffStage);
      expect(stage?.dropOffFromPrev).toBeGreaterThan(0);
    });

    it('handles empty input safely', () => {
      const f = computeProviderFunnel([]);
      expect(f.overallConversion).toBe(0);
      expect(f.largestDropOffStage).toBeNull();
    });
  });

  describe('computeProviderProfileScore', () => {
    it('weak for empty profile', () => {
      expect(computeProviderProfileScore({}).level).toBe('weak');
    });
    it('excellent for a fully-completed published profile', () => {
      const s = computeProviderProfileScore(ready);
      expect(s.score).toBeGreaterThanOrEqual(85);
      expect(s.level).toBe('excellent');
      expect(s.missingRequired.length).toBe(0);
    });
    it('separates required / recommended / optional', () => {
      const s = computeProviderProfileScore(draft);
      expect(s.missingRequired.length).toBeGreaterThan(0);
      expect(s.missingRequired.every((f) => f.level === 'required')).toBe(true);
      expect(s.missingRecommended.every((f) => f.level === 'recommended')).toBe(true);
      expect(s.missingOptional.every((f) => f.level === 'optional')).toBe(true);
    });
    it('nextBestActions prioritise required', () => {
      const s = computeProviderProfileScore(draft);
      expect(s.nextBestActions.length).toBeGreaterThan(0);
      expect(s.nextBestActions[0].level).toBe('required');
      expect(s.nextBestActions.length).toBeLessThanOrEqual(4);
    });
    it('does NOT block publishing on optional items (parity with PublishReadinessPanel)', () => {
      // `ready` without banner+gallery should still score excellent and have no required misses.
      const withoutOptionals: GrowthBusiness = { ...ready, banner_url: null, gallery_count: 0, verified: false };
      const s = computeProviderProfileScore(withoutOptionals);
      expect(s.missingRequired.length).toBe(0);
    });
  });

  describe('computeDirectoryQuality', () => {
    it('aggregates metrics over rows', () => {
      const q = computeDirectoryQuality([ready, ready, draft]);
      expect(q.totalProviders).toBe(3);
      expect(q.publishedProviders).toBe(2);
      expect(q.verifiedProviders).toBe(2);
      expect(q.withLogo).toBe(2);
      expect(q.withSectors).toBe(2);
      expect(q.averageProfileScore).toBeGreaterThan(0);
      expect(q.readinessScore).toBeGreaterThan(0);
    });
    it('flags weak spots when publishing rate is low', () => {
      const q = computeDirectoryQuality([draft, draft]);
      expect(q.weakSpots).toContain('low_publish_rate');
      expect(q.suggestedAdminActions.length).toBeGreaterThan(0);
    });
    it('handles zero providers without dividing by zero', () => {
      const q = computeDirectoryQuality([]);
      expect(q.totalProviders).toBe(0);
      expect(q.readinessScore).toBe(0);
      expect(q.weakSpots).toContain('no_providers');
    });
  });

  describe('computeProviderSeoScore', () => {
    it('low score for empty profile, flags multiple issues', () => {
      const r = computeProviderSeoScore({});
      expect(r.score).toBeLessThan(20);
      expect(r.issues.length).toBeGreaterThan(3);
    });
    it('high score for a fully-published profile', () => {
      const r = computeProviderSeoScore(ready);
      expect(r.score).toBeGreaterThanOrEqual(85);
    });
    it('recommends but does not error on partial gallery', () => {
      const r = computeProviderSeoScore({ ...ready, gallery_count: 1 });
      expect(r.recommendations.some((x) => x.key === 'gallery-more')).toBe(true);
    });
  });

  describe('helpLinkForKey', () => {
    it('always returns a /help-prefixed URL — never a 404 shape', () => {
      const keys = ['logo', 'sectors', 'published', 'unknown-key', undefined];
      for (const k of keys) {
        expect(helpLinkForKey(k).startsWith('/help')).toBe(true);
      }
    });
  });

  describe('Integration guardrails', () => {
    const SRC = resolve(process.cwd(), 'src');
    const read = (p: string) => readFileSync(p, 'utf8');

    it('pure helper does not import the Supabase client', () => {
      const src = read(resolve(SRC, 'modules/growth/providerGrowth.ts'));
      expect(src.includes('@/integrations/supabase/client')).toBe(false);
      expect(src.includes('supabase.from')).toBe(false);
    });

    it('ProviderGrowthCard exists and is mounted in DashboardBusinessEdit', () => {
      expect(existsSync(resolve(SRC, 'components/growth/ProviderGrowthCard.tsx'))).toBe(true);
      const page = read(resolve(SRC, 'pages/dashboard/DashboardBusinessEdit.tsx'));
      expect(page).toContain('ProviderGrowthCard');
    });

    it('Admin growth panel exists and is mounted in AdminProviderReview', () => {
      expect(existsSync(resolve(SRC, 'components/admin/AdminProviderGrowthPanel.tsx'))).toBe(true);
      const page = read(resolve(SRC, 'pages/admin/AdminProviderReview.tsx'));
      expect(page).toContain('AdminProviderGrowthPanel');
    });

    it('new growth UI does not call supabase.from directly', () => {
      for (const p of [
        'components/growth/ProviderGrowthCard.tsx',
        'components/admin/AdminProviderGrowthPanel.tsx',
      ]) {
        const src = read(resolve(SRC, p));
        expect(src.includes('supabase.from')).toBe(false);
      }
    });

    it('does not introduce auto-publish or forbidden surface imports', () => {
      const forbiddenSubstrings = [
        'autoPublish', 'auto_publish', 'forcePublish',
        '@/modules/inventory', '@/modules/accounting',
        'supplier-portal', 'supplier_payments',
        'whatsapp', 'WhatsApp', 'sms', 'twilio',
      ];
      for (const p of [
        'modules/growth/providerGrowth.ts',
        'components/growth/ProviderGrowthCard.tsx',
        'components/admin/AdminProviderGrowthPanel.tsx',
      ]) {
        const src = read(resolve(SRC, p));
        for (const bad of forbiddenSubstrings) {
          expect(src.includes(bad), `${p} must not contain "${bad}"`).toBe(false);
        }
      }
    });

    it('mirrors PublishReadinessPanel required-field set (no conflicting rule)', () => {
      // Required factors in growth score must be a subset of the
      // PublishReadinessPanel required blockers. Source of truth stays
      // with PublishReadinessPanel.
      const panel = read(resolve(SRC, 'components/admin/PublishReadinessPanel.tsx'));
      const requiredInPanel = ['name', 'username', 'sectors', 'contact', 'is_active', 'not_demo'];
      for (const k of requiredInPanel) {
        expect(panel).toContain(`key: '${k}'`);
      }
      // Growth requires a subset (name, username, sectors, contact); no extra
      // publish blockers introduced.
      const score = computeProviderProfileScore({});
      const growthRequired = score.missingRequired.map((f) => f.key).sort();
      expect(growthRequired).toEqual(['contact', 'name', 'sectors', 'username']);
    });
  });

  /* ─────────── Part C — PublishReadinessPanel integration ─────────── */
  describe('PublishReadinessPanel integration (Part C)', () => {
    const SRC = resolve(process.cwd(), 'src');
    const panel = readFileSync(
      resolve(SRC, 'components/admin/PublishReadinessPanel.tsx'),
      'utf8',
    );

    it('imports growth helpers', () => {
      expect(panel).toContain("from '@/modules/growth/providerGrowth'");
      expect(panel).toContain('computeProviderProfileScore');
      expect(panel).toContain('computeProviderSeoScore');
      expect(panel).toContain('mapProfileActionToHelpLink');
    });

    it('renders profile and SEO scores', () => {
      expect(panel).toMatch(/data-testid="growth-scores"/);
      expect(panel).toMatch(/Profile score|جودة الملف/);
      expect(panel).toMatch(/SEO score|SEO/);
    });

    it('renders Required / Recommended / Optional groups', () => {
      expect(panel).toContain('data-testid="readiness-required"');
      expect(panel).toContain('data-testid="readiness-recommended"');
      expect(panel).toContain('data-testid="readiness-optional"');
    });

    it('renders Help Center links for missing items via the mapping helper', () => {
      expect(panel).toContain('data-testid="next-best-actions"');
      expect(panel).toContain('data-testid="help-link"');
      expect(panel).toContain('mapProfileActionToHelpLink(');
    });

    it('keeps publish blockers authoritative — recommended/optional do NOT block publishing', () => {
      // The published-blocker math still derives from `items` (required-only),
      // not from growth's recommended/optional sets.
      expect(panel).toContain('items.filter((i) => i.required && !i.ok)');
      // The "Cannot publish" copy is gated by `blockers.length > 0` only.
      expect(panel).toMatch(/blockers\.length\s*>\s*0/);
      // Recommended is explicitly labelled non-blocking.
      expect(panel).toMatch(/non-blocking|لا يمنع النشر/);
    });

    it('does not introduce auto-publish, hidden publish triggers, or scope creep', () => {
      const forbidden = [
        'autoPublish', 'auto_publish', 'forcePublish',
        '.update(', '.insert(', '.upsert(', // panel must remain presentational
        '@/modules/inventory', '@/modules/accounting',
        'supplier-portal', 'supplier_payments',
        'whatsapp', 'WhatsApp', 'twilio',
      ];
      for (const bad of forbidden) {
        expect(panel.includes(bad), `PublishReadinessPanel must not contain "${bad}"`).toBe(false);
      }
    });

    it('preserves the businesses_public visibility rule (is_active && published && !is_demo)', () => {
      // Source of truth stays in computePublicVisibility.
      expect(panel).toContain("approval_status === 'published'");
      expect(panel).toContain('is_active === false');
      expect(panel).toContain('is_demo === true');
    });

    it('does not add any direct supabase.from calls', () => {
      expect(panel.includes('supabase.from')).toBe(false);
      expect(panel.includes('@/integrations/supabase/client')).toBe(false);
    });

    it('growth required-field set is a subset of panel publish blockers', () => {
      const score = computeProviderProfileScore({});
      const growthRequired = new Set(score.missingRequired.map((f) => f.key));
      // Panel publish blockers include: name, username, sectors, contact, is_active, not_demo
      const panelRequired = new Set(['name', 'username', 'sectors', 'contact', 'is_active', 'not_demo']);
      for (const k of growthRequired) {
        expect(panelRequired.has(k), `growth key "${k}" must exist as a panel publish blocker`).toBe(true);
      }
    });

    it('exposes mapProfileActionToHelpLink as a stable alias of helpLinkForKey', async () => {
      const mod = await import('@/modules/growth/providerGrowth');
      expect(mod.mapProfileActionToHelpLink).toBe(mod.helpLinkForKey);
      expect(mod.mapProfileActionToHelpLink('logo')).toMatch(/^\/help/);
      expect(mod.mapProfileActionToHelpLink('username-approval')).toMatch(/^\/help/);
      expect(mod.mapProfileActionToHelpLink(undefined)).toMatch(/^\/help/);
    });
  });
});