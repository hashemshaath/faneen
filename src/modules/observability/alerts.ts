import type { ObservabilityAlert, SystemHealthSnapshot } from './types';

export interface AlertInputs {
  emailFailureRatePct: number;
  publishedProviders: number;
  registeredProviders: number;
  draftProviders: number;
  dataIntegrityCritical: number;
  zeroResultSearches: number;
  zeroResultThreshold?: number;
  pendingCustomerConfirmations: number;
  pendingConfirmationThreshold?: number;
  seoCheckRun?: boolean;
  gscConnected?: boolean | 'manual';
  customerPortalSnapshotFailures?: number;
  lowNpsCount?: number;
  contentGaps?: number;
  providersNeedingProfileImprovement?: number;
}

export function computeObservabilityAlerts(i: AlertInputs): ObservabilityAlert[] {
  const alerts: ObservabilityAlert[] = [];
  const zeroThr = i.zeroResultThreshold ?? 5;
  const pendThr = i.pendingConfirmationThreshold ?? 10;

  // Critical
  if (i.dataIntegrityCritical > 0)
    alerts.push({ severity: 'critical', code: 'data_integrity_critical', label_ar: 'تنبيهات سلامة بيانات حرجة', label_en: 'Critical data integrity findings', value: i.dataIntegrityCritical });
  if (i.emailFailureRatePct > 20)
    alerts.push({ severity: 'critical', code: 'email_failure_rate_high', label_ar: 'نسبة فشل البريد مرتفعة', label_en: 'Email failure rate above 20%', value: i.emailFailureRatePct });
  if (i.registeredProviders > 0 && i.publishedProviders === 0)
    alerts.push({ severity: 'critical', code: 'no_published_providers', label_ar: 'لا يوجد مزوّدون منشورون', label_en: 'No published providers after launch' });
  if ((i.customerPortalSnapshotFailures ?? 0) > 0)
    alerts.push({ severity: 'critical', code: 'customer_portal_snapshot_failures', label_ar: 'إخفاقات لقطات بوابة العميل', label_en: 'Customer portal snapshot failures', value: i.customerPortalSnapshotFailures });

  // Warning
  if (i.zeroResultSearches > zeroThr)
    alerts.push({ severity: 'warning', code: 'zero_result_searches_high', label_ar: 'بحث بنتائج صفرية مرتفع', label_en: 'High zero-result help searches', value: i.zeroResultSearches });
  if (i.draftProviders > i.publishedProviders * 3 && i.draftProviders > 5)
    alerts.push({ severity: 'warning', code: 'draft_to_published_ratio_high', label_ar: 'مسوّدات أكثر بكثير من المنشور', label_en: 'Draft providers far outnumber published' });
  if (i.pendingCustomerConfirmations > pendThr)
    alerts.push({ severity: 'warning', code: 'pending_customer_confirmations_high', label_ar: 'تأكيدات عملاء معلّقة كثيرة', label_en: 'Pending customer confirmations above threshold', value: i.pendingCustomerConfirmations });
  if (i.seoCheckRun === false)
    alerts.push({ severity: 'warning', code: 'seo_check_not_run', label_ar: 'لم يتم تشغيل فحص SEO بعد النشر', label_en: 'SEO check not run after deploy' });
  if (i.gscConnected === false)
    alerts.push({ severity: 'warning', code: 'gsc_not_connected', label_ar: 'Google Search Console غير مُوصَّل', label_en: 'GSC not connected' });

  // Info
  if ((i.contentGaps ?? 0) > 0)
    alerts.push({ severity: 'info', code: 'new_content_gaps', label_ar: 'فجوات محتوى جديدة', label_en: 'New help content gaps detected', value: i.contentGaps });
  if ((i.providersNeedingProfileImprovement ?? 0) > 0)
    alerts.push({ severity: 'info', code: 'providers_need_profile_improvement', label_ar: 'ملفات مزوّدين تحتاج تحسينًا', label_en: 'Provider profiles need improvement', value: i.providersNeedingProfileImprovement });
  if ((i.lowNpsCount ?? 0) > 0)
    alerts.push({ severity: 'info', code: 'low_nps_responses', label_ar: 'تقييمات NPS منخفضة', label_en: 'Low NPS responses', value: i.lowNpsCount });

  return alerts;
}

export function alertCountsBySeverity(alerts: ObservabilityAlert[]): { critical: number; warning: number; info: number } {
  return alerts.reduce(
    (acc, a) => { acc[a.severity]++; return acc; },
    { critical: 0, warning: 0, info: 0 },
  );
}

export function snapshotAlertCounts(snapshot: SystemHealthSnapshot) {
  return alertCountsBySeverity(snapshot.alerts);
}