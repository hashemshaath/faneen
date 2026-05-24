import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_SRC = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../supabase/migrations/20260524205408_25489303-9738-43bc-adb2-3ac729dec87b.sql',
  ),
  'utf8',
);

describe('BARCODE-REGISTRY-NEW-CODE-1 migration contract', () => {
  const FN_BLOCK =
    MIGRATION_SRC.split('FUNCTION public.admin_issue_successor_barcode(')[1] ?? '';

  it('relaxes the active-entity unique index to exclude transferred rows', () => {
    expect(MIGRATION_SRC).toMatch(
      /CREATE UNIQUE INDEX[\s\S]*barcode_registry_active_entity_uidx[\s\S]*WHERE status NOT IN \('archived',\s*'transferred'\)/,
    );
    expect(MIGRATION_SRC).toMatch(
      /DROP INDEX IF EXISTS public\.barcode_registry_active_entity_uidx/,
    );
  });

  it('declares admin_issue_successor_barcode as SECURITY DEFINER + pinned search_path', () => {
    expect(MIGRATION_SRC).toMatch(
      /CREATE OR REPLACE FUNCTION public\.admin_issue_successor_barcode\([\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path TO 'public'/,
    );
  });

  it('enforces admin/super_admin gate and rejects anonymous calls', () => {
    expect(FN_BLOCK).toMatch(/has_role\(v_uid,\s*'admin'\)/);
    expect(FN_BLOCK).toMatch(/has_role\(v_uid,\s*'super_admin'\)/);
    expect(FN_BLOCK).toMatch(/RAISE EXCEPTION 'unauthorized'/);
    expect(FN_BLOCK).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it('locks the old barcode row FOR UPDATE before reading state', () => {
    expect(FN_BLOCK).toMatch(
      /FROM public\.barcode_registry[\s\S]*WHERE id = _transferred_barcode_id[\s\S]*FOR UPDATE/,
    );
  });

  it('requires old status=transferred and a target user + entity', () => {
    expect(FN_BLOCK).toMatch(/v_old\.status <> 'transferred'/);
    expect(FN_BLOCK).toMatch(/'invalid_transition'/);
    expect(FN_BLOCK).toMatch(/v_old\.transfer_to_user_id IS NULL/);
    expect(FN_BLOCK).toMatch(/'missing_target_user'/);
    expect(FN_BLOCK).toMatch(/'missing_entity'/);
  });

  it('checks for conflicting active barcode on the same entity', () => {
    expect(FN_BLOCK).toMatch(/entity_already_has_active_barcode/);
    expect(FN_BLOCK).toMatch(/status NOT IN \('archived',\s*'transferred'\)/);
    expect(FN_BLOCK).toMatch(/conflict_barcode_id/);
  });

  it('inserts a new active row owned by the transfer target user', () => {
    expect(FN_BLOCK).toMatch(/INSERT INTO public\.barcode_registry/);
    expect(FN_BLOCK).toMatch(/v_old\.transfer_to_user_id/);
    expect(FN_BLOCK).toMatch(/'active'/);
    expect(FN_BLOCK).toMatch(/generate_barcode_code\(v_old\.entity_type\)/);
  });

  it('does NOT mutate the old transferred row', () => {
    expect(FN_BLOCK).not.toMatch(/UPDATE public\.barcode_registry/);
    expect(FN_BLOCK).not.toMatch(/DELETE FROM public\.barcode_registry/);
  });

  it('logs audit events on both old and new barcodes', () => {
    const matches = FN_BLOCK.match(/INSERT INTO public\.barcode_events/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(FN_BLOCK).toMatch(/'created'/);
    expect(FN_BLOCK).toMatch(/'admin_repair'/);
    expect(FN_BLOCK).toMatch(/successor_of/);
    expect(FN_BLOCK).toMatch(/successor_issued/);
  });

  it('returns new_barcode_id / new_code / public_url on success', () => {
    expect(FN_BLOCK).toMatch(/'new_barcode_id'/);
    expect(FN_BLOCK).toMatch(/'new_code'/);
    expect(FN_BLOCK).toMatch(/'public_url'/);
    expect(FN_BLOCK).toMatch(/'\/q\/'/);
  });

  it('revokes PUBLIC and grants only to authenticated', () => {
    expect(MIGRATION_SRC).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_issue_successor_barcode\(uuid, text\) FROM PUBLIC/,
    );
    expect(MIGRATION_SRC).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_issue_successor_barcode\(uuid, text\) TO authenticated/,
    );
  });
});