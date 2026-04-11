import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, ArrowRight, ArrowLeft, Calendar, DollarSign,
  Shield, AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight, ChevronLeft,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

type Contract = Tables<'contracts'>;

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgCard: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground', bgCard: 'border-muted-foreground/10' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', bgCard: 'border-amber-200 dark:border-amber-800/30' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', bgCard: 'border-emerald-200 dark:border-emerald-800/30' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', bgCard: 'border-blue-200 dark:border-blue-800/30' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', bgCard: 'border-red-200 dark:border-red-800/30' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', bgCard: 'border-orange-200 dark:border-orange-800/30' },
};

const ContractCard: React.FC<{ contract: Contract; role: 'client' | 'provider' }> = ({ contract, role }) => {
  const { t, language, isRTL } = useLanguage();
  const title = language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar);
  const date = new Date(contract.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const cfg = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Link to={`/contracts/${contract.id}`} className={`block p-4 sm:p-5 rounded-xl bg-card border ${cfg.bgCard} hover:border-accent/40 hover:shadow-lg dark:hover:shadow-accent/5 transition-all duration-300 group active:scale-[0.98]`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-accent transition-colors truncate">{title}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-body mt-0.5" dir="ltr">{contract.contract_number}</p>
        </div>
        <Badge className={`${cfg.color} gap-1 text-[10px] sm:text-xs flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {t(`status.${contract.status}` as any)}
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
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {role === 'client' ? t('contracts.as_client') : t('contracts.as_provider')}
          </Badge>
        </div>
        <NextIcon className="w-4 h-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
      </div>
    </Link>
  );
};

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
  
  // Deduplicate: if user is both client & provider on same contract, show once
  const seen = new Set<string>();
  const allContracts = [
    ...(clientContracts?.map(c => ({ ...c, _role: 'client' as const })) || []),
    ...(providerContracts?.map(c => ({ ...c, _role: 'provider' as const })) || []),
  ].filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
            <p className="text-muted-foreground font-body text-sm">{t('contracts.no_contracts_desc')}</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4 sm:mb-6 bg-muted/50 dark:bg-muted/30 rounded-xl p-1 h-auto overflow-x-auto no-scrollbar flex w-full sm:w-auto">
              <TabsTrigger value="all" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 sm:px-6 py-2 text-xs sm:text-sm whitespace-nowrap">
                {t('profile.all')} ({allContracts.length})
              </TabsTrigger>
              <TabsTrigger value="client" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 sm:px-6 py-2 text-xs sm:text-sm whitespace-nowrap">
                {t('contracts.as_client')} ({clientContracts?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="provider" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 sm:px-6 py-2 text-xs sm:text-sm whitespace-nowrap">
                {t('contracts.as_provider')} ({providerContracts?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {allContracts.map(c => <ContractCard key={c.id + c._role} contract={c} role={c._role} />)}
              </div>
            </TabsContent>
            <TabsContent value="client">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {clientContracts?.map(c => <ContractCard key={c.id} contract={c} role="client" />)}
              </div>
            </TabsContent>
            <TabsContent value="provider">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {providerContracts?.map(c => <ContractCard key={c.id} contract={c} role="provider" />)}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Contracts;