import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ADMIN-SYSTEM-SETTINGS-DEEP-AUDIT-1 Phase 2 — API tab secret-leak guard.
 *
 * The /admin/system-settings → API tab must never invite admins to paste
 * private secrets into the client-managed `platform_settings` table.
 * All server-side credentials must be rendered as status-only rows that
 * point admins at Lovable / Supabase Secrets instead. SPL_API_KEY is the
 * only key that remains editable, and only because the
 * `national-address-lookup` edge function has a documented DB fallback —
 * it is labeled "fallback only" so the recommended source is still Secrets.
 */
const src = readFileSync(
  resolve(__dirname, '../pages/admin/AdminApiSettings.tsx'),
  'utf8',
);

describe('ADMIN-SYSTEM-SETTINGS-DEEP-AUDIT-1: API tab', () => {
  it('declares every sensitive server secret as server-managed (status-only)', () => {
    const required = [
      'SMTP_PASSWORD',
      'TWILIO_AUTH_TOKEN',
      'OPENAI_API_KEY',
      'GOOGLE_AI_KEY',
      'GOOGLE_RECAPTCHA_SECRET',
      'FCM_SERVER_KEY',
      // Public-ish IDs that runtime does not read from DB:
      'GOOGLE_ANALYTICS_ID',
      'GOOGLE_MAPS_KEY',
    ];
    for (const key of required) {
      expect(src).toMatch(new RegExp(`SERVER_SECRET_KEYS[\\s\\S]*'${key}'`));
    }
  });

  it('keeps SPL_API_KEY as the only fallback-only editable key', () => {
    expect(src).toMatch(/FALLBACK_ONLY_KEYS\s*=\s*new Set<string>\(\['SPL_API_KEY'\]\)/);
    // SPL_API_KEY must NOT appear inside the SERVER_SECRET_KEYS set body.
    const m = src.match(/SERVER_SECRET_KEYS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/SPL_API_KEY/);
  });

  it('renders server-secret rows as status-only with a Lovable/Supabase Secrets pointer', () => {
    // The status-only branch must short-circuit before any editable Input.
    expect(src).toMatch(/if \(isServerSecret\)\s*{[\s\S]*Server secret/);
    expect(src).toMatch(/Lovable\s*\/\s*Supabase Secrets/);
  });

  it('does not render a password / text Input for server-managed secrets', () => {
    // The single password-typed Input that remains is inside the editable
    // branch reached only for non-server-secret rows. Guard by ensuring the
    // server-secret branch sits ABOVE that Input in source order.
    const guardIdx = src.indexOf('if (isServerSecret)');
    const inputIdx = src.indexOf("setting.is_secret && !isVisible ? 'password' : 'text'");
    expect(guardIdx).toBeGreaterThan(0);
    expect(inputIdx).toBeGreaterThan(guardIdx);
  });

  it('labels the SPL fallback row clearly', () => {
    expect(src).toMatch(/Fallback only|احتياطي فقط/);
    expect(src).toMatch(/Supabase Secrets/);
  });
});