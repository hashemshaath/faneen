import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  ArrowRight, ArrowLeft, FileText, Shield, Wrench, CheckCircle2, Clock,
  Calendar, DollarSign, AlertTriangle, XCircle, ListChecks, Plus, Send,
} from 'lucide-react';

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintPriority, setMaintPriority] = useState<string>('medium');

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: milestones } = useQuery({
    queryKey: ['milestones', id],
    queryFn: async () => {
      const { data } = await supabase.from('contract_milestones').select('*').eq('contract_id', id!).order('sort_order');
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: warranties } = useQuery({
    queryKey: ['warranties', id],
    queryFn: async () => {
      const { data } = await supabase.from('warranties').select('*').eq('contract_id', id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: maintenanceReqs } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: async () => {
      const { data } = await supabase.from('maintenance_requests').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['profile', contract?.client_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', contract!.client_id).maybeSingle();
      return data;
    },
    enabled: !!contract,
  });

  const { data: providerProfile } = useQuery({
    queryKey: ['profile', contract?.provider_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', contract!.provider_id).maybeSingle();
      return data;
    },
    enabled: !!contract,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const isClient = user?.id === contract?.client_id;
      const updateField = isClient ? 'client_accepted_at' : 'provider_accepted_at';
      const update: any = { [updateField]: new Date().toISOString() };
      const otherAccepted = isClient ? contract?.provider_accepted_at : contract?.client_accepted_at;
      if (otherAccepted) update.status = 'active';
      else if (contract?.status === 'draft') update.status = 'pending_approval';
      await supabase.from('contracts').update(update).eq('id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      toast({ title: t('contracts.accept') });
    },
  });

  const submitMaintenance = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('maintenance_requests').insert({
        contract_id: id!,
        client_id: user!.id,
        provider_id: contract!.provider_id,
        title_ar: maintTitle,
        description_ar: maintDesc,
        priority: maintPriority as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setShowMaintForm(false);
      setMaintTitle('');
      setMaintDesc('');
      toast({ title: t('maintenance.submit') });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 sm:py-28 space-y-4 sm:space-y-6 px-4 sm:px-6">
          <Skeleton className="h-10 sm:h-12 w-3/4 rounded-xl" />
          <Skeleton className="h-48 sm:h-64 w-full rounded-xl" />
          <Skeleton className="h-32 sm:h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center space-y-4 px-4">
          <FileText className="w-14 h-14 sm:w-16 sm:h-16 mx-auto text-muted-foreground/30" />
          <p className="font-body text-muted-foreground">{t('profile.not_found')}</p>
          <Link to="/contracts"><Button variant="hero">{t('profile.back_home')}</Button></Link>
        </div>
      </div>
    );
  }

  const title = language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar);
  const desc = language === 'ar' ? contract.description_ar : (contract.description_en || contract.description_ar);
  const terms = language === 'ar' ? contract.terms_ar : (contract.terms_en || contract.terms_ar);
  const cfg = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const isClient = user?.id === contract.client_id;
  const canAccept = (isClient && !contract.client_accepted_at) || (!isClient && !contract.provider_accepted_at);
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;
  const milestonePaid = milestones?.filter(m => m.status === 'completed').reduce((s, m) => s + Number(m.amount), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-20 sm:pt-24 pb-4 sm:pb-6">
        <div className="container px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-lg sm:text-2xl text-primary-foreground truncate">{title}</h1>
            <p className="text-primary-foreground/60 text-[10px] sm:text-xs font-body mt-0.5" dir="ltr">{contract.contract_number}</p>
          </div>
          {canAccept && contract.status !== 'completed' && contract.status !== 'cancelled' && (
            <Button variant="hero" size="sm" className="text-xs sm:text-sm shrink-0" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
              {t('contracts.accept')}
            </Button>
          )}
        </div>
      </div>

      <div className="container py-4 sm:py-8 px-4 sm:px-6">
        {/* Header Card */}
        <div className="p-4 sm:p-6 rounded-xl bg-card border border-border mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 flex-wrap">
                <h1 className="font-heading font-bold text-lg sm:text-2xl text-foreground">{title}</h1>
                <Badge className={`${cfg.color} gap-1 text-[10px] sm:text-xs`}>
                  <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t(`status.${contract.status}` as any)}
                </Badge>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body" dir="ltr">{contract.contract_number}</p>
              {desc && <p className="text-xs sm:text-sm text-muted-foreground font-body mt-2 sm:mt-3 leading-relaxed">{desc}</p>}
            </div>

            <div className="flex flex-col items-start sm:items-end gap-0.5 sm:gap-1 flex-shrink-0">
              <span className="font-heading font-bold text-xl sm:text-2xl text-accent">
                {Number(contract.total_amount).toLocaleString()} {contract.currency_code}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-body">{t('contracts.total_amount')}</span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
            {[
              { label: t('contracts.client'), value: clientProfile?.full_name || '-' },
              { label: t('contracts.provider'), value: providerProfile?.full_name || '-' },
              { label: t('contracts.start_date'), value: formatDate(contract.start_date) },
              { label: t('contracts.end_date'), value: formatDate(contract.end_date) },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-body mb-0.5 sm:mb-1">{item.label}</p>
                <p className="text-xs sm:text-sm font-heading font-semibold text-foreground truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones">
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap mb-4 sm:mb-6 gap-1">
            <TabsTrigger value="milestones" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('contracts.milestones')} ({totalMilestones})
            </TabsTrigger>
            <TabsTrigger value="warranty" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('contracts.warranty')}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('contracts.maintenance')} ({maintenanceReqs?.length || 0})
            </TabsTrigger>
            {terms && (
              <TabsTrigger value="terms" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('contracts.terms')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Milestones */}
          <TabsContent value="milestones">
            {totalMilestones > 0 && (
              <div className="p-3 sm:p-4 rounded-xl bg-card border border-border mb-3 sm:mb-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <span className="text-xs sm:text-sm font-body text-muted-foreground">{completedMilestones}/{totalMilestones} {t('contracts.milestones')}</span>
                  <span className="text-xs sm:text-sm font-body text-accent font-semibold">{milestonePaid.toLocaleString()} / {Number(contract.total_amount).toLocaleString()} {contract.currency_code}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              {milestones?.map((m, idx) => {
                const mTitle = language === 'ar' ? m.title_ar : (m.title_en || m.title_ar);
                const mDesc = language === 'ar' ? m.description_ar : (m.description_en || m.description_ar);
                const mCfg = statusConfig[m.status] || statusConfig.draft;
                return (
                  <div key={m.id} className="p-3 sm:p-5 rounded-xl bg-card border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${m.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {m.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-heading font-semibold text-xs sm:text-base text-foreground truncate">{mTitle}</h4>
                          {mDesc && <p className="text-[10px] sm:text-sm text-muted-foreground font-body mt-0.5 sm:mt-1 line-clamp-2">{mDesc}</p>}
                          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground font-body flex-wrap">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{Number(m.amount).toLocaleString()} {contract.currency_code}</span>
                            {m.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(m.due_date)}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${mCfg.color} text-[9px] sm:text-xs shrink-0`}>{t(`milestone.${m.status}` as any)}</Badge>
                    </div>
                  </div>
                );
              })}
              {(!milestones || milestones.length === 0) && (
                <p className="text-center py-10 sm:py-12 text-muted-foreground font-body text-sm">{t('common.no_results')}</p>
              )}
            </div>
          </TabsContent>

          {/* Warranty */}
          <TabsContent value="warranty">
            {warranties && warranties.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {warranties.map(w => {
                  const wTitle = language === 'ar' ? w.title_ar : (w.title_en || w.title_ar);
                  const wDesc = language === 'ar' ? w.description_ar : (w.description_en || w.description_ar);
                  const wCoverage = language === 'ar' ? w.coverage_ar : (w.coverage_en || w.coverage_ar);
                  return (
                    <div key={w.id} className="p-4 sm:p-6 rounded-xl bg-card border border-border">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">{wTitle}</h3>
                            <Badge className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs">{t(`warranty.${w.warranty_type}` as any)}</Badge>
                          </div>
                        </div>
                        <Badge className={`text-[10px] sm:text-xs shrink-0 ${w.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {t(`warranty.${w.status}` as any)}
                        </Badge>
                      </div>
                      {wDesc && <p className="text-xs sm:text-sm text-muted-foreground font-body mb-2 sm:mb-3">{wDesc}</p>}
                      {wCoverage && (
                        <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 dark:bg-muted/30">
                          <p className="text-[10px] sm:text-xs font-heading font-semibold text-foreground mb-0.5 sm:mb-1">{t('warranty.coverage')}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground font-body">{wCoverage}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(w.start_date)} - {formatDate(w.end_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 sm:py-12">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-body text-sm">{t('warranty.no_warranty')}</p>
              </div>
            )}
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance">
            {isClient && (
              <div className="mb-4 sm:mb-6">
                {showMaintForm ? (
                  <div className="p-4 sm:p-6 rounded-xl bg-card border border-border space-y-3 sm:space-y-4">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">{t('maintenance.new')}</h3>
                    <Input placeholder={isRTL ? 'عنوان الطلب' : 'Request title'} value={maintTitle} onChange={e => setMaintTitle(e.target.value)} className="text-sm" />
                    <Textarea placeholder={isRTL ? 'وصف المشكلة' : 'Describe the issue'} value={maintDesc} onChange={e => setMaintDesc(e.target.value)} rows={3} className="text-sm" />
                    <Select value={maintPriority} onValueChange={setMaintPriority}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{isRTL ? 'منخفض' : 'Low'}</SelectItem>
                        <SelectItem value="medium">{isRTL ? 'متوسط' : 'Medium'}</SelectItem>
                        <SelectItem value="high">{isRTL ? 'عالي' : 'High'}</SelectItem>
                        <SelectItem value="urgent">{isRTL ? 'عاجل' : 'Urgent'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => submitMaintenance.mutate()} disabled={!maintTitle.trim() || submitMaintenance.isPending}>
                        <Send className="w-3.5 h-3.5" />{t('maintenance.submit')}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setShowMaintForm(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={() => setShowMaintForm(true)}>
                    <Plus className="w-3.5 h-3.5" />{t('maintenance.new')}
                  </Button>
                )}
              </div>
            )}

            {maintenanceReqs && maintenanceReqs.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {maintenanceReqs.map(req => {
                  const rTitle = language === 'ar' ? req.title_ar : (req.title_en || req.title_ar);
                  const rDesc = language === 'ar' ? req.description_ar : (req.description_en || req.description_ar);
                  const rCfg = statusConfig[req.status] || statusConfig.draft;
                  return (
                    <div key={req.id} className="p-3 sm:p-5 rounded-xl bg-card border border-border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-heading font-semibold text-xs sm:text-base text-foreground truncate">{rTitle}</h4>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-body mt-0.5" dir="ltr">{req.request_number}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={`${priorityColors[req.priority] || ''} text-[9px] sm:text-xs`}>{req.priority}</Badge>
                          <Badge className={`${rCfg.color} text-[9px] sm:text-xs`}>{t(`maintenance.${req.status}` as any)}</Badge>
                        </div>
                      </div>
                      {rDesc && <p className="text-[10px] sm:text-sm text-muted-foreground font-body line-clamp-2">{rDesc}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(req.created_at)}</span>
                        {req.scheduled_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(req.scheduled_date)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 sm:py-12">
                <Wrench className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-body text-sm">{t('common.no_results')}</p>
              </div>
            )}
          </TabsContent>

          {/* Terms */}
          {terms && (
            <TabsContent value="terms">
              <div className="p-4 sm:p-6 rounded-xl bg-card border border-border">
                <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{terms}</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default ContractDetail;
