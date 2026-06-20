import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isPilotReady,
  isProviderLike,
  providerSegment,
  pilotReadinessReasons,
  cityDistribution,
  reviewBuckets,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { BUSINESS_ADMIN_TABS } from '@/modules/admin/businesses/businessAdminTabs';

/**
 * ADMIN BUSINESSES + PROVIDERS CONTROL CENTER —
 * Professional Rebuild guard (Phase 2).
 *
 * Locks the rebuilt control center: every tab ships real content,
 * provider segmentation is deterministic, pilot readiness reasons
 * are surfaced for not-ready rows, and the new files honor the
 * project guardrails (tokens only, no `any`, no suppressions, no
 * Supabase/DB/RPC/edge changes).
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

const REBUILD_FILES = [
  'src/components/admin/businesses/control-center/BusinessMiniCard.tsx',
  'src/components/admin/businesses/control-center/ProvidersTab.tsx',
  'src/components/admin/businesses/control-center/TaxonomiesTab.tsx',
  'src/components/admin/businesses/control-center/ReviewTab.tsx',
  'src/components/admin/businesses/control-center/PilotTab.tsx',
];

describe('AdminBusinesses control-center — Professional Rebuild', () => {
  it('every rebuild file exists on disk', () => {
    for (const p of REBUILD_FILES) {
      expect(fs.existsSync(path.join(repo, p)), `missing ${p}`).toBe(true);
    }
  });

  it('every tab is ready (no coming-next placeholders left)', () => {
    const notReady = BUSINESS_ADMIN_TABS.filter((t) => !t.ready);
    expect(notReady, `unready tabs: ${notReady.map((t) => t.id).join(',')}`).toHaveLength(0);
  });

  it('AdminBusinesses mounts all four new tab components', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/<ControlCenterProvidersTab\b/);
    expect(src).toMatch(/<ControlCenterTaxonomiesTab\b/);
    expect(src).toMatch(/<ControlCenterReviewTab\b/);
    expect(src).toMatch(/<ControlCenterPilotTab\b/);
    // Legacy table + filters still mounted inside the businesses tab
    expect(src).toMatch(/<BusinessFiltersBar\b/);
    expect(src).toMatch(/<BusinessTableSection\b/);
    // Coming-next placeholders are no longer referenced
    expect(/<ComingNextTab\b/.test(src), 'ComingNextTab still rendered').toBe(false);
  });

  it('provider segmentation is deterministic and covers every provider exactly once', () => {
    const rows: BusinessMetricsRow[] = [
      // qualified
      { id: '1', entity_type: 'company',       is_active: true,  username: 'a', phone: '+9665' },
      // no contact
      { id: '2', entity_type: 'company',       is_active: true,  username: 'b' },
      // no public link
      { id: '3', entity_type: 'establishment', is_active: true,  phone: '+9665' },
      // unpublished (inactive)
      { id: '4', entity_type: 'company',       is_active: false, username: 'c', phone: '+9665' },
      // pending review
      { id: '5', entity_type: 'company',       approval_status: 'pending', is_active: true, username: 'd', phone: '+9665' },
      // not provider-like (individual) — must be filtered out
      { id: '6', entity_type: 'individual',    is_active: true,  username: 'e', phone: '+9665' },
    ];
    const providers = rows.filter(isProviderLike);
    expect(providers).toHaveLength(5);
    expect(providerSegment(providers[0])).toBe('qualified');
    expect(providerSegment(providers[1])).toBe('noContact');
    expect(providerSegment(providers[2])).toBe('noPublicLink');
    expect(providerSegment(providers[3])).toBe('unpublished');
    expect(providerSegment(providers[4])).toBe('pendingOrRejected');
  });

  it('pilot readiness reasons surface for not-ready rows and stay empty when ready', () => {
    const ready: BusinessMetricsRow = { id: 'r', is_active: true, username: 'ok', phone: '+9665' };
    expect(isPilotReady(ready)).toBe(true);
    expect(pilotReadinessReasons(ready, true)).toEqual([]);

    const broken: BusinessMetricsRow = { id: 'x', is_active: false };
    const reasons = pilotReadinessReasons(broken, false);
    expect(reasons.length).toBeGreaterThan(0);
    // Includes both "Inactive" and "Missing public link" and "Missing contact"
    expect(reasons).toEqual(expect.arrayContaining(['Inactive', 'Missing public link', 'Missing contact']));
  });

  it('city distribution returns real, ordered buckets without inventing labels', () => {
    const rows: BusinessMetricsRow[] = [
      { id: '1', region: 'الرياض' },
      { id: '2', region: 'الرياض' },
      { id: '3', region: 'جدة' },
      { id: '4' },
    ];
    const cd = cityDistribution(rows, true);
    expect(cd[0].label).toBe('الرياض');
    expect(cd[0].count).toBe(2);
    expect(cd.some((b) => b.label === 'جدة')).toBe(true);
    expect(cd.reduce((s, b) => s + b.count, 0)).toBe(3); // row 4 skipped
  });

  it('review buckets partition the rows into actionable groups', () => {
    const rows: BusinessMetricsRow[] = [
      { id: '1', is_active: false, approval_status: 'draft' },
      { id: '2', is_active: false, approval_status: 'pending' },
      { id: '3', is_active: true, is_demo: true, username: 'd' },
      { id: '4', is_active: true, username: '' },
    ];
    const buckets = reviewBuckets(rows, false);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.rows.length]));
    expect(byKey.drafts).toBeGreaterThanOrEqual(1);
    expect(byKey.pending).toBe(1);
    expect(byKey.demo).toBe(1);
    expect(byKey.noUsername).toBeGreaterThanOrEqual(1);
  });

  it('rebuild files use design tokens — no hex, no `as any`, no suppressions, no direct supabase access', () => {
    for (const p of REBUILD_FILES) {
      const src = read(p);
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(/#[0-9a-fA-F]{3,8}\b/.test(stripped), `hex color in ${p}`).toBe(false);
      expect(/\bas\s+any\b/.test(stripped), `'as any' in ${p}`).toBe(false);
      expect(/@ts-(ignore|expect-error)/.test(stripped), `ts suppression in ${p}`).toBe(false);
      expect(/eslint-disable/.test(stripped), `eslint-disable in ${p}`).toBe(false);
      expect(/from\s+['"]@\/integrations\/supabase\//.test(stripped), `supabase import in ${p}`).toBe(false);
      expect(/\.rpc\s*\(/.test(stripped), `rpc call in ${p}`).toBe(false);
    }
  });
});