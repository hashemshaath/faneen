import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf8');

/**
 * ADMIN-DIRECT-TOGGLE-1 — /admin/system-access now lets admins (including
 * super-admins) flip any module switch instantly, regardless of the target
 * business's membership plan. The change is still audited through the
 * SECURITY DEFINER RPC, but there is no inline interstitial card and no
 * mandatory reason field — reasons remain optional everywhere.
 */
describe('ADMIN-DIRECT-TOGGLE-1 — /admin/system-access', () => {
  const src = read('src/pages/admin/AdminSystemAccess.tsx');

  it('every admin toggle bypasses membership gating', () => {
    expect(src).toMatch(/bypassMembership:\s*!!isAdmin/);
  });

  it('tags the audit row so direct admin actions are queryable', () => {
    expect(src).toMatch(/\[admin direct\]/);
  });

  it('no longer renders the blocking "module not available" interstitial card', () => {
    expect(src).not.toMatch(/super-admin-bypass-card/);
    expect(src).not.toMatch(/blockedAttempt/);
    expect(src).not.toMatch(/bypassMutation/);
  });

  it('core-module protection is preserved (handleToggle still rejects core disable)', () => {
    expect(src).toMatch(/m\.is_core && !nextEnabled/);
    expect(src).toMatch(/Core modules cannot be disabled/);
  });

  it('does not write directly to system_module_overrides or audit tables', () => {
    expect(src).not.toMatch(/from\('system_module_overrides'\)/);
    expect(src).not.toMatch(/from\('system_module_audit_log'\)/);
  });
});