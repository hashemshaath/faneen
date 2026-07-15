import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared';
import { useQuery } from '@tanstack/react-query';
import { listProviderLeads, type ProviderLeadRow } from '@/modules/leads/services/list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, MapPin, Tag, Calendar, ChevronLeft, Sparkles, ShieldCheck, Activity, MapPinned, X } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useProviderActivityPing } from '@/hooks/useProviderActivityPing';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { supabase } from '@/integrations/supabase/client';
import {
  LEAD_STATUS_LABEL_AR, LEAD_STATUS_TONE, type LeadStatus,
  SECTOR_LABEL_AR, TIMELINE_LABEL_AR,
} from '@/lib/quoteRequests';
import {
  computeProviderBidState,
  PROVIDER_BID_STATE_LABEL_AR,
  PROVIDER_BID_STATE_TONE,
  type ProviderBidState,
} from '@/modules/opportunities/journeyState';
import { listMySubmittedBidsForProvider } from '@/modules/opportunities/bids/services';
import { StatusBadge } from '@/components/shared/StatusBadge';

type LeadRow = ProviderLeadRow;

const ProviderLeads: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  useProviderActivityPing(!!user);
  const workspace = useActiveWorkspace();
  const businessId = workspace.active_entity_id;

  // Q2-UI — nudge when the provider has zero coverage rows.
  const coverageCountQ = useQuery({
    queryKey: ['coverage-areas-count', user?.id, businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('business_service_areas')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const [nudgeDismissed, setNudgeDismissed] = React.useState<boolean>(() => {
    try { return localStorage.getItem('qitaat_coverage_nudge_dismissed') === '1'; } catch { return false; }
  });
  const showCoverageNudge = !!businessId && !coverageCountQ.isLoading && (coverageCountQ.data ?? 0) === 0 && !nudgeDismissed;
  const dismissNudge = () => {
    setNudgeDismissed(true);
    try { localStorage.setItem('qitaat_coverage_nudge_dismissed', '1'); } catch { /* noop */ }
  };

  const { data: leads, isLoading } = useQuery({
    queryKey: ['provider-leads', user?.id],
    enabled: !!user,
    queryFn: () => listProviderLeads(),
  });

  // R5.3 — my bids across all opportunities, for chip-state computation.
  const { data: myBids } = useQuery({
    queryKey: ['provider-my-bids', user?.id],
    enabled: !!user?.id,
    queryFn: () => listMySubmittedBidsForProvider(user!.id),
  });

  const [bidStateFilter, setBidStateFilter] = React.useState<ProviderBidState | 'all'>('all');

  // Latest bid per opportunity_id (services returns newest-first).
  const myBidByOpp = React.useMemo(() => {
    const m = new Map<string, { id: string; status: string }>();
    (myBids ?? []).forEach((b) => {
      if (!m.has(b.opportunity_id)) m.set(b.opportunity_id, { id: b.id, status: b.status });
    });
    return m;
  }, [myBids]);

  const stateByLead = React.useMemo(() => {
    const m = new Map<string, ProviderBidState>();
    (leads ?? []).forEach((l) => {
      const oppId = l.quote_request?.id;
      if (!oppId) return;
      m.set(l.id, computeProviderBidState(myBidByOpp.get(oppId) ?? null, null));
    });
    return m;
  }, [leads, myBidByOpp]);

  const filteredLeads = React.useMemo(() => {
    if (bidStateFilter === 'all') return leads ?? [];
    return (leads ?? []).filter((l) => stateByLead.get(l.id) === bidStateFilter);
  }, [leads, stateByLead, bidStateFilter]);

  const stateCounts = React.useMemo(() => {
    const m = new Map<ProviderBidState | 'all', number>();
    m.set('all', leads?.length ?? 0);
    (leads ?? []).forEach((l) => {
      const st = stateByLead.get(l.id);
      if (!st) return;
      m.set(st, (m.get(st) ?? 0) + 1);
    });
    return m;
  }, [leads, stateByLead]);

  const CHIPS: (ProviderBidState | 'all')[] = [
    'all', 'not_submitted', 'submitted', 'revision_requested_by_client',
    'shortlisted', 'won', 'lost',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        <PageHeader
          icon={Sparkles}
          tone="primary"
          eyebrow="الفرص"
          title="فرص عروض الأسعار"
          subtitle="طلبات جديدة تم توجيهها لك بناءً على قطاعك ومدينة خدمتك."
        />

        {showCoverageNudge && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <MapPinned className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm">لم تحدد مناطق التغطية بعد</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                حدد المناطق التي تغطيها لتصلك طلبات عروض الأسعار من عملاء هذه المناطق مباشرة.
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button asChild size="sm" className="min-h-[36px]">
                <Link to="/dashboard/business/coverage">تحديد مناطق التغطية</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissNudge} aria-label="إخفاء التنبيه" className="h-9 w-9 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm">اكتمال ملفك يزيد فرصك</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              تستخدم قطاعات بيانات منشأتك ومناطق خدمتك لتوجيه الطلبات المناسبة لك. حدّث ملفك وأضف مناطق الخدمة لتحصل على فرص أكثر ملاءمة.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild size="sm" variant="outline" className="min-h-[36px]">
              <Link to="/dashboard/business/coverage">مناطق التغطية</Link>
            </Button>
            <Button asChild size="sm" className="min-h-[36px]">
              <Link to="/dashboard/business-edit">تحديث الملف</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (leads?.length ?? 0) === 0 ? (
          <Card><CardContent className="py-14 text-center space-y-3">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="font-heading font-semibold">لا توجد فرص حاليًا</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              عند توفر طلبات مناسبة لقطاعك ومناطق خدمتك، ستظهر هنا.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <Button asChild variant="outline" className="min-h-[40px]">
                <Link to="/dashboard/business/coverage">تحديث مناطق التغطية</Link>
              </Button>
            </div>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(leads?.length ?? 0) > 0 && (
              <div className="md:col-span-2 flex flex-wrap items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground me-1" aria-hidden />
                {CHIPS.map((k) => {
                  const active = bidStateFilter === k;
                  const label = k === 'all' ? 'الكل' : PROVIDER_BID_STATE_LABEL_AR[k as ProviderBidState];
                  const count = stateCounts.get(k) ?? 0;
                  if (k !== 'all' && count === 0 && !active) return null;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setBidStateFilter(k)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-muted/60 border-border text-muted-foreground'
                      }`}
                      aria-pressed={active}
                    >
                      <span>{label}</span>
                      <span className={`tech-content text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {filteredLeads.length === 0 && (
              <div className="md:col-span-2 text-sm text-muted-foreground py-6 text-center">
                لا توجد فرص مطابقة للفلتر الحالي.
              </div>
            )}
            {filteredLeads.map((lead) => {
              const q = lead.quote_request;
              const status = lead.status as LeadStatus;
              const tone = LEAD_STATUS_TONE[status] ?? 'bg-muted';
              const showRevealed = lead.contact_revealed;
              const showAwaiting = status === 'interested' && !lead.contact_revealed;
              const providerState = stateByLead.get(lead.id);
              return (
                <Card key={lead.id} className="hover-lift">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${tone}`}>
                          {LEAD_STATUS_LABEL_AR[status] ?? status}
                        </span>
                        {providerState && (
                          <StatusBadge
                            tone={PROVIDER_BID_STATE_TONE[providerState]}
                            label={PROVIDER_BID_STATE_LABEL_AR[providerState]}
                          />
                        )}
                        {showRevealed && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-success/30 bg-success/5 text-success inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> بيانات التواصل متاحة
                          </span>
                        )}
                        {showAwaiting && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-warning/30 bg-warning/5 text-warning">
                            بانتظار المتابعة
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tech-content">
                        {new Date(lead.created_at).toLocaleDateString('ar-SA-u-nu-latn')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{SECTOR_LABEL_AR[q?.sector ?? ''] ?? q?.sector}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{q?.city}{q?.district ? ` · ${q.district}` : ''}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{TIMELINE_LABEL_AR[q?.execution_timeline ?? ''] ?? q?.execution_timeline}</span>
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-3 leading-6">
                      {q?.project_description}
                    </p>
                    {(lead.match_reasons?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {lead.match_reasons.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">درجة المطابقة: <span className="tech-content">{lead.match_score}</span></span>
                      <Button asChild size="sm" variant="outline" className="min-h-[36px]">
                        <Link to={`/dashboard/provider/leads/${lead.id}`}>
                          عرض التفاصيل <ChevronLeft className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
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

export default ProviderLeads;