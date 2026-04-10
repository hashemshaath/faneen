import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, DollarSign,
  TrendingUp, Calendar, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-muted text-muted-foreground',
  defaulted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
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
  const { isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const isProvider = profile?.account_type === 'provider';

  // Fetch contracts where user is client OR provider
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['installment-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, title_ar, title_en, contract_number, client_id, provider_id')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);
      if (!contracts?.length) return [];
      const { data } = await supabase
        .from('installment_plans')
        .select('*, installment_payments(*)')
        .in('contract_id', contracts.map(c => c.id))
        .order('created_at', { ascending: false });
      return (data ?? []).map(plan => ({
        ...plan,
        contract: contracts.find(c => c.id === plan.contract_id),
      }));
    },
    enabled: !!user,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('installment_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-plans'] });
      toast.success(isRTL ? 'تم تسجيل الدفع' : 'Payment recorded');
    },
  });

  // Stats
  const totalAmount = plans.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
  const paidAmount = plans.reduce((s: number, p: any) => {
    const payments = p.installment_payments || [];
    return s + payments.filter((pay: any) => pay.status === 'paid').reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);
  }, 0);
  const pendingPayments = plans.reduce((s: number, p: any) => {
    return s + (p.installment_payments || []).filter((pay: any) => pay.status === 'pending').length;
  }, 0);
  const overduePayments = plans.reduce((s: number, p: any) => {
    return s + (p.installment_payments || []).filter((pay: any) => pay.status === 'overdue').length;
  }, 0);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            {isRTL ? 'الأقساط والدفعات' : 'Installments & Payments'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isRTL ? 'تتبع جميع خطط التقسيط والدفعات المرتبطة بعقودك' : 'Track all installment plans and payments for your contracts'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: isRTL ? 'خطط التقسيط' : 'Plans', value: plans.length, color: 'text-foreground' },
            { icon: DollarSign, label: isRTL ? 'إجمالي المبالغ' : 'Total Amount', value: totalAmount.toLocaleString(), sub: 'SAR', color: 'text-accent' },
            { icon: TrendingUp, label: isRTL ? 'المدفوع' : 'Paid', value: paidAmount.toLocaleString(), sub: 'SAR', color: 'text-emerald-600 dark:text-emerald-400' },
            { icon: AlertTriangle, label: isRTL ? 'دفعات متأخرة' : 'Overdue', value: overduePayments, color: overduePayments > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground' },
          ].map((s, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                  <s.icon className="w-4 h-4 text-accent" />
                </div>
                <p className={`text-lg sm:text-xl font-bold ${s.color}`}>
                  <span className="tech-content">{s.value}</span>
                  {s.sub && <span className="tech-content text-xs font-normal text-muted-foreground ms-1">{s.sub}</span>}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plans List */}
        {plans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">{isRTL ? 'لا توجد خطط تقسيط' : 'No installment plans'}</p>
              <p className="text-sm">{isRTL ? 'ستظهر خطط التقسيط هنا عند إنشائها من العقود' : 'Plans will appear here when created from contracts'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan: any) => {
              const payments = (plan.installment_payments || []).sort((a: any, b: any) => a.installment_number - b.installment_number);
              const paidCount = payments.filter((p: any) => p.status === 'paid').length;
              const progress = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0;
              const contract = plan.contract;
              const isUserProvider = user?.id === contract?.provider_id;
              const roleLabel = isUserProvider ? (isRTL ? 'مزود' : 'Provider') : (isRTL ? 'عميل' : 'Client');

              return (
                <Card key={plan.id} className="border-border/50 overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    {/* Plan Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-bold text-sm sm:text-base truncate">
                            {contract ? (isRTL ? contract.title_ar : (contract.title_en || contract.title_ar)) : ''}
                          </h3>
                          <Badge className={`${statusColors[plan.status] || ''} text-[9px] sm:text-[10px]`}>
                            {statusLabels[plan.status]?.[isRTL ? 'ar' : 'en'] || plan.status}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">
                            {roleLabel}
                          </Badge>
                        </div>
                        <p className="tech-content text-[10px] text-muted-foreground">
                          {contract?.contract_number} • {plan.ref_id}
                        </p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="tech-content font-bold text-sm text-foreground">
                          {Number(plan.total_amount).toLocaleString()} {plan.currency_code}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isRTL ? 'دفعة أولى:' : 'Down:'} <span className="tech-content">{Number(plan.down_payment).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-4">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="tech-content text-[10px] font-semibold text-accent">{progress}%</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({paidCount}/{payments.length})
                      </span>
                    </div>

                    {/* Payments */}
                    <div className="space-y-1.5">
                      {payments.map((payment: any) => {
                        const isPaid = payment.status === 'paid';
                        const isOverdue = payment.status === 'overdue';
                        return (
                          <div
                            key={payment.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg text-xs gap-2 ${
                              isPaid ? 'bg-emerald-50/50 dark:bg-emerald-950/10' :
                              isOverdue ? 'bg-red-50/50 dark:bg-red-950/10' :
                              'bg-muted/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isPaid ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : isOverdue ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span>{isRTL ? `القسط ${payment.installment_number}` : `Installment #${payment.installment_number}`}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <span className="tech-content font-medium">{Number(payment.amount).toLocaleString()} {plan.currency_code}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(payment.due_date)}
                              </span>
                              <Badge className={`text-[9px] ${statusColors[payment.status] || ''}`}>
                                {statusLabels[payment.status]?.[isRTL ? 'ar' : 'en'] || payment.status}
                              </Badge>
                              {payment.status === 'pending' && isUserProvider && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => markPaidMutation.mutate(payment.id)}
                                  disabled={markPaidMutation.isPending}
                                >
                                  {isRTL ? 'تسجيل دفع' : 'Mark Paid'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardInstallments;
