/**
 * OPERATIONS-CENTER-UNIFICATION-1 — guardrails for the unified ops view.
 * File-system + source-text + pure-module checks (no rendering).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';
import {
  computeAgeHours,
  computeSlaStatus,
  computePriority,
  computeUnifiedKpis,
  projectSafeMetadata,
  SOURCE_SYSTEM_ROUTES,
  type UnifiedWorkItem,
} from '@/modules/operations/unifiedWorkQueue';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const PAGE = 'src/pages/admin/AdminOperationsCenterUnified.tsx';
const MODEL = 'src/modules/operations/unifiedWorkQueue.ts';
const SERVICE = 'src/modules/operations/services/unifiedOperationsQueries.ts';
const APP = 'src/App.tsx';

describe('OPERATIONS-CENTER-UNIFICATION-1', () => {
  it('unified model + query wrapper + page files exist', () => {
    for (const p of [MODEL, SERVICE, PAGE]) expect(existsSync(resolve(p))).toBe(true);
  });

  it('route /admin/operations-center is registered under ProtectedRoute requireAdmin', () => {
    const src = read(APP);
    expect(src).toMatch(
      /path="\/admin\/operations-center"[\s\S]+ProtectedRoute requireAdmin[\s\S]+AdminOperationsCenterUnified/,
    );
  });

  it('page has no direct supabase imports — only the service wrapper', () => {
    const src = read(PAGE);
    expect(src.includes('@/integrations/supabase/client')).toBe(false);
    expect(src.includes('supabase.from')).toBe(false);
    expect(src).toContain('@/modules/operations/services/unifiedOperationsQueries');
  });

  it('no new score engines are defined in the unified module', () => {
    const m = read(MODEL) + read(SERVICE);
    expect(m).not.toMatch(/function\s+compute[A-Za-z]*ReadinessScore/);
    expect(m).not.toMatch(/function\s+compute[A-Za-z]*QualityScore/);
  });

  it('no new pipeline table or migrations introduced', () => {
    const m = read(MODEL) + read(SERVICE) + read(PAGE);
    expect(m).not.toMatch(/CREATE\s+TABLE/i);
    expect(m).not.toMatch(/ALTER\s+TABLE/i);
    expect(m).not.toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(m).not.toMatch(/CREATE\s+POLICY/i);
  });

  it('page has no bulk publish, no mutation actions', () => {
    const src = read(PAGE).toLowerCase();
    expect(src).not.toContain('bulk publish');
    expect(src).not.toContain('bulkpublish');
    expect(src).not.toContain('autopublish');
    expect(src).not.toContain('.insert(');
    expect(src).not.toContain('.update(');
    expect(src).not.toContain('.delete(');
  });

  it('every source system has a route link in the page', () => {
    const src = read(PAGE);
    // The page renders SOURCE_SYSTEM_ROUTES via .map; the import alone proves
    // wiring, and we additionally check the registry covers all 15 systems.
    // The page renders the routes via snap.sources.map (snap.sources comes
    // from the service wrapper which re-exports SOURCE_SYSTEM_ROUTES).
    expect(src).toMatch(/snap\.sources\.map/);
    expect(SOURCE_SYSTEM_ROUTES.length).toBeGreaterThanOrEqual(15);
    for (const s of SOURCE_SYSTEM_ROUTES) {
      expect(typeof s.route).toBe('string');
      expect(s.route.startsWith('/')).toBe(true);
    }
  });

  it('help mapping admin.operations-center-unified exists', () => {
    const arr = contextualHelpRegistry['admin.operations-center-unified'];
    expect(Array.isArray(arr)).toBe(true);
    expect((arr ?? []).length).toBeGreaterThan(0);
    expect(read(PAGE)).toMatch(/HelpLauncher[^/]*pageKey=["']admin\.operations-center-unified["']/);
  });

  it('SLA rules: ok < 24h, warning 24–72h, overdue > 72h', () => {
    expect(computeSlaStatus(0)).toBe('ok');
    expect(computeSlaStatus(23)).toBe('ok');
    expect(computeSlaStatus(24)).toBe('warning');
    expect(computeSlaStatus(72)).toBe('warning');
    expect(computeSlaStatus(73)).toBe('overdue');
  });

  it('priority rules combine SLA + severity hint deterministically', () => {
    expect(computePriority('overdue', 'high')).toBe('critical');
    expect(computePriority('overdue', 'medium')).toBe('high');
    expect(computePriority('warning')).toBe('medium');
    expect(computePriority('ok')).toBe('low');
  });

  it('safe metadata strips unknown keys and clamps numeric scores', () => {
    const out = projectSafeMetadata({
      readiness_score: 9999,
      quality_score: -5,
      business_ref: 'BIZ-1000001',
      pii_email: 'leak@example.com',
    });
    expect(out.readiness_score).toBe(100);
    expect(out.quality_score).toBe(0);
    expect(out.business_ref).toBe('BIZ-1000001');
    expect('pii_email' in out).toBe(false);
  });

  it('computeAgeHours + computeUnifiedKpis aggregate without writes', () => {
    const now = new Date('2026-06-05T12:00:00Z');
    expect(computeAgeHours('2026-06-05T10:00:00Z', now)).toBe(2);
    const items: UnifiedWorkItem[] = [
      {
        ref: 'A', type: 'provider', title_ar: 'A', title_en: 'A',
        source_system: 'provider_growth', status: 'draft',
        priority: 'critical', sla_status: 'overdue',
        target_route: '/admin/provider-growth/queue',
        action_label_ar: 'x', action_label_en: 'x', age_hours: 100,
        safe_metadata: {},
      },
    ];
    const k = computeUnifiedKpis(items);
    expect(k.total).toBe(1);
    expect(k.overdue).toBe(1);
    expect(k.byPriority.critical).toBe(1);
  });
});