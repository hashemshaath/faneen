import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ADMIN-SYSTEM-SETTINGS-DEEP-AUDIT-1 Phase 2 — System tab honesty guard.
 *
 * Locks in the contract that the only system-tab setting persisted to
 * `platform_settings` and treated as a live editable control is
 * `robots_txt_custom` (consumed by `supabase/functions/robots/index.ts`).
 *
 * Everything else must be rendered as deferred / read-only so admins are
 * not misled by fake working controls — most importantly `maintenance_mode`,
 * which is NOT a real kill switch.
 */
const src = readFileSync(
  resolve(__dirname, '../pages/admin/AdminSystemSettings.tsx'),
  'utf8',
);

describe('ADMIN-SYSTEM-SETTINGS-DEEP-AUDIT-1: system tab', () => {
  it('exports WIRED_SYSTEM_SETTING_KEYS containing only robots_txt_custom', () => {
    expect(src).toMatch(/export const WIRED_SYSTEM_SETTING_KEYS\s*=\s*new Set<string>\(\['robots_txt_custom'\]\)/);
  });

  it('removes google_analytics_id from the editable defaults (runtime uses VITE_GTM_ID)', () => {
    expect(src).not.toMatch(/key:\s*'google_analytics_id'/);
  });

  it('keeps maintenance_mode but flags it as deferred (no real runtime gate)', () => {
    expect(src).toMatch(/key:\s*'maintenance_mode'[^}]*deferredNote:\s*MAINTENANCE_NOTE/);
    expect(src).not.toMatch(/key:\s*'maintenance_mode'[^}]*wired:\s*true/);
  });

  it('guards updateValue against non-wired writes', () => {
    expect(src).toMatch(/if \(!WIRED_SYSTEM_SETTING_KEYS\.has\(key\)\) return/);
  });

  it('guards saveMutation against persisting non-wired keys', () => {
    expect(src).toMatch(/dirty\)\.filter\(k => WIRED_SYSTEM_SETTING_KEYS\.has\(k\)\)/);
  });

  it('shows the deferred honesty banner copy', () => {
    expect(src).toMatch(/الإعدادات غير الموصولة تظهر كعناصر مؤجلة/);
  });
});