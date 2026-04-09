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
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-700' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-700' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
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
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
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
        <div className="container py-20 space-y-6">
          <Skeleton className="h-12 w-1/2 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30" />
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
      <div className="bg-primary pt-24 pb-6">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-foreground">{title}</h1>
            <p className="text-primary-foreground/60 text-xs font-body" dir="ltr">{contract.contract_number}</p>
          </div>
          {canAccept && contract.status !== 'completed' && contract.status !== 'cancelled' && (
            <Button variant="hero" size="sm" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
              {t('contracts.accept')}
            </Button>
          )}
        </div>
      </div>

      <div className="container py-8">
        {/* Header */}
        <div className="p-6 rounded-xl bg-card border border-border mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading font-bold text-2xl text-foreground">{title}</h1>
                <Badge className={`${cfg.color} gap-1`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {t(`status.${contract.status}` as any)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-body" dir="ltr">{contract.contract_number}</p>
              {desc && <p className="text-sm text-muted-foreground font-body mt-3 leading-relaxed">{desc}</p>}
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="font-heading font-bold text-2xl text-accent">
                {Number(contract.total_amount).toLocaleString()} {contract.currency_code}
              </span>
              <span className="text-xs text-muted-foreground font-body">{t('contracts.total_amount')}</span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground font-body mb-1">{t('contracts.client')}</p>
              <p className="text-sm font-heading font-semibold text-foreground">{clientProfile?.full_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body mb-1">{t('contracts.provider')}</p>
              <p className="text-sm font-heading font-semibold text-foreground">{providerProfile?.full_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body mb-1">{t('contracts.start_date')}</p>
              <p className="text-sm font-body text-foreground">{formatDate(contract.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body mb-1">{t('contracts.end_date')}</p>
              <p className="text-sm font-body text-foreground">{formatDate(contract.end_date)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones">
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap mb-6">
            <TabsTrigger value="milestones" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-5 py-2.5 gap-2">
              <ListChecks className="w-4 h-4" />
              {t('contracts.milestones')} ({totalMilestones})
            </TabsTrigger>
            <TabsTrigger value="warranty" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-5 py-2.5 gap-2">
              <Shield className="w-4 h-4" />
              {t('contracts.warranty')}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-5 py-2.5 gap-2">
              <Wrench className="w-4 h-4" />
              {t('contracts.maintenance')} ({maintenanceReqs?.length || 0})
            </TabsTrigger>
            {terms && (
              <TabsTrigger value="terms" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-5 py-2.5 gap-2">
                <FileText className="w-4 h-4" />
                {t('contracts.terms')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Milestones */}
          <TabsContent value="milestones">
            {/* Progress bar */}
            {totalMilestones > 0 && (
              <div className="p-4 rounded-xl bg-card border border-border mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-body text-muted-foreground">{completedMilestones}/{totalMilestones} {t('contracts.milestones')}</span>
                  <span className="text-sm font-body text-accent font-semibold">{milestonePaid.toLocaleString()} / {Number(contract.total_amount).toLocaleString()} {contract.currency_code}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {milestones?.map((m, idx) => {
                const mTitle = language === 'ar' ? m.title_ar : (m.title_en || m.title_ar);
                const mDesc = language === 'ar' ? m.description_ar : (m.description_en || m.description_ar);
                const mCfg = statusConfig[m.status] || statusConfig.draft;
                return (
                  <div key={m.id} className="p-5 rounded-xl bg-card border border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-foreground">{mTitle}</h4>
                          {mDesc && <p className="text-sm text-muted-foreground font-body mt-1">{mDesc}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-body">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{Number(m.amount).toLocaleString()} {contract.currency_code}</span>
                            {m.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(m.due_date)}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${mCfg.color} text-xs`}>{t(`milestone.${m.status}` as any)}</Badge>
                    </div>
                  </div>
                );
              })}
              {(!milestones || milestones.length === 0) && (
                <p className="text-center py-12 text-muted-foreground font-body">{t('common.no_results')}</p>
              )}
            </div>
          </TabsContent>

          {/* Warranty */}
          <TabsContent value="warranty">
            {warranties && warranties.length > 0 ? (
              <div className="space-y-4">
                {warranties.map(w => {
                  const wTitle = language === 'ar' ? w.title_ar : (w.title_en || w.title_ar);
                  const wDesc = language === 'ar' ? w.description_ar : (w.description_en || w.description_ar);
                  const wCoverage = language === 'ar' ? w.coverage_ar : (w.coverage_en || w.coverage_ar);
                  return (
                    <div key={w.id} className="p-6 rounded-xl bg-card border border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-foreground">{wTitle}</h3>
                            <Badge className="mt-1 text-xs">{t(`warranty.${w.warranty_type}` as any)}</Badge>
                          </div>
                        </div>
                        <Badge className={w.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}>
                          {t(`warranty.${w.status}` as any)}
                        </Badge>
                      </div>
                      {wDesc && <p className="text-sm text-muted-foreground font-body mb-3">{wDesc}</p>}
                      {wCoverage && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs font-heading font-semibold text-foreground mb-1">{t('warranty.coverage')}</p>
                          <p className="text-sm text-muted-foreground font-body">{wCoverage}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(w.start_date)} - {formatDate(w.end_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-body">{t('warranty.no_warranty')}</p>
              </div>
            )}
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance">
            {isClient && (
              <div className="mb-6">
                {showMaintForm ? (
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <h3 className="font-heading font-bold text-foreground">{t('maintenance.new')}</h3>
                    <Input placeholder={t('maintenance.title')} value={maintTitle} onChange={e => setMaintTitle(e.target.value)} />
                    <Textarea placeholder={t('maintenance.description')} value={maintDesc} onChange={e => setMaintDesc(e.target.value)} rows={4} />
                    <Select value={maintPriority} onValueChange={setMaintPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('maintenance.low')}</SelectItem>
                        <SelectItem value="medium">{t('maintenance.medium')}</SelectItem>
                        <SelectItem value="high">{t('maintenance.high')}</SelectItem>
                        <SelectItem value="urgent">{t('maintenance.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="hero" onClick={() => submitMaintenance.mutate()} disabled={!maintTitle || submitMaintenance.isPending} className="gap-2">
                        <Send className="w-4 h-4" />{t('maintenance.submit')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowMaintForm(false)}>{t('contracts.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowMaintForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" />{t('maintenance.new')}
                  </Button>
                )}
              </div>
            )}

            {maintenanceReqs && maintenanceReqs.length > 0 ? (
              <div className="space-y-3">
                {maintenanceReqs.map(req => {
                  const rTitle = language === 'ar' ? req.title_ar : (req.title_en || req.title_ar);
                  const rDesc = language === 'ar' ? req.description_ar : (req.description_en || req.description_ar);
                  return (
                    <div key={req.id} className="p-5 rounded-xl bg-card border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-heading font-semibold text-foreground">{rTitle}</h4>
                          <p className="text-xs text-muted-foreground font-body mt-0.5" dir="ltr">{req.request_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColors[req.priority] || ''} >{t(`maintenance.${req.priority}` as any)}</Badge>
                          <Badge variant="outline">{t(`maintenance.${req.status}` as any)}</Badge>
                        </div>
                      </div>
                      {rDesc && <p className="text-sm text-muted-foreground font-body mt-2">{rDesc}</p>}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(req.created_at)}</span>
                        {req.scheduled_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(req.scheduled_date)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-body">{t('maintenance.no_requests')}</p>
              </div>
            )}
          </TabsContent>

          {/* Terms */}
          {terms && (
            <TabsContent value="terms">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-heading font-bold text-foreground mb-4">{t('contracts.terms')}</h3>
                <div className="prose prose-sm max-w-none font-body text-muted-foreground whitespace-pre-wrap">{terms}</div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default ContractDetail;
