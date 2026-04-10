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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CreditCard, Settings, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-muted text-muted-foreground',
  defaulted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  active: { ar: 'نشط', en: 'Active' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  defaulted: { ar: 'متعثر', en: 'Defaulted' },
  pending: { ar: 'معلق', en: 'Pending' },
  paid: { ar: 'مدفوع', en: 'Paid' },
  overdue: { ar: 'متأخر', en: 'Overdue' },
};

const DashboardInstallments = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['installment-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      if (!biz) return null;
      const { data } = await supabase.from('provider_installment_settings').select('*').eq('business_id', biz.id).maybeSingle();
      return { businessId: biz.id, settings: data };
    },
    enabled: !!user,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['installment-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: contracts } = await supabase.from('contracts').select('id, title_ar, title_en, contract_number').eq('provider_id', user.id);
      if (!contracts?.length) return [];
      const { data } = await supabase.from('installment_plans').select('*, installment_payments(*)').in('contract_id', contracts.map(c => c.id)).order('created_at', { ascending: false });
      return (data ?? []).map(plan => ({ ...plan, contract: contracts.find(c => c.id === plan.contract_id) }));
    },
    enabled: !!user,
  });

  const [settingsForm, setSettingsForm] = useState({
    is_enabled: false, min_amount: 1000, max_installments: 12, down_payment_percentage: 25, description_ar: '', description_en: '',
  });

  React.useEffect(() => {
    if (settings?.settings) {
      const s = settings.settings;
      setSettingsForm({
        is_enabled: s.is_enabled, min_amount: Number(s.min_amount) || 1000, max_installments: s.max_installments || 12,
        down_payment_percentage: Number(s.down_payment_percentage) || 25, description_ar: s.description_ar || '', description_en: s.description_en || '',
      });
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.businessId) throw new Error('No business found');
      const payload = { business_id: settings.businessId, ...settingsForm };
      if (settings.settings) {
        const { error } = await supabase.from('provider_installment_settings').update(payload).eq('id', settings.settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('provider_installment_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['installment-settings'] }); toast.success(isRTL ? 'تم حفظ الإعدادات' : 'Settings saved'); },
    onError: (err: any) => toast.error(err.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from('installment_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['installment-plans'] }); toast.success(isRTL ? 'تم تسجيل الدفع' : 'Payment recorded'); },
  });

  if (loadingSettings) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-8">
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl">{isRTL ? 'نظام التقسيط' : 'Installment System'}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{isRTL ? 'إدارة خطط التقسيط وإعداداتها' : 'Manage installment plans and settings'}</p>
        </div>

        {/* Settings */}
        <Card className="border-border/50">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              {isRTL ? 'إعدادات التقسيط' : 'Installment Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm sm:text-base font-medium">{isRTL ? 'تفعيل خدمة التقسيط' : 'Enable Installments'}</Label>
                <p className="text-[10px] sm:text-sm text-muted-foreground">{isRTL ? 'السماح للعملاء بطلب تقسيط المبالغ' : 'Allow clients to request payment installments'}</p>
              </div>
              <Switch checked={settingsForm.is_enabled} onCheckedChange={(v) => setSettingsForm({ ...settingsForm, is_enabled: v })} />
            </div>

            {settingsForm.is_enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'الحد الأدنى للمبلغ (ر.س)' : 'Min Amount (SAR)'}</Label>
                    <Input type="number" value={settingsForm.min_amount} onChange={(e) => setSettingsForm({ ...settingsForm, min_amount: Number(e.target.value) })} dir="ltr" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'أقصى عدد أقساط' : 'Max Installments'}</Label>
                    <Input type="number" value={settingsForm.max_installments} onChange={(e) => setSettingsForm({ ...settingsForm, max_installments: Number(e.target.value) })} dir="ltr" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'نسبة الدفعة الأولى %' : 'Down Payment %'}</Label>
                    <div className="flex items-center gap-3">
                      <Slider value={[settingsForm.down_payment_percentage]} onValueChange={(v) => setSettingsForm({ ...settingsForm, down_payment_percentage: v[0] })} max={50} min={0} step={5} className="flex-1" />
                      <span className="text-xs sm:text-sm font-mono w-10 text-end">{settingsForm.down_payment_percentage}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'وصف التقسيط (عربي)' : 'Description (Arabic)'}</Label>
                    <Textarea value={settingsForm.description_ar} onChange={(e) => setSettingsForm({ ...settingsForm, description_ar: e.target.value })} rows={2} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'وصف التقسيط (إنجليزي)' : 'Description (English)'}</Label>
                    <Textarea value={settingsForm.description_en} onChange={(e) => setSettingsForm({ ...settingsForm, description_en: e.target.value })} rows={2} dir="ltr" className="text-sm" />
                  </div>
                </div>
              </>
            )}

            <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} variant="hero" size="sm" className="text-xs sm:text-sm">
              {saveSettingsMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الإعدادات' : 'Save Settings')}
            </Button>
          </CardContent>
        </Card>

        {/* Plans */}
        <div>
          <h2 className="font-heading font-bold text-lg sm:text-xl mb-3 sm:mb-4">{isRTL ? 'خطط التقسيط' : 'Installment Plans'}</h2>

          {plans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-10 sm:py-12 text-muted-foreground">
                <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-40" />
                <p className="text-base sm:text-lg font-medium">{isRTL ? 'لا توجد خطط تقسيط' : 'No installment plans'}</p>
                <p className="text-xs sm:text-sm">{isRTL ? 'ستظهر خطط التقسيط هنا عند إنشائها من العقود' : 'Plans will appear here when created from contracts'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {plans.map((plan: any) => {
                const payments = plan.installment_payments || [];
                const paidCount = payments.filter((p: any) => p.status === 'paid').length;
                const progress = payments.length > 0 ? (paidCount / payments.length) * 100 : 0;

                return (
                  <Card key={plan.id} className="border-border/50">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">
                            {plan.contract ? (isRTL ? plan.contract.title_ar : (plan.contract.title_en || plan.contract.title_ar)) : ''}
                          </h3>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">
                            {plan.contract?.contract_number} • {Number(plan.total_amount).toLocaleString()} {plan.currency_code}
                          </p>
                        </div>
                        <Badge className={`${statusColors[plan.status] || ''} text-[10px] sm:text-xs shrink-0 self-start sm:self-auto`}>
                          {statusLabels[plan.status]?.[isRTL ? 'ar' : 'en'] || plan.status}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="mb-3 sm:mb-4">
                        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mb-1">
                          <span>{paidCount}/{payments.length} {isRTL ? 'قسط' : 'paid'}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      {/* Payments */}
                      <div className="space-y-1.5 sm:space-y-2">
                        {payments
                          .sort((a: any, b: any) => a.installment_number - b.installment_number)
                          .map((payment: any) => (
                          <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50 dark:bg-muted/30 text-xs sm:text-sm gap-2">
                            <div className="flex items-center gap-2">
                              {payment.status === 'paid' ? (
                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 shrink-0" />
                              ) : payment.status === 'overdue' ? (
                                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 dark:text-red-400 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-xs sm:text-sm">{isRTL ? `القسط ${payment.installment_number}` : `#${payment.installment_number}`}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap ps-6 sm:ps-0">
                              <span className="font-mono text-xs sm:text-sm">{Number(payment.amount).toLocaleString()} {plan.currency_code}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">{new Date(payment.due_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                              {payment.status === 'pending' && (
                                <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs px-2 sm:px-3" onClick={() => markPaidMutation.mutate(payment.id)} disabled={markPaidMutation.isPending}>
                                  {isRTL ? 'تسجيل دفع' : 'Mark Paid'}
                                </Button>
                              )}
                              <Badge className={`text-[9px] sm:text-xs ${statusColors[payment.status] || ''}`}>
                                {statusLabels[payment.status]?.[isRTL ? 'ar' : 'en'] || payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardInstallments;
