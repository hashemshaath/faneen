import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_SRC = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../supabase/migrations/20260524201717_d5dd78c5-91af-467c-8eea-48e925b78429.sql',
  ),
  'utf8',
);

describe('BARCODE-REGISTRY-LIFECYCLE-1 migration contract', () => {
  const FNS = ['admin_freeze_barcode', 'admin_archive_barcode', 'admin_restore_barcode'] as const;

  it.each(FNS)('%s is SECURITY DEFINER with pinned search_path', (fn) => {
    const re = new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${fn}\\([\\s\\S]*?SECURITY DEFINER[\\s\\S]*?SET search_path TO 'public'`,
    );
    expect(MIGRATION_SRC).toMatch(re);
  });

  it.each(FNS)('%s enforces admin/super_admin gate', (fn) => {
    const block = MIGRATION_SRC.split(`FUNCTION public.${fn}(`)[1] ?? '';
    expect(block).toMatch(/has_role\(v_uid,\s*'admin'\)/);
    expect(block).toMatch(/has_role\(v_uid,\s*'super_admin'\)/);
    expect(block).toMatch(/RAISE EXCEPTION 'unauthorized'/);
    expect(block).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it.each(FNS)('%s validates the transition before mutating', (fn) => {
    const block = MIGRATION_SRC.split(`FUNCTION public.${fn}(`)[1] ?? '';
    expect(block).toMatch(/invalid_transition|not_found/);
    expect(block).toMatch(/FOR UPDATE/);
  });

  it.each(FNS)('%s writes an audit event via _admin_log_barcode_event', (fn) => {
    const block = MIGRATION_SRC.split(`FUNCTION public.${fn}(`)[1] ?? '';
    expect(block).toMatch(/_admin_log_barcode_event\(/);
  });

  it('restore guards against duplicate active barcode per entity', () => {
    expect(MIGRATION_SRC).toMatch(/entity_already_has_active_barcode/);
  });

  it('does not introduce a hard-delete or revoke admin RPC', () => {
    expect(MIGRATION_SRC).not.toMatch(/admin_delete_barcode/);
    expect(MIGRATION_SRC).not.toMatch(/admin_revoke_barcode/);
    expect(MIGRATION_SRC).not.toMatch(/DELETE FROM public\.barcode_registry/i);
  });

  it.each(FNS)('%s execute is granted to authenticated only (PUBLIC revoked)', (fn) => {
    expect(MIGRATION_SRC).toMatch(
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC`),
    );
    expect(MIGRATION_SRC).toMatch(
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO authenticated`),
    );
  });
});