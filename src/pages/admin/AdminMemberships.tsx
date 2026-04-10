import React, { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import {
  Crown, Pencil, Loader2, Users, CreditCard, X, Check, Save,
  Zap, Star, Building2, TrendingUp, AlertTriangle, Clock, Ban,
  RefreshCw, BarChart3, Eye, Search, Filter, ChevronDown, ChevronUp,
  UserCheck, CalendarDays, DollarSign, Shield, Sparkles,
} from 'lucide-react';

type Tab = 'plans' | 'subscriptions' | 'stats';

const tierIcons: Record<string, React.ElementType> = {
  free: Zap, basic: Star, premium: Crown, enterprise: Building2,
};
const tierBg: Record<string, string> = {
  free: 'bg-muted/50', basic: 'bg-blue-500/10', premium: 'bg-accent/10', enterprise: 'bg-purple-500/10',
};
const tierBadge: Record<string, string> = {
  free: 'bg-muted text-muted-foreground', basic: 'bg-blue-500/15 text-blue-600', premium: 'bg-accent/15 text-accent', enterprise: 'bg-purple-500/15 text-purple-600',
};
const statusBadge: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600', cancelled: 'bg-destructive/10 text-destructive',
  expired: 'bg-muted text-muted-foreground', replaced: 'bg-amber-500/10 text-amber-600',
};

const PlanCard = React.memo(({ plan, isRTL, onEdit }: { plan: any; isRTL: boolean; onEdit: (p: any) => void }) => {
  const Icon = tierIcons[plan.tier] || Zap;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const limits = plan.limits && typeof plan.limits === 'object' ? plan.limits as Record<string, any> : {};

  return (
    <Card className={cn('relative transition-all hover:shadow-md', !plan.is_active && 'opacity-50', tierBg[plan.tier])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', tierBadge[plan.tier])}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm">{isRTL ? plan.name_ar : plan.name_en}</h3>
              <Badge className={cn('text-[8px] px-1.5 py-0 h-3.5', tierBadge[plan.tier])}>{plan.tier}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!plan.is_active && <Badge variant="outline" className="text-[8px] h-4 bg-destructive/5 text-destructive">{isRTL ? 'معطل' : 'Inactive'}</Badge>}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(plan)}>
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mb-3 line-clamp-2">{isRTL ? plan.description_ar : plan.description_en}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-background/60">
            <p className="text-[9px] text-muted-foreground">{isRTL ? 'شهري' : 'Monthly'}</p>
            <p className="font-bold text-sm">{plan.price_monthly === 0 ? (isRTL ? 'مجاناً' : 'Free') : `${plan.price_monthly} ${plan.currency_code}`}</p>
          </div>
          <div className="p-2 rounded-lg bg-background/60">
            <p className="text-[9px] text-muted-foreground">{isRTL ? 'سنوي' : 'Yearly'}</p>
            <p className="font-bold text-sm">{plan.price_yearly === 0 ? (isRTL ? 'مجاناً' : 'Free') : `${plan.price_yearly} ${plan.currency_code}`}</p>
          </div>
        </div>

        {features.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-semibold text-muted-foreground mb-1">{isRTL ? 'المميزات' : 'Features'}:</p>
            {features.slice(0, 4).map((f: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <Check className="w-2.5 h-2.5 text-accent shrink-0" /><span className="truncate">{f}</span>
              </div>
            ))}
            {features.length > 4 && <p className="text-[9px] text-muted-foreground">+{features.length - 4} {isRTL ? 'أخرى' : 'more'}</p>}
          </div>
        )}

        {Object.keys(limits).length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[9px] font-semibold text-muted-foreground mb-1">{isRTL ? 'الحدود' : 'Limits'}:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(limits).slice(0, 3).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[8px] px-1 py-0 h-3.5">{k}: {String(v)}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
PlanCard.displayName = 'PlanCard';

const SubRow = React.memo(({ sub, isRTL, onCancel, onRenew }: { sub: any; isRTL: boolean; onCancel: (id: string) => void; onRenew: (sub: any) => void }) => {
  const plan = sub.plan;
  const Icon = tierIcons[plan?.tier] || Zap;
  const isExpiringSoon = sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date(Date.now() + 7 * 86400000);

  return (
    <Card className={cn('transition-all hover:shadow-sm', isExpiringSoon && 'border-amber-400/50')}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tierBadge[plan?.tier] || 'bg-muted')}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-xs">{isRTL ? plan?.name_ar : plan?.name_en}</span>
            <Badge className={cn('text-[7px] px-1 py-0 h-3', statusBadge[sub.status] || 'bg-muted')}>{sub.status}</Badge>
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3">{sub.billing_cycle}</Badge>
            {isExpiringSoon && <Badge className="bg-amber-500/10 text-amber-600 text-[7px] px-1 py-0 h-3 gap-0.5"><AlertTriangle className="w-2 h-2" />{isRTL ? 'ينتهي قريباً' : 'Expiring'}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-muted-foreground tech-content">{sub.ref_id}</span>
            <span className="text-[9px] text-muted-foreground">
              {new Date(sub.starts_at).toLocaleDateString()} → {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '∞'}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {sub.status === 'active' && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onCancel(sub.id)} title={isRTL ? 'إلغاء' : 'Cancel'}>
              <Ban className="w-3 h-3" />
            </Button>
          )}
          {(sub.status === 'expired' || sub.status === 'cancelled') && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-accent hover:bg-accent/10" onClick={() => onRenew(sub)} title={isRTL ? 'تجديد' : 'Renew'}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
SubRow.displayName = 'SubRow';

const AdminMemberships = () => {
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('plans');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuresText, setFeaturesText] = useState('');
  const [limitsText, setLimitsText] = useState('');
  const [form, setForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    price_monthly: 0, price_yearly: 0, is_active: true, sort_order: 0,
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('membership_plans').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_subscriptions')
        .select('*, plan:membership_plans(name_ar, name_en, tier)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const active = subscriptions.filter((s: any) => s.status === 'active').length;
    const cancelled = subscriptions.filter((s: any) => s.status === 'cancelled').length;
    const expired = subscriptions.filter((s: any) => s.status === 'expired').length;
    const expiringSoon = subscriptions.filter((s: any) =>
      s.status === 'active' && s.expires_at && new Date(s.expires_at) < new Date(Date.now() + 7 * 86400000)
    ).length;
    const monthly = subscriptions.filter((s: any) => s.billing_cycle === 'monthly' && s.status === 'active').length;
    const yearly = subscriptions.filter((s: any) => s.billing_cycle === 'yearly' && s.status === 'active').length;
    return { total: subscriptions.length, active, cancelled, expired, expiringSoon, monthly, yearly };
  }, [subscriptions]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s: any) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.ref_id?.toLowerCase().includes(q) || (s.plan as any)?.name_ar?.toLowerCase().includes(q) || (s.plan as any)?.name_en?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [subscriptions, statusFilter, searchQuery]);

  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlan) return;
      const features = featuresText.split('\n').map(l => l.trim()).filter(Boolean);
      let limits: Record<string, any> = {};
      try { limits = JSON.parse(limitsText || '{}'); } catch { /* ignore */ }
      const { error } = await supabase.from('membership_plans').update({
        name_ar: form.name_ar, name_en: form.name_en,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        price_monthly: form.price_monthly, price_yearly: form.price_yearly,
        is_active: form.is_active, sort_order: form.sort_order,
        features, limits,
      }).eq('id', editingPlan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      setEditingPlan(null);
      toast.success(isRTL ? 'تم تحديث الخطة' : 'Plan updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase.rpc('cancel_subscription' as any, { _subscription_id: subId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success(isRTL ? 'تم إلغاء الاشتراك' : 'Subscription cancelled');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = useCallback((plan: any) => {
    setEditingPlan(plan);
    const features = Array.isArray(plan.features) ? (plan.features as string[]).join('\n') : '';
    const limits = plan.limits && typeof plan.limits === 'object' ? JSON.stringify(plan.limits, null, 2) : '{}';
    setFeaturesText(features);
    setLimitsText(limits);
    setForm({
      name_ar: plan.name_ar, name_en: plan.name_en,
      description_ar: plan.description_ar || '', description_en: plan.description_en || '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      is_active: plan.is_active, sort_order: plan.sort_order,
    });
  }, []);

  const handleRenew = useCallback(async (sub: any) => {
    if (!sub.plan_id || !sub.business_id) return;
    try {
      const { error } = await supabase.rpc('subscribe_to_plan' as any, {
        _user_id: sub.user_id,
        _plan_id: sub.plan_id,
        _business_id: sub.business_id,
        _billing_cycle: sub.billing_cycle,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success(isRTL ? 'تم تجديد الاشتراك' : 'Subscription renewed');
    } catch (e: any) { toast.error(e.message); }
  }, [isRTL, queryClient]);

  const tabs = [
    { key: 'stats' as Tab, icon: BarChart3, label: isRTL ? 'الإحصائيات' : 'Stats' },
    { key: 'plans' as Tab, icon: CreditCard, label: isRTL ? 'الخطط' : 'Plans' },
    { key: 'subscriptions' as Tab, icon: Users, label: isRTL ? 'الاشتراكات' : 'Subscriptions' },
  ];

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            {isRTL ? 'إدارة العضويات والاشتراكات' : 'Membership & Subscriptions'}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isRTL ? 'إدارة الخطط والاشتراكات والتجديدات' : 'Manage plans, subscriptions, and renewals'}
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-muted/30 rounded-xl p-0.5 w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeTab === t.key ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ═══ STATS ═══ */}
        {activeTab === 'stats' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Users, label: isRTL ? 'إجمالي' : 'Total', value: stats.total, color: 'text-foreground' },
                { icon: UserCheck, label: isRTL ? 'نشط' : 'Active', value: stats.active, color: 'text-emerald-600' },
                { icon: AlertTriangle, label: isRTL ? 'ينتهي قريباً' : 'Expiring', value: stats.expiringSoon, color: 'text-amber-600' },
                { icon: Ban, label: isRTL ? 'ملغي' : 'Cancelled', value: stats.cancelled, color: 'text-destructive' },
              ].map((s, i) => (
                <Card key={i} className="border-border/40">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <s.icon className={cn('w-3.5 h-3.5', s.color)} />
                    </div>
                    <div>
                      <p className={cn('font-bold text-lg leading-none', s.color)}>{s.value}</p>
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  {isRTL ? 'توزيع الاشتراكات' : 'Subscription Distribution'}
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: isRTL ? 'نشط' : 'Active', value: stats.active, total: stats.total, color: 'bg-emerald-500' },
                    { label: isRTL ? 'شهري' : 'Monthly', value: stats.monthly, total: stats.active || 1, color: 'bg-blue-500' },
                    { label: isRTL ? 'سنوي' : 'Yearly', value: stats.yearly, total: stats.active || 1, color: 'bg-accent' },
                    { label: isRTL ? 'منتهي' : 'Expired', value: stats.expired, total: stats.total, color: 'bg-muted-foreground' },
                  ].map((item, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value} ({item.total > 0 ? Math.round(item.value / item.total * 100) : 0}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', item.color)}
                          style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ PLANS ═══ */}
        {activeTab === 'plans' && (
          <div className="space-y-3">
            {/* Edit Form */}
            {editingPlan && (
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                      <Pencil className="w-3.5 h-3.5 text-accent" />
                      {isRTL ? 'تعديل الخطة' : 'Edit Plan'}
                      <Badge className={cn('text-[8px]', tierBadge[editingPlan.tier])}>{editingPlan.tier}</Badge>
                    </h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPlan(null)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">{isRTL ? 'الاسم (عربي)' : 'Name (AR)'}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-8 text-xs mt-0.5" /></div>
                    <div><Label className="text-[10px]">{isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="h-8 text-xs mt-0.5" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-[10px]">{isRTL ? 'السعر الشهري' : 'Monthly'}</Label><Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs mt-0.5" /></div>
                    <div><Label className="text-[10px]">{isRTL ? 'السعر السنوي' : 'Yearly'}</Label><Input type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs mt-0.5" /></div>
                    <div><Label className="text-[10px]">{isRTL ? 'الترتيب' : 'Sort'}</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-8 text-xs mt-0.5" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">{isRTL ? 'الوصف (عربي)' : 'Desc (AR)'}</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-xs mt-0.5" /></div>
                    <div><Label className="text-[10px]">{isRTL ? 'الوصف (إنجليزي)' : 'Desc (EN)'}</Label><Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} className="text-xs mt-0.5" /></div>
                  </div>
                  <div>
                    <Label className="text-[10px]">{isRTL ? 'المميزات (سطر لكل ميزة)' : 'Features (one per line)'}</Label>
                    <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4} className="text-xs mt-0.5" placeholder={isRTL ? 'ميزة 1\nميزة 2\nميزة 3' : 'Feature 1\nFeature 2\nFeature 3'} />
                  </div>
                  <div>
                    <Label className="text-[10px]">{isRTL ? 'الحدود (JSON)' : 'Limits (JSON)'}</Label>
                    <Textarea value={limitsText} onChange={e => setLimitsText(e.target.value)} rows={3} className="text-xs mt-0.5 font-mono tech-content" dir="ltr" placeholder='{"max_projects": 10}' />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">{isRTL ? 'مفعّل' : 'Active'}</Label></div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditingPlan(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                      <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updatePlanMutation.mutate()} disabled={updatePlanMutation.isPending}>
                        {updatePlanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {isRTL ? 'حفظ' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingPlans ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((plan: any) => (
                  <PlanCard key={plan.id} plan={plan} isRTL={isRTL} onEdit={openEdit} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SUBSCRIPTIONS ═══ */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={isRTL ? 'بحث بالمعرف أو الخطة...' : 'Search by ref or plan...'} value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} className="h-8 text-xs ps-8" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</SelectItem>
                  <SelectItem value="expired">{isRTL ? 'منتهي' : 'Expired'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingSubs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredSubs.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">{isRTL ? 'لا توجد اشتراكات' : 'No subscriptions found'}</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredSubs.map((sub: any) => (
                  <SubRow key={sub.id} sub={sub} isRTL={isRTL}
                    onCancel={(id) => cancelSubMutation.mutate(id)}
                    onRenew={handleRenew} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminMemberships;
