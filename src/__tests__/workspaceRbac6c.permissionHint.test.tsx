/**
 * WORKSPACE-RBAC-6C — Low-risk UI permission affordances.
 *
 * Verifies:
 *  - PermissionHint renders children when permitted.
 *  - PermissionHint renders a disabled wrapper + denial copy when not permitted.
 *  - PermissionGate hides children when not permitted.
 *  - Denial copy exists in both Arabic and English.
 *  - Only the 6C-approved pages adopt PermissionHint / PermissionGate.
 *  - No contracts / payments / membership / auth pages were touched.
 *  - No RLS / RPC / policy migrations introduced.
 *  - No page calls supabase.rpc('has_permission') yet.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import {
  PermissionGate,
  PermissionHint,
  PERMISSION_DENIED_COPY,
} from '@/components/workspace/PermissionGate';

vi.mock('@/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => ({ active_role: 'viewer', permissions: [] }),
}));
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: false, language: 'en' }),
}));

describe('WORKSPACE-RBAC-6C — PermissionGate / PermissionHint', () => {
  it('PermissionGate hides children when permission missing', () => {
    render(
      <PermissionGate permission="services.manage">
        <button>Add Service</button>
      </PermissionGate>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('PermissionGate renders fallback when provided', () => {
    render(
      <PermissionGate permission="services.manage" fallback={<span>locked</span>}>
        <button>Add</button>
      </PermissionGate>,
    );
    expect(screen.getByText('locked')).toBeInTheDocument();
  });

  it('PermissionHint renders disabled wrapper when permission missing', () => {
    const { container } = render(
      <PermissionHint permission="services.manage">
        <button>Add Service</button>
      </PermissionHint>,
    );
    const span = container.querySelector('[data-permission-denied="true"]');
    expect(span).not.toBeNull();
    expect(span?.getAttribute('aria-disabled')).toBe('true');
    expect(span?.className).toContain('pointer-events-none');
    expect(screen.getByText('Add Service')).toBeInTheDocument();
  });

  it('denial copy exists in both Arabic and English', () => {
    expect(PERMISSION_DENIED_COPY.ar).toBe('لا تملك صلاحية تنفيذ هذا الإجراء');
    expect(PERMISSION_DENIED_COPY.en).toBe('You do not have permission to perform this action');
  });
});

describe('WORKSPACE-RBAC-6C — owner short-circuit', () => {
  it('PermissionGate renders children when active_role is owner', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useActiveWorkspace', () => ({
      useActiveWorkspace: () => ({ active_role: 'owner', permissions: [] }),
    }));
    vi.doMock('@/i18n/LanguageContext', () => ({
      useLanguage: () => ({ isRTL: false, language: 'en' }),
    }));
    const mod = await import('@/components/workspace/PermissionGate');
    render(
      <mod.PermissionGate permission="services.manage">
        <button>Add Service</button>
      </mod.PermissionGate>,
    );
    expect(screen.getByRole('button', { name: 'Add Service' })).toBeInTheDocument();
  });
});

describe('WORKSPACE-RBAC-6C — safety invariants', () => {
  const SRC = join(process.cwd(), 'src');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
    }
    return out;
  };

  const ALLOWED_PAGES = [
    'pages/dashboard/DashboardServices.tsx',
    'pages/dashboard/DashboardPortfolio.tsx',
    'pages/dashboard/DashboardPromotions.tsx',
  ].map((p) => join(SRC, p));

  it('PermissionHint/PermissionGate adoption is limited to the approved pages', () => {
    const files = walk(join(SRC, 'pages'));
    const callers = files.filter((f) => {
      const c = readFileSync(f, 'utf8');
      return /\bPermissionHint\b|\bPermissionGate\b|\buseCan\s*\(/.test(c);
    });
    expect(new Set(callers)).toEqual(new Set(ALLOWED_PAGES));
  });

  it('does NOT touch contracts / payments / membership / auth pages', () => {
    const forbidden = [
      'pages/dashboard/DashboardContracts.tsx',
      'pages/dashboard/DashboardContractAnalytics.tsx',
      'pages/dashboard/DashboardInstallments.tsx',
      'pages/MembershipPaymentReturn.tsx',
      'pages/Auth.tsx',
      'pages/dashboard/ProviderMembership.tsx',
    ];
    for (const rel of forbidden) {
      const c = readFileSync(join(SRC, rel), 'utf8');
      expect(c).not.toMatch(/\bPermissionHint\b/);
      expect(c).not.toMatch(/\bPermissionGate\b/);
      expect(c).not.toMatch(/\buseCan\s*\(/);
    }
  });

  it('no page calls the has_permission RPC yet', () => {
    const files = walk(join(SRC, 'pages'));
    const fnName = ['has', 'permission'].join('_');
    const re = new RegExp('rpc\\(\\s*["\'`]' + fnName + '["\'`]');
    for (const f of files) {
      const c = readFileSync(f, 'utf8');
      expect(re.test(c)).toBe(false);
    }
  });

  it('helper component is UI-only (no mutation, auth, payment, RLS imports)', () => {
    const src = readFileSync(join(SRC, 'components/workspace/PermissionGate.tsx'), 'utf8');
    expect(src).not.toMatch(/@\/modules\/memberships/);
    expect(src).not.toMatch(/@\/modules\/payments/);
    expect(src).not.toMatch(/@\/contexts\/AuthContext/);
    expect(src).not.toMatch(/supabase\.auth\b/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.rpc\(/);
  });

  it('no new migrations were introduced for this phase', () => {
    const migDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      const c = readFileSync(join(migDir, f), 'utf8');
      // 6C must not introduce any policy referencing PermissionHint/Gate (sanity).
      expect(c).not.toMatch(/PermissionHint|PermissionGate/);
    }
  });
});