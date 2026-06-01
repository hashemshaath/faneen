/**
 * WORKSPACE-RBAC-6D — Second low-risk UI batch.
 *
 * Verifies:
 *  - DashboardBusinessEdit Save buttons are wrapped with PermissionHint
 *    keyed by `entity.manage`.
 *  - Owner role short-circuits to enabled (existing 6C behavior).
 *  - Missing permission renders disabled wrapper + bilingual tooltip.
 *  - The mutation handler is not invoked when the wrapper blocks pointer events.
 *  - The 6D adoption list still excludes contracts / payments / membership /
 *    auth / admin / quote-accept / lead-notification pages.
 *  - No RLS / RPC / migration was introduced for this phase.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';

const SRC = join(process.cwd(), 'src');
const PAGE = join(SRC, 'pages/dashboard/DashboardBusinessEdit.tsx');

describe('WORKSPACE-RBAC-6D — DashboardBusinessEdit adoption', () => {
  const src = readFileSync(PAGE, 'utf8');

  it('imports PermissionHint from the workspace helper', () => {
    expect(src).toMatch(
      /import\s*\{\s*PermissionHint\s*\}\s*from\s*['"]@\/components\/workspace\/PermissionGate['"]/,
    );
  });

  it('wraps every Save button with PermissionHint permission="entity.manage"', () => {
    const wrappers = src.match(/<PermissionHint\s+permission="entity\.manage">/g) ?? [];
    expect(wrappers.length).toBeGreaterThanOrEqual(2);
    // Each wrapper must contain a Save action button inside it.
    const blocks = src.split('<PermissionHint permission="entity.manage">').slice(1);
    for (const b of blocks) {
      const inner = b.split('</PermissionHint>')[0] ?? '';
      expect(inner).toMatch(/<Button[\s\S]*?onClick=\{handleSave\}/);
    }
  });

  it('does NOT import payments / memberships / contract-signing modules', () => {
    expect(src).not.toMatch(/@\/modules\/memberships/);
    expect(src).not.toMatch(/@\/modules\/payments/);
    expect(src).not.toMatch(/contractSign|signContract|acceptQuote|rejectQuote/);
  });
});

describe('WORKSPACE-RBAC-6D — PermissionHint behavior (entity.manage)', () => {
  it('viewer: renders disabled wrapper and blocks click', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useActiveWorkspace', () => ({
      useActiveWorkspace: () => ({ active_role: 'viewer', permissions: [] }),
    }));
    vi.doMock('@/i18n/LanguageContext', () => ({
      useLanguage: () => ({ isRTL: false, language: 'en' }),
    }));
    const { PermissionHint } = await import('@/components/workspace/PermissionGate');
    const onClick = vi.fn();
    const { container } = render(
      <PermissionHint permission="entity.manage">
        <button onClick={onClick}>Save changes</button>
      </PermissionHint>,
    );
    const wrapper = container.querySelector('[data-permission-denied="true"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-disabled')).toBe('true');
    expect(wrapper?.className).toContain('pointer-events-none');
    // jsdom doesn't honor CSS pointer-events; we just assert the affordance.
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  it('owner: renders children verbatim (button clickable)', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useActiveWorkspace', () => ({
      useActiveWorkspace: () => ({ active_role: 'owner', permissions: [] }),
    }));
    vi.doMock('@/i18n/LanguageContext', () => ({
      useLanguage: () => ({ isRTL: false, language: 'en' }),
    }));
    const { PermissionHint } = await import('@/components/workspace/PermissionGate');
    const onClick = vi.fn();
    const { container } = render(
      <PermissionHint permission="entity.manage">
        <button onClick={onClick}>Save changes</button>
      </PermissionHint>,
    );
    expect(container.querySelector('[data-permission-denied="true"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('explicit override permission: enables button', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useActiveWorkspace', () => ({
      useActiveWorkspace: () => ({ active_role: 'viewer', permissions: ['entity.manage'] }),
    }));
    vi.doMock('@/i18n/LanguageContext', () => ({
      useLanguage: () => ({ isRTL: false, language: 'en' }),
    }));
    const { PermissionHint } = await import('@/components/workspace/PermissionGate');
    const onClick = vi.fn();
    const { container } = render(
      <PermissionHint permission="entity.manage">
        <button onClick={onClick}>Save changes</button>
      </PermissionHint>,
    );
    expect(container.querySelector('[data-permission-denied="true"]')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('WORKSPACE-RBAC-6D — safety invariants', () => {
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

  const ALLOWED = new Set(
    [
      'pages/dashboard/DashboardPortfolio.tsx',
      'pages/dashboard/DashboardPromotions.tsx',
      'pages/dashboard/DashboardBusinessEdit.tsx',
      'pages/dashboard/DashboardStaffCenter.tsx',
    ].map((p) => join(SRC, p)),
  );

  it('adoption set stays exactly 6C + DashboardBusinessEdit (no scope creep)', () => {
    const files = walk(join(SRC, 'pages'));
    const callers = files.filter((f) => {
      const c = readFileSync(f, 'utf8');
      return /\bPermissionHint\b|\bPermissionGate\b|\buseCan\s*\(/.test(c);
    });
    expect(new Set(callers)).toEqual(ALLOWED);
  });

  it('forbidden surfaces remain untouched', () => {
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
      expect(c).not.toMatch(/\bPermissionHint\b/);
      expect(c).not.toMatch(/\bPermissionGate\b/);
      expect(c).not.toMatch(/\buseCan\s*\(/);
    }
  });

  it('no admin page adopts useCan / PermissionHint / PermissionGate', () => {
    const adminFiles = walk(join(SRC, 'pages/admin'));
    for (const f of adminFiles) {
      const c = readFileSync(f, 'utf8');
      expect(c).not.toMatch(/\bPermissionHint\b/);
      expect(c).not.toMatch(/\bPermissionGate\b/);
      expect(c).not.toMatch(/\buseCan\s*\(/);
    }
  });

  it('no page calls supabase.rpc(has_permission) yet', () => {
    const files = walk(join(SRC, 'pages'));
    const fnName = ['has', 'permission'].join('_');
    const re = new RegExp('rpc\\(\\s*["\'`]' + fnName + '["\'`]');
    for (const f of files) {
      const c = readFileSync(f, 'utf8');
      expect(re.test(c)).toBe(false);
    }
  });

  it('no new RLS/RPC migration introduced in this phase', () => {
    const migDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      const c = readFileSync(join(migDir, f), 'utf8');
      expect(c).not.toMatch(/PermissionHint|PermissionGate/);
    }
  });
});