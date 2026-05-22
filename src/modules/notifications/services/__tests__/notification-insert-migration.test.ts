import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), 'utf-8');

const DIRECT_INSERT = /\.from\(\s*['"]notifications['"]\s*\)\s*\.insert/;

/**
 * N-3 — Awaited fail-soft notification inserts have been migrated to the
 * shared `createNotification` wrapper. These tests lock in:
 *   - the direct `.from('notifications').insert(...)` call is gone,
 *   - the wrapper is imported and called,
 *   - the exact payload fields are preserved,
 *   - the awaited fail-soft try/catch/console.warn pattern is preserved,
 *   - ordering relative to transactional email sends is preserved,
 *   - the deferred fire-and-forget / blocking-await groups remain untouched.
 */

const FAIL_SOFT_FILES = [
  'src/components/membership/AdminUpgradeRequestsPanel.tsx',
  'src/pages/Membership.tsx',
  'src/pages/admin/AdminProviderReview.tsx',
] as const;

const FIRE_AND_FORGET_FILES = [
  'src/pages/dashboard/DashboardContracts.tsx',
  'src/pages/ContractDetail.tsx',
] as const;

const DEFERRED_FILES = {
  blocking: [
    'src/pages/dashboard/DashboardContracts.tsx',
    'src/pages/admin/AdminQuoteRequestDetails.tsx',
  ],
} as const;

describe('N-3 — fail-soft notification insert migration', () => {
  it.each(FAIL_SOFT_FILES)('%s no longer contains direct notifications.insert', (rel) => {
    expect(read(rel)).not.toMatch(DIRECT_INSERT);
  });

  it.each(FAIL_SOFT_FILES)('%s imports createNotification', (rel) => {
    const src = read(rel);
    expect(src).toContain(
      "import { createNotification } from '@/modules/notifications/services/createNotification'",
    );
    expect(src).toContain('createNotification({');
  });

  describe('AdminUpgradeRequestsPanel — approval + rejection inserts', () => {
    const src = read('src/components/membership/AdminUpgradeRequestsPanel.tsx');

    it('approval payload preserved verbatim', () => {
      expect(src).toContain("title_ar: 'تمت الموافقة على ترقية باقتك'");
      expect(src).toContain("title_en: 'Your upgrade has been approved'");
      expect(src).toContain("reference_type: 'membership_upgrade_approved'");
      expect(src).toContain("action_url: '/dashboard'");
    });

    it('rejection payload preserved verbatim', () => {
      expect(src).toContain("title_ar: 'تحديث بخصوص طلب ترقية الباقة'");
      expect(src).toContain("title_en: 'Update on your upgrade request'");
      expect(src).toContain("reference_type: 'membership_upgrade_rejected'");
      expect(src).toContain("action_url: '/membership'");
    });

    it('awaited fail-soft try/catch + console.warn preserved (×2)', () => {
      const warns = src.match(/console\.warn\('\[AdminUpgrade\] notification failed'/g) ?? [];
      expect(warns.length).toBe(2);
      const awaited = src.match(/await createNotification\(\{/g) ?? [];
      expect(awaited.length).toBe(2);
    });
  });

  describe('Membership — upgrade-received + auto-renewal-cancelled inserts', () => {
    const src = read('src/pages/Membership.tsx');

    it('upgrade-received payload preserved verbatim', () => {
      expect(src).toContain("title_ar: 'تم استلام طلب ترقية الباقة'");
      expect(src).toContain("title_en: 'Upgrade request received'");
    });

    it('auto-renewal-cancelled payload preserved verbatim', () => {
      expect(src).toContain("title_ar: 'تم إيقاف التجديد التلقائي'");
      expect(src).toContain("title_en: 'Auto-renewal cancelled'");
      expect(src).toContain("reference_type: 'membership_subscription_cancelled'");
    });

    it('awaited fail-soft try/catch + console.warn preserved', () => {
      expect(src).toContain("console.warn('[Membership] notification insert failed'");
      expect(src).toContain("console.warn('[Membership] cancel notification failed'");
      const awaited = src.match(/await createNotification\(\{/g) ?? [];
      expect(awaited.length).toBe(2);
    });
  });

  describe('AdminProviderReview — approval/rejection insert', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');

    it('uses copy fields (status-driven), reference_type and action_url preserved', () => {
      expect(src).toContain('title_ar: copy.titleAr');
      expect(src).toContain('title_en: copy.titleEn');
      expect(src).toContain('body_ar: copy.bodyAr');
      expect(src).toContain('body_en: copy.bodyEn');
      expect(src).toContain("reference_type: 'business_approval'");
      expect(src).toContain("action_url: '/dashboard'");
    });

    it('awaited fail-soft try/catch + console.warn preserved', () => {
      expect(src).toContain(
        "console.warn('[AdminProviderReview] notification insert failed', err);",
      );
    });

    it('ordering: notification insert still precedes transactional email send', () => {
      const notifyIdx = src.indexOf('await createNotification({');
      const emailIdx = src.indexOf('await sendTransactionalEmail({');
      expect(notifyIdx).toBeGreaterThan(-1);
      expect(emailIdx).toBeGreaterThan(notifyIdx);
    });
  });
});

describe('N-4 — fire-and-forget notification insert migration', () => {
  it.each(FIRE_AND_FORGET_FILES)('%s no longer contains direct notifications.insert', (rel) => {
    expect(read(rel)).not.toMatch(/void supabase\.from\('notifications'\)\.insert/);
  });

  it.each(FIRE_AND_FORGET_FILES)('%s imports createNotificationFireAndForget', (rel) => {
    const src = read(rel);
    expect(src).toContain(
      "import { createNotificationFireAndForget } from '@/modules/notifications/services/createNotification'",
    );
    expect(src).toContain('createNotificationFireAndForget({');
  });

  describe('DashboardContracts — milestone-completed insert', () => {
    const src = read('src/pages/dashboard/DashboardContracts.tsx');

    it('payload fields preserved verbatim', () => {
      expect(src).toContain("title_ar: 'تم تحديث مرحلة في عقدك'");
      expect(src).toContain("title_en: 'A milestone in your contract was updated'");
      expect(src).toContain("notification_type: 'contract_milestone_completed'");
      expect(src).toContain("reference_type: 'contract'");
      expect(src).toContain('action_url: `/contracts/${contract.id}`');
    });

    it('body fields use msTitle / refId expressions', () => {
      expect(src).toContain('body_ar: msTitle ? `المرحلة: ${msTitle}` : `العقد ${refId}`');
      expect(src).toContain('body_en: msTitle ? `Milestone: ${msTitle}` : `Contract ${refId}`');
    });

    it('uses createNotificationFireAndForget with correct tag', () => {
      expect(src).toContain(
        "[DashboardContracts] milestone-completed notification failed'",
      );
    });

    it('ordering: notification insert still precedes transactional email send', () => {
      const notifyIdx = src.indexOf('createNotificationFireAndForget({');
      const emailIdx = src.indexOf('void sendTransactionalEmail({');
      expect(notifyIdx).toBeGreaterThan(-1);
      expect(emailIdx).toBeGreaterThan(notifyIdx);
    });
  });

  describe('ContractDetail — payment-recorded insert', () => {
    const src = read('src/pages/ContractDetail.tsx');

    it('payload fields preserved verbatim', () => {
      expect(src).toContain("title_ar: 'تم تسجيل دفعة على عقدك'");
      expect(src).toContain("title_en: 'A payment was recorded on your contract'");
      expect(src).toContain("notification_type: 'contract_payment_recorded'");
      expect(src).toContain("reference_type: 'contract'");
      expect(src).toContain('action_url: `/contracts/${contract.id}`');
    });

    it('body fields use pay.installment_number / refId expressions', () => {
      expect(src).toContain('body_ar: `تم تسجيل دفعة #${pay.installment_number} على العقد ${refId}.`');
      expect(src).toContain('body_en: `Payment #${pay.installment_number} was recorded on contract ${refId}.`');
    });

    it('uses createNotificationFireAndForget with correct tag', () => {
      expect(src).toContain(
        "[ContractDetail] payment-recorded notification failed'",
      );
    });

    it('ordering: notification insert still precedes transactional email send', () => {
      const notifyIdx = src.indexOf('createNotificationFireAndForget({');
      const emailIdx = src.indexOf('void sendTransactionalEmail({');
      expect(notifyIdx).toBeGreaterThan(-1);
      expect(emailIdx).toBeGreaterThan(notifyIdx);
    });
  });
});

describe('N-4 — deferred blocking-await group remains untouched', () => {
  it('blocking-await callsites still use direct `await supabase.from(...).insert`', () => {
    for (const rel of DEFERRED_FILES.blocking) {
      const src = read(rel);
      expect(src).toMatch(/await supabase\.from\('notifications'\)\.insert/);
    }
  });
});
