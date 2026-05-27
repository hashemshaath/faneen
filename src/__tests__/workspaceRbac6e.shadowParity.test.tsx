/**
 * WORKSPACE-RBAC-6E — Shadow parity layer (observability only).
 *
 * Verifies:
 *  - `hasPermissionServer` wrapper calls `rpc('has_permission')` with the
 *    canonical argument shape and short-circuits on missing inputs.
 *  - `useHasPermission` does not call the server without user+entity+permission.
 *  - `usePermissionParity` warns once on mismatch in non-production, never throws.
 *  - Parity hook is wired ONLY on the 6C/6D-approved pages.
 *  - No RLS / migration / forbidden surface is touched.
 *  - PermissionHint behavior in UI still keys off `useCan`, not the server.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, act } from '@testing-library/react';

const SRC = join(process.cwd(), 'src');

// ─── hasPermissionServer wrapper ────────────────────────────────────────────

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpcMock(...a) },
}));

describe('WORKSPACE-RBAC-6E — hasPermissionServer wrapper', () => {
  beforeEach(() => rpcMock.mockReset());

  it('calls rpc("has_permission") with canonical _user_id/_entity_id/_permission args', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const { hasPermissionServer } = await import(
      '@/modules/workspace/services/hasPermissionServer'
    );
    const res = await hasPermissionServer({
      userId: 'u-1',
      entityId: 'e-1',
      permission: 'services.manage',
    });
    expect(rpcMock).toHaveBeenCalledWith('has_permission', {
      _user_id: 'u-1',
      _entity_id: 'e-1',
      _permission: 'services.manage',
    });
    expect(res).toEqual({ data: true, error: null });
  });

  it('short-circuits without calling rpc when inputs are missing', async () => {
    const { hasPermissionServer } = await import(
      '@/modules/workspace/services/hasPermissionServer'
    );
    const r1 = await hasPermissionServer({ userId: '', entityId: 'e', permission: 'p' });
    const r2 = await hasPermissionServer({ userId: 'u', entityId: '', permission: 'p' });
    const r3 = await hasPermissionServer({ userId: 'u', entityId: 'e', permission: '' });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(r1.data).toBeNull();
    expect(r2.data).toBeNull();
    expect(r3.data).toBeNull();
  });

  it('returns raw error from rpc without throwing', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const { hasPermissionServer } = await import(
      '@/modules/workspace/services/hasPermissionServer'
    );
    const res = await hasPermissionServer({
      userId: 'u',
      entityId: 'e',
      permission: 'p',
    });
    expect(res.error).toEqual({ message: 'boom' });
    expect(res.data).toBeNull();
  });
});

// ─── usePermissionParity behavior ───────────────────────────────────────────

describe('WORKSPACE-RBAC-6E — usePermissionParity (non-production)', () => {
  afterEach(() => vi.resetModules());

  it('warns once on mismatch (client true, server false) and never throws', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useCan', () => ({ useCan: () => true }));
    vi.doMock('@/hooks/useHasPermission', () => ({
      useHasPermission: () => ({ data: false, isLoading: false, error: null }),
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { usePermissionParity } = await import('@/hooks/usePermissionParity');
    const Probe: React.FC = () => {
      usePermissionParity('services.manage');
      return null;
    };
    await act(async () => {
      render(<Probe />);
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('rbac-parity');
    warn.mockRestore();
  });

  it('does not warn when server result matches client', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useCan', () => ({ useCan: () => true }));
    vi.doMock('@/hooks/useHasPermission', () => ({
      useHasPermission: () => ({ data: true, isLoading: false, error: null }),
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { usePermissionParity } = await import('@/hooks/usePermissionParity');
    const Probe: React.FC = () => {
      usePermissionParity('services.manage');
      return null;
    };
    await act(async () => {
      render(<Probe />);
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn while server result is still loading', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useCan', () => ({ useCan: () => true }));
    vi.doMock('@/hooks/useHasPermission', () => ({
      useHasPermission: () => ({ data: null, isLoading: true, error: null }),
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { usePermissionParity } = await import('@/hooks/usePermissionParity');
    const Probe: React.FC = () => {
      usePermissionParity('services.manage');
      return null;
    };
    await act(async () => {
      render(<Probe />);
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ─── Source / safety invariants ─────────────────────────────────────────────

describe('WORKSPACE-RBAC-6E — safety invariants', () => {
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

  const ALLOWED_PARITY_PAGES = new Set(
    [
      'pages/dashboard/DashboardServices.tsx',
      'pages/dashboard/DashboardBusinessEdit.tsx',
    ].map((p) => join(SRC, p)),
  );

  it('usePermissionParity is wired only on the approved low-risk pages', () => {
    const files = walk(join(SRC, 'pages'));
    const callers = files.filter((f) =>
      /\busePermissionParity\s*\(/.test(readFileSync(f, 'utf8')),
    );
    expect(new Set(callers)).toEqual(ALLOWED_PARITY_PAGES);
  });

  it('useHasPermission is not consumed by any forbidden surface', () => {
    const forbidden = [
      'pages/dashboard/DashboardContracts.tsx',
      'pages/dashboard/DashboardContractAnalytics.tsx',
      'pages/dashboard/DashboardInstallments.tsx',
      'pages/dashboard/DashboardLeads.tsx',
      'pages/dashboard/DashboardNotifications.tsx',
      'pages/MembershipPaymentReturn.tsx',
      'pages/Auth.tsx',
      'pages/dashboard/ProviderMembership.tsx',
    ];
    for (const rel of forbidden) {
      const c = readFileSync(join(SRC, rel), 'utf8');
      expect(c).not.toMatch(/\buseHasPermission\b/);
      expect(c).not.toMatch(/\busePermissionParity\b/);
      expect(c).not.toMatch(/hasPermissionServer/);
    }
  });

  it('no admin page consumes the shadow parity layer', () => {
    const files = walk(join(SRC, 'pages/admin'));
    for (const f of files) {
      const c = readFileSync(f, 'utf8');
      expect(c).not.toMatch(/\buseHasPermission\b/);
      expect(c).not.toMatch(/\busePermissionParity\b/);
      expect(c).not.toMatch(/hasPermissionServer/);
    }
  });

  it('PermissionHint behavior in UI still keys off useCan (no server gating yet)', () => {
    const helper = readFileSync(
      join(SRC, 'components/workspace/PermissionGate.tsx'),
      'utf8',
    );
    expect(helper).not.toMatch(/useHasPermission/);
    expect(helper).not.toMatch(/usePermissionParity/);
    expect(helper).not.toMatch(/has_permission/);
    expect(helper).toMatch(/useCan/);
  });

  it('parity hook never imports payments / memberships / auth modules', () => {
    const p = readFileSync(join(SRC, 'hooks/usePermissionParity.ts'), 'utf8');
    const s = readFileSync(
      join(SRC, 'modules/workspace/services/hasPermissionServer.ts'),
      'utf8',
    );
    for (const src of [p, s]) {
      expect(src).not.toMatch(/@\/modules\/memberships/);
      expect(src).not.toMatch(/@\/modules\/payments/);
      expect(src).not.toMatch(/@\/contexts\/AuthContext/);
      expect(src).not.toMatch(/supabase\.from\(/);
    }
  });

  it('no migration was introduced in this phase', () => {
    const migDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      const c = readFileSync(join(migDir, f), 'utf8');
      expect(c).not.toMatch(/usePermissionParity|useHasPermission|hasPermissionServer/);
    }
  });
});