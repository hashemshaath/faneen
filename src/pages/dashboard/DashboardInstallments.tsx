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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

/* ── Payment Item ── */
const PaymentItem = React.memo(({ payment, plan, isProvider, isRTL, language, onMarkPaid, isPending }: any) => {
  const isPaid = payment.status === 'paid';
  const isOverdue = payment.status === 'overdue';
  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className={cn(
      'flex items-center justify-between p-2.5 rounded-lg text-xs gap-2 transition-colors',
      isPaid ? 'bg-emerald-50/50 dark:bg-emerald-950/10' :
      isOverdue ? 'bg-destructive/5' : 'bg-muted/30'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {isPaid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> :
         isOverdue ? <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" /> :
         <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="font-medium">{isRTL ? `القسط ${payment.installment_number}` : `#${payment.installment_number}`}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <span className="tech-content font-semibold">{Number(payment.amount).toLocaleString()} {plan.currency_code}</span>
        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
          <Calendar className="w-2.5 h-2.5" />{formatDate(payment.due_date)}
        </span>
        <Badge className={`text-[8px] px-1.5 py-0 h-[14px] ${statusColors[payment.status] || ''}`}>
          {statusLabels[payment.status]?.[isRTL ? 'ar' : 'en'] || payment.status}
        </Badge>
        {payment.status === 'pending' && isProvider && (
          <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 gap-0.5" onClick={() => onMarkPaid(payment.id)} disabled={isPending}>
            <CheckCircle className="w-2.5 h-2.5" />{isRTL ? 'تسجيل' : 'Paid'}
          </Button>
        )}
      </div>
    </div>
  );
});
PaymentItem.displayName = 'PaymentItem';

/* ── Plan Card ── */
const PlanCard = React.memo(({ plan, user, isRTL, language, onMarkPaid, isPending }: any) => {
  const [expanded, setExpanded] = useState(false);
  const payments = useMemo(() =>
    (plan.installment_payments || []).sort((a: any, b: any) => a.installment_number - b.installment_number), [plan.installment_payments]);
  const paidCount = payments.filter((p: any) => p.status === 'paid').length;
  const progress = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0;
  const contract = plan.contract;
  const isUserProvider = user?.id === contract?.provider_id;

  return (
    <Card className="border-border/40 overflow-hidden group hover:shadow-md transition-all">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <h3 className="font-heading font-bold text-xs sm:text-sm truncate">
                {contract ? (isRTL ? contract.title_ar : (contract.title_en || contract.title_ar)) : ''}
              </h3>
              <Badge className={`${statusColors[plan.status] || ''} text-[8px] px-1.5 py-0 h-[14px]`}>
                {statusLabels[plan.status]?.[isRTL ? 'ar' : 'en'] || plan.status}
              </Badge>
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-[14px]">
                {isUserProvider ? (isRTL ? 'مزود' : 'Provider') : (isRTL ? 'عميل' : 'Client')}
              </Badge>
            </div>
            <p className="tech-content text-[9px] text-muted-foreground">{contract?.contract_number} • {plan.ref_id}</p>
          </div>
          <div className="text-end shrink-0">
            <p className="tech-content font-bold text-sm">{Number(plan.total_amount).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">{plan.currency_code}</span></p>
            <p className="text-[9px] text-muted-foreground">{isRTL ? 'دفعة أولى:' : 'Down:'} <span className="tech-content">{Number(plan.down_payment).toLocaleString()}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="tech-content text-[9px] font-bold text-accent">{progress}%</span>
          <span className="text-[9px] text-muted-foreground">({paidCount}/{payments.length})</span>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {expanded && (
          <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
            {payments.map((payment: any) => (
              <PaymentItem key={payment.id} payment={payment} plan={plan} isProvider={isUserProvider} isRTL={isRTL} language={language} onMarkPaid={onMarkPaid} isPending={isPending} />
            ))}
          </div>
        )}
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
    <Card className="border-border/40 overflow-hidden hover:shadow-lg transition-all group">
      <CardContent className="p-0">
        {/* Header with brand color */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${provider.color_hex}, ${provider.color_hex}88)` }} />
        
        <div className="p-4 sm:p-5">
          {/* Logo & Name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-border/20 flex items-center justify-center bg-background overflow-hidden shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
              style={{ borderColor: provider.color_hex + '40' }}>
              {provider.logo_url ? (
                <img src={provider.logo_url} alt={name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" loading="lazy" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: provider.color_hex }}>{(provider.name_en || 'B').charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-base sm:text-lg">{name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {provider.interest_rate === 0 ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {isRTL ? 'بدون فوائد' : '0% Interest'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">{provider.interest_rate}%</Badge>
                )}
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isRTL ? 'شريك معتمد' : 'Authorized'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <Banknote className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-sm sm:text-base font-bold text-foreground tech-content">{provider.installments_count}</p>
              <p className="text-[9px] text-muted-foreground">{isRTL ? 'عدد الأقساط' : 'Payments'}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <DollarSign className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-sm sm:text-base font-bold text-foreground tech-content">{Number(provider.min_amount).toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">{isRTL ? 'الحد الأدنى' : 'Min'} {provider.currency_code}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-sm sm:text-base font-bold text-foreground tech-content">{Number(provider.max_amount).toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">{isRTL ? 'الحد الأقصى' : 'Max'} {provider.currency_code}</p>
            </div>
          </div>

          {/* Approval Notice */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  {isRTL ? 'يخضع للموافقة الائتمانية' : 'Subject to Credit Approval'}
                </p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5 leading-relaxed">
                  {isRTL 
                    ? 'يعتمد القبول على الموافقة الائتمانية والسجل الائتماني للعميل. قد تطبق شروط وأحكام إضافية.'
                    : 'Approval depends on credit assessment and customer credit history. Additional terms and conditions may apply.'}
                </p>
              </div>
            </div>
          </div>

          {/* Details Toggle */}
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isRTL ? 'تفاصيل إضافية' : 'More Details'}
          </Button>

          {showDetails && (
            <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              
              {provider.website_url && (
                <a href={provider.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/30 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
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
const AdminBnplForm = React.memo(({ provider, isRTL, language, onSave, onCancel, saving }: any) => {
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

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Card className="border-accent/30 bg-accent/[0.02]">
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
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [showNewProvider, setShowNewProvider] = useState(false);

  const isProvider = profile?.account_type === 'provider';

  const { data: hasAdminRole } = useQuery({
    queryKey: ['user-admin-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id).in('role', ['admin', 'super_admin']);
      return (data?.length || 0) > 0;
    },
    enabled: !!user,
  });

  // Plans
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

  // All BNPL Providers (for showcase + admin)
  const { data: allProviders = [], isLoading: loadingProviders } = useQuery({
    queryKey: ['bnpl-providers-all'],
    queryFn: async () => {
      const { data } = await supabase.from('bnpl_providers').select('*').order('sort_order');
      return data ?? [];
    },
  });

  const activeProviders = useMemo(() => allProviders.filter((p: any) => p.is_active), [allProviders]);

  const filtered = useMemo(() => {
    return plans.filter((p: any) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (language === 'ar' ? p.contract?.title_ar : (p.contract?.title_en || p.contract?.title_ar) || '').toLowerCase();
        if (!title.includes(q) && !(p.ref_id || '').toLowerCase().includes(q) && !(p.contract?.contract_number || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [plans, statusFilter, searchQuery, language]);

  const stats = useMemo(() => {
    const totalAmount = plans.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
    const paidAmount = plans.reduce((s: number, p: any) =>
      s + (p.installment_payments || []).filter((pay: any) => pay.status === 'paid').reduce((sum: number, pay: any) => sum + Number(pay.amount), 0), 0);
    const pendingPayments = plans.reduce((s: number, p: any) =>
      s + (p.installment_payments || []).filter((pay: any) => pay.status === 'pending').length, 0);
    const overduePayments = plans.reduce((s: number, p: any) =>
      s + (p.installment_payments || []).filter((pay: any) => pay.status === 'overdue').length, 0);
    return { totalAmount, paidAmount, pendingPayments, overduePayments };
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
    onError: (e: any) => toast.error(e.message),
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

  const hasFilters = statusFilter !== 'all' || searchQuery.trim();

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'الأقساط والتقسيط' : 'Installments & BNPL'}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'إدارة خطط التقسيط المباشر وشركات التقسيط المعتمدة' : 'Manage direct installment plans and authorized BNPL partners'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="plans" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'خطط التقسيط المباشر' : 'Direct Plans'}
            </TabsTrigger>
            <TabsTrigger value="bnpl" className="gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5" />
              {isRTL ? 'شركات التقسيط' : 'BNPL Partners'}
              {activeProviders.length > 0 && (
                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 ms-1">{activeProviders.length}</Badge>
              )}
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
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: FileText, label: isRTL ? 'خطط التقسيط' : 'Plans', value: plans.length, color: 'text-primary bg-primary/10' },
                { icon: DollarSign, label: isRTL ? 'إجمالي المبالغ' : 'Total', value: stats.totalAmount.toLocaleString(), sub: 'SAR', color: 'text-accent bg-accent/10' },
                { icon: TrendingUp, label: isRTL ? 'المدفوع' : 'Paid', value: stats.paidAmount.toLocaleString(), sub: 'SAR', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                { icon: AlertTriangle, label: isRTL ? 'متأخرة' : 'Overdue', value: stats.overduePayments, color: stats.overduePayments > 0 ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted' },
              ].map((s, i) => (
                <Card key={i} className="border-border/40 bg-card/50">
                  <CardContent className="p-2.5 sm:p-3 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                      <s.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-xl font-bold tech-content">{s.value}{s.sub && <span className="text-[9px] font-normal text-muted-foreground ms-1">{s.sub}</span>}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress */}
            {stats.totalAmount > 0 && (
              <Card className="border-border/40 bg-card/50">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold flex items-center gap-1"><BarChart3 className="w-3 h-3 text-primary" />{isRTL ? 'نسبة السداد الإجمالية' : 'Overall Payment Progress'}</span>
                    <span className="tech-content text-xs font-bold text-accent">{Math.round((stats.paidAmount / stats.totalAmount) * 100)}%</span>
                  </div>
                  <Progress value={(stats.paidAmount / stats.totalAmount) * 100} className="h-2" />
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="ps-9 h-8 text-xs" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-8 text-xs"><Filter className="w-3 h-3 me-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  {Object.entries(statusLabels).filter(([k]) => ['active', 'completed', 'cancelled', 'defaulted'].includes(k)).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{language === 'ar' ? label.ar : label.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>
                  <X className="w-3 h-3" />{isRTL ? 'مسح' : 'Clear'}
                </Button>
              )}
            </div>

            {/* Plans List */}
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <CreditCard className="w-7 h-7 text-primary opacity-50" />
                  </div>
                  <p className="font-heading font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد خطط تقسيط' : 'No installment plans'}</p>
                  <p className="text-xs">{hasFilters ? (isRTL ? 'جرّب تعديل الفلاتر' : 'Adjust filters') : (isRTL ? 'ستظهر هنا عند إنشائها من العقود' : 'Will appear when created from contracts')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.slice(0, visibleCount).map((plan: any) => (
                  <PlanCard key={plan.id} plan={plan} user={user} isRTL={isRTL} language={language} onMarkPaid={handleMarkPaid} isPending={markPaidMutation.isPending} />
                ))}
                {visibleCount < filtered.length && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setVisibleCount(c => c + 20)}>
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {isRTL ? `المزيد (${filtered.length - visibleCount})` : `More (${filtered.length - visibleCount})`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── BNPL Partners Showcase Tab ── */}
          <TabsContent value="bnpl" className="space-y-5 mt-4">
            {/* Section Header */}
            <div className="text-center space-y-2 pb-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-heading font-bold text-lg sm:text-xl">
                {isRTL ? 'شركات التقسيط المعتمدة' : 'Authorized BNPL Partners'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {isRTL
                  ? 'يمكنك تقديم خدماتك للعملاء من خلال شركات التقسيط المعتمدة التالية. جميع الطلبات تخضع لموافقة الشركة والسجل الائتماني للعميل.'
                  : 'Offer your services through these authorized BNPL partners. All requests are subject to company approval and customer credit history.'}
              </p>
            </div>

            {/* Info Banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    {isRTL ? 'كيف يعمل التقسيط عبر الشركات المتخصصة؟' : 'How does BNPL work?'}
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold mt-0.5">١</span>
                      {isRTL ? 'يختار العميل شركة التقسيط المناسبة عند الدفع' : 'Customer selects a BNPL provider at checkout'}
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold mt-0.5">٢</span>
                      {isRTL ? 'تقوم الشركة بمراجعة السجل الائتماني للعميل والموافقة' : 'Provider reviews customer credit history and approves'}
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold mt-0.5">٣</span>
                      {isRTL ? 'يتم تقسيم المبلغ على أقساط شهرية ميسرة' : 'Amount is split into convenient monthly installments'}
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold mt-0.5">٤</span>
                      {isRTL ? 'يحصل المزود على المبلغ كاملاً من شركة التقسيط' : 'Provider receives the full amount from the BNPL company'}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Providers Grid */}
            {loadingProviders ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
              </div>
            ) : activeProviders.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <Building2 className="w-10 h-10 mb-3 opacity-40" />
                  <p className="font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد شركات تقسيط متاحة حالياً' : 'No BNPL providers available'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeProviders.map((provider: any) => (
                  <BnplShowcaseCard key={provider.id} provider={provider} isRTL={isRTL} />
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                {isRTL
                  ? '⚠️ جميع عمليات التقسيط عبر الشركات المتخصصة تخضع لشروط وأحكام كل شركة على حدة. يعتمد القبول على الموافقة الائتمانية والسجل الائتماني للعميل. المنصة ليست طرفاً في عقد التقسيط بين العميل وشركة التقسيط.'
                  : '⚠️ All BNPL transactions are subject to each provider\'s terms and conditions. Approval depends on credit assessment and customer credit history. The platform is not a party to the installment agreement between the customer and the BNPL provider.'}
              </p>
            </div>
          </TabsContent>

          {/* ── Admin Tab ── */}
          {hasAdminRole && (
            <TabsContent value="admin" className="space-y-4 mt-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading font-bold text-base flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-accent" />
                    {isRTL ? 'إدارة شركات التقسيط' : 'Manage BNPL Providers'}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isRTL ? 'أضف وعدّل شركات التقسيط مع شعاراتها وتفاصيلها' : 'Add and edit BNPL providers with logos and details'}
                  </p>
                </div>
                {!showNewProvider && !editingProvider && (
                  <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewProvider(true)}>
                    <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة شركة' : 'Add Provider'}
                  </Button>
                )}
              </div>

              {showNewProvider && (
                <AdminBnplForm isRTL={isRTL} language={language} onSave={handleSaveProvider} onCancel={() => setShowNewProvider(false)} saving={saveProviderMutation.isPending} />
              )}

              {editingProvider && !showNewProvider && (
                <AdminBnplForm provider={editingProvider} isRTL={isRTL} language={language} onSave={handleSaveProvider} onCancel={() => setEditingProvider(null)} saving={saveProviderMutation.isPending} />
              )}

              {loadingProviders ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : allProviders.length === 0 && !showNewProvider ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                    <Building2 className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد شركات تقسيط' : 'No BNPL providers'}</p>
                    <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowNewProvider(true)}>
                      <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة أول شركة' : 'Add First Provider'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {allProviders.map((p: any) => {
                    const name = isRTL ? p.name_ar : p.name_en;
                    return (
                      <Card key={p.id} className={cn('border-border/40 transition-all hover:shadow-sm', !p.is_active && 'opacity-60')}>
                        <CardContent className="p-2.5 sm:p-3 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl border border-border/20 flex items-center justify-center bg-background overflow-hidden shrink-0"
                            style={{ borderColor: p.is_active ? p.color_hex + '30' : undefined }}>
                            {p.logo_url ? (
                              <img src={p.logo_url} alt={name} className="w-8 h-8 object-contain" loading="lazy" />
                            ) : (
                              <span className="text-lg font-bold" style={{ color: p.color_hex }}>{(p.name_en || 'B').charAt(0)}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-heading font-bold text-xs sm:text-sm">{name}</h4>
                              <Badge className={cn('text-[8px] px-1.5 py-0 h-[14px]', p.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                                {p.is_active ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'معطّل' : 'Inactive')}
                              </Badge>
                              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-[14px] tech-content">{p.slug}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{p.installments_count} {isRTL ? 'قسط' : 'payments'}</span>
                              <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />{p.min_amount}-{p.max_amount}</span>
                              <span className="flex items-center gap-0.5"><Percent className="w-2.5 h-2.5" />{p.interest_rate}%</span>
                              {p.website_url && <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />{isRTL ? 'الموقع' : 'Site'}</a>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditingProvider(p); setShowNewProvider(false); }}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => {
                              if (confirm(isRTL ? 'هل تريد حذف هذا المزود؟' : 'Delete this provider?')) deleteProviderMutation.mutate(p.id);
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
