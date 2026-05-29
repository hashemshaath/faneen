import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { listProviderSubscriptionsForCurrentUser } from '@/modules/memberships';
import { listProviderCreditTransactionsForBusinesses } from '@/modules/credits';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Crown, Wallet, Calendar, Activity, Sparkles, ArrowUpRight, TrendingUp, Download } from 'lucide-react';
import { PROVIDER_COMMERCIAL_CONFIG } from '@/lib/providerCommercialConfig';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface SubRow {
  id: string;
  business_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  lead_credits_balance: number;
  plan: { code: string; name_ar: string; description_ar: string | null; lead_credits_per_month: number; monthly_price: number } | null;
  business: { id: string; name_ar: string } | null;
}

interface TxRow {
  id: string;
  type: 'grant' | 'consume' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  reason: string;
  quote_request_lead_id: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  grant: 'إضافة رصيد',
  consume: 'استخدام رصيد',
  refund: 'استرجاع رصيد',
  adjustment: 'تعديل إداري',
};

const TYPE_BADGE: Record<string, string> = {
  grant: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  consume: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  refund: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  adjustment: 'bg-muted text-foreground border-border',
};

const REASON_LABEL: Record<string, string> = {
  monthly_grant: 'منح شهري',
  admin_manual_grant: 'إضافة يدوية من الإدارة',
  contact_reveal_consumption: 'استخدام لكشف بيانات تواصل',
  launch_free_reveal: 'إتاحة مجانية في مرحلة الإطلاق',
  admin_override_reveal: 'إتاحة بتجاوز إداري',
  admin_adjustment: 'تعديل إداري',
  admin_refund: 'استرجاع إداري',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'نشطة',
  paused: 'موقوفة',
  expired: 'منتهية',
  cancelled: 'ملغاة',
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-SA-u-nu-latn') : '—';

const ProviderMembership: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();

  React.useEffect(() => { trackEvent('provider_membership_viewed'); }, []);

  const subQuery = useQuery({
    queryKey: ['provider-subscription', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await listProviderSubscriptionsForCurrentUser<SubRow>();
      if (error) throw error;
      return (data ?? []) as SubRow[];
    },
  });

  const businessIds = (subQuery.data ?? []).map((s) => s.business_id);

  const txQuery = useQuery({
    queryKey: ['provider-credit-tx', businessIds],
    enabled: businessIds.length > 0,
    queryFn: async () => {
      const { data, error } = await listProviderCreditTransactionsForBusinesses<TxRow>({
        businessIds,
      });
      if (error) throw error;
      return (data ?? []) as TxRow[];
    },
  });

  const sub = subQuery.data?.[0];
  const [filter, setFilter] = useState<'all' | 'grant' | 'consume' | 'refund' | 'adjustment'>('all');
  const filteredTx = useMemo(() => {
    const list = txQuery.data ?? [];
    return filter === 'all' ? list : list.filter((t) => t.type === filter);
  }, [txQuery.data, filter]);
  const launch = !PROVIDER_COMMERCIAL_CONFIG.requireCreditForContactReveal;

  // Period progress (% elapsed in current billing window)
  const periodProgress = useMemo(() => {
    if (!sub?.current_period_start || !sub?.current_period_end) return null;
    const start = new Date(sub.current_period_start).getTime();
    const end = new Date(sub.current_period_end).getTime();
    const now = Date.now();
    if (end <= start) return null;
    const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
    return { pct, daysLeft };
  }, [sub?.current_period_start, sub?.current_period_end]);

  // Credit usage gauge (based on monthly grant vs current balance)
  const creditGauge = useMemo(() => {
    if (!sub?.plan?.lead_credits_per_month) return null;
    const max = sub.plan.lead_credits_per_month;
    const balance = sub.lead_credits_balance;
    const used = Math.max(0, max - balance);
    const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
    return { used, max, balance, pct };
  }, [sub?.plan?.lead_credits_per_month, sub?.lead_credits_balance]);

  // Export CSV of credit log
  const exportCsv = () => {
    const rows = filteredTx;
    const header = ['date', 'type', 'reason', 'amount', 'balance_after', 'lead_id'];
    const lines = [header.join(',')];
    for (const t of rows) {
      lines.push([
        new Date(t.created_at).toISOString(),
        t.type,
        (REASON_LABEL[t.reason] ?? t.reason).replace(/,/g, ' '),
        String(t.amount),
        String(t.balance_after),
        t.quote_request_lead_id ?? '',
      ].join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provider-credits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('provider_membership_credits_csv_exported', { rows: rows.length });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        {/* Hero */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden relative">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-xl sm:text-2xl leading-tight">
                    العضوية والرصيد
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    تابع خطة منشأتك، رصيد فرص التواصل، وحركات الإضافة والاستهلاك في مكان واحد.
                  </p>
                  {sub?.plan && (
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <Badge variant="outline" className="text-[11px] h-6 px-2 gap-1 border-primary/30 text-primary bg-primary/5">
                        <Crown className="w-3 h-3" /> {sub.plan.name_ar}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] h-6 px-2 gap-1 border-border">
                        <Wallet className="w-3 h-3" /> الرصيد: <span className="tech-content">{sub.lead_credits_balance}</span>
                      </Badge>
                      {periodProgress && (
                        <Badge variant="outline" className="text-[11px] h-6 px-2 gap-1 border-border">
                          <Calendar className="w-3 h-3" /> <span className="tech-content">{periodProgress.daysLeft}</span> يوم متبقي
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button asChild size="sm" className="h-9 gap-1.5">
                <Link to="/membership" onClick={() => trackEvent('provider_membership_upgrade_cta_clicked')}>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  ترقية الباقة
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {launch && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-wrap items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold text-sm">مرحلة الإطلاق</p>
                <p className="text-xs text-muted-foreground mt-1">
                  في هذه المرحلة، تتم إتاحة بيانات التواصل بإشراف فريق قطاعات، وقد لا يتم خصم رصيد من حسابك.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/business-edit">تحديث ملف المنشأة</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {subQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !sub ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            لا توجد عضوية مفعّلة لمنشأتك حاليًا. تواصل مع فريق قطاعات لتفعيلها.
          </CardContent></Card>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoCard icon={<Crown className="h-4 w-4" />} label="الخطة الحالية" value={sub.plan?.name_ar ?? '—'} hint={sub.plan?.description_ar ?? undefined} />
            <InfoCard icon={<Wallet className="h-4 w-4" />} label="رصيد فرص التواصل" value={String(sub.lead_credits_balance)} />
            <InfoCard icon={<Activity className="h-4 w-4" />} label="حالة الاشتراك" value={STATUS_LABEL[sub.status] ?? sub.status} />
            <InfoCard icon={<Calendar className="h-4 w-4" />} label="بداية الفترة" value={fmtDate(sub.current_period_start)} hint={sub.current_period_end ? `تنتهي: ${fmtDate(sub.current_period_end)}` : undefined} />
          </div>

          {/* Gauges: credit usage + period progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {creditGauge && (
              <Card>
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      استهلاك رصيد فرص التواصل (هذا الشهر)
                    </p>
                    <span className="text-[11px] text-muted-foreground tech-content">
                      {creditGauge.used} / {creditGauge.max}
                    </span>
                  </div>
                  <Progress
                    value={creditGauge.pct}
                    className={cn('h-2', creditGauge.pct >= 90 && '[&>div]:bg-destructive', creditGauge.pct >= 70 && creditGauge.pct < 90 && '[&>div]:bg-warning')}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    المتبقي: <span className="tech-content font-medium text-foreground">{creditGauge.balance}</span> فرصة من أصل <span className="tech-content">{creditGauge.max}</span> شهريًا.
                  </p>
                </CardContent>
              </Card>
            )}
            {periodProgress && (
              <Card>
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      تقدم الفترة الحالية
                    </p>
                    <span className="text-[11px] text-muted-foreground tech-content">{periodProgress.pct}%</span>
                  </div>
                  <Progress value={periodProgress.pct} className="h-2" />
                  <p className="text-[11px] text-muted-foreground">
                    تنتهي الفترة خلال <span className="tech-content font-medium text-foreground">{periodProgress.daysLeft}</span> يوم — {fmtDate(sub.current_period_end)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          </>
        )}

        <Card><CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading font-semibold text-base">سجل الرصيد</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">جميع حركات الإضافة والاستهلاك على رصيد فرص التواصل.</p>
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              {([
                ['all', 'الكل'], ['grant', 'إضافة'], ['consume', 'استخدام'],
                ['refund', 'استرجاع'], ['adjustment', 'تعديل'],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k as typeof filter)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${filter === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'}`}>
                  {l}
                </button>
              ))}
              <Button
                type="button"
                onClick={exportCsv}
                disabled={filteredTx.length === 0}
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1.5 ms-1"
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </div>
          {txQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : filteredTx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد حركات رصيد حتى الآن</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-start py-2 px-2">التاريخ</th>
                    <th className="text-start py-2 px-2">النوع</th>
                    <th className="text-start py-2 px-2">السبب</th>
                    <th className="text-start py-2 px-2">التغيير</th>
                    <th className="text-start py-2 px-2">الرصيد بعد</th>
                    <th className="text-start py-2 px-2">رقم الفرصة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-2 px-2 tech-content text-muted-foreground">{fmtDate(t.created_at)}</td>
                      <td className="py-2 px-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_BADGE[t.type] ?? 'border-border'}`}>
                          {TYPE_LABEL[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{REASON_LABEL[t.reason] ?? t.reason}</td>
                      <td className={`py-2 px-2 tech-content font-medium ${t.amount > 0 ? 'text-success' : t.amount < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </td>
                      <td className="py-2 px-2 tech-content">{t.balance_after}</td>
                      <td className="py-2 px-2 tech-content text-muted-foreground">
                        {t.quote_request_lead_id ? `#${t.quote_request_lead_id.slice(-6)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </div>
    </DashboardLayout>
  );
};

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = ({ icon, label, value, hint }) => (
  <Card><CardContent className="p-4">
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{icon}</span>
    </div>
    <div className="text-lg font-bold mt-1">{value}</div>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </CardContent></Card>
);

export default ProviderMembership;
