import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  listProviderPlans,
  listProviderSubscriptions,
  updateProviderSubscriptionById,
  adminAdjustProviderCredits,
} from '@/modules/memberships';
import { listProviderCreditTransactionsForBusiness } from '@/modules/credits';

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
import { Crown, Wallet, RefreshCw, Search, ChevronRight, Undo2 } from 'lucide-react';
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
  id: string; business_id: string; provider_user_id: string | null;
  plan_id: string; status: string; lead_credits_balance: number;
  current_period_start: string | null; current_period_end: string | null; updated_at: string;
  plan: Plan | null;
  business: { id: string; name_ar: string; user_id: string | null } | null;
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

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" /> عضويات المزودين
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              إدارة خطط المزودين وأرصدة فرص التواصل.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المنشأة" className="h-9 ps-7 w-[200px] text-xs" />
            </div>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => subsQ.refetch()} disabled={subsQ.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${subsQ.isFetching ? 'animate-spin' : ''}`} /> تحديث
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2"><CardContent className="p-3">
            {subsQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">لا توجد عضويات.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-start py-2 px-2">المنشأة</th>
                      <th className="text-start py-2 px-2">الخطة</th>
                      <th className="text-start py-2 px-2">الحالة</th>
                      <th className="text-start py-2 px-2">الرصيد</th>
                      <th className="text-start py-2 px-2">آخر تحديث</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className={`border-t border-border cursor-pointer hover:bg-muted/40 ${editId === s.id ? 'bg-primary/5' : ''}`} onClick={() => setEditId(s.id)}>
                        <td className="py-2 px-2 font-medium truncate max-w-[200px]">{s.business?.name_ar ?? '—'}</td>
                        <td className="py-2 px-2">{s.plan?.name_ar ?? '—'}</td>
                        <td className="py-2 px-2"><span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/50">{STATUS_LABEL[s.status] ?? s.status}</span></td>
                        <td className="py-2 px-2 tech-content font-medium">{s.lead_credits_balance}</td>
                        <td className="py-2 px-2 tech-content text-muted-foreground">{new Date(s.updated_at).toLocaleDateString('ar-SA-u-nu-latn')}</td>
                        <td className="py-2 px-2 text-end"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-4">
            {!editing ? (
              <p className="text-sm text-muted-foreground text-center py-8">اختر منشأة للإدارة</p>
            ) : (
              <ManageSub sub={editing} plans={plansQ.data ?? []} onDone={() => { qc.invalidateQueries({ queryKey: ['admin-subs'] }); }} adminId={user?.id ?? null} />
            )}
          </CardContent></Card>
        </div>
      </div>
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
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">{sub.business?.name_ar ?? '—'}</h3>
        <p className="text-xs text-muted-foreground tech-content">#{sub.business_id.slice(-6)}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">الخطة</Label>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name_ar} · {p.lead_credits_per_month} فرصة/شهر</SelectItem>)}
          </SelectContent>
        </Select>
        <Label className="text-xs">الحالة</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['active','paused','expired','cancelled'] as const).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full h-9 text-xs" onClick={() => planStatusM.mutate()} disabled={planStatusM.isPending || (planId === sub.plan_id && status === sub.status)}>
          حفظ التغييرات
        </Button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <Label className="text-xs flex items-center gap-1"><Wallet className="h-3 w-3" /> إضافة رصيد يدوي</Label>
        <Input type="number" min={1} value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} placeholder="عدد الفرص" className="h-9 text-xs tech-content" />
        <Textarea rows={2} value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="text-xs" />
        <Button size="sm" variant="outline" className="w-full h-9 text-xs" onClick={() => grantM.mutate()} disabled={grantM.isPending || !grantAmount}>
          إضافة
        </Button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <Label className="text-xs">تعديل الرصيد إلى قيمة محددة</Label>
        <Input type="number" min={0} value={adjustTo} onChange={(e) => setAdjustTo(e.target.value)} className="h-9 text-xs tech-content" />
        <Textarea rows={2} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="سبب التعديل (اختياري)" className="text-xs" />
        <Button size="sm" variant="outline" className="w-full h-9 text-xs" onClick={() => adjustM.mutate()} disabled={adjustM.isPending}>
          تطبيق التعديل
        </Button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <Label className="text-xs flex items-center gap-1"><Undo2 className="h-3 w-3" /> استرجاع رصيد</Label>
        <Input type="number" min={1} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="عدد الفرص المسترجعة" className="h-9 text-xs tech-content" />
        <Input value={refundLeadId} onChange={(e) => setRefundLeadId(e.target.value)} placeholder="معرف الفرصة (اختياري)" className="h-9 text-xs tech-content" />
        <Textarea rows={2} value={refundNote} onChange={(e) => setRefundNote(e.target.value)} placeholder="السبب (مطلوب)" className="text-xs" />
        <Button size="sm" variant="outline" className="w-full h-9 text-xs" onClick={() => refundM.mutate()} disabled={refundM.isPending || !refundAmount || !refundNote.trim()}>
          استرجاع
        </Button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <Label className="text-xs">آخر 10 حركات رصيد</Label>
        {recentTxQ.isLoading ? <Skeleton className="h-20 w-full" /> : (recentTxQ.data ?? []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">لا توجد حركات.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {(recentTxQ.data ?? []).map((t) => (
              <div key={t.id} className="text-[11px] border border-border rounded-md p-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-full border border-border bg-muted/40">{TYPE_LABEL_ADMIN[t.type] ?? t.type}</span>
                    <span className="text-muted-foreground truncate">{REASON_LABEL[t.reason] ?? t.reason}</span>
                  </div>
                  <div className="text-muted-foreground tech-content mt-0.5">{new Date(t.created_at).toLocaleString('ar-SA-u-nu-latn')}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className={`tech-content font-medium ${t.amount > 0 ? 'text-success' : t.amount < 0 ? 'text-destructive' : ''}`}>{t.amount > 0 ? `+${t.amount}` : t.amount}</div>
                  <div className="text-muted-foreground tech-content">رصيد: {t.balance_after}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProviderSubscriptions;
