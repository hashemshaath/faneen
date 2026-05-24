import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_SRC = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../supabase/migrations/20260524203933_a5e01aa9-0442-4ccb-a72f-b8e5ebba5a38.sql',
  ),
  'utf8',
);

describe('BARCODE-REGISTRY-TRANSFER-AUDIT-1 migration contract', () => {
  const FN_BLOCK =
    MIGRATION_SRC.split('FUNCTION public.admin_get_barcode_transfer_trail(')[1] ?? '';

  it('declares admin_get_barcode_transfer_trail as SECURITY DEFINER with pinned search_path', () => {
    expect(MIGRATION_SRC).toMatch(
      /CREATE OR REPLACE FUNCTION public\.admin_get_barcode_transfer_trail\([\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path TO 'public'/,
    );
  });

  it('enforces admin/super_admin gate', () => {
    expect(FN_BLOCK).toMatch(/has_role\(v_uid,\s*'admin'\)/);
    expect(FN_BLOCK).toMatch(/has_role\(v_uid,\s*'super_admin'\)/);
    expect(FN_BLOCK).toMatch(/RAISE EXCEPTION 'unauthorized'/);
    expect(FN_BLOCK).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it("only reads barcode_events with event_type='transferred'", () => {
    expect(FN_BLOCK).toMatch(/FROM public\.barcode_events/);
    expect(FN_BLOCK).toMatch(/event_type\s*=\s*'transferred'/);
  });

  it('masks email and phone (same rules as user picker)', () => {
    // email mask: x***@domain
    expect(FN_BLOCK).toMatch(/'\*\*\*@'/);
    // phone mask: prefix + ***** + last 4
    expect(FN_BLOCK).toMatch(/'\*\*\*\*\*'/);
    expect(FN_BLOCK).toMatch(/right\(btrim\(\w+\.phone\),\s*4\)/);
  });

  it('filters synthetic @phone.qitaat.local emails', () => {
    expect(FN_BLOCK).toMatch(/@phone\.qitaat\.local/);
  });

  it('does not touch auth.users', () => {
    // Strip SQL line comments before checking — the header comment intentionally
    // documents that the function does not touch auth.users.
    const codeOnly = MIGRATION_SRC
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    expect(codeOnly).not.toMatch(/auth\.users/);
  });

  it('execute is granted to authenticated only (PUBLIC revoked)', () => {
    expect(MIGRATION_SRC).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_get_barcode_transfer_trail\([^)]*\) FROM PUBLIC/,
    );
    expect(MIGRATION_SRC).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_get_barcode_transfer_trail\([^)]*\) TO authenticated/,
    );
  });

  it('does not perform any data mutation', () => {
    expect(FN_BLOCK).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(FN_BLOCK).not.toMatch(/\bUPDATE\s+public\./i);
    expect(FN_BLOCK).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});