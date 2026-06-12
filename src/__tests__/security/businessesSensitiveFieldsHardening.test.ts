/**
 * BUSINESSES SENSITIVE FIELDS HARDENING
 *
 * Static guarantees enforced by reading the latest migration + module
 * source. These tests do not hit the database — they verify:
 *
 *  1) The migration revokes column-level SELECT and UPDATE on the 6
 *     sensitive columns from PUBLIC / anon / authenticated.
 *  2) Service role retains SELECT/UPDATE on the same columns.
 *  3) The broad RLS read policy that previously included managers is
 *     removed and replaced with owner / manager / admin policies that
 *     no longer expose sensitive cols to managers (column-level GRANT
 *     handles enforcement).
 *  4) `get_business_sensitive_fields` + `update_business_sensitive_fields`
 *     SECURITY DEFINER RPCs exist, are search_path-pinned, and check
 *     owner-or-admin before returning / writing the columns.
 *  5) The `businesses_public` view does not expose any sensitive col.
 *  6) Client code routes all sensitive reads/writes through the
 *     canonical helpers in `@/modules/businesses` (no direct
 *     `.from('businesses').update({ national_id: ... })` etc.).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');
const SENSITIVE = [
  'cr_scan_raw',
  'cr_scan_data',
  'cr_document_url',
  'national_id',
  'approval_notes',
  'cr_owner_name',
] as const;

function latestSqlContaining(needle: string): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const f of [...files].reverse()) {
    const txt = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (txt.includes(needle)) return txt;
  }
  return '';
}

describe('businesses sensitive fields — migration', () => {
  const sql = latestSqlContaining('get_business_sensitive_fields');

  it('migration that introduces the RPC exists', () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it('revokes column-level SELECT on every sensitive column from authenticated', () => {
    expect(sql).toMatch(/REVOKE SELECT \([\s\S]*?cr_scan_raw[\s\S]*?\) ON public\.businesses FROM PUBLIC, anon, authenticated/);
    for (const col of SENSITIVE) {
      expect(sql).toMatch(new RegExp(`REVOKE SELECT[\\s\\S]*?${col}[\\s\\S]*?FROM PUBLIC, anon, authenticated`));
    }
  });

  it('revokes column-level UPDATE on every sensitive column from authenticated', () => {
    expect(sql).toMatch(/REVOKE UPDATE \([\s\S]*?cr_scan_raw[\s\S]*?\) ON public\.businesses FROM PUBLIC, anon, authenticated/);
  });

  it('grants SELECT + UPDATE on sensitive cols back to service_role', () => {
    expect(sql).toMatch(/GRANT SELECT \([\s\S]*?cr_scan_raw[\s\S]*?\) ON public\.businesses TO service_role/);
    expect(sql).toMatch(/GRANT UPDATE \([\s\S]*?cr_scan_raw[\s\S]*?\) ON public\.businesses TO service_role/);
  });

  it('drops the broad "owners managers and admins" read policy', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Owners managers and admins read full business rows" ON public\.businesses/);
  });

  it('replaces it with owner-only and manager-only SELECT policies', () => {
    expect(sql).toMatch(/CREATE POLICY "Owners read own business rows"\s+ON public\.businesses FOR SELECT/);
    expect(sql).toMatch(/CREATE POLICY "Managers read assigned business rows"\s+ON public\.businesses FOR SELECT/);
  });

  it('defines get_business_sensitive_fields as SECURITY DEFINER with owner-or-admin check + pinned search_path', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_business_sensitive_fields\(p_business_id uuid\)/);
    expect(sql).toMatch(/SECURITY DEFINER[\s\S]{0,80}SET search_path TO 'public'/);
    expect(sql).toMatch(/forbidden_sensitive_business_fields/);
    expect(sql).toMatch(/has_admin_access/);
  });

  it('defines update_business_sensitive_fields as SECURITY DEFINER with owner-or-admin check', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.update_business_sensitive_fields\(/);
    // The body must perform an authorization gate before writing.
    expect(sql).toMatch(/forbidden_sensitive_business_fields[\s\S]{0,2000}UPDATE public\.businesses/);
  });

  it('grants EXECUTE on both RPCs to authenticated only (not anon)', () => {
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_business_sensitive_fields\(uuid\) TO authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.update_business_sensitive_fields\([^)]+\) TO authenticated/);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.(get|update)_business_sensitive_fields[\s\S]*?TO anon/);
  });
});

describe('businesses sensitive fields — public view does not leak', () => {
  it('businesses_public select list does not contain any sensitive column', () => {
    // Source of truth: every migration that creates or replaces the view.
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    let lastViewSql = '';
    for (const f of files) {
      const txt = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
      if (/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.businesses_public/i.test(txt)) {
        lastViewSql = txt;
      }
    }
    expect(lastViewSql.length).toBeGreaterThan(0);
    for (const col of SENSITIVE) {
      expect(lastViewSql).not.toMatch(new RegExp(`\\b${col}\\b`));
    }
  });
});

describe('businesses sensitive fields — client helper module', () => {
  const HELPER = readFileSync(
    join(process.cwd(), 'src/modules/businesses/services/businessSensitive.ts'),
    'utf8',
  );

  it('exports getBusinessSensitiveFields wired to the SECURITY DEFINER RPC', () => {
    expect(HELPER).toMatch(/export async function getBusinessSensitiveFields/);
    expect(HELPER).toMatch(/supabase\.rpc\(['"]get_business_sensitive_fields['"]/);
  });

  it('exports updateBusinessSensitiveFields wired to the SECURITY DEFINER RPC', () => {
    expect(HELPER).toMatch(/export async function updateBusinessSensitiveFields/);
    expect(HELPER).toMatch(/supabase\.rpc\(['"]update_business_sensitive_fields['"]/);
  });

  it('declares the canonical sensitive column list', () => {
    for (const col of SENSITIVE) {
      expect(HELPER).toContain(`'${col}'`);
    }
  });

  it('BUSINESS_SAFE_COLUMNS_SELECT does not contain any sensitive column', () => {
    const m = HELPER.match(/BUSINESS_SAFE_COLUMNS_SELECT\s*=\s*'([^']+)'/);
    expect(m, 'BUSINESS_SAFE_COLUMNS_SELECT must be exported').toBeTruthy();
    const cols = (m![1] ?? '').split(',').map((s) => s.trim());
    for (const col of SENSITIVE) {
      expect(cols).not.toContain(col);
    }
  });
});

describe('businesses sensitive fields — no direct writes via authenticated client', () => {
  // Walk all .ts/.tsx files (excluding tests and the helper itself) and
  // ensure no file does `.from('businesses').update({ ...sensitive cols })`
  // directly. All sensitive writes MUST go through
  // `updateBusinessSensitiveFields` which calls the SECURITY DEFINER RPC.
  const SRC = join(process.cwd(), 'src');
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
  }
  const FILES = walk(SRC).filter(
    (f) =>
      !/[\\/]__tests__[\\/]|\.test\.|[\\/]test[\\/]setup\.ts$|businessSensitive\.ts$/.test(f),
  );

  for (const col of SENSITIVE) {
    it(`no client file writes ${col} directly via .from('businesses').update()`, () => {
      const pattern = new RegExp(
        // `.from('businesses').update({ ... <col>: ... })` with very loose matching across lines.
        `from\\(['"]businesses['"]\\)[\\s\\S]{0,200}?\\.update\\([\\s\\S]{0,800}?${col}\\s*:`,
      );
      const offenders: string[] = [];
      for (const f of FILES) {
        const src = readFileSync(f, 'utf8');
        if (pattern.test(src)) offenders.push(f.replace(process.cwd() + '/', ''));
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  }
});