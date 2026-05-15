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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Crown, Wallet, RefreshCw, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

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
      const { data, error } = await supabase.from('provider_plans')
        .select('id, code, name_ar, lead_credits_per_month').eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const subsQ = useQuery({
    queryKey: ['admin-subs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('provider_subscriptions')
        .select('id, business_id, provider_user_id, plan_id, status, lead_credits_balance, current_period_start, current_period_end, updated_at, plan:provider_plans(id, code, name_ar, lead_credits_per_month), business:businesses!provider_subscriptions_business_id_fkey(id, name_ar, user_id)')
        .order('updated_at', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Sub[];
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
  const [planId, setPlanId] = useState(sub.plan_id);
  const [status, setStatus] = useState(sub.status);
  const [grantAmount, setGrantAmount] = useState<string>('');
  const [grantNote, setGrantNote] = useState('');
  const [adjustTo, setAdjustTo] = useState<string>(String(sub.lead_credits_balance));
  const [adjustNote, setAdjustNote] = useState('');

  React.useEffect(() => {
    setPlanId(sub.plan_id); setStatus(sub.status);
    setGrantAmount(''); setGrantNote('');
    setAdjustTo(String(sub.lead_credits_balance)); setAdjustNote('');
  }, [sub.id, sub.plan_id, sub.status, sub.lead_credits_balance]);

  const planStatusM = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('provider_subscriptions')
        .update({ plan_id: planId, status }).eq('id', sub.id);
      if (error) throw error;
      trackEvent('admin_subscription_updated', { sub_id: sub.id });
    },
    onSuccess: () => { toast.success('تم تحديث الاشتراك'); onDone(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر التحديث'),
  });

  const grantM = useMutation({
    mutationFn: async () => {
      const amt = parseInt(grantAmount, 10);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('أدخل رقمًا أكبر من صفر');
      const newBal = sub.lead_credits_balance + amt;
      const { error: e1 } = await supabase.from('provider_subscriptions')
        .update({ lead_credits_balance: newBal }).eq('id', sub.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('provider_lead_credit_transactions').insert({
        business_id: sub.business_id,
        provider_user_id: sub.provider_user_id,
        type: 'grant', amount: amt, balance_after: newBal,
        reason: 'admin_manual_grant',
        metadata: { note: grantNote || null },
        created_by: adminId,
      });
      if (e2) throw e2;
      trackEvent('admin_lead_credit_granted', { sub_id: sub.id, amount: amt });
    },
    onSuccess: () => { toast.success('تمت إضافة الرصيد'); onDone(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر إضافة الرصيد'),
  });

  const adjustM = useMutation({
    mutationFn: async () => {
      const target = parseInt(adjustTo, 10);
      if (!Number.isFinite(target) || target < 0) throw new Error('أدخل رقمًا صحيحًا');
      const diff = target - sub.lead_credits_balance;
      if (diff === 0) throw new Error('لا يوجد تغيير');
      const { error: e1 } = await supabase.from('provider_subscriptions')
        .update({ lead_credits_balance: target }).eq('id', sub.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('provider_lead_credit_transactions').insert({
        business_id: sub.business_id,
        provider_user_id: sub.provider_user_id,
        type: 'adjustment', amount: diff, balance_after: target,
        reason: 'admin_adjustment',
        metadata: { note: adjustNote || null },
        created_by: adminId,
      });
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success('تم التعديل'); onDone(); },
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
    </div>
  );
};

export default AdminProviderSubscriptions;
