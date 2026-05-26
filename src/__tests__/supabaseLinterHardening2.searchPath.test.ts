/**
 * SUPABASE-LINTER-HARDENING-2 (Batch 1)
 * Regression: the two remaining public-schema functions that previously had
 * mutable search_path must keep `search_path = public` pinned via migration.
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

describe('SUPABASE-LINTER-HARDENING-2: public function search_path pinned', () => {
  const sql = migrationsText();

  it.each([
    'public.jsonb_diff(jsonb, jsonb)',
    'public.tg_sanitize_visit_log_metadata()',
  ])('%s has SET search_path = public', (sig) => {
    const escaped = sig.replace(/[.()]/g, (m) => '\\' + m);
    const re = new RegExp(
      `ALTER\\s+FUNCTION\\s+${escaped}\\s+SET\\s+search_path\\s*=\\s*public`,
      'i',
    );
    expect(re.test(sql)).toBe(true);
  });
});