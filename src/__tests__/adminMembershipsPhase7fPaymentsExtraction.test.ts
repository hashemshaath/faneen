/**
 * Phase 7F — AdminMembershipPayments safe extraction guards.
 *
 * Asserts the new payments sections/forms exist, are pure UI (no Supabase,
 * no queries/mutations/RPCs, no payment helpers), no hex colors, no
 * suppressions, that the parent page adopts them, and that the parent
 * still owns all sensitive payment lifecycle calls.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PAY_DIR = path.resolve(__dirname, '../components/admin/memberships/payments');
const ADMIN_PAGE = path.resolve(
  __dirname,
  '../pages/admin/AdminMembershipPayments.tsx',
);
const APP_TSX = path.resolve(__dirname, '../App.tsx');

const NEW_FILES = [
  'MembershipPaymentsStatsStrip.tsx',
  'MembershipPaymentIntentsSection.tsx',
  'MembershipWebhookEventsSection.tsx',
  'PaymentManualForm.tsx',
  'PaymentRefundForm.tsx',
];

const readFile = (file: string) => fs.readFileSync(path.join(PAY_DIR, file), 'utf8');
const pageSrc = () => fs.readFileSync(ADMIN_PAGE, 'utf8');

describe('Phase 7F — admin membership payments extraction', () => {
  it('all 5 new files exist + barrel', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(PAY_DIR, f)), `${f} missing`).toBe(true);
    }
    expect(fs.existsSync(path.join(PAY_DIR, 'index.ts'))).toBe(true);
  });

  it('barrel re-exports the new components', () => {
    const barrel = fs.readFileSync(path.join(PAY_DIR, 'index.ts'), 'utf8');
    for (const sym of [
      'MembershipPaymentsStatsStrip',
      'MembershipPaymentIntentsSection',
      'MembershipWebhookEventsSection',
      'PaymentManualForm',
      'PaymentRefundForm',
    ]) {
      expect(barrel).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('AdminMembershipPayments.tsx adopts the new section + form components', () => {
    const src = pageSrc();
    for (const sym of [
      '<MembershipPaymentIntentsSection',
      '<MembershipWebhookEventsSection',
      '<PaymentManualForm',
      '<PaymentRefundForm',
    ]) {
      expect(src.includes(sym), `AdminMembershipPayments.tsx missing ${sym}`).toBe(true);
    }
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

  it('new components contain no queries, mutations or payment helpers', () => {
    const banned = [
      'useQuery',
      'useMutation',
      'useQueryClient',
      '.rpc(',
      '.from(',
      'markMembershipPaidManually',
      'markMembershipRefundedManually',
      'reconcileMembershipPaymentStatus',
      'listMembershipPaymentIntents',
      'listMembershipPaymentWebhookEvents',
    ];
    for (const f of NEW_FILES) {
      const src = readFile(f);
      for (const m of banned) {
        expect(src.includes(m), `${f} must not reference ${m}`).toBe(false);
      }
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

  it('PaymentStatusBadge & WebhookEventStatusBadge are still used by the new sections', () => {
    const intents = readFile('MembershipPaymentIntentsSection.tsx');
    const events = readFile('MembershipWebhookEventsSection.tsx');
    expect(intents.includes('PaymentStatusBadge')).toBe(true);
    expect(events.includes('WebhookEventStatusBadge')).toBe(true);
  });

  it('AdminMembershipPayments.tsx still owns all sensitive payment mutations & queries', () => {
    const src = pageSrc();
    for (const sym of [
      'markMembershipPaidManually',
      'markMembershipRefundedManually',
      'reconcileMembershipPaymentStatus',
      'listMembershipPaymentIntents',
      'listMembershipPaymentWebhookEvents',
      'useQuery',
      'useQueryClient',
    ]) {
      expect(src.includes(sym), `AdminMembershipPayments.tsx must still own ${sym}`).toBe(true);
    }
  });

  it('AdminMembershipPayments.tsx is meaningfully smaller (< 500 lines)', () => {
    const src = pageSrc();
    const lineCount = src.split('\n').length;
    expect(lineCount, `AdminMembershipPayments.tsx line count = ${lineCount}`).toBeLessThan(500);
  });

  it('legacy redirects still exist in App.tsx', () => {
    const src = fs.readFileSync(APP_TSX, 'utf8');
    expect(src.includes('<Navigate')).toBe(true);
  });
});