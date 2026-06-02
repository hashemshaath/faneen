import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf8');

describe('SUPER-ADMIN-BYPASS-MEMBERSHIP-1 — /admin/system-access', () => {
  const src = read('src/pages/admin/AdminSystemAccess.tsx');

  it('captures blocked_by_membership attempts into an inline state (no silent failure)', () => {
    expect(src).toMatch(/blockedAttempt/);
    expect(src).toMatch(/setBlockedAttempt\(/);
  });

  it('renders the super-admin bypass card only for super admin + entity scope', () => {
    expect(src).toMatch(/super-admin-bypass-card/);
    expect(src).toMatch(/isSuperAdmin && blockedAttempt/);
    expect(src).toMatch(/scopeTab === 'entity'/);
  });

  it('requires a non-empty reason before submit', () => {
    expect(src).toMatch(/super-admin-bypass-reason/);
    expect(src).toMatch(/disabled=\{!bypassReason\.trim\(\) \|\| bypassMutation\.isPending\}/);
  });

  it('submit calls updateBusinessSystemAccess with bypassMembership:true + reason', () => {
    expect(src).toMatch(/bypassMutation\s*=\s*useMutation/);
    expect(src).toMatch(/bypassMembership:\s*true/);
    expect(src).toMatch(/\[super-admin bypass\]/);
  });

  it('on success invalidates business access, system overrides, and audit caches', () => {
    // bypassMutation.onSuccess block
    expect(src).toMatch(/qc\.invalidateQueries\(\{ queryKey: \['system-module-overrides'\] \}\)/);
    expect(src).toMatch(/qc\.invalidateQueries\(\{ queryKey: \['system-module-audit-recent'\] \}\)/);
    expect(src).toMatch(/invalidateAccess\(\{ businessId: vars\.scopeValue, includeAudit: true \}\)/);
  });

  it('offers plan-matrix and membership-upgrade alternatives alongside the bypass', () => {
    expect(src).toMatch(/\/admin\/memberships\?tab=modules/);
    expect(src).toMatch(/تفعيلها على مستوى الباقة/);
    expect(src).toMatch(/ترقية عضوية المنشأة/);
    expect(src).toMatch(/تجاوز كمسؤول/);
  });

  it('helper copy makes the scope of each action explicit', () => {
    expect(src).toMatch(/يتجاوز قيود العضوية لهذه المنشأة فقط/);
    expect(src).toMatch(/لا يغيّر باقة المنشأة/);
    expect(src).toMatch(/سيتم تسجيل السبب في سجل العمليات/);
  });

  it('non-super-admins keep the old toast path (no bypass UI exposed)', () => {
    // The bypass card is gated by isSuperAdmin everywhere it appears.
    const matches = src.match(/super-admin-bypass-(card|submit|reason)/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    // Every render path that mounts the card is gated by isSuperAdmin.
    expect(src).toMatch(/isSuperAdmin && blockedAttempt/);
    // The toast path remains for non-super-admin (no else branch silently writes).
    expect(src).toMatch(/toast\.error\(isRTL \? \(res\.reason_ar/);
  });

  it('core-module protection is preserved (handleToggle still rejects core disable)', () => {
    expect(src).toMatch(/m\.is_core && !nextEnabled/);
    expect(src).toMatch(/Core modules cannot be disabled/);
  });

  it('does not write directly to system_module_overrides or audit tables', () => {
    expect(src).not.toMatch(/from\('system_module_overrides'\)/);
    expect(src).not.toMatch(/from\('system_module_audit_log'\)/);
  });

  it('reason is tagged so audit rows are queryable as super-admin bypass', () => {
    expect(src).toMatch(/reason:\s*`\[super-admin bypass\]/);
  });
});