import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_SRC = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../supabase/migrations/20260524202621_4073f5d5-b1a3-4932-b1aa-cc6100191605.sql',
  ),
  'utf8',
);

describe('BARCODE-REGISTRY-TRANSFER-1 migration contract', () => {
  const FN_BLOCK = MIGRATION_SRC.split('FUNCTION public.admin_transfer_barcode(')[1] ?? '';

  it('declares admin_transfer_barcode as SECURITY DEFINER with pinned search_path', () => {
    expect(MIGRATION_SRC).toMatch(
      /CREATE OR REPLACE FUNCTION public\.admin_transfer_barcode\([\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path TO 'public'/,
    );
  });

  it('enforces admin/super_admin gate', () => {
    expect(FN_BLOCK).toMatch(/has_role\(v_uid,\s*'admin'\)/);
    expect(FN_BLOCK).toMatch(/has_role\(v_uid,\s*'super_admin'\)/);
    expect(FN_BLOCK).toMatch(/RAISE EXCEPTION 'unauthorized'/);
    expect(FN_BLOCK).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it('locks the source barcode row FOR UPDATE before mutating', () => {
    expect(FN_BLOCK).toMatch(/FROM public\.barcode_registry WHERE id = _barcode_id FOR UPDATE/);
  });

  it('validates transition (only active|frozen → transferred)', () => {
    expect(FN_BLOCK).toMatch(/status NOT IN \(\s*'active',\s*'frozen'\s*\)/);
    expect(FN_BLOCK).toMatch(/invalid_transition/);
  });

  it('validates target user existence and rejects self-transfer', () => {
    expect(FN_BLOCK).toMatch(/missing_target_user/);
    expect(FN_BLOCK).toMatch(/FROM public\.profiles WHERE user_id = _transfer_to_user_id/);
    expect(FN_BLOCK).toMatch(/target_user_not_found/);
    expect(FN_BLOCK).toMatch(/same_owner/);
  });

  it('sets status=transferred + transferred_at + transfer endpoints', () => {
    expect(FN_BLOCK).toMatch(/SET status\s*=\s*'transferred'/);
    expect(FN_BLOCK).toMatch(/transferred_at\s*=\s*now\(\)/);
    expect(FN_BLOCK).toMatch(/transfer_from_user_id\s*=\s*v_br\.owner_user_id/);
    expect(FN_BLOCK).toMatch(/transfer_to_user_id\s*=\s*_transfer_to_user_id/);
  });

  it('does NOT mutate entity_type / entity_id (safe Model A)', () => {
    // The UPDATE statement targeting the registry must not include those columns.
    const update = FN_BLOCK.match(/UPDATE public\.barcode_registry[\s\S]*?WHERE id = _barcode_id;/);
    expect(update).toBeTruthy();
    expect(update![0]).not.toMatch(/\bentity_type\s*=/);
    expect(update![0]).not.toMatch(/\bentity_id\s*=/);
  });

  it('inserts a transferred audit event with from/to + old entity metadata', () => {
    expect(FN_BLOCK).toMatch(/INSERT INTO public\.barcode_events/);
    expect(FN_BLOCK).toMatch(/'transferred'/);
    expect(FN_BLOCK).toMatch(/'from_user_id'/);
    expect(FN_BLOCK).toMatch(/'to_user_id'/);
    expect(FN_BLOCK).toMatch(/'old_entity_type'/);
    expect(FN_BLOCK).toMatch(/'old_entity_id'/);
  });

  it('does not introduce hard delete or weaken admin gate', () => {
    expect(MIGRATION_SRC).not.toMatch(/DELETE FROM public\.barcode_registry/i);
    expect(MIGRATION_SRC).not.toMatch(/admin_delete_barcode/);
  });

  it('execute is granted to authenticated only (PUBLIC revoked)', () => {
    expect(MIGRATION_SRC).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_transfer_barcode\([^)]*\) FROM PUBLIC/,
    );
    expect(MIGRATION_SRC).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_transfer_barcode\([^)]*\) TO authenticated/,
    );
  });
});