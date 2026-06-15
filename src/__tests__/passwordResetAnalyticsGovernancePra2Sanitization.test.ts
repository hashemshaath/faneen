import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizePasswordResetMetadata,
  METADATA_MAX_BYTES,
} from '@/modules/identity/services/passwordResetLog/sanitize';

/**
 * PRA-2 sanitization guard. Pins:
 *  - call-sites route every metadata write through the helpers
 *  - helpers themselves strip tokens / cookies / oversized blobs
 *  - status allowlist + metadata size cap exist in migrations
 *  - no read access widening, no service_role in client, no TS escapes
 */

const CALLSITES = [
  'src/components/auth/ForgotPasswordForm.tsx',
  'src/pages/ResetPassword.tsx',
];
const MIGRATIONS = 'supabase/migrations';
const read = (p: string) => readFileSync(p, 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|sql)$/.test(name)) out.push(p);
  }
  return out;
}

describe('PRA-2 — sanitization helpers', () => {
  it('sanitizeAnalyticsPath strips query and hash', () => {
    expect(sanitizeAnalyticsPath('/forgot?email=a@b.c#x')).toBe('/forgot');
    expect(sanitizeAnalyticsPath('/reset-password#access_token=zzz')).toBe('/reset-password');
    expect(sanitizeAnalyticsPath('https://x.test/p?q=1#h')).toBe('/p');
    expect(sanitizeAnalyticsPath('')).toBe('/');
    expect(sanitizeAnalyticsPath(null)).toBe('/');
  });

  it('sanitizeAnalyticsReferrer keeps only origin + pathname', () => {
    expect(sanitizeAnalyticsReferrer('https://mail.test/r#access_token=AAA.BBB.CCC'))
      .toBe('https://mail.test/r');
    expect(sanitizeAnalyticsReferrer('https://x.test/forgot?email=a@b.c'))
      .toBe('https://x.test/forgot');
    expect(sanitizeAnalyticsReferrer('')).toBeNull();
    expect(sanitizeAnalyticsReferrer('not-a-url')).toBeNull();
  });

  it('sanitizePasswordResetMetadata drops forbidden keys (case-insensitive)', () => {
    const out = sanitizePasswordResetMetadata({
      path: '/forgot',
      access_token: 'eyJabc.eyJdef.signaturexxxxxxxxxx',
      Authorization: 'Bearer xyz',
      Cookie: 'sb-foo=bar',
      password: 'hunter2',
      refresh_token: 'rt',
      otp: '123456',
      State: 'opaque',
      code: 'abc',
    });
    for (const k of ['access_token','Authorization','Cookie','password','refresh_token','otp','State','code']) {
      expect(out, `${k} retained`).not.toHaveProperty(k);
    }
    expect(out.path).toBe('/forgot');
  });

  it('sanitizePasswordResetMetadata drops JWT-shaped strings and truncates long ones', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEyMzQ1Njc4OTB9.abcdefghijabcdefghij';
    const out = sanitizePasswordResetMetadata({ note: jwt, blob: 'x'.repeat(2000) });
    expect(out).not.toHaveProperty('note');
    expect(typeof out.blob).toBe('string');
    expect((out.blob as string).length).toBeLessThanOrEqual(512);
  });

  it('sanitizePasswordResetMetadata enforces the byte cap', () => {
    const huge: Record<string, string> = {};
    for (let i = 0; i < 200; i++) huge[`k${i}`] = 'y'.repeat(200);
    const out = sanitizePasswordResetMetadata(huge);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(METADATA_MAX_BYTES + 64);
  });

  it('sanitizes nested objects recursively', () => {
    const out = sanitizePasswordResetMetadata({ inner: { token: 'leak', ok: 'yes' } });
    const inner = out.inner as Record<string, unknown>;
    expect(inner).not.toHaveProperty('token');
    expect(inner.ok).toBe('yes');
  });
});

describe('PRA-2 — call-site enforcement', () => {
  it('every createPasswordResetLog metadata.path goes through sanitizeAnalyticsPath', () => {
    for (const f of CALLSITES) {
      const src = read(f);
      const calls = [...src.matchAll(/createPasswordResetLog\s*\(\s*\{[\s\S]*?\}\s*\)/g)].map(m => m[0]);
      for (const c of calls) {
        if (/\bpath\s*:/.test(c)) {
          expect(c, `${f}: path not sanitized`).toMatch(/sanitizeAnalyticsPath\(/);
        }
        if (/\breferrer\s*:/.test(c)) {
          expect(c, `${f}: referrer not sanitized`).toMatch(/sanitizeAnalyticsReferrer\(/);
        }
        expect(c, `${f}: raw location.search inside log`).not.toMatch(/location\.search(?!\s*\.includes)/);
        expect(c, `${f}: raw location.href inside log`).not.toMatch(/location\.href/);
      }
    }
  });

  it('no Authorization / cookie / refresh_token in call-sites', () => {
    for (const f of CALLSITES) {
      const src = read(f);
      expect(src).not.toMatch(/document\.cookie/);
      expect(src).not.toMatch(/['"`]Authorization['"`]\s*:/);
      expect(src).not.toMatch(/refresh_token/i);
    }
  });

  it('no banned TS escapes in call-sites or sanitizer', () => {
    const files = [
      ...CALLSITES,
      'src/modules/identity/services/passwordResetLog/sanitize.ts',
      'src/modules/identity/services/passwordResetLog/mutations.ts',
    ];
    const banned = [/\bas\s+any\b/, /:\s*any\b/, /@ts-ignore/, /@ts-expect-error/];
    for (const f of files) {
      const src = read(f);
      for (const r of banned) expect(src, `${f}: ${r}`).not.toMatch(r);
    }
    // eslint-disable scoped only to sanitizer/mutations (not allowed there).
    expect(read('src/modules/identity/services/passwordResetLog/sanitize.ts'))
      .not.toMatch(/eslint-disable/);
  });

  it('no service_role reference in client analytics surface', () => {
    const files = [
      ...CALLSITES,
      'src/modules/identity/services/passwordResetLog/sanitize.ts',
      'src/modules/identity/services/passwordResetLog/mutations.ts',
      'src/modules/identity/services/passwordResetLog/reads.ts',
    ];
    for (const f of files) expect(read(f)).not.toMatch(/service_role/i);
  });
});

describe('PRA-2 — migration hardening', () => {
  it('status allowlist CHECK exists', () => {
    const sql = walk(MIGRATIONS).filter(p => p.endsWith('.sql')).map(read).join('\n');
    expect(sql).toMatch(/password_reset_log_status_allowlist/);
    expect(sql).toMatch(/forgot_page_viewed/);
    expect(sql).toMatch(/link_invalid/);
  });

  it('metadata byte cap CHECK exists', () => {
    const sql = walk(MIGRATIONS).filter(p => p.endsWith('.sql')).map(read).join('\n');
    expect(sql).toMatch(/password_reset_log_metadata_size_cap/);
    expect(sql).toMatch(/octet_length\(metadata::text\)/);
  });

  it('read access remains admin-only (no anon SELECT grant on password_reset_log)', () => {
    const sql = walk(MIGRATIONS).filter(p => p.endsWith('.sql')).map(read).join('\n');
    expect(sql).not.toMatch(/GRANT\s+SELECT[^;]*password_reset_log[^;]*TO\s+anon/i);
  });
});