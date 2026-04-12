import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Calendar, DollarSign,
  Shield, AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight, ChevronLeft,
  Search, Plus, Timer, TrendingUp,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

type Contract = Tables<'contracts'>;

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgCard: string; label_ar: string; label_en: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground', bgCard: 'border-muted-foreground/10', label_ar: 'مسودة', label_en: 'Draft' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', bgCard: 'border-amber-200 dark:border-amber-800/30', label_ar: 'بانتظار الموافقة', label_en: 'Pending' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', bgCard: 'border-emerald-200 dark:border-emerald-800/30', label_ar: 'نشط', label_en: 'Active' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', bgCard: 'border-blue-200 dark:border-blue-800/30', label_ar: 'مكتمل', label_en: 'Completed' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', bgCard: 'border-red-200 dark:border-red-800/30', label_ar: 'ملغي', label_en: 'Cancelled' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', bgCard: 'border-orange-200 dark:border-orange-800/30', label_ar: 'نزاع', label_en: 'Disputed' },
};

const STATUS_FILTERS = ['all', 'active', 'pending_approval', 'draft', 'completed', 'cancelled', 'disputed'] as const;

const ContractCard: React.FC<{ contract: Contract; role: 'client' | 'provider' }> = React.memo(({ contract, role }) => {
  const { t, language, isRTL } = useLanguage();
  const title = language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar);
  const date = new Date(contract.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const cfg = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  // Days remaining for active contracts
  const daysRemaining = contract.end_date && contract.status === 'active'
    ? Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link to={`/contracts/${contract.id}`} className={`block p-4 sm:p-5 rounded-xl bg-card border ${cfg.bgCard} hover:border-accent/40 hover:shadow-lg dark:hover:shadow-accent/5 transition-all duration-300 group active:scale-[0.98]`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-accent transition-colors truncate">{title}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-body mt-0.5 font-mono" dir="ltr">{contract.contract_number}</p>
        </div>
        <Badge className={`${cfg.color} gap-1 text-[10px] sm:text-xs flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {isRTL ? cfg.label_ar : cfg.label_en}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground font-body">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-foreground">{Number(contract.total_amount).toLocaleString()} {contract.currency_code}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{date}</span>
          </div>
          {daysRemaining !== null && (
            <Badge variant={daysRemaining < 7 ? 'destructive' : 'secondary'} className="text-[9px] gap-0.5 px-1.5 py-0 h-4">
              <Timer className="w-2.5 h-2.5" />
              {daysRemaining > 0 ? (isRTL ? `${daysRemaining} يوم` : `${daysRemaining}d`) : (isRTL ? 'منتهي' : 'Overdue')}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {role === 'client' ? t('contracts.as_client') : t('contracts.as_provider')}
          </Badge>
        </div>
        <NextIcon className="w-4 h-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
      </div>
    </Link>
  );
});
ContractCard.displayName = 'ContractCard';

const ContractSkeleton = () => (
  <div className="p-4 sm:p-5 rounded-xl bg-card border border-border space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        <Skeleton className="h-3 w-1/3 rounded-lg" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="flex gap-3">
      <Skeleton className="h-4 w-28 rounded-lg" />
      <Skeleton className="h-4 w-20 rounded-lg" />
    </div>
  </div>
);

const Contracts = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: clientContracts, isLoading: loadingClient } = useQuery({
    queryKey: ['contracts', 'client', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('*').eq('client_id', user!.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: providerContracts, isLoading: loadingProvider } = useQuery({
    queryKey: ['contracts', 'provider', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('*').eq('provider_id', user!.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <FileText className="w-14 h-14 sm:w-16 sm:h-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground font-body text-sm sm:text-base">{t('auth.login')}</p>
          <Link to="/auth"><Button variant="hero">{t('nav.login')}</Button></Link>
        </div>
      </div>
    );
  }

  const isLoading = loadingClient || loadingProvider;
  
  // Deduplicate
  const seen = new Set<string>();
  const allContracts = [
    ...(clientContracts?.map(c => ({ ...c, _role: 'client' as const })) || []),
    ...(providerContracts?.map(c => ({ ...c, _role: 'provider' as const })) || []),
  ].filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Status counts
  const statusCounts = allContracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  // Filter by status + search
  const filtered = allContracts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.title_ar.toLowerCase().includes(q)
        || (c.title_en || '').toLowerCase().includes(q)
        || c.contract_number.toLowerCase().includes(q);
    }
    return true;
  });

  // Summary stats
  const totalValue = allContracts.reduce((s, c) => s + Number(c.total_amount), 0);
  const activeCount = allContracts.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-20 sm:pt-24 pb-6 sm:pb-10">
        <div className="container px-4 sm:px-6 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent/15 dark:bg-accent/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground mb-1 sm:mb-2">{t('contracts.title')}</h1>
          <p className="text-primary-foreground/60 font-body text-sm sm:text-base">{t('contracts.subtitle')}</p>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && allContracts.length > 0 && (
        <div className="container px-4 sm:px-6 -mt-4 sm:-mt-5 relative z-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-card border border-border p-3 sm:p-4 text-center shadow-sm">
              <FileText className="w-4 h-4 mx-auto text-accent mb-1" />
              <p className="font-heading font-bold text-lg sm:text-xl text-foreground">{allContracts.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'إجمالي العقود' : 'Total'}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 sm:p-4 text-center shadow-sm">
              <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
              <p className="font-heading font-bold text-lg sm:text-xl text-emerald-600 dark:text-emerald-400">{activeCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'نشطة' : 'Active'}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 sm:p-4 text-center shadow-sm">
              <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
              <p className="font-heading font-bold text-sm sm:text-lg text-foreground">{totalValue.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'إجمالي القيمة' : 'Total Value'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="container px-4 sm:px-6 py-5 sm:py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <ContractSkeleton key={i} />)}
          </div>
        ) : allContracts.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-muted/50 dark:bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20" />
            </div>
            <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">{t('contracts.no_contracts')}</h3>
            <p className="text-muted-foreground font-body text-sm mb-6">{t('contracts.no_contracts_desc')}</p>
            <Link to="/dashboard/contracts">
              <Button variant="hero" className="gap-2">
                <Plus className="w-4 h-4" />
                {isRTL ? 'إنشاء عقد جديد' : 'Create New Contract'}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Search + Status Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={isRTL ? 'ابحث بالعنوان أو رقم العقد...' : 'Search by title or contract number...'}
                  className="ps-10 rounded-xl h-10"
                />
              </div>
              <Link to="/dashboard/contracts" className="shrink-0">
                <Button variant="hero" size="sm" className="gap-1.5 h-10 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  {isRTL ? 'عقد جديد' : 'New Contract'}
                </Button>
              </Link>
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
              {STATUS_FILTERS.map(s => {
                const count = s === 'all' ? allContracts.length : (statusCounts[s] || 0);
                if (s !== 'all' && count === 0) return null;
                const cfg = s !== 'all' ? statusConfig[s] : null;
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all ${
                      active ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {cfg && <cfg.icon className="w-3 h-3" />}
                    {s === 'all' ? (isRTL ? 'الكل' : 'All') : (isRTL ? cfg!.label_ar : cfg!.label_en)}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-accent-foreground/20' : 'bg-muted'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <Tabs defaultValue="all">
              <TabsList className="mb-4 sm:mb-6 bg-muted/50 dark:bg-muted/30 rounded-xl p-1 h-auto overflow-x-auto no-scrollbar flex w-full sm:w-auto">
                <TabsTrigger value="all" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 sm:px-6 py-2 text-xs sm:text-sm whitespace-nowrap">
                  {t('profile.all')} ({filtered.length})
                </TabsTrigger>
                <TabsTrigger value="client" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 sm:px-6 py-2 text-xs sm:text-sm whitespace-nowrap">
                  {t('contracts.as_client')} ({filtered.filter(c => c._role === 'client').length})
                </TabsTrigger>
                <TabsTrigger value="provider" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 sm:px-6 py-2 text-xs sm:text-sm whitespace-nowrap">
                  {t('contracts.as_provider')} ({filtered.filter(c => c._role === 'provider').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground text-sm">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {filtered.map(c => <ContractCard key={c.id + c._role} contract={c} role={c._role} />)}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="client">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filtered.filter(c => c._role === 'client').map(c => <ContractCard key={c.id} contract={c} role="client" />)}
                </div>
              </TabsContent>
              <TabsContent value="provider">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filtered.filter(c => c._role === 'provider').map(c => <ContractCard key={c.id} contract={c} role="provider" />)}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Contracts;
