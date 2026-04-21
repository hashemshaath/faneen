import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingDown, TrendingUp, Database, Activity, CheckCircle2,
  AlertCircle, ArrowDownRight, ArrowUpRight, Calendar,
} from 'lucide-react';
import { MigrationAlertSettingsCard } from '@/components/admin/MigrationAlertSettingsCard';
import { MigrationRerunHistoryCard } from '@/components/admin/MigrationRerunHistoryCard';
import { ProtectedKeysCard } from '@/components/admin/ProtectedKeysCard';
import { DevMigrationRetryCard } from '@/components/admin/DevMigrationRetryCard';

interface TelemetryRow {
  id: string;
  status: 'success' | 'failed' | 'skipped' | 'no_legacy_data';
  keys_migrated: number;
  created_at: string;
}

const chartConfig: ChartConfig = {
  legacy: { label: 'Legacy faneen_*', color: 'hsl(var(--destructive))' },
  modern: { label: 'New qitaat_*', color: 'hsl(142 76% 36%)' },
  net: { label: 'Net cleaned', color: 'hsl(var(--primary))' },
};

type Bucket = {
  date: string;
  label: string;
  legacy: number; // legacy keys still present (failed migrations)
  modern: number; // new keys successfully created
  netCleaned: number;
  totalDevices: number;
  successRate: number;
};

function formatDay(d: Date, isRTL: boolean) {
  return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
}

const AdminMigrationReport = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  usePageMeta({
    title: isRTL ? 'تقرير ترحيل البيانات | قِطاعات' : 'Migration Report | Qitaat',
    description: isRTL ? 'تقرير مفصل لمقارنة المفاتيح القديمة مقابل الجديدة' : 'Detailed migration report',
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ['migration-report-30d'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('migration_telemetry')
        .select('id, status, keys_migrated, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as TelemetryRow[];
    },
    refetchInterval: 60_000,
  });

  const { buckets, totals, comparison } = useMemo(() => {
    const list = rows || [];
    // Bucket by day
    const byDay = new Map<string, Bucket>();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, {
        date: key, label: formatDay(d, isRTL),
        legacy: 0, modern: 0, netCleaned: 0, totalDevices: 0, successRate: 100,
      });
    }
    let totalSuccess = 0, totalFailed = 0, totalKeys = 0, totalLegacyResidue = 0;
    for (const r of list) {
      const key = r.created_at.slice(0, 10);
      const b = byDay.get(key);
      if (!b) continue;
      b.totalDevices++;
      if (r.status === 'success') {
        b.modern += r.keys_migrated;
        b.netCleaned += r.keys_migrated;
        totalSuccess++;
        totalKeys += r.keys_migrated;
      } else if (r.status === 'failed') {
        // assume each failure leaves ~2 residual legacy keys (lang + history)
        b.legacy += 2;
        totalFailed++;
        totalLegacyResidue += 2;
      }
    }
    // success rate per day
    for (const b of byDay.values()) {
      const successOnDay = b.modern > 0 ? 1 : 0;
      const failedOnDay = b.legacy > 0 ? 1 : 0;
      const denom = successOnDay + failedOnDay;
      b.successRate = denom > 0 ? Math.round((successOnDay / denom) * 100) : 100;
    }
    const buckets = Array.from(byDay.values());

    // Trend: compare first 7 days vs last 7 days
    const first7 = buckets.slice(0, 7);
    const last7 = buckets.slice(-7);
    const sumLegacy = (arr: Bucket[]) => arr.reduce((s, b) => s + b.legacy, 0);
    const sumModern = (arr: Bucket[]) => arr.reduce((s, b) => s + b.modern, 0);
    const legacyFirst = sumLegacy(first7);
    const legacyLast = sumLegacy(last7);
    const modernFirst = sumModern(first7);
    const modernLast = sumModern(last7);
    const legacyDelta = legacyFirst > 0
      ? Math.round(((legacyLast - legacyFirst) / legacyFirst) * 100)
      : 0;
    const modernDelta = modernFirst > 0
      ? Math.round(((modernLast - modernFirst) / modernFirst) * 100)
      : (modernLast > 0 ? 100 : 0);

    const totals = {
      success: totalSuccess,
      failed: totalFailed,
      keysMigrated: totalKeys,
      residue: totalLegacyResidue,
      devices: totalSuccess + totalFailed,
      successRate: (totalSuccess + totalFailed) > 0
        ? Math.round((totalSuccess / (totalSuccess + totalFailed)) * 100)
        : 100,
    };
    const comparison = { legacyDelta, modernDelta, legacyFirst, legacyLast, modernFirst, modernLast };
    return { buckets, totals, comparison };
  }, [rows, isRTL]);

  // Side-by-side comparison data for bar chart
  const comparisonData = [
    {
      name: isRTL ? 'المفاتيح القديمة' : 'Legacy keys',
      value: totals.residue,
      fill: 'hsl(var(--destructive))',
    },
    {
      name: isRTL ? 'المفاتيح الجديدة' : 'New keys',
      value: totals.keysMigrated,
      fill: 'hsl(142 76% 36%)',
    },
  ];

  const cleanupRatio = totals.keysMigrated + totals.residue > 0
    ? Math.round((totals.keysMigrated / (totals.keysMigrated + totals.residue)) * 100)
    : 100;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold flex items-center gap-2">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'تقرير ترحيل بيانات المتصفح' : 'Browser Storage Migration Report'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'مقارنة المفاتيح القديمة (faneen_*) مقابل الجديدة (qitaat_*) ومخطط زمني للتحسن خلال 30 يوماً.'
                : 'Compare legacy (faneen_*) vs modern (qitaat_*) keys and track improvement over 30 days.'}
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="w-3 h-3" />
            {isRTL ? 'آخر 30 يوماً' : 'Last 30 days'}
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isRTL ? 'مفاتيح جديدة' : 'New keys'}
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {totals.keysMigrated}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {isRTL ? `عبر ${totals.success} جهاز` : `across ${totals.success} devices`}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-xs text-destructive mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {isRTL ? 'بقايا قديمة' : 'Legacy residue'}
                  </div>
                  <div className="text-2xl font-bold text-destructive">
                    {totals.residue}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {isRTL ? `${totals.failed} عملية فشل` : `${totals.failed} failed runs`}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    {isRTL ? 'معدل النجاح' : 'Success rate'}
                  </div>
                  <div className="text-2xl font-bold">{totals.successRate}%</div>
                  <Progress value={totals.successRate} className="h-1.5 mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {comparison.legacyDelta < 0
                      ? <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                      : <TrendingUp className="w-3.5 h-3.5 text-destructive" />}
                    {isRTL ? 'اتجاه القديم (7 أيام)' : 'Legacy trend (7d)'}
                  </div>
                  <div className={`text-2xl font-bold flex items-center gap-1 ${
                    comparison.legacyDelta < 0 ? 'text-emerald-600' : 'text-destructive'
                  }`}>
                    {comparison.legacyDelta < 0
                      ? <ArrowDownRight className="w-5 h-5" />
                      : <ArrowUpRight className="w-5 h-5" />}
                    {Math.abs(comparison.legacyDelta)}%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {comparison.legacyDelta < 0
                      ? (isRTL ? 'تحسّن مقارنة بأول أسبوع' : 'improvement vs first week')
                      : (isRTL ? 'مقارنة بأول أسبوع' : 'vs first week')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">
                    {isRTL ? 'المقارنة الإجمالية' : 'Overall Comparison'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? `نسبة النظافة: ${cleanupRatio}% — مفاتيح جديدة مقابل قديمة.`
                      : `Cleanup ratio: ${cleanupRatio}% — new vs legacy keys.`}
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-56 w-full">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {comparisonData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {isRTL ? 'تقدم النظافة' : 'Cleanup progress'}
                      </span>
                      <span className="font-medium">{cleanupRatio}%</span>
                    </div>
                    <Progress value={cleanupRatio} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Timeline chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    {isRTL ? 'المخطط الزمني للتحسن' : 'Improvement Timeline'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? 'تطور المفاتيح الجديدة (أخضر) مقابل بقايا القديمة (أحمر) عبر الأيام.'
                      : 'Daily evolution of new keys (green) vs legacy residue (red).'}
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full">
                    <AreaChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="modernGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="legacyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area
                        type="monotone" dataKey="modern" stroke="hsl(142 76% 36%)"
                        strokeWidth={2} fill="url(#modernGrad)" name={isRTL ? 'مفاتيح جديدة' : 'New keys'}
                      />
                      <Area
                        type="monotone" dataKey="legacy" stroke="hsl(var(--destructive))"
                        strokeWidth={2} fill="url(#legacyGrad)" name={isRTL ? 'بقايا قديمة' : 'Legacy residue'}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Net cleaned per day */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? 'صافي المفاتيح المنظفة يومياً' : 'Net Keys Cleaned per Day'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'إجمالي المفاتيح القديمة التي تمت إزالتها بنجاح كل يوم خلال آخر 30 يوماً.'
                    : 'Total legacy keys successfully removed each day over the last 30 days.'}
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <BarChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="netCleaned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}
                      name={isRTL ? 'مفاتيح منظفة' : 'Keys cleaned'}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Admin alert settings */}
            <MigrationAlertSettingsCard />

            {/* Protected keys list (sweep-safe) */}
            <ProtectedKeysCard />

            {/* DEV-only manual retry + summary */}
            <DevMigrationRetryCard />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminMigrationReport;
