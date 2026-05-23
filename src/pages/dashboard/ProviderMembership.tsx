import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listProviderSubscriptionsForCurrentUser } from '@/modules/memberships';
import { listProviderCreditTransactionsForBusinesses } from '@/modules/credits';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Crown, Wallet, Calendar, Activity, Sparkles } from 'lucide-react';
import { PROVIDER_COMMERCIAL_CONFIG } from '@/lib/providerCommercialConfig';
import { trackEvent } from '@/lib/analytics';

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

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> العضوية والرصيد
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تابع خطة منشأتك ورصيد فرص التواصل المتاح لك في قطاعات.
          </p>
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoCard icon={<Crown className="h-4 w-4" />} label="الخطة الحالية" value={sub.plan?.name_ar ?? '—'} hint={sub.plan?.description_ar ?? undefined} />
            <InfoCard icon={<Wallet className="h-4 w-4" />} label="رصيد فرص التواصل" value={String(sub.lead_credits_balance)} />
            <InfoCard icon={<Activity className="h-4 w-4" />} label="حالة الاشتراك" value={STATUS_LABEL[sub.status] ?? sub.status} />
            <InfoCard icon={<Calendar className="h-4 w-4" />} label="بداية الفترة" value={fmtDate(sub.current_period_start)} hint={sub.current_period_end ? `تنتهي: ${fmtDate(sub.current_period_end)}` : undefined} />
          </div>
        )}

        <Card><CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading font-semibold text-base">سجل الرصيد</h2>
            <div className="flex flex-wrap gap-1">
              {([
                ['all', 'الكل'], ['grant', 'إضافة'], ['consume', 'استخدام'],
                ['refund', 'استرجاع'], ['adjustment', 'تعديل'],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k as typeof filter)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${filter === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'}`}>
                  {l}
                </button>
              ))}
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
