/**
 * SUPABASE-LINTER-HARDENING-1
 * Regression: the 3 public read-only views must remain `security_invoker = on`
 * so RLS on the underlying tables is the authoritative gate (not the view
 * owner). This pairs with the underlying tables' SELECT policies that already
 * match each view's WHERE filter.
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

describe('SUPABASE-LINTER-HARDENING-1: public views use security_invoker', () => {
  const sql = migrationsText();

  it.each([
    'public.businesses_public',
    'public.business_branches_public',
    'public.category_public_counts',
  ])('%s is set to security_invoker = on in migrations', (view) => {
    const re = new RegExp(
      `ALTER\\s+VIEW\\s+${view.replace('.', '\\.')}\\s+SET\\s*\\(\\s*security_invoker\\s*=\\s*on\\s*\\)`,
      'i',
    );
    expect(re.test(sql)).toBe(true);
  });
});