import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useMembershipVisibility } from '@/hooks/useMembershipVisibility';
import { getCurrentMembershipSubscription, getMembershipUsage } from '@/modules/memberships';
import { getOwnerBusiness } from '@/modules/businesses';
import { parseLimits } from '@/lib/membership-limits';
import {
  Crown, Calendar, ArrowUpRight, Sparkles, ShieldCheck, AlertTriangle,
  Building2, Wallet, Info, Check, X, CircleArrowUp, Plus,
  FileText, Wrench, FolderOpen, MapPin, Users, Megaphone, BookOpen,
} from 'lucide-react';

/**
 * Dashboard › Membership (user side).
 *
 * Source of truth — all reads go through the central memberships module:
 *   • getOwnerBusiness               → does the user own a business?
 *   • getCurrentMembershipSubscription → active membership_subscriptions row
 *   • getMembershipUsage              → RPC get_membership_usage
 *   • parseLimits (LIMIT_FIELDS)      → canonical plan limits schema
 *
 * No fake invoices / payment cards / hardcoded plan names or limits.
 * No DB / RLS / RPC / migrations / cron changes.
 */

type Sub = {
  id: string;
  status: string;
  billing_cycle: string | null;
  starts_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  auto_renew: boolean | null;
  payment_provider: string | null;
  last_paid_at: string | null;
  plan: {
    id: string;
    tier: string;
    name_ar: string;
    name_en: string;
    limits: Record<string, unknown> | null;
  } | null;
};

type UsageRow = {
  metric: string;
  used: number;
  limit_value: number;
  period: string;
  near_cap: boolean;
  over_limit: boolean;
};

const METRIC_META: Record<
  string,
  { icon: React.ElementType; label_ar: string; label_en: string }
> = {
  contracts:  { icon: FileText,   label_ar: 'العقود (هذا الشهر)', label_en: 'Contracts (this month)' },
  services:   { icon: Wrench,     label_ar: 'الخدمات النشطة',     label_en: 'Active services' },
  portfolio:  { icon: FolderOpen, label_ar: 'معرض الأعمال',        label_en: 'Portfolio items' },
  branches:   { icon: MapPin,     label_ar: 'الفروع النشطة',       label_en: 'Active branches' },
  staff:      { icon: Users,      label_ar: 'أعضاء الفريق',        label_en: 'Team members' },
  promotions: { icon: Megaphone,  label_ar: 'العروض النشطة',       label_en: 'Active promotions' },
  blog_posts: { icon: BookOpen,   label_ar: 'منشورات المدونة',     label_en: 'Blog posts' },
};

const PLAN_TIER_LABELS: Record<string, { ar: string; en: string }> = {
  free:         { ar: 'مجانية',          en: 'Free' },
  free_launch:  { ar: 'الإطلاق المجانية', en: 'Free Launch' },
  basic:        { ar: 'أساسية',          en: 'Basic' },
  premium:      { ar: 'احترافية',        en: 'Premium' },
  enterprise:   { ar: 'مؤسسات',          en: 'Enterprise' },
};

const STATUS_LABELS: Record<string, { ar: string; en: string; tone: 'success' | 'warning' | 'destructive' | 'muted' }> = {
  active:    { ar: 'نشطة',                 en: 'Active',                tone: 'success' },
  trialing:  { ar: 'تجريبية',              en: 'Trialing',              tone: 'success' },
  past_due:  { ar: 'تحتاج تجديد',          en: 'Needs renewal',         tone: 'warning' },
  cancelled: { ar: 'ملغاة',                en: 'Cancelled',             tone: 'muted' },
  expired:   { ar: 'منتهية',               en: 'Expired',               tone: 'destructive' },
  pending:   { ar: 'قيد المراجعة',         en: 'Pending review',        tone: 'warning' },
};

const fmtDate = (iso: string | null, isRTL: boolean): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return '—'; }
};

const Section: React.FC<{ icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ icon: Icon, title, subtitle, children, aside }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </CardContent>
  </Card>
);

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 px-4 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const StatusBadge: React.FC<{ status: string; isRTL: boolean }> = ({ status, isRTL }) => {
  const meta = STATUS_LABELS[status] ?? { ar: status, en: status, tone: 'muted' as const };
  const toneCls = meta.tone === 'success'
    ? 'bg-success/10 text-success border-success/30'
    : meta.tone === 'warning'
      ? 'bg-warning/10 text-warning border-warning/30'
      : meta.tone === 'destructive'
        ? 'bg-destructive/10 text-destructive border-destructive/30'
        : 'bg-muted text-muted-foreground border-border';
  return (
    <Badge variant="outline" className={`text-[11px] h-5 px-2 ${toneCls}`}>
      {isRTL ? meta.ar : meta.en}
    </Badge>
  );
};

const DashboardMembership: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const membershipVisibility = useMembershipVisibility();
  const upgradeHref = membershipVisibility.membershipPathOrNull;

  // 1) Does the user own a business?
  const ownerBusinessQuery = useQuery({
    queryKey: ['membership-page-owner-business', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await getOwnerBusiness<{ id: string }>({
        userId: user!.id,
        select: 'id',
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
  const businessId = ownerBusinessQuery.data?.id ?? null;

  // 2) Active membership subscription (central reader).
  const subQuery = useQuery({
    queryKey: ['membership-page-subscription', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await getCurrentMembershipSubscription<Sub>({
        userId: user!.id,
        select:
          'id, status, billing_cycle, starts_at, expires_at, cancelled_at, auto_renew, payment_provider, last_paid_at, plan:membership_plans!plan_id(id, tier, name_ar, name_en, limits)',
        statuses: ['active', 'trialing', 'past_due', 'pending'],
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
  const sub = subQuery.data ?? null;

  // 3) Usage from canonical RPC (no transformation).
  const usageQuery = useQuery({
    queryKey: ['membership-page-usage', user?.id, businessId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await getMembershipUsage<UsageRow>({
        _user_id: user!.id,
        _business_id: businessId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as UsageRow[];
    },
    staleTime: 60 * 1000,
  });

  const loading =
    !user || ownerBusinessQuery.isLoading || subQuery.isLoading;

  // ── No business → memberships are business-scoped, prompt to register ────
  const showNoBusiness = !!user && !ownerBusinessQuery.isLoading && !businessId;

  const planTier = (sub?.plan?.tier ?? '').toLowerCase();
  const isFreeLaunch = planTier === 'free_launch' || planTier === 'free';
  const cancelledAtPeriodEnd = !!sub?.cancelled_at && !!sub?.expires_at && new Date(sub.expires_at) > new Date();

  const planNameAr = sub?.plan?.name_ar ?? PLAN_TIER_LABELS[planTier]?.ar ?? '—';
  const planNameEn = sub?.plan?.name_en ?? PLAN_TIER_LABELS[planTier]?.en ?? '—';
  const planName = isRTL ? planNameAr : planNameEn;

  const limits = parseLimits((sub?.plan?.limits as Record<string, unknown> | null) ?? undefined);
  const usageRows = usageQuery.data ?? [];
  const hasUsage = usageRows.length > 0 && usageRows.some((r) => r.used > 0 || r.limit_value > 0);

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-xl sm:text-2xl leading-tight">
                    {isRTL ? 'العضوية والاستخدام' : 'Membership & Usage'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    {isRTL
                      ? 'تابع خطتك الحالية واستخدامك الفعلي من المصدر الموحّد للعضويات.'
                      : 'Track your current plan and real usage from the central memberships source.'}
                  </p>
                </div>
              </div>
              {upgradeHref && (
                <Button asChild size="sm" className="h-9 gap-1.5">
                  <Link to={upgradeHref}>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {isRTL ? 'عرض الباقات' : 'View plans'}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading && <Skeleton className="h-40 w-full" />}

        {/* CASE A — user has no business */}
        {showNoBusiness && (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="font-heading font-semibold text-base">
                {isRTL ? 'العضويات مرتبطة بالمنشأة' : 'Memberships are tied to a business'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isRTL
                  ? 'أنشئ منشأة أولًا لعرض الباقات والحدود الخاصة بها.'
                  : 'Create a business first to see its plans and limits.'}
              </p>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/register-entity">
                  <Plus className="w-3.5 h-3.5" />
                  {isRTL ? 'إنشاء منشأة' : 'Create business'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Plan + Usage + Features + Billing — only when user has a business */}
        {!loading && !showNoBusiness && (
          <>
            {/* 1) Current plan */}
            <Section
              icon={Crown}
              title={isRTL ? 'الخطة الحالية' : 'Current plan'}
              subtitle={isRTL ? 'مصدر البيانات: نظام العضويات المركزي' : 'Source: central memberships module'}
              aside={
                sub ? (
                  upgradeHref && (
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                      <Link to={upgradeHref}>
                        <CircleArrowUp className="w-3.5 h-3.5" />
                        {isRTL ? 'ترقية الباقة' : 'Upgrade'}
                      </Link>
                    </Button>
                  )
                ) : null
              }
            >
              {!sub ? (
                <div className="space-y-3">
                  <EmptyState>
                    {isRTL
                      ? 'لا توجد عضوية مفعّلة لهذه المنشأة حتى الآن.'
                      : 'No active membership for this business yet.'}
                  </EmptyState>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {upgradeHref ? (
                      <Button asChild size="sm" className="gap-1.5">
                        <Link to={upgradeHref}><ArrowUpRight className="w-3.5 h-3.5" /> {isRTL ? 'عرض الباقات المتاحة' : 'View available plans'}</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link to="/contact">{isRTL ? 'تواصل مع فريق قطاعات' : 'Contact Qitaat team'}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[11px] h-6 px-2 gap-1">
                      <Crown className="w-3 h-3" /> {planName}
                    </Badge>
                    <StatusBadge status={sub.status} isRTL={isRTL} />
                    {isFreeLaunch && (
                      <Badge variant="outline" className="border-success/30 bg-success/5 text-success text-[11px] h-6 px-2 gap-1">
                        <Sparkles className="w-3 h-3" />
                        {isRTL ? 'باقة الإطلاق المجانية' : 'Free Launch plan'}
                      </Badge>
                    )}
                    {sub.billing_cycle && (
                      <Badge variant="outline" className="text-[11px] h-6 px-2 gap-1 border-border">
                        <Calendar className="w-3 h-3" />
                        {sub.billing_cycle === 'yearly' ? (isRTL ? 'سنوي' : 'Yearly') : (isRTL ? 'شهري' : 'Monthly')}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border p-3 bg-muted/10">
                      <p className="text-[11px] text-muted-foreground">{isRTL ? 'بداية الفترة' : 'Period start'}</p>
                      <p className="tech-content font-medium mt-0.5">{fmtDate(sub.starts_at, isRTL)}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3 bg-muted/10">
                      <p className="text-[11px] text-muted-foreground">{isRTL ? 'نهاية الفترة' : 'Period end'}</p>
                      <p className="tech-content font-medium mt-0.5">{fmtDate(sub.expires_at, isRTL)}</p>
                    </div>
                  </div>

                  {cancelledAtPeriodEnd && (
                    <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        {isRTL
                          ? 'سيتم إيقاف التجديد في نهاية الفترة الحالية. تبقى المزايا متاحة حتى ذلك التاريخ.'
                          : 'Renewal will stop at the end of the current period. Benefits remain available until then.'}
                      </span>
                    </div>
                  )}

                  {isFreeLaunch && (
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      {isRTL
                        ? 'هذه الباقة مخصّصة لفترة الإطلاق وقد تتغيّر حدودها لاحقًا.'
                        : 'This plan is for the launch phase and its limits may change later.'}
                    </p>
                  )}
                </div>
              )}
            </Section>

            {/* 2) Usage this period */}
            <Section
              icon={Calendar}
              title={isRTL ? 'الاستخدام هذا الشهر' : 'Usage this month'}
              subtitle={isRTL ? 'من get_membership_usage' : 'From get_membership_usage'}
            >
              {usageQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !hasUsage ? (
                <EmptyState>
                  {isRTL
                    ? 'لا توجد بيانات استخدام بعد. ستظهر هنا بعد أول طلب أو عملية.'
                    : 'No usage yet. It will appear here after your first request or action.'}
                </EmptyState>
              ) : (
                <div className="divide-y divide-border/60">
                  {usageRows
                    .filter((r) => r.limit_value > 0 || r.used > 0)
                    .map((r) => {
                      const meta = METRIC_META[r.metric] ?? {
                        icon: Info,
                        label_ar: r.metric,
                        label_en: r.metric,
                      };
                      const Icon = meta.icon;
                      const unlimited = r.limit_value === 0;
                      const pct = unlimited ? 0 : Math.min(100, Math.round((r.used / r.limit_value) * 100));
                      const limText = unlimited ? (isRTL ? 'غير محدود' : 'Unlimited') : String(r.limit_value);
                      return (
                        <div key={r.metric} className="py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs flex items-center gap-1.5 text-foreground">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              {isRTL ? meta.label_ar : meta.label_en}
                            </span>
                            <span className="text-xs tech-content font-medium">
                              {r.used} / {limText}
                              {r.over_limit && (
                                <Badge className="ms-1.5 text-[9px] bg-destructive/15 text-destructive border-0">
                                  {isRTL ? 'تجاوز' : 'Over'}
                                </Badge>
                              )}
                              {!r.over_limit && r.near_cap && (
                                <Badge className="ms-1.5 text-[9px] bg-warning/15 text-warning border-0">
                                  {isRTL ? 'اقترب' : 'Near'}
                                </Badge>
                              )}
                            </span>
                          </div>
                          {!unlimited && <Progress value={pct} className="h-1.5 mt-1.5" />}
                        </div>
                      );
                    })}
                </div>
              )}
            </Section>

            {/* 3) Plan features / limits matrix (confirmed-only) */}
            <Section
              icon={ShieldCheck}
              title={isRTL ? 'الحدود والمزايا' : 'Limits & features'}
              subtitle={isRTL ? 'القيم من خطة العضوية الحالية' : 'Values come from your current plan'}
            >
              {!sub?.plan ? (
                <EmptyState>
                  {isRTL ? 'لا توجد خطة لعرض حدودها.' : 'No plan to show limits for.'}
                </EmptyState>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(limits).map(([key, val]) => {
                    const isBool = typeof val === 'boolean';
                    const isNumber = typeof val === 'number';
                    if (isNumber && val === 0 && !METRIC_META[key.replace(/^max_/, '')]) return null;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2 text-xs">
                        <span className="text-foreground/80 truncate">{key}</span>
                        {isBool ? (
                          val ? (
                            <Badge className="text-[10px] bg-success/15 text-success border-0 gap-1"><Check className="h-3 w-3" /> {isRTL ? 'متاح' : 'Available'}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground"><X className="h-3 w-3" /> {isRTL ? 'غير متاح' : 'Unavailable'}</Badge>
                          )
                        ) : (
                          <span className="tech-content font-medium">
                            {val === 0 ? (isRTL ? 'غير محدود' : 'Unlimited') : String(val)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* 4) Billing & payments */}
            <Section
              icon={Wallet}
              title={isRTL ? 'الفواتير والدفع' : 'Billing & payments'}
              subtitle={isRTL ? 'الفواتير والمدفوعات الحقيقية فقط' : 'Real invoices and payments only'}
            >
              {!sub?.payment_provider && !sub?.last_paid_at ? (
                <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-xs text-foreground/80 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                  <span>
                    {isRTL
                      ? 'الدفع الإلكتروني غير مفعّل حاليًا. سيتم تفعيل إدارة الفواتير والمدفوعات عند إطلاق الباقات المدفوعة.'
                      : 'Online payments are not enabled yet. Invoice and payment management will be available once paid plans launch.'}
                  </span>
                </div>
              ) : (
                <EmptyState>
                  {isRTL ? 'لا توجد مدفوعات مسجلة حتى الآن.' : 'No payments recorded yet.'}
                </EmptyState>
              )}
            </Section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardMembership;