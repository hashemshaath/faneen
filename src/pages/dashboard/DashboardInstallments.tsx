import React, { useMemo, useState, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, DollarSign,
  TrendingUp, Calendar, FileText, Search, Filter, ChevronDown,
  ChevronUp, Plus, Trash2, Save, X, Edit2, Eye, Percent,
  Globe, Building2, Shield, Loader2, BarChart3, ArrowDownRight,
  ExternalLink, Info, ShieldCheck, Users, Banknote, Star,
  Calculator, Download, CalendarDays, Bell, PieChart,
  ArrowUpRight, Wallet, Receipt, CircleDollarSign, Sparkles,
  TrendingDown, Target, Zap, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

/* ── shared ────────────────────────────────────── */
const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  cancelled: 'bg-muted text-muted-foreground',
  defaulted: 'bg-destructive/10 text-destructive',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  overdue: 'bg-destructive/10 text-destructive',
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

const fmtDate = (d: string | null, lang: string) =>
  d ? new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const fmtNum = (n: number) => Number(n).toLocaleString();

/* ── Donut Chart ────────────────────────────────── */
const PaymentDonut = React.memo(({ stats, isRTL }: { stats: { total: number; paid: number; overdue: number; upcoming: number; paidAmount: number; overdueAmount: number; totalAmount: number; pendingAmount: number }; isRTL: boolean }) => {
  const data = [
    { name: isRTL ? 'مدفوع' : 'Paid', value: stats.paidAmount, color: '#10b981' },
    { name: isRTL ? 'معلق' : 'Pending', value: stats.pendingAmount, color: '#f59e0b' },
    { name: isRTL ? 'متأخر' : 'Overdue', value: stats.overdueAmount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (data.length === 0) return null;
  const pct = stats.totalAmount > 0 ? Math.round((stats.paidAmount / stats.totalAmount) * 100) : 0;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <ResponsiveContainer>
        <RechartsPie>
          <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => fmtNum(v) + ' SAR'} />
        </RechartsPie>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tech-content text-foreground">{pct}%</span>
        <span className="text-[8px] text-muted-foreground">{isRTL ? 'مسدد' : 'Paid'}</span>
      </div>
    </div>
  );
});
PaymentDonut.displayName = 'PaymentDonut';

/* ── Mini Progress Ring ──────────────────────────── */
const MiniRing = React.memo(({ pct, size = 32, stroke = 3 }: { pct: number; size?: number; stroke?: number }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 100 ? '#10b981' : 'hsl(var(--accent))'} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
});
MiniRing.displayName = 'MiniRing';

/* ── Installment Calculator ────────────────────── */
const InstallmentCalc = React.memo(({ isRTL }: { isRTL: boolean }) => {
  const [total, setTotal] = useState(10000);
  const [down, setDown] = useState(2000);
  const [months, setMonths] = useState(6);
  const remaining = Math.max(0, total - down);
  const perMonth = months > 0 ? remaining / months : 0;

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.03] to-transparent">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-accent" />
          </div>
          {isRTL ? 'حاسبة الأقساط' : 'Installment Calculator'}
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-[10px]">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}</Label>
            <Input type="number" value={total} onChange={e => setTotal(Number(e.target.value))} className="h-8 text-xs mt-1 tech-content" />
          </div>
          <div>
            <Label className="text-[10px]">{isRTL ? 'الدفعة الأولى' : 'Down Payment'}</Label>
            <Input type="number" value={down} onChange={e => setDown(Number(e.target.value))} className="h-8 text-xs mt-1 tech-content" />
          </div>
          <div>
            <Label className="text-[10px]">{isRTL ? 'عدد الأشهر' : 'Months'}</Label>
            <Input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} className="h-8 text-xs mt-1 tech-content" min={1} max={60} />
          </div>
        </div>

        {/* Result */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-accent/10 text-center border border-accent/10">
            <p className="text-lg font-bold tech-content text-accent">{fmtNum(remaining)}</p>
            <p className="text-[9px] text-muted-foreground">{isRTL ? 'المبلغ المتبقي' : 'Remaining'} SAR</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-center border border-primary/10">
            <p className="text-lg font-bold tech-content text-primary">{fmtNum(Math.ceil(perMonth))}</p>
            <p className="text-[9px] text-muted-foreground">{isRTL ? 'القسط الشهري' : 'Monthly'} SAR</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center border border-border/20">
            <p className="text-lg font-bold tech-content">{down > 0 ? Math.round((down / total) * 100) : 0}%</p>
            <p className="text-[9px] text-muted-foreground">{isRTL ? 'نسبة الدفعة الأولى' : 'Down %'}</p>
          </div>
        </div>

        {/* Schedule preview */}
        {months > 0 && months <= 24 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{isRTL ? 'جدول الأقساط التقديري' : 'Estimated Schedule'}</p>
            {Array.from({ length: months }, (_, i) => {
              const dueDate = new Date();
              dueDate.setMonth(dueDate.getMonth() + i + 1);
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-[10px] hover:bg-muted/40 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-[8px]">{i + 1}</span>
                    {dueDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="font-bold tech-content">{fmtNum(Math.ceil(perMonth))} SAR</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
InstallmentCalc.displayName = 'InstallmentCalc';

/* ── Payment Timeline ──────────────────────────── */
const PaymentTimeline = React.memo(({ plans, isRTL, language }: { plans: Array<any>; isRTL: boolean; language: string }) => {
  const upcoming = useMemo(() => {
    const all = [] as Array<any>;
    plans.forEach((plan: any) => {
      (plan.installment_payments || []).forEach((p: any) => {
        if (p.status === 'pending' || p.status === 'overdue') {
          all.push({ ...p, contract: plan.contract, planId: plan.id, currency: plan.currency_code });
        }
      });
    });
    return all.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 10);
  }, [plans]);

  if (upcoming.length === 0) return null;

  const now = new Date();

  return (
    <Card className="border-border/40 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-accent via-primary to-accent/50" />
      <CardContent className="p-4 sm:p-5">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-accent" />
          </div>
          {isRTL ? 'المدفوعات القادمة' : 'Upcoming Payments'}
          <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{upcoming.length}</Badge>
        </h3>

        <div className="relative">
          {/* Timeline line */}
          <div className={cn("absolute top-0 bottom-0 w-px bg-gradient-to-b from-accent/40 via-border to-transparent", isRTL ? "right-3" : "left-3")} />

          <div className="space-y-2.5">
            {upcoming.map((p, i) => {
              const due = new Date(p.due_date);
              const isOverdue = p.status === 'overdue' || due < now;
              const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div key={p.id} className={cn("relative flex items-start gap-3", isRTL ? "pr-8" : "pl-8")}>
                  {/* Dot */}
                  <div className={cn(
                    "absolute top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background z-10 transition-all",
                    isOverdue ? "bg-destructive ring-2 ring-destructive/20" : daysLeft <= 7 ? "bg-amber-500 ring-2 ring-amber-500/20" : "bg-accent",
                    isRTL ? "right-[7px]" : "left-[7px]"
                  )} />

                  <div className={cn(
                    "flex-1 p-3 rounded-xl text-xs transition-all hover:shadow-sm",
                    isOverdue ? "bg-destructive/5 border border-destructive/20 hover:bg-destructive/10" : "bg-muted/30 border border-border/20 hover:bg-muted/50"
                  )}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold truncate">
                        {p.contract ? (isRTL ? p.contract.title_ar : (p.contract.title_en || p.contract.title_ar)) : ''}
                      </span>
                      <span className="font-bold tech-content text-accent shrink-0">{fmtNum(Number(p.amount))} {p.currency}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {fmtDate(p.due_date, language)}
                      </span>
                      <span>{isRTL ? `القسط ${p.installment_number}` : `#${p.installment_number}`}</span>
                      {isOverdue ? (
                        <Badge className="bg-destructive/10 text-destructive text-[8px] px-1.5 py-0 h-[14px] gap-0.5 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {isRTL ? 'متأخر' : 'Overdue'}
                        </Badge>
                      ) : daysLeft <= 7 ? (
                        <Badge className="bg-amber-500/10 text-amber-600 text-[8px] px-1.5 py-0 h-[14px] gap-0.5">
                          <Bell className="w-2.5 h-2.5" />
                          {isRTL ? `${daysLeft} يوم` : `${daysLeft}d left`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/60">{isRTL ? `${daysLeft} يوم` : `${daysLeft}d`}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
PaymentTimeline.displayName = 'PaymentTimeline';

/* ── Payment Item ── */
const PaymentItem = React.memo(({ payment, plan, isProvider, isRTL, language, onMarkPaid, isPending }: { payment: any; plan: any; isProvider: boolean; isRTL: boolean; language: string; onMarkPaid: (id: string) => void; isPending: boolean }) => {
  const isPaid = payment.status === 'paid';
  const isOverdue = payment.status === 'overdue';

  return (
    <div className={cn(
      'flex items-center justify-between p-2.5 rounded-lg text-xs gap-2 transition-all group/item',
      isPaid ? 'bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20' :
      isOverdue ? 'bg-destructive/5 hover:bg-destructive/10' : 'bg-muted/30 hover:bg-muted/50'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {isPaid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> :
         isOverdue ? <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 animate-pulse" /> :
         <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="font-medium">{isRTL ? `القسط ${payment.installment_number}` : `#${payment.installment_number}`}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <span className="tech-content font-semibold">{fmtNum(Number(payment.amount))} {plan.currency_code}</span>
        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
          <Calendar className="w-2.5 h-2.5" />{fmtDate(payment.due_date, language)}
        </span>
        {payment.paid_at && (
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
            <CheckCircle className="w-2.5 h-2.5" />{fmtDate(payment.paid_at, language)}
          </span>
        )}
        <Badge className={`text-[8px] px-1.5 py-0 h-[14px] ${statusColors[payment.status] || ''}`}>
          {statusLabels[payment.status]?.[isRTL ? 'ar' : 'en'] || payment.status}
        </Badge>
        {payment.status === 'pending' && isProvider && (
          <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={() => onMarkPaid(payment.id)} disabled={isPending}>
            <CheckCircle className="w-2.5 h-2.5" />{isRTL ? 'تسجيل' : 'Paid'}
          </Button>
        )}
      </div>
    </div>
  );
});
PaymentItem.displayName = 'PaymentItem';

/* ── Plan Card ── */
const PlanCard = React.memo(({ plan, user, isRTL, language, onMarkPaid, isPending }: { plan: any; user: { id: string } | null; isRTL: boolean; language: string; onMarkPaid: (id: string) => void; isPending: boolean }): React.ReactElement | null => {
  const [expanded, setExpanded] = useState(false);
  const payments = useMemo(() =>
    (plan.installment_payments || []).sort((a, b) => a.installment_number - b.installment_number), [plan.installment_payments]);
  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;
  const progress = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0;
  const paidAmount = payments.filter((p) => p.status === 'paid').reduce((s: number, p) => s + Number(p.amount), 0);
  const contract = plan.contract;
  const isUserProvider = user?.id === contract?.provider_id;
  const nextPayment = payments.find((p) => p.status === 'pending' || p.status === 'overdue');

  return (
    <Card className={cn(
      "border-border/40 overflow-hidden group hover:shadow-lg transition-all duration-300",
      overdueCount > 0 && "border-l-2 border-l-destructive",
      plan.status === 'completed' && "border-l-2 border-l-emerald-500"
    )}>
      <CardContent className="p-0">
        {/* Color accent bar */}
        <div className={cn(
          "h-0.5 w-full",
          overdueCount > 0 ? "bg-gradient-to-r from-destructive to-destructive/50" :
          plan.status === 'completed' ? "bg-gradient-to-r from-emerald-500 to-emerald-500/50" :
          "bg-gradient-to-r from-accent to-accent/30"
        )} />

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <h3 className="font-heading font-bold text-xs sm:text-sm truncate">
                  {contract ? (isRTL ? contract.title_ar : (contract.title_en || contract.title_ar)) : ''}
                </h3>
                <Badge className={`${statusColors[plan.status] || ''} text-[8px] px-1.5 py-0 h-[14px]`}>
                  {statusLabels[plan.status]?.[isRTL ? 'ar' : 'en'] || plan.status}
                </Badge>
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-[14px] gap-0.5">
                  {isUserProvider ? <><Zap className="w-2 h-2" />{isRTL ? 'مزود' : 'Provider'}</> : <><Users className="w-2 h-2" />{isRTL ? 'عميل' : 'Client'}</>}
                </Badge>
                {overdueCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive text-[8px] px-1.5 py-0 h-[14px] gap-0.5 animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {overdueCount} {isRTL ? 'متأخر' : 'overdue'}
                  </Badge>
                )}
              </div>
              <p className="tech-content text-[9px] text-muted-foreground">{contract?.contract_number} • {plan.ref_id}</p>
            </div>

            {/* Mini ring + amount */}
            <div className="flex items-center gap-2 shrink-0">
              <MiniRing pct={progress} size={36} stroke={3} />
              <div className="text-end">
                <p className="tech-content font-bold text-sm">{fmtNum(Number(plan.total_amount))} <span className="text-[10px] font-normal text-muted-foreground">{plan.currency_code}</span></p>
                <p className="text-[9px] text-muted-foreground">{isRTL ? 'مدفوع:' : 'Paid:'} <span className="tech-content text-emerald-600 dark:text-emerald-400">{fmtNum(paidAmount)}</span></p>
              </div>
            </div>
          </div>

          {/* Next payment highlight */}
          {nextPayment && (
            <div className={cn(
              "p-2 rounded-lg mb-3 flex items-center justify-between text-[10px]",
              nextPayment.status === 'overdue' ? "bg-destructive/5 border border-destructive/15" : "bg-accent/5 border border-accent/15"
            )}>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="w-3 h-3" />
                {isRTL ? 'القسط التالي:' : 'Next:'} <span className="font-medium text-foreground">{isRTL ? `القسط ${nextPayment.installment_number}` : `#${nextPayment.installment_number}`}</span>
                <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{fmtDate(nextPayment.due_date, language)}</span>
              </span>
              <span className="tech-content font-bold text-accent">{fmtNum(Number(nextPayment.amount))} {plan.currency_code}</span>
            </div>
          )}

          {/* Progress with mini stats */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="tech-content text-[10px] font-bold text-accent">{progress}%</span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
              <span>{isRTL ? 'الدفعة الأولى:' : 'Down:'} <span className="tech-content font-medium">{fmtNum(Number(plan.down_payment))}</span></span>
              <span>{isRTL ? 'القسط:' : 'Per:'} <span className="tech-content font-medium">{fmtNum(Number(plan.installment_amount))}</span></span>
              <span className="flex items-center gap-0.5">
                <Receipt className="w-2.5 h-2.5" />
                {paidCount}/{payments.length}
              </span>
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="space-y-1 mt-3 animate-in slide-in-from-top-2 duration-200">
              {payments.map((payment) => (
                <PaymentItem key={payment.id} payment={payment} plan={plan} isProvider={isUserProvider} isRTL={isRTL} language={language} onMarkPaid={onMarkPaid} isPending={isPending} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
PlanCard.displayName = 'PlanCard';

/* ── BNPL Provider Showcase Card ── */
const BnplShowcaseCard = React.memo(({ provider, isRTL }: { provider: any; isRTL: boolean }) => {
  const [showDetails, setShowDetails] = useState(false);
  const name = isRTL ? provider.name_ar : provider.name_en;
  const desc = isRTL ? provider.description_ar : provider.description_en;

  return (
    <Card className="border-border/40 overflow-hidden hover:shadow-xl transition-all duration-300 group relative">
      <CardContent className="p-0">
        {/* Gradient header with logo */}
        <div className="relative h-28 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${provider.color_hex}18, ${provider.color_hex}08)` }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(${provider.color_hex} 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg, ${provider.color_hex}, ${provider.color_hex}66)` }} />
          
          <div className="relative w-20 h-20 rounded-2xl border-2 bg-background shadow-lg flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300"
            style={{ borderColor: provider.color_hex + '30' }}>
            {provider.logo_url ? (
              <img src={provider.logo_url} alt={name} className="w-14 h-14 object-contain" loading="lazy" />
            ) : (
              <span className="text-3xl font-bold" style={{ color: provider.color_hex }}>{(provider.name_en || 'B').charAt(0)}</span>
            )}
          </div>

          {/* Interest badge floating */}
          <div className="absolute top-3 end-3">
            {provider.interest_rate === 0 ? (
              <Badge className="bg-emerald-500/90 text-white text-[10px] px-2.5 py-1 gap-1 shadow-sm">
                <CheckCircle className="w-3 h-3" />
                {isRTL ? 'بدون فوائد' : '0% Interest'}
              </Badge>
            ) : (
              <Badge className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] px-2.5 py-1 border shadow-sm">{provider.interest_rate}% {isRTL ? 'فائدة' : 'Interest'}</Badge>
            )}
          </div>
        </div>
        
        <div className="p-4 sm:p-5">
          <div className="text-center mb-4 -mt-1">
            <h3 className="font-heading font-bold text-lg">{name}</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                <ShieldCheck className="w-3 h-3" />
                {isRTL ? 'شريك معتمد' : 'Authorized Partner'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-4">
            <div className="p-3 rounded-xl text-center border border-border/20 hover:border-border/40 transition-colors" style={{ background: `${provider.color_hex}06` }}>
              <p className="text-base sm:text-lg font-bold text-foreground tech-content">{provider.installments_count}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{isRTL ? 'عدد الأقساط' : 'Installments'}</p>
            </div>
            <div className="p-3 rounded-xl text-center border border-border/20 hover:border-border/40 transition-colors" style={{ background: `${provider.color_hex}06` }}>
              <p className="text-base sm:text-lg font-bold text-foreground tech-content">{fmtNum(Number(provider.min_amount))}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{isRTL ? 'الحد الأدنى' : 'Min'} {provider.currency_code}</p>
            </div>
            <div className="p-3 rounded-xl text-center border border-border/20 hover:border-border/40 transition-colors" style={{ background: `${provider.color_hex}06` }}>
              <p className="text-base sm:text-lg font-bold text-foreground tech-content">{fmtNum(Number(provider.max_amount))}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{isRTL ? 'الحد الأقصى' : 'Max'} {provider.currency_code}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-3">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                {isRTL ? 'يخضع للموافقة الائتمانية والسجل الائتماني' : 'Subject to credit approval'}
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isRTL ? 'تفاصيل إضافية' : 'More Details'}
          </Button>

          {showDetails && (
            <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              {desc && <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>}
              {provider.website_url && (
                <a href={provider.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: `${provider.color_hex}10`, color: provider.color_hex }}>
                  <Globe className="w-4 h-4" />
                  {isRTL ? 'زيارة الموقع الرسمي' : 'Visit Official Website'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
BnplShowcaseCard.displayName = 'BnplShowcaseCard';

/* ── Admin BNPL Provider Form ── */
const AdminBnplForm = React.memo(({ provider, isRTL, language, onSave, onCancel, saving }: { provider: any | null; isRTL: boolean; language: string; onSave: (form: any, id?: string) => void; onCancel: () => void; saving: boolean }) => {
  const isNew = !provider;
  const [form, setForm] = useState({
    name_ar: provider?.name_ar || '',
    name_en: provider?.name_en || '',
    slug: provider?.slug || '',
    description_ar: provider?.description_ar || '',
    description_en: provider?.description_en || '',
    logo_url: provider?.logo_url || '',
    color_hex: provider?.color_hex || '#000000',
    website_url: provider?.website_url || '',
    installments_count: provider?.installments_count || 4,
    interest_rate: provider?.interest_rate || 0,
    min_amount: provider?.min_amount || 0,
    max_amount: provider?.max_amount || 5000,
    currency_code: provider?.currency_code || 'SAR',
    is_active: provider?.is_active ?? true,
    sort_order: provider?.sort_order || 0,
  });
  const set = (k: string, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/[0.03] to-transparent">
      <CardContent className="p-3 sm:p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-heading font-bold text-sm flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5 text-accent" />
            {isNew ? (isRTL ? 'إضافة شركة تقسيط جديدة' : 'Add New BNPL Provider') : (isRTL ? 'تعديل' : 'Edit') + ' ' + (isRTL ? form.name_ar : form.name_en)}
          </h4>
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px]">{isRTL ? 'مفعّل' : 'Active'}</Label>
            <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">{isRTL ? 'شعار الشركة' : 'Provider Logo'}</Label>
          <div className="flex items-start gap-3">
            <div className="w-20">
              <ImageUpload bucket="business-assets" value={form.logo_url} onChange={url => set('logo_url', url)} onRemove={() => set('logo_url', '')} folder="bnpl-logos" aspectRatio="square" placeholder={isRTL ? 'رفع الشعار' : 'Upload logo'} className="w-20 h-20" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-[10px]">{isRTL ? 'لون العلامة' : 'Brand Color'}</Label>
                <div className="flex items-center gap-2 mt-0.5">
                  <input type="color" value={form.color_hex} onChange={e => set('color_hex', e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
                  <Input value={form.color_hex} onChange={e => set('color_hex', e.target.value)} className="h-7 text-xs w-24 tech-content" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-[10px]">{isRTL ? 'الاسم بالعربي *' : 'Name (Arabic) *'}</Label><Input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} className="h-8 text-xs mt-0.5" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'الاسم بالإنجليزي *' : 'Name (English) *'}</Label><Input value={form.name_en} onChange={e => set('name_en', e.target.value)} className="h-8 text-xs mt-0.5" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'المعرف (slug) *' : 'Slug *'}</Label><Input value={form.slug} onChange={e => set('slug', e.target.value)} className="h-8 text-xs mt-0.5 tech-content" placeholder="tabby" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label><Input value={form.website_url} onChange={e => set('website_url', e.target.value)} className="h-8 text-xs mt-0.5 tech-content" placeholder="https://..." /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-[10px]">{isRTL ? 'الوصف بالعربي' : 'Description (Arabic)'}</Label><Textarea value={form.description_ar} onChange={e => set('description_ar', e.target.value)} className="text-xs mt-0.5 min-h-[60px]" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'الوصف بالإنجليزي' : 'Description (English)'}</Label><Textarea value={form.description_en} onChange={e => set('description_en', e.target.value)} className="text-xs mt-0.5 min-h-[60px]" /></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-[10px]">{isRTL ? 'عدد الأقساط' : 'Installments'}</Label><Input type="number" value={form.installments_count} onChange={e => set('installments_count', Number(e.target.value))} className="h-8 text-xs mt-0.5 tech-content" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'نسبة الفائدة %' : 'Interest %'}</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={e => set('interest_rate', Number(e.target.value))} className="h-8 text-xs mt-0.5 tech-content" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'الحد الأدنى' : 'Min Amount'}</Label><Input type="number" value={form.min_amount} onChange={e => set('min_amount', Number(e.target.value))} className="h-8 text-xs mt-0.5 tech-content" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'الحد الأقصى' : 'Max Amount'}</Label><Input type="number" value={form.max_amount} onChange={e => set('max_amount', Number(e.target.value))} className="h-8 text-xs mt-0.5 tech-content" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-[10px]">{isRTL ? 'رمز العملة' : 'Currency'}</Label><Input value={form.currency_code} onChange={e => set('currency_code', e.target.value)} className="h-8 text-xs mt-0.5 tech-content" /></div>
          <div><Label className="text-[10px]">{isRTL ? 'ترتيب العرض' : 'Sort Order'}</Label><Input type="number" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))} className="h-8 text-xs mt-0.5 tech-content" /></div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => onSave(form, provider?.id)} disabled={saving || !form.name_ar || !form.name_en || !form.slug}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />{isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
AdminBnplForm.displayName = 'AdminBnplForm';

/* ══════════════ MAIN ══════════════ */
const DashboardInstallments = () => {
  const { isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('plans');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [editingProvider, setEditingProvider] = useState<any | null>(null);
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  const isProvider = profile?.account_type === 'provider';

  const { data: hasAdminRole } = useQuery({
    queryKey: ['user-admin-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id).in('role', ['admin', 'super_admin']);
      return (data?.length || 0) > 0;
    },
    enabled: !!user,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['installment-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: contracts } = await supabase.from('contracts')
        .select('id, title_ar, title_en, contract_number, client_id, provider_id')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);
      if (!contracts?.length) return [];
      const { data } = await supabase.from('installment_plans')
        .select('*, installment_payments(*)')
        .in('contract_id', contracts.map(c => c.id))
        .order('created_at', { ascending: false });
      return (data ?? []).map(plan => ({ ...plan, contract: contracts.find(c => c.id === plan.contract_id) }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: allProviders = [], isLoading: loadingProviders } = useQuery({
    queryKey: ['bnpl-providers-all'],
    queryFn: async () => {
      const { data } = await supabase.from('bnpl_providers').select('*').order('sort_order');
      return data ?? [];
    },
  });

  const activeProviders = useMemo(() => allProviders.filter((p) => p.is_active), [allProviders]);

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (language === 'ar' ? (p.contract?.title_ar ?? '') : (p.contract?.title_en || p.contract?.title_ar || '')).toLowerCase();
        if (!title.includes(q) && !(p.ref_id || '').toLowerCase().includes(q) && !(p.contract?.contract_number || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [plans, statusFilter, searchQuery, language]);

  const stats = useMemo(() => {
    const totalAmount = plans.reduce((s: number, p) => s + Number(p.total_amount), 0);
    const paidAmount = plans.reduce((s: number, p) =>
      s + (p.installment_payments || []).filter((pay) => pay.status === 'paid').reduce((sum: number, pay) => sum + Number(pay.amount), 0), 0);
    const pendingAmount = plans.reduce((s: number, p) =>
      s + (p.installment_payments || []).filter((pay) => pay.status === 'pending').reduce((sum: number, pay) => sum + Number(pay.amount), 0), 0);
    const overdueAmount = plans.reduce((s: number, p) =>
      s + (p.installment_payments || []).filter((pay) => pay.status === 'overdue').reduce((sum: number, pay) => sum + Number(pay.amount), 0), 0);
    const pendingPayments = plans.reduce((s: number, p) =>
      s + (p.installment_payments || []).filter((pay) => pay.status === 'pending').length, 0);
    const overduePayments = plans.reduce((s: number, p) =>
      s + (p.installment_payments || []).filter((pay) => pay.status === 'overdue').length, 0);
    const totalPayments = plans.reduce((s: number, p) => s + (p.installment_payments || []).length, 0);
    const paidPayments = plans.reduce((s: number, p) =>
      s + (p.installment_payments || []).filter((pay) => pay.status === 'paid').length, 0);
    return { totalAmount, paidAmount, pendingAmount, overdueAmount, pendingPayments, overduePayments, totalPayments, paidPayments };
  }, [plans]);

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from('installment_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-plans'] });
      toast.success(isRTL ? 'تم تسجيل الدفع' : 'Payment recorded');
    },
  });

  const saveProviderMutation = useMutation({
    mutationFn: async ({ form, id }: { form: any; id?: string }) => {
      if (id) {
        const { error } = await supabase.from('bnpl_providers').update(form).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bnpl_providers').insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bnpl-providers-all'] });
      setEditingProvider(null);
      setShowNewProvider(false);
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bnpl_providers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bnpl-providers-all'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const handleSaveProvider = useCallback((form: any, id?: string) => {
    saveProviderMutation.mutate({ form, id });
  }, [saveProviderMutation]);
  const handleMarkPaid = useCallback((id: string) => markPaidMutation.mutate(id), [markPaidMutation]);

  /* ── Export CSV ── */
  const exportCSV = useCallback(() => {
    const rows: string[][] = [['Plan Ref', 'Contract', 'Total', 'Down Payment', 'Installment', 'Status', 'Payments Paid', 'Payments Total']];
    plans.forEach((p) => {
      const payments = p.installment_payments || [];
      rows.push([
        p.ref_id || '',
        p.contract?.contract_number || '',
        String(p.total_amount),
        String(p.down_payment),
        String(p.installment_amount),
        p.status,
        String(payments.filter((pay) => pay.status === 'paid').length),
        String(payments.length),
      ]);
    });
    const bom = '\uFEFF';
    const csv = bom + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `installments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير البيانات' : 'Data exported');
  }, [plans, isRTL]);

  const hasFilters = statusFilter !== 'all' || searchQuery.trim();

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* ── Glassmorphism Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-accent/5 via-background to-primary/5 p-4 sm:p-6">
          <div className="absolute -top-20 -end-20 w-60 h-60 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -start-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-sm">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
                  {isRTL ? 'الأقساط والتقسيط' : 'Installments & BNPL'}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {isRTL ? 'إدارة خطط التقسيط المباشر وشركات التقسيط المعتمدة' : 'Manage direct installment plans and authorized BNPL partners'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs backdrop-blur-sm bg-background/50" onClick={() => setShowCalc(!showCalc)}>
                <Calculator className="w-3.5 h-3.5" />
                {isRTL ? 'الحاسبة' : 'Calculator'}
              </Button>
              {plans.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs backdrop-blur-sm bg-background/50" onClick={exportCSV}>
                  <Download className="w-3.5 h-3.5" />
                  {isRTL ? 'تصدير' : 'Export'}
                </Button>
              )}
            </div>
          </div>

          {/* Quick stats in header */}
          {plans.length > 0 && (
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {[
                { icon: Activity, label: isRTL ? 'خطط التقسيط' : 'Total Plans', value: plans.length, color: 'text-primary' },
                { icon: CircleDollarSign, label: isRTL ? 'إجمالي المبالغ' : 'Total Amount', value: fmtNum(stats.totalAmount), sub: 'SAR', color: 'text-accent' },
                { icon: TrendingUp, label: isRTL ? 'المدفوع' : 'Paid', value: fmtNum(stats.paidAmount), sub: 'SAR', color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: TrendingDown, label: isRTL ? 'المتبقي' : 'Remaining', value: fmtNum(stats.totalAmount - stats.paidAmount), sub: 'SAR', color: 'text-amber-600 dark:text-amber-400' },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 hover:bg-background/80 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={cn("w-4 h-4", s.color)} />
                    <span className="text-[9px] text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold tech-content">{s.value}</span>
                    {s.sub && <span className="text-[9px] text-muted-foreground">{s.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculator */}
        {showCalc && <InstallmentCalc isRTL={isRTL} />}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto bg-muted/50 p-1">
            <TabsTrigger value="plans" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'خطط التقسيط' : 'Plans'}
              {plans.length > 0 && <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 ms-1">{plans.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5 text-xs">
              <CalendarDays className="w-3.5 h-3.5" />
              {isRTL ? 'الجدول الزمني' : 'Timeline'}
              {stats.pendingPayments > 0 && (
                <Badge className="bg-amber-500/10 text-amber-600 text-[8px] px-1.5 py-0 h-4 ms-1">{stats.pendingPayments}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bnpl" className="gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5" />
              {isRTL ? 'شركات التقسيط' : 'BNPL'}
              {activeProviders.length > 0 && <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 ms-1">{activeProviders.length}</Badge>}
            </TabsTrigger>
            {hasAdminRole && (
              <TabsTrigger value="admin" className="gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5" />
                {isRTL ? 'إدارة' : 'Admin'}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Plans Tab ── */}
          <TabsContent value="plans" className="space-y-4 mt-4">
            {/* Analytics row: donut + progress + breakdown */}
            {stats.totalAmount > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Donut */}
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <h4 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <PieChart className="w-3.5 h-3.5" />
                      {isRTL ? 'توزيع المدفوعات' : 'Payment Distribution'}
                    </h4>
                    <PaymentDonut stats={stats} isRTL={isRTL} />
                    <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isRTL ? 'مدفوع' : 'Paid'}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{isRTL ? 'معلق' : 'Pending'}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />{isRTL ? 'متأخر' : 'Overdue'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Overall progress */}
                <Card className="border-border/40 bg-card/50 lg:col-span-2">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? 'نسبة السداد الإجمالية' : 'Overall Payment Progress'}
                      </span>
                      <span className="tech-content text-sm font-bold text-accent">{Math.round((stats.paidAmount / stats.totalAmount) * 100)}%</span>
                    </div>
                    <Progress value={(stats.paidAmount / stats.totalAmount) * 100} className="h-3" />
                    
                    {/* Amount breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: isRTL ? 'إجمالي' : 'Total', value: fmtNum(stats.totalAmount), color: 'text-foreground', bg: 'bg-muted/40' },
                        { label: isRTL ? 'مسدد' : 'Paid', value: fmtNum(stats.paidAmount), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-950/10' },
                        { label: isRTL ? 'معلق' : 'Pending', value: fmtNum(stats.pendingAmount), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/10' },
                        { label: isRTL ? 'متأخر' : 'Overdue', value: fmtNum(stats.overdueAmount), color: 'text-destructive', bg: stats.overdueAmount > 0 ? 'bg-destructive/5' : 'bg-muted/30' },
                      ].map((item, i) => (
                        <div key={i} className={cn("p-2 rounded-lg text-center", item.bg)}>
                          <p className={cn("text-sm font-bold tech-content", item.color)}>{item.value}</p>
                          <p className="text-[8px] text-muted-foreground">{item.label} SAR</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-[9px] text-muted-foreground flex-wrap pt-1 border-t border-border/20">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        {isRTL ? 'الدفعات:' : 'Payments:'} <span className="tech-content font-medium text-foreground">{stats.paidPayments}/{stats.totalPayments}</span>
                      </span>
                      {stats.overduePayments > 0 && (
                        <Badge className="bg-destructive/10 text-destructive text-[8px] px-1.5 py-0 h-[14px] gap-0.5 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {stats.overduePayments} {isRTL ? 'متأخر' : 'overdue'}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={isRTL ? 'بحث بالعنوان أو الرقم...' : 'Search by title or number...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="ps-9 h-8 text-xs" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><Filter className="w-3 h-3 me-1.5" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                  {Object.entries(statusLabels).filter(([k]) => ['active', 'completed', 'cancelled', 'defaulted'].includes(k)).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{language === 'ar' ? label.ar : label.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>
                  <X className="w-3 h-3" />{isRTL ? 'مسح الفلاتر' : 'Clear'}
                </Button>
              )}
            </div>

            {/* Plans List */}
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-primary opacity-50" />
                  </div>
                  <p className="font-heading font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد خطط تقسيط' : 'No installment plans'}</p>
                  <p className="text-xs max-w-xs text-center">{hasFilters ? (isRTL ? 'جرّب تعديل الفلاتر' : 'Adjust filters') : (isRTL ? 'ستظهر هنا عند إنشائها من العقود' : 'Will appear when created from contracts')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.slice(0, visibleCount).map((plan) => (
                  <PlanCard key={plan.id} plan={plan} user={user} isRTL={isRTL} language={language} onMarkPaid={handleMarkPaid} isPending={markPaidMutation.isPending} />
                ))}
                {visibleCount < filtered.length && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setVisibleCount(c => c + 20)}>
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {isRTL ? `عرض المزيد (${filtered.length - visibleCount})` : `More (${filtered.length - visibleCount})`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Timeline Tab ── */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : plans.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center mb-4">
                    <CalendarDays className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-heading font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد مدفوعات قادمة' : 'No upcoming payments'}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overdue alert */}
                {stats.overduePayments > 0 && (
                  <Card className="border-destructive/30 bg-gradient-to-r from-destructive/5 to-transparent overflow-hidden">
                    <div className="h-0.5 bg-destructive/50" />
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-destructive">{stats.overduePayments} {isRTL ? 'أقساط متأخرة' : 'overdue payments'}</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'يرجى المبادرة بالسداد لتجنب أي رسوم إضافية' : 'Please settle to avoid additional charges'}</p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-lg font-bold tech-content text-destructive">{fmtNum(stats.overdueAmount)}</p>
                        <p className="text-[9px] text-muted-foreground">SAR</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <PaymentTimeline plans={plans} isRTL={isRTL} language={language} />

                {/* Recent paid */}
                {(() => {
                  const recentPaid = [] as Array<typeof providerContracts[number] & { _role: string }>;
                  plans.forEach((plan) => {
                    (plan.installment_payments || []).forEach((p) => {
                      if (p.status === 'paid' && p.paid_at) {
                        recentPaid.push({ ...p, contract: plan.contract, currency: plan.currency_code });
                      }
                    });
                  });
                  recentPaid.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
                  const recent5 = recentPaid.slice(0, 5);
                  if (recent5.length === 0) return null;

                  return (
                    <Card className="border-border/40 overflow-hidden">
                      <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-500/30" />
                      <CardContent className="p-4 sm:p-5">
                        <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          {isRTL ? 'آخر المدفوعات' : 'Recent Payments'}
                        </h3>
                        <div className="space-y-1.5">
                          {recent5.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10 text-xs hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate">{p.contract ? (isRTL ? p.contract.title_ar : (p.contract.title_en || p.contract.title_ar)) : ''}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-[10px]">
                                <span className="tech-content font-semibold text-emerald-600 dark:text-emerald-400">{fmtNum(Number(p.amount))} {p.currency}</span>
                                <span className="text-muted-foreground">{fmtDate(p.paid_at, language)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}
          </TabsContent>

          {/* ── BNPL Partners Showcase Tab ── */}
          <TabsContent value="bnpl" className="space-y-5 mt-4">
            <div className="text-center space-y-2 pb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-heading font-bold text-lg sm:text-xl">
                {isRTL ? 'شركات التقسيط المعتمدة' : 'Authorized BNPL Partners'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {isRTL
                  ? 'يمكنك تقديم خدماتك للعملاء من خلال شركات التقسيط المعتمدة التالية.'
                  : 'Offer your services through these authorized BNPL partners.'}
              </p>
            </div>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    {isRTL ? 'كيف يعمل التقسيط عبر الشركات المتخصصة؟' : 'How does BNPL work?'}
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                    {[
                      isRTL ? 'يختار العميل شركة التقسيط المناسبة عند الدفع' : 'Customer selects a BNPL provider at checkout',
                      isRTL ? 'تقوم الشركة بمراجعة السجل الائتماني للعميل والموافقة' : 'Provider reviews customer credit history and approves',
                      isRTL ? 'يتم تقسيم المبلغ على أقساط شهرية ميسرة' : 'Amount is split into convenient monthly installments',
                      isRTL ? 'يحصل المزود على المبلغ كاملاً من شركة التقسيط' : 'Provider receives the full amount from the BNPL company',
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[8px] shrink-0 mt-0.5">{isRTL ? ['١','٢','٣','٤'][i] : i + 1}</span>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {loadingProviders ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
              </div>
            ) : activeProviders.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد شركات تقسيط متاحة حالياً' : 'No BNPL providers available'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeProviders.map((provider) => (
                  <BnplShowcaseCard key={provider.id} provider={provider} isRTL={isRTL} />
                ))}
              </div>
            )}

            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                {isRTL
                  ? '⚠️ جميع عمليات التقسيط عبر الشركات المتخصصة تخضع لشروط وأحكام كل شركة على حدة. المنصة ليست طرفاً في عقد التقسيط.'
                  : '⚠️ All BNPL transactions are subject to each provider\'s terms and conditions. The platform is not a party to the installment agreement.'}
              </p>
            </div>
          </TabsContent>

          {/* ── Admin Tab ── */}
          {hasAdminRole && (
            <TabsContent value="admin" className="space-y-4 mt-4">
              {/* Admin header with stats */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-heading font-bold text-base flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-accent" />
                    {isRTL ? 'إدارة شركات التقسيط' : 'Manage BNPL Providers'}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isRTL 
                      ? `${allProviders.length} شركة مسجلة • ${activeProviders.length} مفعّلة` 
                      : `${allProviders.length} registered • ${activeProviders.length} active`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!showNewProvider && !editingProvider && (
                    <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewProvider(true)}>
                      <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة شركة' : 'Add Provider'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Admin quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-lg font-bold tech-content text-primary">{allProviders.length}</p>
                  <p className="text-[9px] text-muted-foreground">{isRTL ? 'إجمالي الشركات' : 'Total Providers'}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <p className="text-lg font-bold tech-content text-emerald-600 dark:text-emerald-400">{activeProviders.length}</p>
                  <p className="text-[9px] text-muted-foreground">{isRTL ? 'مفعّلة' : 'Active'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/20 text-center">
                  <p className="text-lg font-bold tech-content text-muted-foreground">{allProviders.length - activeProviders.length}</p>
                  <p className="text-[9px] text-muted-foreground">{isRTL ? 'معطّلة' : 'Inactive'}</p>
                </div>
              </div>

              {showNewProvider && (
                <AdminBnplForm isRTL={isRTL} language={language} onSave={handleSaveProvider} onCancel={() => setShowNewProvider(false)} saving={saveProviderMutation.isPending} />
              )}

              {editingProvider && !showNewProvider && (
                <AdminBnplForm provider={editingProvider} isRTL={isRTL} language={language} onSave={handleSaveProvider} onCancel={() => setEditingProvider(null)} saving={saveProviderMutation.isPending} />
              )}

              {loadingProviders ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
              ) : allProviders.length === 0 && !showNewProvider ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                      <Building2 className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد شركات تقسيط' : 'No BNPL providers'}</p>
                    <p className="text-xs text-muted-foreground mb-3">{isRTL ? 'أضف أول شركة تقسيط لبدء العمل' : 'Add your first BNPL provider to get started'}</p>
                    <Button size="sm" className="gap-1.5" onClick={() => setShowNewProvider(true)}>
                      <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة أول شركة' : 'Add First Provider'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {allProviders.map((p) => {
                    const name = isRTL ? p.name_ar : p.name_en;
                    const nameSecondary = isRTL ? p.name_en : p.name_ar;
                    const desc = isRTL ? p.description_ar : p.description_en;
                    const isEditing = editingProvider?.id === p.id;
                    
                    return (
                      <Card key={p.id} className={cn(
                        'border-border/40 transition-all overflow-hidden group/admin',
                        !p.is_active && 'opacity-70',
                        isEditing && 'ring-2 ring-accent/30'
                      )}>
                        <CardContent className="p-0">
                          {/* Color header bar */}
                          <div className="h-1.5 w-full relative" style={{ background: p.is_active ? `linear-gradient(90deg, ${p.color_hex}, ${p.color_hex}66)` : 'hsl(var(--muted))' }}>
                            {!p.is_active && <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,hsl(var(--muted-foreground)/0.1)_4px,hsl(var(--muted-foreground)/0.1)_8px)]" />}
                          </div>

                          <div className="p-3 sm:p-4">
                            {/* Top row: Logo + Name + Actions */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-14 h-14 rounded-xl border-2 border-border/20 flex items-center justify-center bg-background overflow-hidden shrink-0 shadow-sm"
                                style={{ borderColor: p.is_active ? p.color_hex + '30' : undefined }}>
                                {p.logo_url ? (
                                  <img src={p.logo_url} alt={name} className="w-10 h-10 object-contain" loading="lazy" />
                                ) : (
                                  <span className="text-xl font-bold" style={{ color: p.color_hex }}>{(p.name_en || 'B').charAt(0)}</span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-heading font-bold text-sm">{name}</h4>
                                  <Badge className={cn('text-[8px] px-1.5 py-0 h-[14px]', p.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>
                                    {p.is_active ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'معطّل' : 'Disabled')}
                                  </Badge>
                                </div>
                                {nameSecondary && <p className="text-[10px] text-muted-foreground">{nameSecondary}</p>}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 tech-content">{p.slug}</Badge>
                                  {p.interest_rate === 0 && (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[7px] px-1 py-0 h-3 gap-0.5">
                                      <CheckCircle className="w-2 h-2" />{isRTL ? 'بدون فوائد' : '0%'}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Switch 
                                  checked={p.is_active} 
                                  onCheckedChange={(checked) => {
                                    saveProviderMutation.mutate({ form: { is_active: checked }, id: p.id });
                                  }}
                                  className="scale-75"
                                />
                                <Button variant="ghost" size="icon" className="w-7 h-7 opacity-60 hover:opacity-100" onClick={() => { setEditingProvider(p); setShowNewProvider(false); }}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive opacity-60 hover:opacity-100" onClick={() => {
                                  if (confirm(isRTL ? 'هل أنت متأكد من حذف هذا المزود؟ لا يمكن التراجع.' : 'Are you sure you want to delete this provider? This cannot be undone.')) deleteProviderMutation.mutate(p.id);
                                }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Provider details grid */}
                            <div className="grid grid-cols-4 gap-1.5 mb-3">
                              <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-xs font-bold tech-content">{p.installments_count}</p>
                                <p className="text-[7px] text-muted-foreground">{isRTL ? 'أقساط' : 'Payments'}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-xs font-bold tech-content">{p.interest_rate}%</p>
                                <p className="text-[7px] text-muted-foreground">{isRTL ? 'فائدة' : 'Interest'}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-xs font-bold tech-content">{fmtNum(Number(p.min_amount))}</p>
                                <p className="text-[7px] text-muted-foreground">{isRTL ? 'الحد الأدنى' : 'Min'}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-xs font-bold tech-content">{fmtNum(Number(p.max_amount))}</p>
                                <p className="text-[7px] text-muted-foreground">{isRTL ? 'الحد الأقصى' : 'Max'}</p>
                              </div>
                            </div>

                            {/* Description if available */}
                            {desc && (
                              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">{desc}</p>
                            )}

                            {/* Footer info */}
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-2 border-t border-border/20">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />{p.currency_code}</span>
                                <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />{isRTL ? `ترتيب: ${p.sort_order}` : `Order: ${p.sort_order}`}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {p.website_url && (
                                  <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-0.5">
                                    <Globe className="w-2.5 h-2.5" />{isRTL ? 'الموقع' : 'Website'}
                                  </a>
                                )}
                                <span className="text-muted-foreground/50">{fmtDate(p.created_at, language)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardInstallments;
