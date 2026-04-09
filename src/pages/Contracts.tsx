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
  FileText, Plus, ArrowRight, ArrowLeft, Calendar, DollarSign,
  Shield, AlertTriangle, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

type Contract = Tables<'contracts'>;

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const ContractCard: React.FC<{ contract: Contract; role: 'client' | 'provider' }> = ({ contract, role }) => {
  const { t, language } = useLanguage();
  const title = language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar);
  const date = new Date(contract.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const cfg = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;

  return (
    <Link to={`/contracts/${contract.id}`} className="block p-5 rounded-xl bg-card border border-border hover:border-accent/40 hover:shadow-lg transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-foreground group-hover:text-accent transition-colors truncate">{title}</h3>
          <p className="text-xs text-muted-foreground font-body mt-1" dir="ltr">{contract.contract_number}</p>
        </div>
        <Badge className={`${cfg.color} gap-1 text-xs flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {t(`status.${contract.status}` as any)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-body">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold text-foreground">{Number(contract.total_amount).toLocaleString()} {contract.currency_code}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{date}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {role === 'client' ? t('contracts.as_client') : t('contracts.as_provider')}
        </Badge>
      </div>
    </Link>
  );
};

const Contracts = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground font-body">{t('auth.login')}</p>
          <Link to="/auth"><Button variant="hero">{t('nav.login')}</Button></Link>
        </div>
      </div>
    );
  }

  const isLoading = loadingClient || loadingProvider;
  const allContracts = [
    ...(clientContracts?.map(c => ({ ...c, _role: 'client' as const })) || []),
    ...(providerContracts?.map(c => ({ ...c, _role: 'provider' as const })) || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <FileText className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">{t('contracts.title')}</h1>
          <p className="text-primary-foreground/60 font-body">{t('contracts.subtitle')}</p>
        </div>
      </div>

      <div className="container py-8">

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : allContracts.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-20 h-20 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="font-heading font-bold text-xl text-foreground mb-2">{t('contracts.no_contracts')}</h3>
            <p className="text-muted-foreground font-body">{t('contracts.no_contracts_desc')}</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-6 bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="all" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-6 py-2">
                {t('profile.all')} ({allContracts.length})
              </TabsTrigger>
              <TabsTrigger value="client" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-6 py-2">
                {t('contracts.as_client')} ({clientContracts?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="provider" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-6 py-2">
                {t('contracts.as_provider')} ({providerContracts?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allContracts.map(c => <ContractCard key={c.id + c._role} contract={c} role={c._role} />)}
              </div>
            </TabsContent>
            <TabsContent value="client">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientContracts?.map(c => <ContractCard key={c.id} contract={c} role="client" />)}
              </div>
            </TabsContent>
            <TabsContent value="provider">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
