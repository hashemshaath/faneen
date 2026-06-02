import { describe, it, expect } from 'vitest';
import {
  getNotificationLabel,
  humanizeJobName,
  humanizeKey,
  notificationLabelDict,
  resolveNotificationTitle,
} from '@/i18n/notificationLabels';

describe('notificationLabels — Arabic-first dictionary', () => {
  it('returns Arabic labels for known notification types', () => {
    expect(getNotificationLabel('business_updated', 'ar')).toBe('تحديث بيانات المنشأة');
    expect(getNotificationLabel('business_sensitive_update', 'ar')).toBe('تحديث بيانات حسّاسة للمنشأة');
    expect(getNotificationLabel('username_status_changed', 'ar')).toBe('تغيير حالة اسم المستخدم');
    expect(getNotificationLabel('membership_tier.admin_override', 'ar')).toBe('تعديل الباقة من قِبل الإدارة');
  });

  it('returns English labels for known notification types', () => {
    expect(getNotificationLabel('business_updated', 'en')).toBe('Business Updated');
    expect(getNotificationLabel('membership_payment_succeeded', 'en')).toBe('Membership Payment Succeeded');
  });

  it('handles cron job names in both separator styles', () => {
    expect(humanizeJobName('membership-payment-reconcile-hourly', 'ar')).toBe('مطابقة دفعات العضوية (كل ساعة)');
    expect(humanizeJobName('membership_payment_reconcile', 'ar')).toBe('مطابقة دفعات العضوية');
    expect(humanizeJobName('membership-lifecycle-dispatcher', 'ar')).toBe('موزّع دورة حياة العضويات');
    expect(humanizeJobName('monthly-provider-credit-grant', 'en')).toBe('Monthly Provider Credit Grant');
  });

  it('falls back to humanized text for unknown keys', () => {
    expect(humanizeKey('some_unmapped_event', 'en')).toBe('Some Unmapped Event');
    expect(humanizeKey('another-cron-job', 'ar')).toBe('another cron job');
    expect(getNotificationLabel('totally_new_key_xyz', 'en')).toBe('Totally New Key Xyz');
  });

  it('resolves stored notification titles, falling back to dictionary for raw keys', () => {
    // Real human-written title — keep it.
    expect(resolveNotificationTitle(
      { title_ar: 'تم تحديث منشأتك بنجاح', title_en: null, notification_type: 'business_updated' },
      'ar',
    )).toBe('تم تحديث منشأتك بنجاح');

    // Title equals raw type key → fall back to Arabic label.
    expect(resolveNotificationTitle(
      { title_ar: 'business_updated', title_en: 'business_updated', notification_type: 'business_updated' },
      'ar',
    )).toBe('تحديث بيانات المنشأة');

    // Missing titles → use dictionary.
    expect(resolveNotificationTitle(
      { title_ar: null, title_en: null, notification_type: 'membership_payment_succeeded' },
      'ar',
    )).toBe('نجاح دفعة العضوية');

    // English requested but only Arabic stored title is human → use it.
    expect(resolveNotificationTitle(
      { title_ar: 'تمت العملية', title_en: null, notification_type: 'business_updated' },
      'en',
    )).toBe('تمت العملية');
  });

  it('every dictionary entry has non-empty ar + en strings', () => {
    for (const [key, pair] of Object.entries(notificationLabelDict)) {
      expect(pair.ar, `missing Arabic label for ${key}`).toBeTruthy();
      expect(pair.en, `missing English label for ${key}`).toBeTruthy();
      // Arabic must contain at least one Arabic character — guards against
      // accidental English-only translations.
      expect(/[\u0600-\u06FF]/.test(pair.ar), `Arabic label for ${key} is not Arabic`).toBe(true);
    }
  });

  it('covers every notification type emitted from edge functions', () => {
    // Snapshot of keys produced by edge functions / DB triggers — keep in
    // sync when adding new emitters. Each must resolve to a real Arabic label
    // (not just a humanized fallback) so admin/dashboard surfaces stay clean.
    const emittedKeys = [
      'business_updated',
      'business_sensitive_update',
      'business_staff_invitation',
      'username_status_changed',
      'membership_tier.admin_override',
      'membership_tier_changed',
      'membership_payment_succeeded',
      'membership_payment_failed',
      'membership_payment_refunded',
      'membership_payment_marked_paid',
      'membership_payment_marked_refunded',
      'contract_milestone_completed',
      'contract_payment_recorded',
      'quote_request_submitted',
      'quote_request_new_admin',
      'quote_request_status_updated',
      'quote_lead_assigned',
      'quote_contact_revealed',
      'lead_cancelled',
      'brand_request_approved',
      'brand_request_rejected',
      'provider_brand_link_approved',
      'provider_brand_link_rejected',
    ];
    for (const key of emittedKeys) {
      expect(notificationLabelDict[key], `dictionary missing entry for ${key}`).toBeTruthy();
    }
  });

  it('covers every scheduled cron job name', () => {
    const cronJobs = [
      'membership-payment-reconcile-hourly',
      'membership-lifecycle-dispatcher',
      'monthly-provider-credit-grant',
    ];
    for (const job of cronJobs) {
      // Must NOT just echo back the technical key — it must be translated.
      expect(humanizeJobName(job, 'ar')).not.toBe(job);
      expect(/[\u0600-\u06FF]/.test(humanizeJobName(job, 'ar'))).toBe(true);
    }
  });
});