import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
import {
  listProviderPlans,
  listProviderSubscriptions,
  updateProviderSubscriptionById,
} from '@/modules/memberships';
import {
  listProviderCreditTransactionsForBusiness,
  adminAdjustProviderCredits,
} from '@/modules/credits';
import {
  MembershipFinancePageShell,
  MembershipDetailsDrawer,
  buildProviderSubscriptionDrawerProps,
} from '@/components/admin/memberships/shared';
import {
  ProviderSubscriptionsTableSection,
  ProviderManageSubscriptionPanel,
} from '@/components/admin/memberships/providers';

interface AdminTxRow {
  id: string;
  type: 'grant' | 'consume' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
  created_by: string | null;
  quote_request_lead_id: string | null;
}
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Wallet, Info } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

const REASON_LABEL: Record<string, string> = {
  monthly_grant: 'منح شهري',
  admin_manual_grant: 'إضافة يدوية',
  contact_reveal_consumption: 'كشف بيانات تواصل',
  launch_free_reveal: 'إتاحة مجانية - إطلاق',
  admin_override_reveal: 'تجاوز إداري',
  admin_adjustment: 'تعديل إداري',
  admin_refund: 'استرجاع إداري',
};
const TYPE_LABEL_ADMIN: Record<string, string> = {
  grant: 'إضافة', consume: 'استخدام', refund: 'استرجاع', adjustment: 'تعديل',
};

interface Plan { id: string; code: string; name_ar: string; lead_credits_per_month: number; }
interface Sub {
  id: string; ref_id: string | null; business_id: string; provider_user_id: string | null;
  plan_id: string; status: string; lead_credits_balance: number;
  current_period_start: string | null; current_period_end: string | null; updated_at: string;
  plan: Plan | null;
  business: { id: string; ref_id: string | null; name_ar: string; user_id: string | null; membership_tier: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'نشطة', paused: 'موقوفة', expired: 'منتهية', cancelled: 'ملغاة',
};

const AdminProviderSubscriptions: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const plansQ = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await listProviderPlans<Plan>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const subsQ = useQuery({
    queryKey: ['admin-subs'],
    queryFn: async () => {
      const { data, error } = await listProviderSubscriptions<Sub>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = subsQ.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((x) =>
      (x.business?.name_ar ?? '').toLowerCase().includes(s) ||
      (x.plan?.name_ar ?? '').toLowerCase().includes(s) ||
      x.business_id.includes(s),
    );
  }, [subsQ.data, search]);

  const editing = useMemo(() => filtered.find((x) => x.id === editId) ?? null, [filtered, editId]);
  const viewing = useMemo(() => filtered.find((x) => x.id === viewId) ?? null, [filtered, viewId]);
  const drawerProps = useMemo(() => {
    if (!viewing) return null;
    return buildProviderSubscriptionDrawerProps({
      businessName: viewing.business?.name_ar ?? null,
      businessRefId: viewing.business?.ref_id ?? null,
      membershipTier: viewing.business?.membership_tier ?? null,
      planName: viewing.plan?.name_ar ?? null,
      status: viewing.status,
      leadCreditsBalance: viewing.lead_credits_balance,
      currentPeriodStart: viewing.current_period_start,
      currentPeriodEnd: viewing.current_period_end,
      updatedAt: viewing.updated_at,
      isRTL: true,
    });
  }, [viewing]);

  return (
    <DashboardLayout>
      <MembershipFinancePageShell
        className="max-w-7xl space-y-5"
        title="اشتراكات رصيد فرص التواصل (للمزودين)"
        description="إدارة خطط المزودين وأرصدة فرص التواصل. هذه الخطط مستقلة عن «عضوية المنصة» الظاهرة في حساب المنشأة."
        icon={<Wallet className="h-5 w-5 text-primary" />}
        actionsSlot={
          <>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المنشأة" className="h-9 ps-7 w-[200px] text-xs" />
            </div>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => subsQ.refetch()} disabled={subsQ.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${subsQ.isFetching ? 'animate-spin' : ''}`} /> تحديث
            </Button>
          </>
        }
        banner={
          <div className="rounded-lg border border-info/30 bg-info/5 p-3 flex items-start gap-2 text-xs">
            <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">تنبيه:</span> «خطة المزود» هنا تخص رصيد فرص التواصل فقط (basic/pro …) ولا تعني أن المنشأة لديها عضوية احترافية على المنصة. عمود «عضوية المنصة» أدناه يعرض المستوى الفعلي للعضوية لمقارنته مع خطة المزود.
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProviderSubscriptionsTableSection
            rows={filtered}
            editId={editId}
            isLoading={subsQ.isLoading}
            statusLabel={STATUS_LABEL}
            onEdit={setEditId}
            onView={setViewId}
          />

          <Card><CardContent className="p-4">
            {!editing ? (
              <p className="text-sm text-muted-foreground text-center py-8">اختر منشأة للإدارة</p>
            ) : (
              <ManageSub sub={editing} plans={plansQ.data ?? []} onDone={() => { qc.invalidateQueries({ queryKey: ['admin-subs'] }); }} adminId={user?.id ?? null} />
            )}
          </CardContent></Card>
        </div>
      </MembershipFinancePageShell>
      {drawerProps && (
        <MembershipDetailsDrawer
          open={!!viewId}
          onOpenChange={(o) => { if (!o) setViewId(null); }}
          isRTL={true}
          subject={drawerProps.subject}
          lifecycle={drawerProps.lifecycle}
        />
      )}
    </DashboardLayout>
  );
};

const ManageSub: React.FC<{ sub: Sub; plans: Plan[]; onDone: () => void; adminId: string | null }> = ({ sub, plans, onDone, adminId }) => {
  const qc = useQueryClient();
  const [planId, setPlanId] = useState(sub.plan_id);
  const [status, setStatus] = useState(sub.status);
  const [grantAmount, setGrantAmount] = useState<string>('');
  const [grantNote, setGrantNote] = useState('');
  const [adjustTo, setAdjustTo] = useState<string>(String(sub.lead_credits_balance));
  const [adjustNote, setAdjustNote] = useState('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundNote, setRefundNote] = useState('');
  const [refundLeadId, setRefundLeadId] = useState('');

  React.useEffect(() => {
    setPlanId(sub.plan_id); setStatus(sub.status);
    setGrantAmount(''); setGrantNote('');
    setAdjustTo(String(sub.lead_credits_balance)); setAdjustNote('');
    setRefundAmount(''); setRefundNote(''); setRefundLeadId('');
  }, [sub.id, sub.plan_id, sub.status, sub.lead_credits_balance]);

  const recentTxQ = useQuery({
    queryKey: ['admin-sub-tx', sub.business_id],
    queryFn: async () => {
      const { data, error } = await listProviderCreditTransactionsForBusiness<AdminTxRow>({
        businessId: sub.business_id,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const planStatusM = useMutation({
    mutationFn: async () => {
      const { error } = await updateProviderSubscriptionById({
        id: sub.id,
        values: { plan_id: planId, status },
      });
      if (error) throw error;
      trackEvent('admin_subscription_updated', { sub_id: sub.id });
    },
    onSuccess: () => { toast.success('تم تحديث الاشتراك'); onDone(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر التحديث'),
  });

  const callRpc = async (action: 'grant'|'refund'|'adjustment', amount: number, reason: string, note?: string, leadId?: string) => {
    const { data, error } = await adminAdjustProviderCredits({
      p_subscription_id: sub.id,
      p_action: action,
      p_amount: amount,
      p_reason: reason,
      p_note: note ?? null,
      p_quote_request_lead_id: leadId || null,
    });
    if (error) throw error;
    return data;
  };

  const grantM = useMutation({
    mutationFn: async () => {
      const amt = parseInt(grantAmount, 10);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('أدخل رقمًا أكبر من صفر');
      await callRpc('grant', amt, 'admin_manual_grant', grantNote);
      trackEvent('admin_lead_credit_granted', { sub_id: sub.id, amount: amt });
    },
    onSuccess: () => { toast.success('تمت إضافة الرصيد'); qc.invalidateQueries({ queryKey: ['admin-sub-tx', sub.business_id] }); onDone(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر إضافة الرصيد'),
  });

  const refundM = useMutation({
    mutationFn: async () => {
      const amt = parseInt(refundAmount, 10);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('أدخل رقمًا أكبر من صفر');
      if (!refundNote.trim()) throw new Error('السبب مطلوب');
      await callRpc('refund', amt, 'admin_refund', refundNote, refundLeadId.trim());
      trackEvent('admin_lead_credit_refunded', { sub_id: sub.id, amount: amt });
    },
    onSuccess: () => { toast.success('تم استرجاع الرصيد بنجاح'); qc.invalidateQueries({ queryKey: ['admin-sub-tx', sub.business_id] }); onDone(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر استرجاع الرصيد حاليًا'),
  });

  const adjustM = useMutation({
    mutationFn: async () => {
      const target = parseInt(adjustTo, 10);
      if (!Number.isFinite(target) || target < 0) throw new Error('أدخل رقمًا صحيحًا');
      await callRpc('adjustment', target, 'admin_adjustment', adjustNote);
    },
    onSuccess: () => { toast.success('تم التعديل'); qc.invalidateQueries({ queryKey: ['admin-sub-tx', sub.business_id] }); onDone(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر التعديل'),
  });

  return (
    <ProviderManageSubscriptionPanel
      subject={{
        businessName: sub.business?.name_ar ?? null,
        businessRefId: sub.business?.ref_id ?? null,
        membershipTier: sub.business?.membership_tier ?? null,
        currentPlanId: sub.plan_id,
        currentStatus: sub.status,
      }}
      plans={plans}
      statusLabel={STATUS_LABEL}
      reasonLabel={REASON_LABEL}
      typeLabel={TYPE_LABEL_ADMIN}
      planId={planId}
      status={status}
      onPlanIdChange={setPlanId}
      onStatusChange={setStatus}
      onSavePlanStatus={() => planStatusM.mutate()}
      isSavePlanStatusPending={planStatusM.isPending}
      grantAmount={grantAmount}
      grantNote={grantNote}
      onGrantAmountChange={setGrantAmount}
      onGrantNoteChange={setGrantNote}
      onGrant={() => grantM.mutate()}
      isGrantPending={grantM.isPending}
      adjustTo={adjustTo}
      adjustNote={adjustNote}
      onAdjustToChange={setAdjustTo}
      onAdjustNoteChange={setAdjustNote}
      onAdjust={() => adjustM.mutate()}
      isAdjustPending={adjustM.isPending}
      refundAmount={refundAmount}
      refundLeadId={refundLeadId}
      refundNote={refundNote}
      onRefundAmountChange={setRefundAmount}
      onRefundLeadIdChange={setRefundLeadId}
      onRefundNoteChange={setRefundNote}
      onRefund={() => refundM.mutate()}
      isRefundPending={refundM.isPending}
      recentTx={recentTxQ.data ?? []}
      isRecentTxLoading={recentTxQ.isLoading}
    />
  );
};

export default AdminProviderSubscriptions;
