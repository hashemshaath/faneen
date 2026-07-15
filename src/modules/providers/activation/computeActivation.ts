/**
 * F1.1 — Provider Activation Checklist (pure helper).
 *
 * The 5 steps mirror the matcher's WHERE clause EXACTLY so a "fully
 * active" provider (isFullyActive === true) is guaranteed to be included
 * in the candidate set of `public.match_quote_to_providers`.
 *
 *   1. business_approved  — approval_status ∈ {approved, published}
 *   2. coverage_set       — ≥1 business_service_areas row (DOMINANT LEAK
 *                            today: 1/12 providers have coverage)
 *   3. activity_taxonomy  — ≥1 business_taxonomy_categories row with
 *                            role = 'primary_activity'. This is what the
 *                            matcher actually joins on — NOT the per-service
 *                            business_service_taxonomy_categories table.
 *   4. has_service        — ≥1 active business_services row
 *   5. profile_basics     — logo_url present AND description length ≥ 20
 *                            (description_ar OR description_en)
 *
 * NO DB access here — callers pass in the raw counts (see
 * `useProviderActivation`). This keeps the helper unit-testable and
 * reusable by admin/growth analytics if they ever want to compute the
 * same rollup for another business.
 */

export type ActivationStepKey =
  | 'business_approved'
  | 'coverage_set'
  | 'activity_taxonomy'
  | 'has_service'
  | 'profile_basics';

export interface ActivationStep {
  key: ActivationStepKey;
  labelAr: string;
  labelEn: string;
  done: boolean;
  href: string;
  hintAr?: string;
  hintEn?: string;
}

export interface ActivationInput {
  approvalStatus: string | null | undefined;
  coverageCount: number;
  /**
   * Count of `business_taxonomy_categories` rows with
   * `role = 'primary_activity'` for this business. Matches the matcher's
   * hard join requirement in `match_quote_to_providers`.
   */
  primaryActivityCount: number;
  activeServicesCount: number;
  logoUrl: string | null | undefined;
  descriptionAr: string | null | undefined;
  descriptionEn: string | null | undefined;
}

export interface ActivationResult {
  steps: ActivationStep[];
  completedCount: number;
  totalCount: number;
  percent: number;
  isFullyActive: boolean;
}

const MIN_DESCRIPTION_LEN = 20;

export function computeProviderActivation(input: ActivationInput): ActivationResult {
  const approved =
    input.approvalStatus === 'approved' || input.approvalStatus === 'published';

  const coverageOk = input.coverageCount > 0;
  const activityOk = input.primaryActivityCount > 0;
  const hasServiceOk = input.activeServicesCount > 0;

  const descLen = Math.max(
    (input.descriptionAr ?? '').trim().length,
    (input.descriptionEn ?? '').trim().length,
  );
  const profileBasicsOk = !!input.logoUrl && descLen >= MIN_DESCRIPTION_LEN;

  const steps: ActivationStep[] = [
    {
      key: 'business_approved',
      labelAr: 'اعتماد المنشأة',
      labelEn: 'Business approved',
      done: approved,
      href: '/dashboard/business-visibility',
      hintAr: approved ? undefined : 'ملفك قيد المراجعة أو يحتاج للإرسال للاعتماد.',
      hintEn: approved ? undefined : 'Your profile is under review or awaiting submission.',
    },
    {
      key: 'coverage_set',
      labelAr: 'مناطق التغطية',
      labelEn: 'Service coverage',
      done: coverageOk,
      href: '/dashboard/business/coverage',
      hintAr: coverageOk ? undefined : 'بدون تغطية لن تصلك أي طلبات — هذه أهم خطوة.',
      hintEn: coverageOk ? undefined : 'Without coverage areas you will receive zero requests — this is the top blocker.',
    },
    {
      key: 'activity_taxonomy',
      labelAr: 'نشاط المنشأة',
      labelEn: 'Business activity',
      done: activityOk,
      href: '/dashboard/business-edit',
      hintAr: activityOk ? undefined : 'حدّد النشاط الرئيسي للمنشأة حتى تظهر في المطابقة.',
      hintEn: activityOk ? undefined : 'Set your primary business activity so the matcher can find you.',
    },
    {
      key: 'has_service',
      labelAr: 'إضافة خدمة',
      labelEn: 'Add a service',
      done: hasServiceOk,
      href: '/dashboard/services',
      hintAr: hasServiceOk ? undefined : 'أضف خدمة واحدة على الأقل لتظهر في المطابقة.',
      hintEn: hasServiceOk ? undefined : 'Add at least one service to appear in matching.',
    },
    {
      key: 'profile_basics',
      labelAr: 'أساسيات الملف',
      labelEn: 'Profile basics',
      done: profileBasicsOk,
      href: '/dashboard/business-edit',
      hintAr: profileBasicsOk ? undefined : 'أضف الشعار ووصفًا (20 حرفًا فأكثر).',
      hintEn: profileBasicsOk ? undefined : 'Add a logo and a description (20+ chars).',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const isFullyActive = completedCount === totalCount;

  return { steps, completedCount, totalCount, percent, isFullyActive };
}