import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_SRC = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../supabase/migrations/20260524203324_96949b29-6d0c-4881-8cfa-2e0378bfc515.sql',
  ),
  'utf8',
);

describe('BARCODE-REGISTRY-USER-PICKER-1 migration contract', () => {
  const BLOCK = MIGRATION_SRC.split('FUNCTION public.admin_search_users_for_transfer(')[1] ?? '';

  it('declares admin_search_users_for_transfer as SECURITY DEFINER with pinned search_path', () => {
    expect(MIGRATION_SRC).toMatch(
      /CREATE OR REPLACE FUNCTION public\.admin_search_users_for_transfer\([\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path TO 'public'/,
    );
  });

  it('enforces admin/super_admin gate', () => {
    expect(BLOCK).toMatch(/has_role\(v_uid,\s*'admin'\)/);
    expect(BLOCK).toMatch(/has_role\(v_uid,\s*'super_admin'\)/);
    expect(BLOCK).toMatch(/RAISE EXCEPTION 'unauthorized'/);
    expect(BLOCK).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it('trims the query and enforces a minimum length of 2', () => {
    expect(BLOCK).toMatch(/btrim\(COALESCE\(_query,\s*''\)\)/);
    expect(BLOCK).toMatch(/char_length\(v_q\)\s*<\s*2/);
  });

  it('clamps the limit (default ≤20, ≥1)', () => {
    expect(BLOCK).toMatch(/LEAST\(GREATEST\(COALESCE\(_limit,\s*10\),\s*1\),\s*20\)/);
  });

  it('never references auth.users (only public.profiles)', () => {
    expect(BLOCK).not.toMatch(/auth\.users/);
    expect(BLOCK).toMatch(/FROM public\.profiles/);
  });

  it('masks the email (h***@domain.com) and filters synthetic phone-domain emails', () => {
    expect(BLOCK).toMatch(/'\*\*\*@'/);
    expect(BLOCK).toMatch(/substr\(p\.email,\s*1,\s*1\)/);
    expect(BLOCK).toMatch(/'%@phone\.qitaat\.local'/);
  });

  it('masks the phone (keeps prefix + last 4 digits)', () => {
    expect(BLOCK).toMatch(/'\*\*\*\*\*'/);
    expect(BLOCK).toMatch(/right\(btrim\(p\.phone\),\s*4\)/);
  });

  it('does not return raw email/phone columns', () => {
    // The SELECT list must not project p.email / p.phone as-is.
    expect(BLOCK).not.toMatch(/SELECT[\s\S]*?\bp\.email\b\s+AS\b/);
    expect(BLOCK).not.toMatch(/SELECT[\s\S]*?\bp\.phone\b\s+AS\b/);
  });

  it('execute is granted to authenticated only (PUBLIC revoked)', () => {
    expect(MIGRATION_SRC).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_search_users_for_transfer\([^)]*\) FROM PUBLIC/,
    );
    expect(MIGRATION_SRC).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_search_users_for_transfer\([^)]*\) TO authenticated/,
    );
  });
});