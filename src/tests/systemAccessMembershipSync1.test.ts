import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveEffectiveBusinessAccess,
  ACCESS_LABELS,
} from '@/modules/systemAccess/accessResolution';
import { updateBusinessSystemAccess } from '@/modules/systemAccess/services/updateBusinessSystemAccess';
import useBusinessAccessInvalidation from '@/hooks/useBusinessAccessInvalidation';
import type { SystemModule } from '@/modules/systemAccess';

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf8');

const mod = (k: string, extra: Partial<SystemModule> = {}): SystemModule => ({
  id: k,
  key: k,
  category: 'business',
  label_ar: k,
  label_en: k,
  description_ar: null,
  description_en: null,
  icon: null,
  route: `/dashboard/${k}`,
  is_core: false,
  default_enabled: true,
  default_account_types: [],
  sort_order: 0,
  is_active: true,
  ...extra,
});

describe('SYSTEM-ACCESS-MEMBERSHIP-SYNC-1', () => {
  it('admin route is wired in App.tsx', () => {
    const src = read('src/App.tsx');
    expect(src).toMatch(/\/admin\/system-access/);
    expect(src).toMatch(/AdminSystemAccess/);
  });

  it('admin page routes writes through the wrapper (no direct setModuleOverride/clearModuleOverride imports)', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/updateBusinessSystemAccess/);
    expect(src).toMatch(/useBusinessAccessInvalidation/);
    // The page must NOT re-import the raw RPC wrappers anymore.
    expect(/from '@\/modules\/systemAccess'[^;]*setModuleOverride/.test(src)).toBe(false);
    expect(/from '@\/modules\/systemAccess'[^;]*clearModuleOverride/.test(src)).toBe(false);
  });

  it('resolveEffectiveBusinessAccess exists and resolves admin-disabled', () => {
    const out = resolveEffectiveBusinessAccess({
      modules: [mod('contracts'), mod('procurement')],
      visibility: [
        { module_key: 'contracts', enabled: false, source: 'entity' },
        { module_key: 'procurement', enabled: true, source: 'module_default' },
      ],
    });
    expect(out.allowed).toContain('procurement');
    expect(out.disabled).toContain('contracts');
    const c = out.entries.find(e => e.module_key === 'contracts');
    expect(c?.source).toBe('admin_override');
    expect(c?.reason_ar).toBe(ACCESS_LABELS.admin_disabled.ar);
  });

  it('membership block prevents an enabled feature from being effective', () => {
    const out = resolveEffectiveBusinessAccess({
      modules: [mod('brands')],
      visibility: [{ module_key: 'brands', enabled: true, source: 'module_default' }],
      membershipFeatures: { brands: false },
    });
    expect(out.disabled).toContain('brands');
    const b = out.entries.find(e => e.module_key === 'brands');
    expect(b?.source).toBe('membership');
    expect(b?.reason_en).toBe(ACCESS_LABELS.membership_block.en);
  });

  it('suspended business hides non-core modules', () => {
    const out = resolveEffectiveBusinessAccess({
      modules: [mod('core_x', { is_core: true }), mod('contracts')],
      visibility: [],
      businessStatus: 'suspended',
    });
    expect(out.allowed).toContain('core_x');
    expect(out.disabled).toContain('contracts');
  });

  it('update wrapper rejects non-admin callers without writing', async () => {
    const res = await updateBusinessSystemAccess({
      moduleKey: 'contracts',
      scopeType: 'entity',
      scopeValue: 'ent_1',
      enabled: true,
      isAdmin: false,
    });
    expect(res.ok).toBe(false);
    expect(res.changed).toBe(false);
    expect(res.reason_en).toMatch(/Admin/);
  });

  it('useBusinessAccessInvalidation hook module exists and exports a default', () => {
    expect(typeof useBusinessAccessInvalidation).toBe('function');
    const src = read('src/hooks/useBusinessAccessInvalidation.ts');
    // covers sidebar/menu, feature gates, membership, workspace
    for (const key of [
      'system-access',
      'visible-modules',
      'feature-gate',
      'membership-subscription',
      'workspace',
    ]) {
      expect(src).toContain(key);
    }
  });

  it('admin page broadly invalidates feature gates after a write', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/invalidateAccess\(/);
    expect(src).toMatch(/includeAudit:\s*true/);
  });

  it('audit row is written by the existing security-definer RPC (not bypassed)', () => {
    const src = read('src/modules/systemAccess/services/updateBusinessSystemAccess.ts');
    // wrapper uses the RPC-backed helpers
    expect(src).toMatch(/setModuleOverride/);
    expect(src).toMatch(/clearModuleOverride/);
    // never references the service-role key
    expect(src).not.toMatch(/SERVICE_ROLE/);
  });

  it('UI surfaces the synced + membership-block + admin-disabled states', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/system-access-sync-indicator/);
    expect(src).toMatch(/ACCESS_LABELS\.synced/);
    expect(src).toMatch(/blocked_by_membership/);
  });

  it('no inventory/accounting/supplier-payment scope creep was introduced', () => {
    for (const file of [
      'src/modules/systemAccess/accessResolution.ts',
      'src/modules/systemAccess/services/updateBusinessSystemAccess.ts',
      'src/hooks/useBusinessAccessInvalidation.ts',
    ]) {
      const src = read(file);
      expect(src).not.toMatch(/inventory|accounting|supplier.?payment/i);
    }
  });

  it('audit doc was authored for this phase', () => {
    const src = read('docs/system-access-membership-sync-audit.md');
    expect(src).toMatch(/SYSTEM-ACCESS-MEMBERSHIP-SYNC-1/);
    expect(src).toMatch(/membership/i);
    expect(src).toMatch(/visible-modules/);
  });
});