/**
 * CONTRACT PARTY MODEL — PHASE A
 *
 * Source-level guards to lock in the small, surgical changes made in
 * Phase A:
 *
 *  1. `ExecutionSiteSection` no longer shows the "select your business
 *     first" hint to client-only accounts, branches its query through
 *     `client_sites` directly, and renders a client-friendly empty
 *     state.
 *  2. `SelfClientCard` labels the signed-in user as the second party,
 *     not "العميل".
 *  3. `DashboardContracts` passes `isClientOnlyAccount` to the site
 *     section and uses the second-party label in the stepper / review.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '..', rel), 'utf8');

const SITE_SECTION = read('components/contracts/dashboard/create/ExecutionSiteSection.tsx');
const SELF_CARD = read('components/contracts/SelfClientCard.tsx');
const DASH = read('pages/dashboard/DashboardContracts.tsx');

describe('Contract party model — Phase A site fix', () => {
  it('ExecutionSiteSection accepts isClientOnlyAccount prop', () => {
    expect(SITE_SECTION).toMatch(/isClientOnlyAccount\?\s*:\s*boolean/);
  });

  it('suppresses the "select your business first" hint for client-only accounts', () => {
    expect(SITE_SECTION).toMatch(/!businessId\s*&&\s*!isClientOnlyAccount/);
  });

  it('shows a client-friendly empty state when no sites exist', () => {
    expect(SITE_SECTION).toContain('لا توجد مواقع مرتبطة بحسابك');
  });

  it('shows "add execution site" hint instead of the manshaa message', () => {
    expect(SITE_SECTION).toContain('أضف موقع التنفيذ قبل إنشاء العقد');
  });

  it('queries client_sites directly for client-only accounts', () => {
    expect(SITE_SECTION).toMatch(/isClientOnlyAccount[\s\S]{0,400}from\(['"]client_sites['"]\)/);
    expect(SITE_SECTION).toMatch(/\.eq\(['"]client_user_id['"],\s*clientUserId\)/);
  });

  it('enable flag depends on clientUserId for client-only accounts', () => {
    expect(SITE_SECTION).toMatch(/isClientOnlyAccount\s*\?\s*!!clientUserId\s*:\s*!!businessId/);
  });
});

describe('Contract party model — Phase A terminology', () => {
  it('SelfClientCard labels the user as second party, not client', () => {
    expect(SELF_CARD).toContain('الطرف الثاني (أنت)');
    expect(SELF_CARD).not.toContain('العميل (أنت)');
  });

  it('DashboardContracts passes isClientOnlyAccount to ExecutionSiteSection', () => {
    expect(DASH).toMatch(/<ExecutionSiteSection[\s\S]{0,400}isClientOnlyAccount=\{isClientOnlyAccount\}/);
  });

  it('Stepper "client" step uses second-party label when isClientOnlyAccount', () => {
    expect(DASH).toMatch(/isClientOnlyAccount\s*\?\s*'الطرف الثاني'\s*:\s*'العميل'/);
    expect(DASH).toMatch(/isClientOnlyAccount\s*\?\s*'Second party'\s*:\s*'Client'/);
  });

  it('Review missing-fields uses second-party label when isClientOnlyAccount', () => {
    expect(DASH).toMatch(/missing\.push\(pickBi\(isRTL,\s*isClientOnlyAccount\s*\?\s*'الطرف الثاني'\s*:\s*'العميل'/);
  });
});

describe('Contract party model — Phase A non-regression', () => {
  it('provider/admin path keeps the original "select business first" hint', () => {
    expect(SITE_SECTION).toContain('حدد المنشأة أولاً.');
    expect(SITE_SECTION).toContain('Select your business first.');
  });

  it('does not introduce service_role / any / ts-ignore in changed files', () => {
    for (const src of [SITE_SECTION, SELF_CARD]) {
      expect(src).not.toMatch(/service_role/i);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/:\s*any\b/);
    }
  });
});