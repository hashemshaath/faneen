import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Crown, Plus, Pencil, Loader2, Users, CreditCard } from 'lucide-react';

const tierColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  premium: 'bg-gold/20 text-gold',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const AdminMemberships = () => {
  const { isRTL } = useLanguage();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form, setForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    price_monthly: 0, price_yearly: 0, is_active: true,
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
      const { data, error } = await supabase.from('membership_subscriptions').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlan) return;
      const { error } = await supabase.from('membership_plans').update({
        name_ar: form.name_ar,
        name_en: form.name_en,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        price_monthly: form.price_monthly,
        price_yearly: form.price_yearly,
        is_active: form.is_active,
      }).eq('id', editingPlan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      setEditingPlan(null);
      toast.success(isRTL ? 'تم تحديث الخطة' : 'Plan updated');
    },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Update failed'),
  });

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      name_ar: plan.name_ar, name_en: plan.name_en,
      description_ar: plan.description_ar || '', description_en: plan.description_en || '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      is_active: plan.is_active,
    });
  };

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            {isRTL ? 'إدارة العضويات' : 'Membership Management'}
          </h1>
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans" className="gap-1.5">
              <CreditCard className="w-4 h-4" />
              {isRTL ? 'الخطط' : 'Plans'}
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5">
              <Users className="w-4 h-4" />
              {isRTL ? 'الاشتراكات' : 'Subscriptions'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4 mt-4">
            {loadingPlans ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {plans.map(plan => (
                  <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={tierColors[plan.tier] || 'bg-muted'}>{plan.tier}</Badge>
                          <CardTitle className="text-base">{isRTL ? plan.name_ar : plan.name_en}</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {isRTL ? plan.description_ar : plan.description_en}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="font-bold text-lg">{plan.price_monthly}</span>
                          <span className="text-muted-foreground text-xs"> {plan.currency_code}/{isRTL ? 'شهر' : 'mo'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-lg">{plan.price_yearly}</span>
                          <span className="text-muted-foreground text-xs"> {plan.currency_code}/{isRTL ? 'سنة' : 'yr'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-3 mt-4">
            {loadingSubs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : subscriptions.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">
                {isRTL ? 'لا توجد اشتراكات' : 'No subscriptions'}
              </CardContent></Card>
            ) : (
              subscriptions.map(sub => (
                <Card key={sub.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{sub.ref_id}</Badge>
                        <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}>
                          {sub.status}
                        </Badge>
                        <Badge variant="outline">{sub.billing_cycle}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(sub.starts_at).toLocaleDateString()} → {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '∞'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Plan Dialog */}
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isRTL ? 'تعديل الخطة' : 'Edit Plan'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
                  <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
                <div><Label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
                  <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'السعر الشهري' : 'Monthly Price'}</Label>
                  <Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>{isRTL ? 'السعر السنوي' : 'Yearly Price'}</Label>
                  <Input type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div><Label>{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label>
                <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} /></div>
              <div><Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label>
                <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>{isRTL ? 'مفعّل' : 'Active'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPlan(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={() => updatePlanMutation.mutate()} disabled={updatePlanMutation.isPending}>
                {updatePlanMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isRTL ? 'حفظ' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminMemberships;
