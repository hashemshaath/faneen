import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Anonymous-role RLS regression tests.
 *
 * These tests use a fresh anon client (NOT the app's signed-in client) and
 * assert that operations the security audit closed off remain closed:
 *
 *  - phone_otps: no SELECT / INSERT / UPDATE for anon (server-only verification)
 *  - password_reset_log: no INSERT for anon (prevents rate-limit pre-burn)
 *  - provider_landing_settings.indexnow_key: not readable by anon
 *  - provider_landing_settings_public view: readable, but excludes secret key
 *  - businesses: sensitive contact columns (mobile, vat_number, national_id,
 *    account_manager_email, account_manager_phone) blocked for anon
 *
 * If env vars are missing (e.g. local dev without .env), the suite skips
 * cleanly so it never breaks unrelated test runs.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const enabled = Boolean(URL && KEY);

const d = enabled ? describe : describe.skip;

d('RLS anonymous regression', () => {
  let anon: SupabaseClient;
  beforeAll(() => {
    anon = createClient(URL!, KEY!, { auth: { persistSession: false } });
  });

  // ---------- phone_otps ----------
  it('phone_otps: anon SELECT returns no rows (policy denies / table empty to anon)', async () => {
    const { data, error } = await anon.from('phone_otps').select('id').limit(1);
    // Either an explicit RLS error OR an empty result set is acceptable —
    // both prove anon cannot read OTPs. What MUST NOT happen is a non-empty
    // payload coming back.
    if (!error) expect(data ?? []).toEqual([]);
  });

  it('phone_otps: anon INSERT is rejected', async () => {
    const { error } = await anon
      .from('phone_otps')
      .insert({ phone: '+966500000000', code: '000000' } as never);
    expect(error).not.toBeNull();
  });

  it('phone_otps: anon UPDATE is rejected', async () => {
    const { error } = await anon
      .from('phone_otps')
      .update({ code: '111111' } as never)
      .eq('phone', '+966500000000');
    expect(error).not.toBeNull();
  });

  // ---------- password_reset_log ----------
  it('password_reset_log: anon INSERT is rejected', async () => {
    const { error } = await anon
      .from('password_reset_log')
      .insert({ email: 'attacker@example.com' } as never);
    expect(error).not.toBeNull();
  });

  // ---------- provider_landing_settings.indexnow_key ----------
  it('provider_landing_settings: anon cannot SELECT indexnow_key column', async () => {
    const { data, error } = await anon
      .from('provider_landing_settings')
      .select('indexnow_key')
      .limit(1);
    // Column-level revoke -> error. If somehow returned, ensure the value
    // is null/empty (defensive — the migration also added a public view).
    if (!error) {
      for (const row of data ?? []) {
        expect((row as { indexnow_key: unknown }).indexnow_key ?? null).toBeNull();
      }
    } else {
      expect(error).not.toBeNull();
    }
  });

  it('provider_landing_settings_public: anon CAN read safe fields, no indexnow_key', async () => {
    const { data, error } = await anon
      .from('provider_landing_settings_public' as never)
      .select('*')
      .limit(1);
    expect(error).toBeNull();
    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    if (row) expect(row).not.toHaveProperty('indexnow_key');
  });

  // ---------- businesses sensitive contact fields ----------
  it('businesses: anon SELECT of sensitive contact columns is blocked', async () => {
    const { data, error } = await anon
      .from('businesses')
      .select('id, mobile, vat_number, national_id, account_manager_email, account_manager_phone')
      .limit(1);
    if (!error) {
      for (const row of data ?? []) {
        const r = row as Record<string, unknown>;
        expect(r.mobile ?? null).toBeNull();
        expect(r.vat_number ?? null).toBeNull();
        expect(r.national_id ?? null).toBeNull();
        expect(r.account_manager_email ?? null).toBeNull();
        expect(r.account_manager_phone ?? null).toBeNull();
      }
    } else {
      expect(error).not.toBeNull();
    }
  });

  // ---------- lead_requests anti-spoof (R3H) ----------
  it('lead_requests: anon INSERT with spoofed user_id is rejected by RLS', async () => {
    const { error } = await anon.from('lead_requests').insert({
      id: crypto.randomUUID(),
      business_id: '00000000-0000-0000-0000-000000000000',
      user_id: crypto.randomUUID(), // spoof attempt — anon must send null
      name: 'spoof',
      email: 'spoof@example.com',
      message: 'anti-spoof regression test',
      contact_preference: 'any',
      source: 'rls-regression',
    } as never);
    expect(error).not.toBeNull();
  });
});