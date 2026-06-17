import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  Crown, Calendar, Users, FileText, Truck, ShieldCheck, X,
  CreditCard, Plus, Receipt, FileSpreadsheet, ArrowUpRight, RefreshCw,
} from 'lucide-react';

/**
 * Dashboard › Membership (user / customer side) — UI Placeholder.
 * Pure presentational page: plan & usage, billing period, payment cards,
 * payment history and invoices. No DB / RPC / mutations.
 */

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ar-SA-u-nu-latn', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

// --- Placeholder data (UI only). Replace with real queries later. -----------
const PLAN = {
  tier_ar: 'Free',
  status_ar: 'نشط',
  cycle: 'monthly',
  renew_at: '2026-07-15T03:00:00',
  period_start: '2026-06-15T03:00:00',
  period_end:   '2026-07-15T02:59:00',
  period_days: 28,
  remaining_pct: 93,
};

const USAGE = {
  period_start: '2026-06-15T00:00:00',
  period_end:   '2026-07-14T23:59:00',
  period_days: 28,
  remaining_pct: 93,
  metrics: [
    { key: 'users',    icon: Users,    label: 'المستخدمون في الحساب',  used: 1, limit: 2,  unit: '' },
    { key: 'rfq',      icon: FileText, label: 'طلبات العروض الشهرية',  used: 0, limit: 10, unit: '' },
    { key: 'suppliers',icon: Truck,    label: 'الموردون لكل طلب عروض', used: 5, limit: 5,  unit: '', fixed: true },
  ],
  all_suppliers_access: false,
};
// ---------------------------------------------------------------------------

const SectionTitle: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-3">
    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Icon className="h-4.5 w-4.5" />
    </div>
    <div>
      <h2 className="font-heading font-semibold text-base leading-tight">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const KeyValue: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="font-medium text-foreground text-end tech-content">{value}</span>
  </div>
);

const PeriodFooter: React.FC<{ days: number; remainingPct: number; start: string; end: string }> = ({ days, remainingPct, start, end }) => (
  <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Billing Period · <span className="tech-content">{days}d</span></span>
      <span className="tech-content">{remainingPct}% متبقية</span>
    </div>
    <Progress value={100 - remainingPct} className="h-1.5" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
      <KeyValue label="بداية الفترة" value={fmtDate(start)} />
      <KeyValue label="نهاية الفترة" value={fmtDate(end)} />
    </div>
    <p className="text-[11px] text-muted-foreground">
      يُعاد تعيينه خلال <span className="tech-content text-foreground font-medium">{Math.round(days * remainingPct / 100)}</span> أيام
    </p>
  </div>
);

const DashboardMembership: React.FC = () => {
  useNoIndex();

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
                  <h1 className="font-heading font-bold text-xl sm:text-2xl leading-tight">الخطة والاستخدام</h1>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    تتبع خطتك الحالية والاستخدام مقارنةً بحدود دورة الفوترة.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="h-9 gap-1.5">
                <Link to="/membership">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  عرض الخطط
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current plan + Usage stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Current Plan */}
          <Card>
            <CardContent className="p-5">
              <SectionTitle icon={Crown} title="الخطة الحالية" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">المستوى</span>
                  <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[11px] h-6 px-2 gap-1">
                    <Crown className="w-3 h-3" /> {PLAN.tier_ar}
                  </Badge>
                </div>
                <KeyValue label="الحالة" value={
                  <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[11px] h-5 px-2">
                    {PLAN.status_ar}
                  </Badge>
                } />
                <KeyValue label="دورة الفوترة" value={PLAN.cycle} />
                <KeyValue label="تاريخ التجديد" value={fmtDate(PLAN.renew_at)} />
              </div>
              <PeriodFooter
                days={PLAN.period_days}
                remainingPct={PLAN.remaining_pct}
                start={PLAN.period_start}
                end={PLAN.period_end}
              />
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardContent className="p-5">
              <SectionTitle icon={RefreshCw} title="إحصائيات الاستخدام" subtitle="فترة الفوترة الحالية" />
              <div className="divide-y divide-border/60">
                {USAGE.metrics.map((m) => {
                  const Icon = m.icon;
                  const remaining = Math.max(0, m.limit - m.used);
                  const pct = m.limit > 0 ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0;
                  return (
                    <div key={m.key} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs flex items-center gap-1.5 text-foreground">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {m.label}
                        </span>
                        <span className="text-xs tech-content font-medium">
                          {m.used} / {m.limit}
                          {!m.fixed && <span className="text-muted-foreground"> ({remaining} متبقية)</span>}
                        </span>
                      </div>
                      {!m.fixed && <Progress value={pct} className="h-1.5 mt-1.5" />}
                    </div>
                  );
                })}
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    الوصول إلى جميع الموردين
                  </span>
                  {USAGE.all_suppliers_access ? (
                    <Badge className="bg-success/15 text-success text-[10px] h-5 px-2 gap-1">
                      <ShieldCheck className="h-3 w-3" /> Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 text-[10px] h-5 px-2 gap-1">
                      <X className="h-3 w-3" /> No
                    </Badge>
                  )}
                </div>
              </div>
              <PeriodFooter
                days={USAGE.period_days}
                remainingPct={USAGE.remaining_pct}
                start={USAGE.period_start}
                end={USAGE.period_end}
              />
            </CardContent>
          </Card>
        </div>

        {/* Upgrade CTA */}
        <Card className="border-accent/30 bg-gradient-to-l from-accent/10 via-background to-background">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-semibold text-base">افتح حدوداً أعلى</h3>
              <p className="text-xs text-muted-foreground mt-1">
                قم بالترقية إلى Professional للحصول على المزيد من طلبات العروض والمستخدمين والمميزات.
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/membership"><ArrowUpRight className="w-3.5 h-3.5" /> عرض الخطط</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Payment cards */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <SectionTitle icon={CreditCard} title="بطاقات الدفع" subtitle="وسائل الدفع المحفوظة لديك" />
              <Button size="sm" variant="outline" className="gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" /> إضافة بطاقة
              </Button>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              لا توجد بطاقات دفع مسجلة.
            </div>
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle icon={Receipt} title="سجل المدفوعات" subtitle="المعاملات المالية على حسابك" />
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              لا توجد مدفوعات مسجلة.
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle icon={FileSpreadsheet} title="الفواتير" subtitle="الفواتير الصادرة لحسابك" />
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              لا توجد فواتير.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardMembership;