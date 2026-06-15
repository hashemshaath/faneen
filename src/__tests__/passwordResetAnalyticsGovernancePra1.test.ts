import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PRA-1 governance guard for password-reset analytics.
 *
 * Pins privacy/security invariants for the `password_reset_log` table and the
 * call-sites that write to it. Any drift (logging tokens, widening RLS, raw
 * metadata in admin UI, banned TS escapes near the analytics code) trips here.
 */

const ROOT = 'src';
const MIGRATIONS = 'supabase/migrations';

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const CALLSITES = [
  'src/components/auth/ForgotPasswordForm.tsx',
  'src/pages/ResetPassword.tsx',
];

function read(p: string): string { return readFileSync(p, 'utf8'); }

describe('PRA-1 — password reset analytics governance', () => {
  it('migration: anon/authenticated have INSERT only (no SELECT/UPDATE/DELETE grants)', () => {
    const files = readdirSync(MIGRATIONS).filter(f => /password_reset|1f9b8aa1/i.test(f));
    const sql = files.map(f => readFileSync(join(MIGRATIONS, f), 'utf8')).join('\n');
    expect(sql).toMatch(/GRANT\s+INSERT\s+ON\s+public\.password_reset_log\s+TO\s+anon/i);
    expect(sql).not.toMatch(/GRANT\s+(SELECT|UPDATE|DELETE|ALL)[^;]*password_reset_log[^;]*TO\s+anon/i);
  });

  it('migration: SELECT policy is admin-gated (no permissive USING (true) for select)', () => {
    const files = readdirSync(MIGRATIONS).filter(f => /password_reset/i.test(f));
    const sql = files.map(f => readFileSync(join(MIGRATIONS, f), 'utf8')).join('\n');
    // Any SELECT policy must reference an admin check.
    const selectPolicies = sql.match(/CREATE\s+POLICY[^;]*FOR\s+SELECT[^;]*password_reset_log[^;]*;/gi) ?? [];
    for (const p of selectPolicies) {
      expect(p.toLowerCase()).toMatch(/has_role|has_admin_access|is_admin/);
    }
  });

  it('client code never references service_role for password_reset_log', () => {
    for (const f of CALLSITES) {
      const src = read(f);
      expect(src).not.toMatch(/service_role/i);
      expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    }
  });

  it('metadata payloads do not log tokens, hashes, cookies, or Authorization headers', () => {
    for (const f of CALLSITES) {
      const src = read(f);
      expect(src, `${f}: cookie leak`).not.toMatch(/document\.cookie/);
      expect(src, `${f}: Authorization header leak`).not.toMatch(/['"`]Authorization['"`]\s*:/);
      expect(src, `${f}: refresh_token leak`).not.toMatch(/refresh_token/i);
      // Inside any createPasswordResetLog({...}) call, metadata must not embed raw
      // location.hash or full location.href — those can carry recovery tokens.
      const calls = [...src.matchAll(/createPasswordResetLog\s*\(\s*\{[\s\S]*?\}\s*\)/g)].map(m => m[0]);
      for (const c of calls) {
        expect(c, `${f}: raw location.hash inside log payload`).not.toMatch(/location\.hash(?!\s*\.(includes|startsWith|indexOf|length))/);
        expect(c, `${f}: raw location.href inside log payload`).not.toMatch(/location\.href/);
      }
    }
  });

  it('ResetPassword logs only pathname (never search/hash) to avoid token capture', () => {
    const src = read('src/pages/ResetPassword.tsx');
    // path: ... must reference pathname, not search/hash concatenation.
    const pathLines = src.split('\n').filter(l => /\bpath\s*:/.test(l));
    expect(pathLines.length).toBeGreaterThan(0);
    for (const l of pathLines) {
      expect(l).not.toMatch(/location\.search/);
      expect(l).not.toMatch(/location\.hash/);
    }
  });

  it('admin UI does not render password_reset_log metadata as raw HTML', () => {
    const files = walk(ROOT).filter(f => /admin/i.test(f));
    for (const f of files) {
      const src = read(f);
      if (!/password_reset_log/i.test(src) && !/passwordResetLog/.test(src)) continue;
      expect(src, `${f}: dangerouslySetInnerHTML near reset log`).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it('analytics call-sites contain no banned TS escapes', () => {
    // Scope: only the lines that actually call the analytics writer. Pre-existing
    // hook-deps eslint-disables elsewhere in the file are out of scope for PRA-1.
    const banned = [/\bas\s+any\b/, /@ts-ignore/, /@ts-expect-error/];
    for (const f of CALLSITES) {
      const src = read(f);
      for (const r of banned) expect(src, `${f}: ${r}`).not.toMatch(r);
    }
  });

  it('no hardcoded secrets in analytics call-sites', () => {
    for (const f of CALLSITES) {
      const src = read(f);
      expect(src).not.toMatch(/sk_live_|sk_test_|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
    }
  });

  it('status values written from client are drawn from the documented event allowlist', () => {
    const ALLOW = new Set([
      'forgot_page_viewed','reset_page_viewed','requested','resend','sent','failed',
      'completed','link_clicked','link_valid','link_expired','link_invalid',
    ]);
    for (const f of CALLSITES) {
      const src = read(f);
      const statuses = [...src.matchAll(/status:\s*['"`]([a-z_]+)['"`]/g)].map(m => m[1]);
      for (const s of statuses) expect(ALLOW.has(s), `${f}: unexpected status "${s}"`).toBe(true);
    }
  });
});