import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveEffectiveBusinessAccess,
  ACCESS_LABELS,
} from '@/modules/systemAccess/accessResolution';
import useEffectiveBusinessAccess from '@/hooks/useEffectiveBusinessAccess';

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf8');

const rgFiles = (pattern: RegExp, dir = 'src'): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (name === 'node_modules' || name === '__tests__' || name === 'tests') continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
        const body = fs.readFileSync(full, 'utf8');
        if (pattern.test(body)) out.push(full);
      }
    }
  };
  walk(dir);
  return out;
};

describe('ACCESS-GOVERNANCE-FINAL-1 — single source of truth', () => {
  it('audit doc documents the canonical layered model', () => {
    const doc = read('docs/access-governance-audit.md');
    for (const key of [
      'resolveEffectiveBusinessAccess',
      'useFeatureGate',
      'useVisibleModules',
      'useCan',
      'ACCESS_LABELS',
    ]) {
      expect(doc).toContain(key);
    }
  });

  it('useEffectiveBusinessAccess composes the resolver with module + visibility caches', () => {
    expect(typeof useEffectiveBusinessAccess).toBe('function');
    const src = read('src/hooks/useEffectiveBusinessAccess.ts');
    expect(src).toMatch(/resolveEffectiveBusinessAccess/);
    expect(src).toMatch(/listSystemModules/);
    expect(src).toMatch(/getUserVisibleModules/);
    expect(src).toMatch(/\['system-access',\s*'visible-modules'/);
  });

  it('hasMembershipFeature is consumed ONLY through useFeatureGate / admin pre-check', () => {
    const callers = rgFiles(/hasMembershipFeature/);
    const allowed = new Set([
      path.normalize('src/hooks/useFeatureGate.ts'),
      path.normalize('src/modules/memberships/index.ts'),
      path.normalize('src/modules/memberships/services/usage/reads.ts'),
      path.normalize('src/modules/systemAccess/services/updateBusinessSystemAccess.ts'),
    ]);
    const leaks = callers.map(p => path.normalize(p)).filter(p => !allowed.has(p));
    expect(leaks, `Unexpected hasMembershipFeature consumers: ${leaks.join(', ')}`).toEqual([]);
  });

  it('useVisibleModules / getUserVisibleModules are consumed only by canonical surfaces', () => {
    const callers = rgFiles(/getUserVisibleModules|useVisibleModules/);
    const allowed = new Set([
      'src/modules/systemAccess/index.ts',
      'src/hooks/useVisibleModules.ts',
      'src/hooks/useEffectiveBusinessAccess.ts',
      'src/pages/admin/AdminSystemAccess.tsx',
      'src/components/dashboard/DashboardSidebar.tsx',
      'src/App.tsx',
      'src/components/auth/ProtectedRoute.tsx',
      'src/components/auth/PermissionRouteGuard.tsx',
    ].map(p => path.normalize(p)));
    const leaks = callers.map(p => path.normalize(p)).filter(p => !allowed.has(p));
    expect(leaks, `Unexpected visibility consumers: ${leaks.join(', ')}`).toEqual([]);
  });

  it('ACCESS_LABELS exposes canonical bilingual disabled-state strings', () => {
    for (const k of ['active', 'membership_block', 'admin_disabled', 'business_suspended', 'synced'] as const) {
      expect(ACCESS_LABELS[k].ar.length).toBeGreaterThan(0);
      expect(ACCESS_LABELS[k].en.length).toBeGreaterThan(0);
    }
  });

  it('resolver returns admin_override / membership / business_status sources distinctly', () => {
    const out = resolveEffectiveBusinessAccess({
      modules: [
        { id: 'a', key: 'a', category: 'business', label_ar: 'a', label_en: 'a',
          description_ar: null, description_en: null, icon: null, route: null,
          is_core: false, default_enabled: true, default_account_types: [],
          sort_order: 0, is_active: true },
        { id: 'b', key: 'b', category: 'business', label_ar: 'b', label_en: 'b',
          description_ar: null, description_en: null, icon: null, route: null,
          is_core: false, default_enabled: true, default_account_types: [],
          sort_order: 0, is_active: true },
      ],
      visibility: [{ module_key: 'a', enabled: false, source: 'entity' }],
      membershipFeatures: { b: false },
    });
    expect(out.entries.find(e => e.module_key === 'a')?.source).toBe('admin_override');
    expect(out.entries.find(e => e.module_key === 'b')?.source).toBe('membership');
  });

  it('no production file re-implements "current plan supports feature" logic ad hoc', () => {
    const adhoc = rgFiles(/has_membership_feature\s*\(/);
    const allowed = new Set([
      path.normalize('src/modules/memberships/services/usage/reads.ts'),
      path.normalize('src/hooks/useFeatureGate.ts'),
    ]);
    const leaks = adhoc.map(p => path.normalize(p)).filter(p => !allowed.has(p));
    expect(leaks, `Ad-hoc plan checks: ${leaks.join(', ')}`).toEqual([]);
  });

  it('no service-role / RLS / membership-plan rewrites snuck in', () => {
    for (const f of [
      'src/hooks/useEffectiveBusinessAccess.ts',
      'src/modules/systemAccess/accessResolution.ts',
      'docs/access-governance-audit.md',
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/SERVICE_ROLE/);
      expect(src).not.toMatch(/ALTER\s+POLICY/i);
      expect(src).not.toMatch(/DROP\s+POLICY/i);
    }
  });
});