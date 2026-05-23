import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/identity-isolation-audit.mjs');

describe('identity-isolation-audit.mjs (ID-6)', () => {
  it('script exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  const SCRIPT_SRC = readFileSync(SCRIPT, 'utf8');

  it('declares the canonical allowed identity paths', () => {
    expect(SCRIPT_SRC).toContain('src/modules/identity/');
    expect(SCRIPT_SRC).toContain('src/services/auth/');
    expect(SCRIPT_SRC).toContain('src/integrations/lovable/');
    expect(SCRIPT_SRC).toContain('src/contexts/AuthContext.tsx');
    expect(SCRIPT_SRC).toContain('src/services/userRoles.ts');
  });

  it('enforces every identity table', () => {
    for (const t of ['user_roles', 'password_reset_log']) {
      expect(SCRIPT_SRC).toContain(`"${t}"`);
    }
  });

  it('enforces every migrated identity RPC', () => {
    for (const r of [
      'has_role',
      'accept_client_invitation',
      'get_staff_invitation_preview',
      'accept_staff_invitation',
      'get_my_staff_invitations',
    ]) {
      expect(SCRIPT_SRC).toContain(`"${r}"`);
    }
  });

  it('enforces every identity edge function', () => {
    for (const f of ['admin-reset-password', 'admin-delete-user', 'temp-code-session']) {
      expect(SCRIPT_SRC).toContain(`"${f}"`);
    }
  });

  it('enforces supabase.auth.* method surface', () => {
    for (const m of [
      'signOut',
      'getSession',
      'getUser',
      'updateUser',
      'verifyOtp',
      'signInWithPassword',
      'signUp',
      'resetPasswordForEmail',
      'setSession',
    ]) {
      expect(SCRIPT_SRC).toContain(`"${m}"`);
    }
  });

  it('is wired into package.json as identity-isolation-audit', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['identity-isolation-audit']).toBe(
      'node scripts/identity-isolation-audit.mjs',
    );
  });

  it('is wired into the code-audit CI workflow', () => {
    const wf = readFileSync(
      resolve(ROOT, '.github/workflows/code-audit.yml'),
      'utf8',
    );
    expect(wf).toContain('Identity Isolation Audit');
    expect(wf).toContain('node scripts/identity-isolation-audit.mjs');
  });

  it('passes (exit 0) against the live source tree', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/No unauthorized direct identity access found/);
  }, 30_000);
});