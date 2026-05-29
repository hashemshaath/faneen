import { CheckCircle2, AlertTriangle, Globe, EyeOff, Eye, Sparkles, Search, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  computeProviderProfileScore,
  computeProviderSeoScore,
  mapProfileActionToHelpLink,
  type GrowthBusiness,
} from '@/modules/growth/providerGrowth';

export type ReadinessBusiness = {
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  username_status: string | null;
  logo_url: string | null;
  sectors: string[] | null;
  sub_services: string[] | null;
  email: string | null;
  phone: string | null;
  approval_status: string | null;
  is_active?: boolean | null;
  is_demo?: boolean | null;
  // Optional growth-signal fields. Not required for publish decisions —
  // used only by the advisory profile/SEO scores.
  description_ar?: string | null;
  description_en?: string | null;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  banner_url?: string | null;
  city?: string | null;
  city_id?: string | null;
  gallery_count?: number | null;
  verified?: boolean | null;
};

export type ReadinessItem = {
  key: string;
  ok: boolean;
  required: boolean;
  ar: string;
  en: string;
};

export function computeReadiness(b: ReadinessBusiness): ReadinessItem[] {
  return [
    { key: 'name', required: true, ok: !!(b.name_ar || b.name_en), ar: 'اسم المنشأة', en: 'Business name' },
    { key: 'username', required: true, ok: !!b.username && b.username_status === 'approved', ar: 'اسم المستخدم المعتمد', en: 'Approved username' },
    { key: 'logo', required: false, ok: !!b.logo_url, ar: 'الشعار', en: 'Logo' },
    { key: 'sectors', required: true, ok: !!(b.sectors && b.sectors.length > 0), ar: 'القطاعات', en: 'Sectors' },
    { key: 'services', required: false, ok: !!(b.sub_services && b.sub_services.length > 0), ar: 'الخدمات الفرعية', en: 'Sub-services' },
    { key: 'contact', required: true, ok: !!(b.email || b.phone), ar: 'وسيلة تواصل', en: 'Contact method' },
    { key: 'is_active', required: true, ok: b.is_active !== false, ar: 'الحساب مفعّل', en: 'Account active' },
    { key: 'not_demo', required: true, ok: b.is_demo !== true, ar: 'ليس حساباً تجريبياً', en: 'Not a demo account' },
  ];
}

export type PublicVisibility = {
  visible: boolean;
  status: 'draft' | 'pending' | 'published' | 'inactive' | 'demo-hidden';
  reasonAr: string;
  reasonEn: string;
  url: string | null;
};

export function computePublicVisibility(b: ReadinessBusiness): PublicVisibility {
  const url = b.username ? `/${b.username}` : null;
  if (b.is_demo === true) {
    return { visible: false, status: 'demo-hidden', url, reasonAr: 'حساب تجريبي مُستبعد من العرض العام.', reasonEn: 'Demo account excluded from public listings.' };
  }
  if (b.is_active === false) {
    return { visible: false, status: 'inactive', url, reasonAr: 'الحساب موقوف، غير ظاهر للعموم.', reasonEn: 'Account inactive — hidden from public.' };
  }
  if (b.approval_status === 'published') {
    return { visible: true, status: 'published', url, reasonAr: 'منشور وظاهر في /search وعلى رابط الملف العام.', reasonEn: 'Published and visible on /search and the public profile URL.' };
  }
  if (b.approval_status === 'draft' || !b.approval_status) {
    return { visible: false, status: 'draft', url, reasonAr: 'مسودة — لم يُرسل للمراجعة بعد.', reasonEn: 'Draft — not yet submitted for review.' };
  }
  return { visible: false, status: 'pending', url, reasonAr: 'بانتظار اعتماد الإدارة قبل النشر.', reasonEn: 'Pending admin approval before publishing.' };
}

interface Props {
  business: ReadinessBusiness;
  isRTL: boolean;
}

export function PublishReadinessPanel({ business, isRTL }: Props) {
  const items = computeReadiness(business);
  const vis = computePublicVisibility(business);
  const blockers = items.filter((i) => i.required && !i.ok);
  const optional = items.filter((i) => !i.required && !i.ok);

  // ── Advisory growth signals (do NOT influence publish blockers) ──
  const growth: GrowthBusiness = business as GrowthBusiness;
  const profile = computeProviderProfileScore(growth);
  const seo = computeProviderSeoScore(growth);
  const scoreColor = (n: number) =>
    n >= 85 ? 'text-success' : n >= 60 ? 'text-warning' : 'text-destructive';
  const levelLabel = (lvl: 'weak' | 'good' | 'excellent') =>
    isRTL
      ? lvl === 'excellent' ? 'ممتاز' : lvl === 'good' ? 'جيد' : 'ضعيف'
      : lvl;
  const nextActions = profile.nextBestActions.slice(0, 3);
  const requiredItems = items.filter((i) => i.required);
  const optionalItems = items.filter((i) => !i.required);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3" data-testid="publish-readiness-panel">
      {/* Public visibility preview */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          {vis.visible ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          {isRTL ? 'الظهور العام' : 'Public visibility'}
          <Badge variant="outline" className="text-[10px]">{vis.status}</Badge>
        </div>
        {vis.url && (
          <a href={vis.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent tech-content hover:underline">
            <Globe className="h-3 w-3" /> qitaat.com{vis.url}
          </a>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{isRTL ? vis.reasonAr : vis.reasonEn}</p>

      {/* Advisory growth scores (non-blocking) */}
      <div
        className="grid grid-cols-2 gap-2 rounded-md border border-border/40 bg-background/40 p-2"
        data-testid="growth-scores"
      >
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {isRTL ? 'جودة الملف' : 'Profile score'}
          </span>
          <span className="tech-content">
            <strong className={scoreColor(profile.score)}>{profile.score}</strong>
            <span className="opacity-60">/100</span>
            <Badge variant="outline" className="ms-1 text-[10px]">{levelLabel(profile.level)}</Badge>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Search className="h-3 w-3" />
            {isRTL ? 'SEO' : 'SEO score'}
          </span>
          <span className="tech-content">
            <strong className={scoreColor(seo.score)}>{seo.score}</strong>
            <span className="opacity-60">/100</span>
            {seo.issues.length > 0 && (
              <Badge variant="outline" className="ms-1 text-[10px] text-destructive">
                {isRTL ? `${seo.issues.length} مشكلة` : `${seo.issues.length} issues`}
              </Badge>
            )}
          </span>
        </div>
      </div>

      {/* Checklist — grouped Required / Recommended / Optional */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
          {isRTL ? 'قائمة جاهزية النشر' : 'Publishing readiness'}
        </div>

        {/* Required (publish blockers) */}
        <div className="mb-1.5" data-testid="readiness-required">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-destructive/80">
            {isRTL ? 'مطلوب' : 'Required'}
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {requiredItems.map((i) => (
              <li key={i.key} className="flex items-center gap-2 text-[11px]">
                {i.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className={i.ok ? '' : 'text-destructive'}>{isRTL ? i.ar : i.en}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended (advisory — does not block publishing) */}
        {profile.missingRecommended.length > 0 && (
          <div className="mb-1.5" data-testid="readiness-recommended">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-warning/80">
              {isRTL ? 'موصى به' : 'Recommended'}
              <span className="ms-1 opacity-60">({isRTL ? 'لا يمنع النشر' : 'non-blocking'})</span>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2">
              {profile.missingRecommended.map((f) => (
                <li key={`rec-${f.key}`} className="flex items-center gap-2 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-warning">{isRTL ? f.ar : f.en}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional */}
        <div data-testid="readiness-optional">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isRTL ? 'اختياري' : 'Optional'}
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {optionalItems.map((i) => (
              <li key={i.key} className="flex items-center gap-2 text-[11px]">
                {i.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                )}
                <span className={i.ok ? '' : 'text-warning'}>{isRTL ? i.ar : i.en}</span>
              </li>
            ))}
            {profile.missingOptional
              .filter((f) => !optionalItems.some((o) => o.key === f.key))
              .map((f) => (
                <li key={`opt-${f.key}`} className="flex items-center gap-2 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-warning">{isRTL ? f.ar : f.en}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Next best actions (advisory, with Help Center links) */}
      {nextActions.length > 0 && (
        <div
          className="rounded-md border border-border/40 bg-background/40 p-2"
          data-testid="next-best-actions"
        >
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isRTL ? 'أهم الخطوات التالية' : 'Next best actions'}
          </div>
          <ul className="space-y-1">
            {nextActions.map((f) => {
              const href = mapProfileActionToHelpLink(f.helpSlug ?? f.key);
              return (
                <li key={`nba-${f.key}`} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {isRTL ? f.ar : f.en}
                    <Badge variant="outline" className="text-[9px] opacity-70">
                      {f.level === 'required'
                        ? isRTL ? 'مطلوب' : 'required'
                        : isRTL ? 'موصى' : 'recommended'}
                    </Badge>
                  </span>
                  <a
                    href={href}
                    className="inline-flex items-center gap-0.5 text-accent hover:underline"
                    data-testid="help-link"
                  >
                    {isRTL ? 'مساعدة' : 'Help'}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Publishing implications warning */}
      {!vis.visible && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-[11px] text-warning">
          <div className="font-semibold mb-1">{isRTL ? 'تنبيه قبل النشر' : 'Before publishing'}</div>
          <ul className="list-disc list-inside space-y-0.5 opacity-90">
            <li>{isRTL ? 'سيظهر الملف في /search للعموم.' : 'Profile will appear in /search publicly.'}</li>
            <li>{isRTL ? 'سيصبح الرابط /:username علنياً.' : 'Public URL /:username becomes accessible.'}</li>
            <li>{isRTL ? 'قد يدرج في خريطة الموقع لمحركات البحث.' : 'May be included in the public sitemap.'}</li>
          </ul>
          {blockers.length > 0 && (
            <div className="mt-1.5 text-destructive">
              {isRTL ? `لا يمكن النشر: ${blockers.length} عنصر مطلوب ناقص.` : `Cannot publish: ${blockers.length} required item(s) missing.`}
            </div>
          )}
          {optional.length > 0 && blockers.length === 0 && (
            <div className="mt-1.5">
              {isRTL ? `${optional.length} عنصر اختياري ناقص — يمكن النشر.` : `${optional.length} optional item(s) missing — publishing still allowed.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PublishReadinessPanel;