import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote,
  CheckCircle2, Clock, DollarSign, FileText, ListChecks, Ruler,
  TrendingUp, WrenchIcon,
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
  const kpis = [
    {
      icon: FileText,
      label: isRTL ? 'إجمالي العقود' : 'Total Contracts',
      value: stats.total.toString(),
      color: 'from-primary/10 to-primary/5',
      iconColor: 'text-primary bg-primary/15',
      trend: stats.active > 0 ? `${stats.active} ${isRTL ? 'نشط' : 'active'}` : undefined,
      trendUp: true,
    },
    {
      icon: DollarSign,
      label: isRTL ? 'القيمة الإجمالية' : 'Total Value',
      value: stats.totalAmount.toLocaleString(),
      color: 'from-accent/10 to-accent/5',
      iconColor: 'text-accent bg-accent/15',
      sub: 'SAR',
    },
    {
      icon: Banknote,
      label: isRTL ? 'المحصّل' : 'Collected',
      value: stats.totalPaid.toLocaleString(),
      color: 'from-success/10 to-success/5',
      iconColor: 'text-success bg-success/15',
      sub: 'SAR',
      trend: stats.totalAmount > 0 ? `${collectionPct}%` : undefined,
      trendUp: true,
    },
    {
      icon: AlertTriangle,
      label: isRTL ? 'متأخرات' : 'Overdue',
      value: stats.overdueAmount.toLocaleString(),
      color: stats.overdueCount > 0 ? 'from-destructive/10 to-destructive/5' : 'from-success/5 to-success/3',
      iconColor: stats.overdueCount > 0 ? 'text-destructive bg-destructive/15' : 'text-success bg-success/15',
      sub: 'SAR',
      trend: stats.overdueCount > 0 ? `${stats.overdueCount} ${isRTL ? 'دفعة' : 'payments'}` : undefined,
      trendUp: false,
    },
  ];

  const quick = [
    { icon: CheckCircle2, label: isRTL ? 'مكتملة' : 'Completed', value: stats.completed, color: 'text-info' },
    { icon: Clock, label: isRTL ? 'بانتظار الموافقة' : 'Pending', value: stats.pendingApproval, color: 'text-warning' },
    { icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', value: `${stats.completedMilestones}/${stats.totalMilestones}`, color: 'text-secondary' },
    { icon: Ruler, label: isRTL ? 'المقاسات' : 'Measurements', value: stats.totalMeasurements, color: 'text-info' },
    { icon: WrenchIcon, label: isRTL ? 'طلبات الصيانة' : 'Maintenance', value: stats.totalMaintenance, color: 'text-urgent' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((s, i) => (
          <Card key={i} className="relative overflow-hidden border-border/40 hover-lift transition-all">
            <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${s.color.replace('from-', 'from-').replace('/10', '/60').replace('/5', '/30')}`} aria-hidden="true" />
            <CardContent className={`p-4 bg-gradient-to-br ${s.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconColor} shadow-sm`}>
                  <s.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                {s.trend && (
                  <Badge variant="outline" className={`text-[8px] gap-0.5 ${s.trendUp ? 'text-success border-success/40 bg-success/5' : 'text-destructive border-destructive/40 bg-destructive/5'}`}>
                    {s.trendUp ? <ArrowUpRight className="w-2.5 h-2.5" aria-hidden="true" /> : <ArrowDownRight className="w-2.5 h-2.5" aria-hidden="true" />}
                    {s.trend}
                  </Badge>
                )}
              </div>
              <p className="text-xl font-bold mb-0.5 tech-content tracking-tight">
                {s.value}
                {s.sub && <span className="text-[10px] text-muted-foreground ms-1 font-normal">{s.sub}</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {stats.totalAmount > 0 && (
          <Card className="lg:col-span-2 border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  {isRTL ? 'نسبة التحصيل' : 'Collection Rate'}
                </h3>
                <span className="text-lg font-bold text-accent">{collectionPct}%</span>
              </div>
              <Progress
                value={collectionPct}
                className="h-2.5 mb-2 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-success"
                aria-label={isRTL ? `نسبة التحصيل ${collectionPct}٪` : `Collection rate ${collectionPct}%`}
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{isRTL ? 'المحصّل' : 'Collected'}: <strong className="text-foreground">{stats.totalPaid.toLocaleString()}</strong> {isRTL ? 'ر.س' : 'SAR'}</span>
                <span>{isRTL ? 'المتبقي' : 'Remaining'}: <strong className="text-foreground">{(stats.totalAmount - stats.totalPaid).toLocaleString()}</strong> {isRTL ? 'ر.س' : 'SAR'}</span>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border-border/40">
          <CardContent className="p-4 space-y-2.5">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              {isRTL ? 'إحصائيات سريعة' : 'Quick Stats'}
            </h3>
            {quick.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} aria-hidden="true" />{s.label}
                </span>
                <span className="font-bold">{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}