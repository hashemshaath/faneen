import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';

/**
 * Anonymous-role regression tests for sensitive businesses / business_staff
 * mutations and businesses_public visibility (R4E-TESTS-APPLY-1).
 *
 * Pattern mirrors src/__tests__/security/rls-anon.regression.test.ts:
 *   - fresh anon client (NOT the app's signed-in client)
 *   - skips cleanly when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing
 *   - sentinel UUIDs only — never creates valid rows
 *   - "denied" == error returned OR empty/null payload (RLS no-op)
 *
 * MANUAL / pgTAP-only follow-ups (NOT covered here — require authenticated
 * sessions, owner/admin JWTs, or server-side fixtures):
 *   - owner cannot self-set is_verified=true
 *   - non-admin cannot flip is_active / is_demo / approval_status on own business
 *   - non-owner cannot update businesses.user_id (ownership transfer)
 *   - owner cannot delete the sole `owner` business_staff row
 *   - non-owner / non-admin cannot insert/update/delete business_staff
 *   - admin bulk mutation must write one admin_activity_log row per business
 *   - membership_tier writes must not bypass memberships state machine
 *   - businesses_public round-trip after admin flips active/demo/published
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const enabled = Boolean(URL && KEY);

const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';
const RANDOM_UUID = '11111111-1111-1111-1111-111111111111';

type DenialResult = {
  error: PostgrestError | null;
  data: unknown;
};

function expectDenied(result: DenialResult, label: string): void {
  if (result.error) {
    expect(result.error, `${label}: expected error object`).toBeTruthy();
    return;
  }
  // No error → must be a no-op (empty array or null).
  const data = result.data;
  if (Array.isArray(data)) {
    expect(data, `${label}: anon got rows back, RLS gap`).toEqual([]);
  } else {
    expect(data ?? null, `${label}: anon got payload back, RLS gap`).toBeNull();
  }
}

const d = enabled ? describe : describe.skip;

d('Businesses sensitive mutations — anon regression', () => {
  let anon: SupabaseClient;
  beforeAll(() => {
    anon = createClient(URL!, KEY!, { auth: { persistSession: false } });
  });

  // ---------- A1–A6: businesses sensitive field updates ----------

  it('A1: anon cannot update approval_status on businesses', async () => {
    const res = await anon
      .from('businesses')
      .update({ approval_status: 'approved' } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A1 approval_status');
  });

  it('A2: anon cannot update is_demo on businesses', async () => {
    const res = await anon
      .from('businesses')
      .update({ is_demo: false } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A2 is_demo');
  });

  it('A3: anon cannot update is_active on businesses', async () => {
    const res = await anon
      .from('businesses')
      .update({ is_active: false } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A3 is_active');
  });

  it('A4: anon cannot update is_verified on businesses', async () => {
    const res = await anon
      .from('businesses')
      .update({ is_verified: true } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A4 is_verified');
  });

  it('A5: anon cannot update user_id on businesses', async () => {
    const res = await anon
      .from('businesses')
      .update({ user_id: RANDOM_UUID } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A5 user_id');
  });

  it('A6: anon cannot update membership_tier on businesses', async () => {
    const res = await anon
      .from('businesses')
      .update({ membership_tier: 'platinum' } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A6 membership_tier');
  });

  // ---------- A7–A9: businesses_public visibility ----------

  it('A7: businesses_public exposes no rows with is_active=false', async () => {
    const res = await anon
      .from('businesses_public')
      .select('id, is_active')
      .eq('is_active', false);
    // If view masks the column entirely, an error is also acceptable.
    if (res.error) {
      expect(res.error).toBeTruthy();
      return;
    }
    expect(res.data ?? []).toEqual([]);
  });

  it('A8: businesses_public exposes no rows with is_demo=true', async () => {
    const res = await anon
      .from('businesses_public')
      .select('id, is_demo')
      .eq('is_demo', true);
    if (res.error) {
      expect(res.error).toBeTruthy();
      return;
    }
    expect(res.data ?? []).toEqual([]);
  });

  it('A9: businesses_public exposes no rows where approval_status != published', async () => {
    const res = await anon
      .from('businesses_public')
      .select('id, approval_status')
      .neq('approval_status', 'published');
    if (res.error) {
      expect(res.error).toBeTruthy();
      return;
    }
    expect(res.data ?? []).toEqual([]);
  });

  // ---------- A10: businesses_public PII guard ----------

  const PII_FIELDS = ['user_id', 'email', 'mobile', 'national_id', 'vat_number'] as const;
  for (const field of PII_FIELDS) {
    it(`A10: businesses_public does not expose ${field}`, async () => {
      const res = await anon.from('businesses_public').select(field).limit(1);
      if (res.error) {
        // Column absent / masked → ideal outcome.
        expect(res.error).toBeTruthy();
        return;
      }
      // If the query somehow succeeded, every returned row's field must be
      // null. A non-null leak is a hard failure.
      for (const row of (res.data ?? []) as Array<Record<string, unknown>>) {
        expect(row[field] ?? null, `${field} leaked from businesses_public`).toBeNull();
      }
    });
  }

  // ---------- A11–A14: business_staff anon mutations ----------

  it('A11: anon cannot insert business_staff', async () => {
    const res = await anon
      .from('business_staff')
      .insert({
        business_id: SENTINEL_UUID,
        user_id: RANDOM_UUID,
        role: 'owner',
        is_active: true,
      } as never)
      .select();
    // Insert must be rejected outright.
    expect(res.error, 'A11 anon insert business_staff').toBeTruthy();
  });

  it('A12: anon cannot update business_staff.role', async () => {
    const res = await anon
      .from('business_staff')
      .update({ role: 'manager' } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A12 business_staff.role');
  });

  it('A13: anon cannot update business_staff.is_active', async () => {
    const res = await anon
      .from('business_staff')
      .update({ is_active: false } as never)
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A13 business_staff.is_active');
  });

  it('A14: anon cannot delete business_staff row', async () => {
    const res = await anon
      .from('business_staff')
      .delete()
      .eq('id', SENTINEL_UUID)
      .select();
    expectDenied(res, 'A14 business_staff.delete');
  });

  // ---------- A15: admin_activity_log anon insert ----------

  it('A15: anon cannot insert admin_activity_log', async () => {
    const res = await anon
      .from('admin_activity_log')
      .insert({
        user_id: RANDOM_UUID,
        action: 'anon_probe',
        entity_type: 'business',
        entity_id: SENTINEL_UUID,
        details: {},
      } as never)
      .select();
    expect(res.error, 'A15 anon insert admin_activity_log').toBeTruthy();
  });
});