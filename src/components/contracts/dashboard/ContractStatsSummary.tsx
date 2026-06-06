import {
  Activity, AlertTriangle, Banknote, CheckCircle2, Clock, DollarSign,
  FileText, ListChecks, Ruler, Sparkles, TrendingUp, WrenchIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface ContractStatsSummaryData {
  total: number;
  active: number;
  completed: number;
  pendingApproval: number;
  totalAmount: number;
  totalPaid: number;
  overdueCount: number;
  overdueAmount: number;
  totalMilestones: number;
  completedMilestones: number;
  totalMeasurements: number;
  totalMaintenance: number;
}

interface Props {
  stats: ContractStatsSummaryData;
  isRTL: boolean;
}

/**
 * Read-only KPI grid + collection progress + quick stats card.
 * Extracted from DashboardContracts (Phase 2B) — markup unchanged.
 */
export function ContractStatsSummary({ stats, isRTL }: Props) {
  const collectionPct = stats.totalAmount > 0 ? Math.round((stats.totalPaid / stats.totalAmount) * 100) : 0;
  const remaining = Math.max(0, stats.totalAmount - stats.totalPaid);
  const milestonePct = stats.totalMilestones > 0
    ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100)
    : 0;

  const fmt = (n: number) => n.toLocaleString();
  const fmtShort = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
    : n.toLocaleString();

  const supportKpis: Array<{
    icon: typeof FileText;
    label: string;
    value: string;
    sub?: string;
    hint?: string;
    tone: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  }> = [
    {
      icon: FileText,
      label: isRTL ? 'إجمالي العقود' : 'Total contracts',
      value: stats.total.toString(),
      hint: stats.active > 0 ? `${stats.active} ${isRTL ? 'نشط' : 'active'}` : undefined,
      tone: 'primary',
    },
    {
      icon: Banknote,
      label: isRTL ? 'المحصّل' : 'Collected',
      value: fmtShort(stats.totalPaid),
      sub: 'SAR',
      hint: stats.totalAmount > 0 ? `${collectionPct}%` : undefined,
      tone: 'success',
    },
    {
      icon: Clock,
      label: isRTL ? 'المتبقي' : 'Remaining',
      value: fmtShort(remaining),
      sub: 'SAR',
      hint: stats.pendingApproval > 0 ? `${stats.pendingApproval} ${isRTL ? 'بانتظار' : 'pending'}` : undefined,
      tone: 'warning',
    },
    {
      icon: AlertTriangle,
      label: isRTL ? 'المتأخرات' : 'Overdue',
      value: fmtShort(stats.overdueAmount),
      sub: 'SAR',
      hint: stats.overdueCount > 0
        ? `${stats.overdueCount} ${isRTL ? 'دفعة' : 'payments'}`
        : (isRTL ? 'لا يوجد' : 'None'),
      tone: stats.overdueCount > 0 ? 'destructive' : 'success',
    },
  ];

  const quick = [
    { icon: CheckCircle2, label: isRTL ? 'مكتملة' : 'Completed', value: stats.completed, color: 'text-info bg-info/10' },
    { icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', value: `${stats.completedMilestones}/${stats.totalMilestones}`, color: 'text-secondary bg-secondary/10' },
    { icon: Ruler, label: isRTL ? 'المقاسات' : 'Measurements', value: stats.totalMeasurements, color: 'text-accent bg-accent/10' },
    { icon: WrenchIcon, label: isRTL ? 'الصيانة' : 'Maintenance', value: stats.totalMaintenance, color: 'text-urgent bg-urgent/10' },
  ];

  const toneClass = (tone: string) => {
    switch (tone) {
      case 'success': return { icon: 'bg-success/15 text-success', dot: 'bg-success', text: 'text-success' };
      case 'warning': return { icon: 'bg-warning/15 text-warning', dot: 'bg-warning', text: 'text-warning' };
      case 'destructive': return { icon: 'bg-destructive/15 text-destructive', dot: 'bg-destructive', text: 'text-destructive' };
      case 'accent': return { icon: 'bg-accent/15 text-accent', dot: 'bg-accent', text: 'text-accent' };
      default: return { icon: 'bg-primary/15 text-primary', dot: 'bg-primary', text: 'text-primary' };
    }
  };

  return (
    <section
      aria-label={isRTL ? 'لوحة إحصائيات العقود' : 'Contracts statistics panel'}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[var(--elev-1)]"
    >
      {/* subtle ambient backdrop */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04] pointer-events-none" />
      <div aria-hidden="true" className="absolute -top-16 -end-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative p-4 md:p-5 space-y-4">
        {/* Hero row: title + featured value + collection progress */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Featured: total value + collection */}
          <div className="lg:col-span-3 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  <span className="font-medium uppercase tracking-wide">
                    {isRTL ? 'الأداء المالي' : 'Financial overview'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold tracking-tight tech-content">
                    {fmt(stats.totalAmount)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">SAR</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRTL ? 'القيمة الإجمالية للعقود' : 'Total contracts value'}
                </p>
              </div>
              <div className="text-end shrink-0">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${collectionPct >= 75 ? 'bg-success/15 text-success' : collectionPct >= 40 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />
                  {collectionPct}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {isRTL ? 'نسبة التحصيل' : 'Collected'}
                </div>
              </div>
            </div>

            <Progress
              value={collectionPct}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-success"
              aria-label={isRTL ? `نسبة التحصيل ${collectionPct}٪` : `Collection ${collectionPct}%`}
            />

            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/50">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
                  {isRTL ? 'المحصّل' : 'Collected'}
                </div>
                <div className="text-sm font-bold tech-content text-success">
                  {fmt(stats.totalPaid)} <span className="text-[10px] text-muted-foreground font-normal">SAR</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" />
                  {isRTL ? 'المتبقي' : 'Remaining'}
                </div>
                <div className="text-sm font-bold tech-content text-warning">
                  {fmt(remaining)} <span className="text-[10px] text-muted-foreground font-normal">SAR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats panel */}
          <div className="lg:col-span-2 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
              <Activity className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span className="font-medium uppercase tracking-wide">
                {isRTL ? 'إحصائيات سريعة' : 'Quick stats'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quick.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/50 px-2.5 py-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                    <s.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground leading-tight truncate">{s.label}</div>
                    <div className="text-sm font-bold tech-content leading-tight truncate">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {stats.totalMilestones > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{isRTL ? 'تقدم المراحل' : 'Milestones progress'}</span>
                  <span className="font-bold text-secondary">{milestonePct}%</span>
                </div>
                <Progress value={milestonePct} className="h-1.5 [&>div]:bg-secondary" />
              </div>
            )}
          </div>
        </div>

        {/* Support KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {supportKpis.map((s, i) => {
            const t = toneClass(s.tone);
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-3 py-2.5 hover-lift transition-all"
              >
                <span aria-hidden="true" className={`absolute inset-y-0 start-0 w-1 ${t.dot}`} />
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.icon}`}>
                    <s.icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground truncate">{s.label}</div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold tech-content leading-none truncate">{s.value}</span>
                      {s.sub && <span className="text-[9px] text-muted-foreground font-normal">{s.sub}</span>}
                    </div>
                  </div>
                  {s.hint && (
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${t.text} border-current/30`}>
                      {s.hint}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}