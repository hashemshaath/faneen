import React from 'react';
import { ExternalLink, Globe2, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { pickBi } from '@/components/common/Bilingual';
import { getBusinessProfileHref, getBusinessProfileUrl, isReservedUsername, normalizeUsername } from '@/lib/business/profileHref';

export const PUBLIC_BUSINESS_PROFILE_ROUTE_SOURCE = 'username' as const;

export type BusinessPublicVisibilityBusiness = {
  id: string;
  username?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  is_active?: boolean | null;
  is_demo?: boolean | null;
  approval_status?: string | null;
  city_id?: string | null;
};

export type PublicVisibilityProbeRow = {
  id: string;
  username: string | null;
};

export type VisibilityCheck = {
  key: string;
  labelAr: string;
  labelEn: string;
  passed: boolean;
};

export type PublicVisibilityState = {
  publicPath: string | null;
  publicUrl: string | null;
  isPubliclyVisible: boolean;
  canPublish: boolean;
  checks: VisibilityCheck[];
  blockingReasonAr: string;
  blockingReasonEn: string;
};

const BASIC_NAME_MIN_LENGTH = 2;

export function hasBasicBusinessProfileData(business: BusinessPublicVisibilityBusiness): boolean {
  return Boolean((business.name_ar ?? business.name_en ?? '').trim().length >= BASIC_NAME_MIN_LENGTH);
}

export function buildPublicVisibilityState(
  business: BusinessPublicVisibilityBusiness,
  publicProbe: PublicVisibilityProbeRow | null | undefined,
  duplicateCount: number | null | undefined,
): PublicVisibilityState {
  const username = normalizeUsername(business.username);
  const publicPath = getBusinessProfileHref({ username });
  const publicUrl = getBusinessProfileUrl({ username });
  const hasUsername = Boolean(username);
  const usernameUnique = hasUsername && (duplicateCount ?? 0) === 0;
  const isActive = business.is_active === true;
  const isNotDemo = business.is_demo !== true;
  const isPublished = business.approval_status === 'published';
  const inPublicView = Boolean(publicProbe?.id && publicProbe.id === business.id);
  const hasBasicData = hasBasicBusinessProfileData(business);

  const checks: VisibilityCheck[] = [
    { key: 'username', labelAr: 'اسم رابط عام موجود', labelEn: 'Public handle exists', passed: hasUsername },
    { key: 'unique', labelAr: 'الرابط فريد', labelEn: 'Handle is unique', passed: usernameUnique },
    { key: 'active', labelAr: 'الجهة نشطة', labelEn: 'Business is active', passed: isActive },
    { key: 'not-demo', labelAr: 'الجهة ليست demo', labelEn: 'Business is not demo', passed: isNotDemo },
    { key: 'published', labelAr: 'الجهة منشورة', labelEn: 'Business is published', passed: isPublished },
    { key: 'public-view', labelAr: 'تظهر في public view', labelEn: 'Appears in public view', passed: inPublicView },
    { key: 'basic-data', labelAr: 'البيانات الأساسية مكتملة', labelEn: 'Basic data is complete', passed: hasBasicData },
  ];

  let blockingReasonAr = 'الرابط العام يعمل والجهة ظاهرة للعامة.';
  let blockingReasonEn = 'The public link works and the business is publicly visible.';

  if (!hasUsername) {
    blockingReasonAr = 'لن تظهر هذه الجهة للعامة لأن اسم الرابط العام غير موجود. أضف اسمًا عامًا ثم انشر الجهة.';
    blockingReasonEn = 'This business is not public because it has no public handle. Add a handle, then publish it.';
  } else if (!usernameUnique) {
    blockingReasonAr = `لن تظهر هذه الجهة للعامة لأن الرابط ${username} مستخدم بالفعل. اختر رابطًا آخر.`;
    blockingReasonEn = `This business is not public because ${username} is already used. Choose another handle.`;
  } else if (!isActive) {
    blockingReasonAr = 'لن تظهر هذه الجهة للعامة لأنها غير نشطة. فعّل الجهة أو استخدم زر النشر.';
    blockingReasonEn = 'This business is not public because it is inactive. Activate it or use the publish button.';
  } else if (!isNotDemo) {
    blockingReasonAr = 'لن تظهر هذه الجهة للعامة لأنها مميزة كبيانات demo. ألغِ وضع demo عند النشر.';
    blockingReasonEn = 'This business is not public because it is marked as demo data. Publishing clears demo mode.';
  } else if (!isPublished) {
    blockingReasonAr = `لن تظهر هذه الجهة للعامة لأن حالة المراجعة الحالية ${business.approval_status ?? 'غير محددة'}. انشر الجهة أولًا من زر النشر.`;
    blockingReasonEn = `This business is not public because its review status is ${business.approval_status ?? 'not set'}. Publish it first.`;
  } else if (!inPublicView) {
    blockingReasonAr = 'شروط النشر محفوظة لكن الجهة لا تظهر في public view بعد. حدّث الصفحة أو راجع فلتر الظهور العام.';
    blockingReasonEn = 'Publishing conditions are saved, but the business is not in the public view yet. Refresh or review the public visibility filter.';
  } else if (!hasBasicData) {
    blockingReasonAr = 'لن تظهر هذه الجهة بشكل مكتمل لأن الاسم الأساسي غير مكتمل.';
    blockingReasonEn = 'This business is missing required basic profile data.';
  }

  const isPubliclyVisible = checks.every((check) => check.passed);
  const canPublish = (hasUsername ? usernameUnique : Boolean(generateBusinessUsernameCandidate(business))) && hasBasicData;

  return {
    publicPath,
    publicUrl,
    isPubliclyVisible,
    canPublish,
    checks,
    blockingReasonAr,
    blockingReasonEn,
  };
}

export function generateBusinessUsernameCandidate(business: BusinessPublicVisibilityBusiness): string | null {
  const source = (business.name_en ?? business.name_ar ?? '').trim();
  const candidate = source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 30);
  if (!candidate || candidate.length < 3 || isReservedUsername(candidate)) return null;
  return candidate;
}

export function createAdminPublishPayload(username: string): Record<string, unknown> {
  return {
    username,
    approval_status: 'published',
    is_active: true,
    is_demo: false,
    username_status: 'approved',
    is_verified: true,
  };
}

type BusinessPublicVisibilityCardProps = {
  business: BusinessPublicVisibilityBusiness;
  publicProbe: PublicVisibilityProbeRow | null | undefined;
  duplicateCount: number | null | undefined;
  isRTL: boolean;
  isPublishing: boolean;
  onPublish: (business: BusinessPublicVisibilityBusiness) => void;
};

export const BusinessPublicVisibilityCard: React.FC<BusinessPublicVisibilityCardProps> = ({
  business,
  publicProbe,
  duplicateCount,
  isRTL,
  isPublishing,
  onPublish,
}) => {
  const state = buildPublicVisibilityState(business, publicProbe, duplicateCount);
  const profileHref = getBusinessProfileHref(business);
  const statusLabel = state.isPubliclyVisible
    ? pickBi(isRTL, 'يعمل', 'Works')
    : pickBi(isRTL, 'لا يعمل', 'Not working');

  return (
    <Card className="border-border/40 bg-card/80" data-testid="business-public-visibility-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-heading">
              <Globe2 className="h-4 w-4 text-primary" />
              {pickBi(isRTL, 'حالة الظهور العام', 'Public visibility status')}
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {pickBi(isRTL, 'المصدر الموحّد للرابط العام: username', 'Canonical public link source: username')}
            </p>
          </div>
          <AdminStatusBadge
            label={statusLabel}
            tone={state.isPubliclyVisible ? 'success' : 'warning'}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{pickBi(isRTL, 'رابط الجهة العام', 'Public profile link')}</p>
              <p className="tech-content mt-1 truncate text-sm font-semibold" dir="ltr">
                {state.publicPath ?? pickBi(isRTL, 'لا يوجد رابط عام صالح', 'No valid public link')}
              </p>
            </div>
            {profileHref && state.isPubliclyVisible && (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl">
                <Link to={profileHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {pickBi(isRTL, 'فتح الصفحة العامة', 'Open public page')}
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {state.checks.map((check) => (
            <div key={check.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2">
              <span className="text-[12px] text-muted-foreground">{pickBi(isRTL, check.labelAr, check.labelEn)}</span>
              <span className={check.passed ? 'text-success' : 'text-destructive'} aria-label={check.passed ? 'passed' : 'failed'}>
                {check.passed ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-[12px] leading-relaxed text-warning-foreground">
          {pickBi(isRTL, state.blockingReasonAr, state.blockingReasonEn)}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {pickBi(isRTL, 'ينشر الزر الجهة فقط عند توفر رابط عام فريد وبيانات أساسية.', 'Publishing requires a unique public handle and basic profile data.')}
          </p>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 rounded-xl"
            disabled={isPublishing || !state.canPublish}
            onClick={() => onPublish(business)}
          >
            {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {pickBi(isRTL, 'نشر الجهة', 'Publish business')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessPublicVisibilityCard;