import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeOverviewMetrics,
  statusDistribution,
  completenessDistribution,
  entityTypeDistribution,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { BUSINESS_ADMIN_TABS } from '@/modules/admin/businesses/businessAdminTabs';

/**
 * ADMIN BUSINESSES + PROVIDERS CONTROL CENTER — Phase 1 guard.
 *
 * Verifies the new tabs shell + overview analytics:
 *   1. all six tabs declared and wired into AdminBusinesses
 *   2. overview tab derived from real row helpers (no fake numbers)
 *   3. existing list/filters/table still mounted under the "businesses" tab
 *   4. presentation primitives stay token-only (no hex, no `as any`,
 *      no suppressions)
 *   5. no Supabase / RLS / RPC / migration / edge changes from Phase 1
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

const NEW_FILES = [
  'src/modules/admin/businesses/businessAdminMetrics.ts',
  'src/modules/admin/businesses/businessAdminTabs.ts',
  'src/components/admin/businesses/control-center/OverviewTab.tsx',
  'src/components/admin/businesses/control-center/ComingNextTab.tsx',
  'src/components/admin/businesses/control-center/MetricBarList.tsx',
];

describe('AdminBusinesses control-center — Phase 1 (tabs shell + overview)', () => {
  it('every new file exists on disk', () => {
    for (const p of NEW_FILES) {
      expect(fs.existsSync(path.join(repo, p)), `missing ${p}`).toBe(true);
    }
  });

  it('declares the full six-tab control-center contract', () => {
    const ids = BUSINESS_ADMIN_TABS.map((t) => t.id).sort();
    expect(ids).toEqual(
      ['businesses', 'overview', 'pilot', 'providers', 'review', 'taxonomies'].sort(),
    );
    // Phase 2 (rebuild) ships every tab; all are marked ready.
    const ready = BUSINESS_ADMIN_TABS.filter((t) => t.ready).map((t) => t.id).sort();
    expect(ready).toEqual(
      ['businesses', 'overview', 'pilot', 'providers', 'review', 'taxonomies'].sort(),
    );
  });

  it('AdminBusinesses wraps content in Tabs and mounts every tab', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/<ControlCenterOverviewTab\b/);
    expect(src).toMatch(/<Tabs\b[^>]*value=\{activeTab\}/);
    for (const t of BUSINESS_ADMIN_TABS) {
      expect(src.includes(`value="${t.id}"`), `tab ${t.id} not mounted`).toBe(true);
    }
    // existing list / filters / pagination still live inside the businesses tab
    expect(src).toMatch(/<BusinessFiltersBar\b/);
    expect(src).toMatch(/<BusinessTableSection\b/);
    expect(src).toMatch(/<BusinessPaginationFooter\b/);
    // new page title
    expect(src).toMatch(/إدارة الجهات والمزودين/);
  });

  it('overview metrics are computed from real rows (no hardcoded numbers)', () => {
    const rows: BusinessMetricsRow[] = [
      { id: '1', is_active: true,  username: 'a', phone: '+9665', entity_type: 'company' },
      { id: '2', is_active: false, approval_status: 'draft' },
      { id: '3', is_active: true,  is_verified: true, username: 'b', email: 'b@x', entity_type: 'company' },
      { id: '4', is_active: false, approval_status: 'pending' },
      { id: '5', is_active: true,  is_demo: true, username: 'd', phone: '+9665' },
    ];
    const m = computeOverviewMetrics(rows);
    expect(m.total).toBe(5);
    expect(m.published).toBe(2); // demo excluded
    expect(m.verified).toBe(1);
    expect(m.drafts).toBeGreaterThanOrEqual(1);
    expect(m.pendingReview).toBe(1);
    expect(m.pilotReady).toBe(2);

    const sd = statusDistribution(rows, true);
    expect(sd.every((b) => b.count > 0)).toBe(true);
    expect(sd.reduce((s, b) => s + b.count, 0)).toBeGreaterThan(0);

    const cd = completenessDistribution(rows, false);
    expect(cd.find((b) => b.key === 'publicLink')?.count).toBe(2); // rows 2 + 4 lack username

    const ed = entityTypeDistribution(rows, false);
    expect(ed.find((b) => b.key === 'company')?.count).toBe(2);
  });

  it('completeness counts missing public link correctly', () => {
    const rows: BusinessMetricsRow[] = [
      { id: '1', username: null },
      { id: '2', username: '' },
      { id: '3', username: 'ok' },
    ];
    const cd = completenessDistribution(rows, false);
    expect(cd.find((b) => b.key === 'publicLink')?.count).toBe(2);
  });

  it('Phase 1 files contain no hex colors, no `as any`, no suppressions', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(/#[0-9a-fA-F]{3,8}\b/.test(stripped), `hex color in ${p}`).toBe(false);
      expect(/\bas\s+any\b/.test(stripped), `'as any' in ${p}`).toBe(false);
      expect(/@ts-(ignore|expect-error)/.test(stripped), `ts suppression in ${p}`).toBe(false);
      expect(/eslint-disable/.test(stripped), `eslint-disable in ${p}`).toBe(false);
    }
  });

  it('Phase 1 introduces no Supabase / RLS / RPC / migration / edge changes', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(/from\s+['"]@\/integrations\/supabase\//.test(src), `${p} imports supabase`).toBe(false);
      expect(/\.rpc\s*\(/.test(src), `${p} calls rpc`).toBe(false);
      expect(/supabase\./.test(src), `${p} touches supabase client`).toBe(false);
    }
  });

  it('coming-next tabs render structure only — never fake numbers', () => {
    const src = read('src/components/admin/businesses/control-center/ComingNextTab.tsx');
    // No hardcoded counts / percentages
    expect(/\b\d+%/.test(src)).toBe(false);
    expect(/value=\{?\s*\d+/.test(src)).toBe(false);
  });
});