import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3, TrendingUp, PieChart as PieIcon, Truck, AlertTriangle, FileText,
} from 'lucide-react';
import { ChartTooltipStyle } from '@/components/dashboard/overview/shared';
import { cn } from '@/lib/utils';

/**
 * Real-data provider analytics. All inputs come from the parent's existing
 * `stats` aggregate — no extra DB calls, no guarded-table reads.
 * Empty states render a soft placeholder instead of fake data.
 */

export interface ContractRow {
  id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
}

interface Props {
  isRTL: boolean;
  contracts: ContractRow[];
  monthlyRevenue: { month: string; revenue: number }[];
  overdueCount?: number;
}

const STATUS_TONE: Record<string, string> = {
  active:           'hsl(var(--primary))',
  pending_approval: 'hsl(var(--info))',
  draft:            'hsl(var(--muted-foreground))',
  completed:        'hsl(var(--success))',
  cancelled:        'hsl(var(--destructive))',
  rejected:         'hsl(var(--destructive))',
  expired:          'hsl(var(--accent))',
};

function statusLabel(s: string, isRTL: boolean): string {
  const ar: Record<string, string> = {
    active: 'نشط', pending_approval: 'بانتظار الموافقة', draft: 'مسودة',
    completed: 'مكتمل', cancelled: 'ملغي', rejected: 'مرفوض', expired: 'منتهي',
  };
  const en: Record<string, string> = {
    active: 'Active', pending_approval: 'Pending', draft: 'Draft',
    completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected', expired: 'Expired',
  };
  return (isRTL ? ar[s] : en[s]) ?? s;
}

function monthKey(d: Date, isRTL: boolean): string {
  return d.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en', { month: 'short' });
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[170px] flex flex-col items-center justify-center text-muted-foreground gap-1">
      <BarChart3 className="w-7 h-7 opacity-20" aria-hidden="true" />
      <p className="text-[10px]">{label}</p>
    </div>
  );
}

export function ProviderAnalyticsCharts({
  isRTL, contracts, monthlyRevenue, overdueCount = 0,
}: Props) {
  const {
    statusData, monthlyContracts, deliveryData, deliveryStats, totalsByStatus,
  } = useMemo(() => {
    const counts: Record<string, number> = {};
    contracts.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });

    const statusData = Object.entries(counts).map(([status, value]) => ({
      name: statusLabel(status, isRTL),
      key: status,
      value,
      fill: STATUS_TONE[status] ?? 'hsl(var(--muted-foreground))',
    }));

    // 6-month bucket
    const now = new Date();
    const months: { key: string; created: number; delivered: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d, isRTL), created: 0, delivered: 0 });
    }
    contracts.forEach((c) => {
      const d = new Date(c.created_at);
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diff >= 0 && diff < 6) {
        const slot = months[5 - diff];
        slot.created += 1;
        if (c.status === 'completed') slot.delivered += 1;
      }
    });

    const delivered = contracts.filter((c) => c.status === 'completed').length;
    const inProgress = contracts.filter((c) => c.status === 'active').length;
    const pending = contracts.filter((c) => c.status === 'pending_approval' || c.status === 'draft').length;
    const cancelled = contracts.filter((c) => c.status === 'cancelled' || c.status === 'rejected').length;

    const deliveryData = [
      { name: isRTL ? 'مسلَّمة' : 'Delivered',    value: delivered,  fill: 'hsl(var(--success))' },
      { name: isRTL ? 'قيد التنفيذ' : 'In progress', value: inProgress, fill: 'hsl(var(--primary))' },
      { name: isRTL ? 'بانتظار البدء' : 'Pending',  value: pending,    fill: 'hsl(var(--info))' },
      { name: isRTL ? 'ملغاة' : 'Cancelled',        value: cancelled,  fill: 'hsl(var(--destructive))' },
    ];

    return {
      statusData,
      monthlyContracts: months,
      deliveryData,
      deliveryStats: { delivered, inProgress, pending, cancelled },
      totalsByStatus: counts,
    };
  }, [contracts, isRTL]);

  const total = contracts.length;
  const deliveryRate = total > 0 ? Math.round((deliveryStats.delivered / total) * 100) : 0;
  const cancelRate   = total > 0 ? Math.round((deliveryStats.cancelled / total) * 100) : 0;

  const hasContracts = total > 0;
  const hasRevenue   = monthlyRevenue.some((m) => m.revenue > 0);

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'} className="border-border/50 shadow-[var(--elev-1)]">
      <CardHeader className="pb-2 px-4 sm:px-5 pt-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex w-7 h-7 rounded-lg bg-info/10 text-info items-center justify-center ring-1 ring-info/15">
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight">
                {isRTL ? 'التحليلات والإحصاءات' : 'Analytics & Insights'}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? 'مبيعات • عقود • تسليم • متأخرات' : 'Sales • Contracts • Delivery • Overdue'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* KPI strip — derived from real contracts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiStat tone="success" icon={Truck}
            label={isRTL ? 'معدل التسليم' : 'Delivery rate'}
            value={`${deliveryRate}%`}
            sub={`${deliveryStats.delivered} ${isRTL ? 'مكتمل' : 'completed'}`} />
          <KpiStat tone="primary" icon={FileText}
            label={isRTL ? 'قيد التنفيذ' : 'In progress'}
            value={deliveryStats.inProgress}
            sub={isRTL ? 'عقود نشطة' : 'Active contracts'} />
          <KpiStat tone="info" icon={FileText}
            label={isRTL ? 'بانتظار البدء' : 'Awaiting start'}
            value={deliveryStats.pending}
            sub={isRTL ? 'موافقة/مسودة' : 'Pending / draft'} />
          <KpiStat tone="destructive" icon={AlertTriangle}
            label={isRTL ? 'دفعات متأخرة' : 'Overdue payments'}
            value={overdueCount}
            sub={cancelRate > 0
              ? `${cancelRate}% ${isRTL ? 'إلغاء' : 'cancel rate'}`
              : (isRTL ? 'لا متأخرات' : 'no overdue')} />
        </div>

        {/* Row 1: Monthly contracts (created vs delivered) + Status pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChartCard
            className="lg:col-span-2"
            icon={TrendingUp}
            title={isRTL ? 'العقود الشهرية (إنشاء/تسليم)' : 'Monthly Contracts (Created / Delivered)'}
          >
            {hasContracts ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyContracts} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="key" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} reversed={isRTL} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} orientation={isRTL ? 'right' : 'left'} />
                    <Tooltip contentStyle={ChartTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/.3)' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="created"   name={isRTL ? 'منشأة' : 'Created'}   fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" name={isRTL ? 'مسلَّمة' : 'Delivered'} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart label={isRTL ? 'ستظهر الإحصاءات عند توفر أول عقد' : 'Charts appear once you have your first contract'} />}
          </ChartCard>

          <ChartCard icon={PieIcon} title={isRTL ? 'توزيع العقود حسب الحالة' : 'Contracts by Status'}>
            {hasContracts ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={ChartTooltipStyle} />
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                      {statusData.map((s) => <Cell key={s.key} fill={s.fill} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart label={isRTL ? 'لا توجد عقود بعد' : 'No contracts yet'} />}
          </ChartCard>
        </div>

        {/* Row 2: Sales (revenue) + delivery composition */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChartCard className="lg:col-span-2" icon={TrendingUp}
            title={isRTL ? 'المبيعات الشهرية (عقود مكتملة)' : 'Monthly Sales (completed contracts)'}>
            {hasRevenue ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} reversed={isRTL} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={42} orientation={isRTL ? 'right' : 'left'} />
                    <Tooltip contentStyle={ChartTooltipStyle} />
                    <Area type="monotone" dataKey="revenue" name={isRTL ? 'إيرادات' : 'Revenue'}
                      stroke="hsl(var(--success))" fill="url(#salesGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart label={isRTL ? 'لم تُسجَّل مبيعات بعد' : 'No sales recorded yet'} />}
          </ChartCard>

          <ChartCard icon={Truck} title={isRTL ? 'حالة التسليم' : 'Delivery Status'}>
            {hasContracts ? (
              <div className="space-y-2.5">
                {deliveryData.map((row) => {
                  const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-foreground/80">{row.name}</span>
                        <span className="tech-content text-muted-foreground">{row.value} • {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: row.fill }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyChart label={isRTL ? 'لا توجد عقود لعرض حالة التسليم' : 'No contracts to show delivery status'} />}
          </ChartCard>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Small helpers ────────────────────────────────────────────────── */

function ChartCard({
  className, icon: Icon, title, children,
}: { className?: string; icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card className={cn('border-border/40', className)}>
      <CardHeader className="pb-1 px-4 pt-3">
        <CardTitle className="text-xs flex items-center gap-2 font-medium">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">{children}</CardContent>
    </Card>
  );
}

const KPI_TONE: Record<'success' | 'primary' | 'info' | 'destructive', string> = {
  success:     'bg-success/10 text-success ring-success/15',
  primary:     'bg-primary/10 text-primary ring-primary/15',
  info:        'bg-info/10 text-info ring-info/15',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/15',
};

function KpiStat({
  tone, icon: Icon, label, value, sub,
}: { tone: keyof typeof KPI_TONE; icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
      <span className={cn('inline-flex w-8 h-8 rounded-lg items-center justify-center ring-1 shrink-0', KPI_TONE[tone])}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="tech-content text-base font-bold leading-none">{value}</div>
        <div className="text-[10px] font-medium text-foreground/80 mt-1 truncate">{label}</div>
        {sub && <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

export default ProviderAnalyticsCharts;