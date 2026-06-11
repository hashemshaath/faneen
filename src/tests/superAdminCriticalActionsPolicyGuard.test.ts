/**
 * SUPER ADMIN CRITICAL ACTIONS POLICY GUARD
 *
 * Regression guard for `docs/super-admin-critical-actions-policy.md`.
 *
 * For each Level-3 (platform-wide) admin_* RPC, we walk the migration
 * source and assert that the *latest* `CREATE OR REPLACE FUNCTION` body
 * contains an explicit super_admin gate. Operational (Level-1/2) RPCs
 * are not asserted here — they are allowed to gate on `has_admin_access`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

/** Level-3: must require super_admin. */
const SUPER_ADMIN_ONLY: readonly string[] = [
  'admin_set_module_override',
  'admin_clear_module_override',
  'admin_reassign_business_owner',
  'admin_transfer_business_ownership',
  'admin_reject_business_ownership_transfer',
  'admin_bulk_set_user_ban',
  'admin_bulk_set_business_active',
  'admin_sync_profile_email_from_auth',
  'admin_search_users_for_transfer',
  'admin_check_identity_availability',
  'admin_identity_duplicates_report',
  'admin_identity_integrity_report',
  'admin_rotate_client_site_qr_token',
  'admin_convert_lead_to_contract',
];

interface LatestBody {
  body: string;
  file: string;
}

function loadLatestBodies(names: readonly string[]): Map<string, LatestBody> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const out = new Map<string, LatestBody>();
  for (const f of files) {
    const full = path.join(MIGRATIONS_DIR, f);
    if (!statSync(full).isFile()) continue;
    const src = readFileSync(full, 'utf8');
    for (const name of names) {
      const marker = `CREATE OR REPLACE FUNCTION public.${name}`;
      const idx = src.lastIndexOf(marker);
      if (idx === -1) continue;
      // Take a generous slice: from the declaration to the next standalone
      // CREATE OR REPLACE statement, or end of file.
      const after = src.slice(idx + marker.length);
      const nextCreate = after.search(/\nCREATE OR REPLACE\s/);
      const body =
        marker + (nextCreate === -1 ? after : after.slice(0, nextCreate));
      out.set(name, { body, file: f });
    }
  }
  return out;
}

describe('SUPER ADMIN CRITICAL ACTIONS POLICY GUARD', () => {
  const bodies = loadLatestBodies(SUPER_ADMIN_ONLY);

  it.each(SUPER_ADMIN_ONLY)(
    '%s must enforce super_admin in its latest migration body',
    (name) => {
      const entry = bodies.get(name);
      expect(entry, `No migration source found for ${name}`).toBeDefined();
      const body = entry!.body;
      // Accept either is_super_admin(...) or has_role(..., 'super_admin').
      const hasSuperAdminGate =
        /\bis_super_admin\s*\(/i.test(body) ||
        /has_role\s*\([^)]*'super_admin'/i.test(body);
      expect(
        hasSuperAdminGate,
        `${name} is missing super_admin gate in ${entry!.file}`,
      ).toBe(true);
      // And must pin search_path.
      expect(/SET\s+search_path\s+TO\s+'public'/i.test(body)).toBe(true);
      // And must be SECURITY DEFINER.
      expect(/SECURITY DEFINER/i.test(body)).toBe(true);
    },
  );

  it('classification doc is present and lists all Level-3 RPCs', () => {
    const doc = readFileSync(
      path.resolve(__dirname, '../../docs/super-admin-critical-actions-policy.md'),
      'utf8',
    );
    for (const name of SUPER_ADMIN_ONLY) {
      expect(doc).toContain(name);
    }
  });
});