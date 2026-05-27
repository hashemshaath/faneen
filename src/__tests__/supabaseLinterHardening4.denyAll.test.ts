/**
 * SUPABASE-LINTER-HARDENING-4
 * Regression: `public.auth_temporary_login_codes` stores hashed one-time
 * login codes. It is accessed only via SECURITY DEFINER RPCs, never directly
 * from the Data API. An explicit deny-all policy must remain in place to
 * document and enforce that the table is sealed against client access.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(__dirname, '../../supabase/migrations');

function migrationsText(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), 'utf-8'))
    .join('\n');
}

describe('SUPABASE-LINTER-HARDENING-4: auth_temporary_login_codes is sealed', () => {
  const sql = migrationsText();

  it('table has RLS enabled', () => {
    expect(/ALTER TABLE public\.auth_temporary_login_codes ENABLE ROW LEVEL SECURITY/i.test(sql)).toBe(true);
  });

  it('original migration revokes Data API grants from anon/authenticated', () => {
    expect(/REVOKE ALL ON public\.auth_temporary_login_codes FROM PUBLIC, anon, authenticated/i.test(sql)).toBe(true);
  });

  it('has an explicit deny-all policy (USING (false) WITH CHECK (false))', () => {
    const re = /CREATE POLICY[^;]+ON public\.auth_temporary_login_codes\s+FOR ALL\s+TO public\s+USING \(false\)\s+WITH CHECK \(false\)/is;
    expect(re.test(sql)).toBe(true);
  });

  it('no permissive USING (true) policy is added to this table', () => {
    // Constrain match to a single CREATE POLICY statement (no `;` crossed)
    // so unrelated `USING (true)` policies on other tables don't false-positive.
    const re = /CREATE POLICY[^;]+ON public\.auth_temporary_login_codes[^;]+USING\s*\(\s*true\s*\)/i;
    expect(re.test(sql)).toBe(false);
  });
});