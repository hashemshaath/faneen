/**
 * Phase 7G — AdminProviderSubscriptions ManageSub UI extraction guards.
 *
 * Asserts the new provider section/panel/card exist and are pure UI:
 * no Supabase, no queries, no mutations, no RPC names, no direct
 * `provider_lead_credit_transactions` references, no hex colors, no
 * `any` / suppressions. Also asserts the parent page adopts them
 * and still owns all sensitive mutations/queries.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROV_DIR = path.resolve(__dirname, '../components/admin/memberships/providers');
const ADMIN_PAGE = path.resolve(__dirname, '../pages/admin/AdminProviderSubscriptions.tsx');
const APP_TSX = path.resolve(__dirname, '../App.tsx');

const NEW_FILES = [
  'ProviderSubscriptionsTableSection.tsx',
  'ProviderManageSubscriptionPanel.tsx',
  'ProviderCreditActionCard.tsx',
];

const readFile = (file: string) => fs.readFileSync(path.join(PROV_DIR, file), 'utf8');
const pageSrc = () => fs.readFileSync(ADMIN_PAGE, 'utf8');

describe('Phase 7G — admin provider subscriptions extraction', () => {
  it('all 3 new files exist + barrel', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(PROV_DIR, f)), `${f} missing`).toBe(true);
    }
    expect(fs.existsSync(path.join(PROV_DIR, 'index.ts'))).toBe(true);
  });

  it('barrel re-exports the new components', () => {
    const barrel = fs.readFileSync(path.join(PROV_DIR, 'index.ts'), 'utf8');
    for (const sym of [
      'ProviderSubscriptionsTableSection',
      'ProviderManageSubscriptionPanel',
      'ProviderCreditActionCard',
    ]) {
      expect(barrel).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('AdminProviderSubscriptions.tsx adopts ProviderManageSubscriptionPanel + table section', () => {
    const src = pageSrc();
    expect(src.includes('<ProviderManageSubscriptionPanel')).toBe(true);
    expect(src.includes('<ProviderSubscriptionsTableSection')).toBe(true);
  });

  it('new components never import Supabase, modules, services or notifications', () => {
    const forbidden = [
      '@/integrations/supabase/client',
      '@/modules/memberships',
      '@/modules/credits',
      '@/modules/notifications',
      '@/services',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = readFile(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('new components contain no queries, mutations or RPC helpers', () => {
    const banned = [
      'useQuery',
      'useMutation',
      'useQueryClient',
      '.rpc(',
      '.from(',
      'adminAdjustProviderCredits',
      'updateProviderSubscriptionById',
      'listProviderPlans',
      'listProviderSubscriptions',
      'listProviderCreditTransactionsForBusiness',
    ];
    for (const f of NEW_FILES) {
      const src = readFile(f);
      for (const m of banned) {
        expect(src.includes(m), `${f} must not reference ${m}`).toBe(false);
      }
    }
  });

  it('new components contain no direct provider_lead_credit_transactions references', () => {
    for (const f of NEW_FILES) {
      const src = readFile(f);
      expect(src.includes('provider_lead_credit_transactions')).toBe(false);
    }
  });

  it('new components contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      expect(hex.test(readFile(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('new components contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = readFile(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore')).toBe(false);
      expect(src.includes('@ts-expect-error')).toBe(false);
      expect(src.includes('eslint-disable')).toBe(false);
    }
  });

  it('AdminProviderSubscriptions.tsx still owns all sensitive mutations & queries', () => {
    const src = pageSrc();
    for (const sym of [
      'adminAdjustProviderCredits',
      'updateProviderSubscriptionById',
      'listProviderSubscriptions',
      'listProviderPlans',
      'listProviderCreditTransactionsForBusiness',
      'useMutation',
      'useQuery',
      'useQueryClient',
    ]) {
      expect(src.includes(sym), `AdminProviderSubscriptions.tsx must still own ${sym}`).toBe(true);
    }
  });

  it('ManageSub RPC payload shape (action + reason values) preserved in parent', () => {
    const src = pageSrc();
    for (const needle of [
      "'grant'",
      "'refund'",
      "'adjustment'",
      'admin_manual_grant',
      'admin_refund',
      'admin_adjustment',
      'p_subscription_id',
      'p_action',
      'p_amount',
      'p_reason',
      'p_quote_request_lead_id',
    ]) {
      expect(src.includes(needle), `parent must still reference ${needle}`).toBe(true);
    }
  });

  it('AdminProviderSubscriptions.tsx is meaningfully smaller (< 320 lines)', () => {
    const src = pageSrc();
    const lineCount = src.split('\n').length;
    expect(lineCount, `AdminProviderSubscriptions.tsx line count = ${lineCount}`).toBeLessThan(320);
  });

  it('legacy redirects still exist in App.tsx', () => {
    const src = fs.readFileSync(APP_TSX, 'utf8');
    expect(src.includes('<Navigate')).toBe(true);
  });
});