import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBusinessesForMyRequests } from '@/modules/leads/services/getBusinessesForMyRequests';
import {
  listMyLeadRequests,
  listMyQuoteRequests,
  countQuoteRequestFiles,
} from '@/modules/leads/services/list';
import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';
import { notifyCustomerLeadUpdate } from '@/modules/leads/services/notifyCustomerLeadUpdate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Inbox, ChevronDown, ChevronUp, Send, Eye, HelpCircle, CheckCircle2,
  XCircle, Archive, X, Wallet, FileText, MessageSquare, Loader2, ReceiptText, Calendar,
  Paperclip, MapPin, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { trackEvent } from '@/lib/analytics-events';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';

interface MyLeadRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string | null;
  subject: string | null;
  status: string;
  contact_preference: string | null;
  budget_range: string | null;
  project_scope: string | null;
  created_at: string;
  updated_at: string | null;
  viewed_at: string | null;
  needs_info_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  conversation_id: string | null;
  quoted_at: string | null;
  quote_amount: number | string | null;
  quote_currency: string | null;
  quote_note: string | null;
  quote_valid_until: string | null;
}

function safeTrack(event: Parameters<typeof trackEvent>[0], payload: Parameters<typeof trackEvent>[1]) {
  try { trackEvent(event, payload); } catch { /* analytics must not throw */ }
}

const CANCELLABLE = new Set(['new', 'viewed', 'needs_info']);

interface QuoteRequestRow {
  id: string;
  ref_id: string | null;
  sector: string;
  city: string;
  district: string | null;
  project_description: string;
  status: string;
  preferred_contact_method: string;
  created_at: string;
  updated_at: string;
}

const QUOTE_STATUS_LABEL_AR: Record<string, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  matched: 'تم توجيهه لمزودين',
  contacted: 'تم التواصل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};
const QUOTE_STATUS_LABEL_EN: Record<string, string> = {
  new: 'New',
  under_review: 'Under review',
  matched: 'Matched',
  contacted: 'Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const QUOTE_STATUS_TONE: Record<string, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  matched: 'bg-info/10 text-info border-info/30',
  contacted: 'bg-success/10 text-success border-success/30',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

const DashboardMyRequests: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['my-service-requests', user?.id],
    enabled: !!user?.id,
    queryFn: () => listMyLeadRequests(user!.id) as unknown as Promise<MyLeadRow[]>,
  });

  const { data: quoteRequests, isLoading: loadingQuotes } = useQuery({
    queryKey: ['my-quote-requests', user?.id],
    enabled: !!user?.id,
    queryFn: () => listMyQuoteRequests(user!.id) as unknown as Promise<QuoteRequestRow[]>,
  });

  const quoteIds = useMemo(() => (quoteRequests ?? []).map((q) => q.id), [quoteRequests]);
  const { data: quoteFileCounts } = useQuery({
    queryKey: ['my-quote-file-counts', quoteIds.join(',')],
    enabled: quoteIds.length > 0,
    queryFn: () => countQuoteRequestFiles(quoteIds),
  });

  const businessIds = useMemo(
    () => Array.from(new Set((leads ?? []).map((l) => l.business_id))).filter(Boolean),
    [leads],
  );

  const { data: businesses } = useQuery({
    queryKey: ['my-requests-businesses', businessIds.join(',')],
    enabled: businessIds.length > 0,
    queryFn: () => getBusinessesForMyRequests(businessIds),
  });

  const businessMap = useMemo(() => {
    const m = new Map<string, { name: string; username: string | null }>();
    (businesses ?? []).forEach((b) => {
      const name = (isRTL ? b.name_ar : b.name_en) ?? b.name_ar ?? b.name_en ?? '—';
      m.set(b.id, { name, username: b.username ?? null });
    });
    return m;
  }, [businesses, isRTL]);

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await updateLeadRequestStatus(id, 'cancelled');
      try {
        await notifyCustomerLeadUpdate({ lead_id: id, status: 'cancelled' });
      } catch { /* fail-soft */ }
    },
    onMutate: (id) => setPendingId(id),
    onSuccess: (_void, id) => {
      const lead = leads?.find((l) => l.id === id);
      safeTrack('service_request_cancelled', {
        source_page: 'dashboard_my_requests',
        outcome: 'cancelled',
        has_budget: !!lead?.budget_range,
      } as Parameters<typeof trackEvent>[1]);
      toast.success(isRTL ? 'تم إلغاء الطلب' : 'Request cancelled');
      qc.invalidateQueries({ queryKey: ['my-service-requests'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Cancel failed';
      toast.error(isRTL ? `تعذر الإلغاء: ${msg}` : `Cancel failed: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  const handleToggle = (id: string) => {
    setOpenId((curr) => {
      if (curr === id) return null;
      safeTrack('service_request_customer_viewed', {
        source_page: 'dashboard_my_requests',
      } as Parameters<typeof trackEvent>[1]);
      return id;
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <header>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            {isRTL ? 'طلباتي' : 'My Requests'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'تابع حالة طلبات الخدمة التي أرسلتها للمنشآت' : 'Track the status of the service requests you sent to providers'}
          </p>
        </header>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        )}

        {/* === Quote requests section === */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-base sm:text-lg flex items-center gap-2">
              <ReceiptText className="h-4 w-4" />
              {isRTL ? 'طلبات عروض الأسعار' : 'Quote requests'}
            </h2>
            <Button asChild size="sm" variant="outline" className="min-h-[40px]">
              <Link to="/quote">{isRTL ? 'طلب جديد' : 'New request'}</Link>
            </Button>
          </div>

          {loadingQuotes && (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          )}

          {!loadingQuotes && (quoteRequests?.length ?? 0) === 0 && (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="font-medium">{isRTL ? 'لا توجد طلبات حتى الآن' : 'No quote requests yet'}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? 'ابدأ بإرسال طلب عرض سعر، وسنساعدك على تنظيم تفاصيله حسب القطاع والمدينة.'
                    : 'Send a quote request and we will help organize the details by sector and city.'}
                </p>
                <Button asChild className="min-h-[44px]">
                  <Link to="/quote">{isRTL ? 'اطلب عرض سعر' : 'Request a quote'}</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(quoteRequests ?? []).map((q) => {
            const fileCount = quoteFileCounts?.get(q.id) ?? 0;
            const tone = QUOTE_STATUS_TONE[q.status] ?? 'bg-muted text-muted-foreground border-border';
            return (
              <Card key={q.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {q.ref_id ? (
                      <>
                        <ReferenceBadge refId={q.ref_id} />
                        <ReferenceLinkCopy refId={q.ref_id} isRTL={isRTL} />
                      </>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground tech-content">#{q.id.slice(0, 8)}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${tone}`}>
                      {isRTL ? QUOTE_STATUS_LABEL_AR[q.status] : QUOTE_STATUS_LABEL_EN[q.status]}
                    </span>
                    <span className="text-xs text-muted-foreground tech-content ms-auto">
                      {new Date(q.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="h-4 w-4" /> {q.sector}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {q.city}{q.district ? ` · ${q.district}` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" /> {q.preferred_contact_method}
                    </span>
                    {fileCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Paperclip className="h-4 w-4" /> {fileCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2">{q.project_description}</p>
                  <div className="pt-1">
                    <Button asChild size="sm" variant="outline" className="min-h-[36px]">
                      <Link to={`/dashboard/my-requests/${q.id}`}>
                        {isRTL ? 'عرض التفاصيل' : 'View details'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {!isLoading && (leads?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="py-14 text-center space-y-4">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {isRTL ? 'لا توجد طلبات خدمة حتى الآن' : 'No service requests yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL ? 'ابدأ بتصفح المنشآت أو القطاعات وأرسل طلب عرض سعر.' : 'Browse providers or sectors to send a quote request.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button asChild className="min-h-[44px]">
                  <Link to="/search">{isRTL ? 'البحث عن مزودين' : 'Search providers'}</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-[44px]">
                  <Link to="/sectors">{isRTL ? 'القطاعات' : 'Sectors'}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {(leads ?? []).map((lead) => {
            const open = openId === lead.id;
            const biz = businessMap.get(lead.business_id);
            const canCancel = CANCELLABLE.has(lead.status);
            return (
              <Card key={lead.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(lead.id)}
                    className="w-full text-start p-4 sm:p-5 flex flex-wrap items-center gap-3 hover:bg-muted/40 transition-colors min-h-[64px]"
                    aria-expanded={open}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground tech-content">{lead.ref_id ?? '—'}</span>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                      <div className="font-medium truncate">
                        {lead.subject || (biz?.name ?? (isRTL ? 'طلب خدمة' : 'Service request'))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {biz?.name ?? '—'} · {new Date(lead.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                      </div>
                    </div>
                    {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {open && (
                    <div className="border-t border-border p-4 sm:p-5 space-y-5 bg-muted/20">
                      {/* Timeline */}
                      <ol className="space-y-2.5" aria-label={isRTL ? 'الجدول الزمني' : 'Timeline'}>
                        <TimelineItem icon={<Send className="h-4 w-4" />} label={isRTL ? 'تم الإرسال' : 'Sent'} at={lead.created_at} done isRTL={isRTL} />
                        <TimelineItem icon={<Eye className="h-4 w-4" />} label={isRTL ? 'تمت المشاهدة' : 'Viewed by provider'} at={lead.viewed_at} done={!!lead.viewed_at} isRTL={isRTL} />
                        {lead.needs_info_at && (
                          <TimelineItem icon={<HelpCircle className="h-4 w-4" />} label={isRTL ? 'بحاجة معلومات' : 'Needs info'} at={lead.needs_info_at} done isRTL={isRTL} tone="warning" />
                        )}
                        {lead.accepted_at && (
                          <TimelineItem icon={<CheckCircle2 className="h-4 w-4" />} label={isRTL ? 'تم القبول' : 'Accepted'} at={lead.accepted_at} done isRTL={isRTL} tone="success" />
                        )}
                        {lead.rejected_at && (
                          <TimelineItem icon={<XCircle className="h-4 w-4" />} label={isRTL ? 'تم الرفض' : 'Rejected'} at={lead.rejected_at} done isRTL={isRTL} tone="danger" />
                        )}
                        {lead.cancelled_at && (
                          <TimelineItem icon={<X className="h-4 w-4" />} label={isRTL ? 'تم الإلغاء' : 'Cancelled'} at={lead.cancelled_at} done isRTL={isRTL} />
                        )}
                        {lead.quoted_at && (
                          <TimelineItem icon={<ReceiptText className="h-4 w-4" />} label={isRTL ? 'تم إرسال عرض سعر' : 'Quote sent'} at={lead.quoted_at} done isRTL={isRTL} tone="success" />
                        )}
                        {lead.closed_at && (
                          <TimelineItem icon={<Archive className="h-4 w-4" />} label={isRTL ? 'مغلق' : 'Closed'} at={lead.closed_at} done isRTL={isRTL} />
                        )}
                      </ol>

                      {lead.status === 'quoted' && lead.quote_amount != null && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <ReceiptText className="h-4 w-4 text-primary" />
                            <h4 className="font-medium text-sm">{isRTL ? 'عرض السعر المستلم' : 'Quote received'}</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                              <span className="tech-content font-medium">
                                {Number(lead.quote_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} {lead.quote_currency ?? 'SAR'}
                              </span>
                            </div>
                            {lead.quote_valid_until && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="tech-content">{isRTL ? 'صالح حتى: ' : 'Valid until: '}{lead.quote_valid_until}</span>
                              </div>
                            )}
                            {lead.quote_note && (
                              <div className="sm:col-span-2 flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <p className="leading-6 whitespace-pre-wrap text-foreground/90">{lead.quote_note}</p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground pt-1">
                            {isRTL ? 'يمكنك التواصل مع المزود عبر المحادثة لمناقشة التفاصيل.' : 'You can chat with the provider to discuss the details.'}
                          </p>
                        </div>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {lead.contact_preference && (
                          <DetailRow icon={<MessageSquare className="h-4 w-4" />} label={isRTL ? 'وسيلة التواصل' : 'Contact preference'} value={lead.contact_preference} />
                        )}
                        {lead.budget_range && (
                          <DetailRow icon={<Wallet className="h-4 w-4" />} label={isRTL ? 'الميزانية' : 'Budget'} value={lead.budget_range} />
                        )}
                        {lead.project_scope && (
                          <div className="sm:col-span-2 flex items-start gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 mt-0.5" />
                            <span className="leading-6 text-foreground/90">{lead.project_scope}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {lead.conversation_id && (lead.status === 'accepted' || lead.status === 'needs_info' || lead.status === 'quoted') && (
                          <Button
                            asChild
                            variant="default"
                            className="min-h-[44px]"
                            onClick={() => safeTrack('service_request_conversation_opened', {
                              source_page: 'dashboard_my_requests',
                              outcome: lead.status,
                              is_authenticated: true,
                            } as Parameters<typeof trackEvent>[1])}
                          >
                            <Link to={`/dashboard/messages?conversation=${lead.conversation_id}`}>
                              <MessageSquare />
                              <span>{isRTL ? 'فتح المحادثة' : 'Open conversation'}</span>
                            </Link>
                          </Button>
                        )}
                        {biz?.username && (
                          <Button asChild variant="outline" className="min-h-[44px]">
                            <Link to={`/${biz.username}`}>
                              {isRTL ? 'فتح ملف المنشأة' : 'Open provider profile'}
                            </Link>
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            variant="outline"
                            className="min-h-[44px] text-destructive hover:text-destructive"
                            disabled={pendingId === lead.id}
                            onClick={() => {
                              if (window.confirm(isRTL ? 'هل تريد إلغاء هذا الطلب؟' : 'Cancel this request?')) {
                                cancelMutation.mutate(lead.id);
                              }
                            }}
                            aria-label={isRTL ? 'إلغاء الطلب' : 'Cancel request'}
                          >
                            {pendingId === lead.id ? <Loader2 className="animate-spin" /> : <X />}
                            <span>{isRTL ? 'إلغاء الطلب' : 'Cancel request'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

const TimelineItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  at: string | null;
  done: boolean;
  isRTL: boolean;
  tone?: 'success' | 'danger' | 'warning';
}> = ({ icon, label, at, done, isRTL, tone }) => {
  const toneCls =
    tone === 'success' ? 'bg-success/10 text-success border-success/30' :
    tone === 'danger' ? 'bg-destructive/10 text-destructive border-destructive/30' :
    tone === 'warning' ? 'bg-warning/10 text-warning border-warning/30' :
    done ? 'bg-muted text-foreground border-border' : 'bg-background text-muted-foreground border-border';
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${toneCls}`}>
        {icon}
      </span>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      {at && (
        <span className="text-xs text-muted-foreground tech-content">
          · {new Date(at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
        </span>
      )}
    </li>
  );
};

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    {icon}
    <span className="text-foreground/80"><strong className="font-medium text-foreground">{label}:</strong> {value}</span>
  </div>
);

export default DashboardMyRequests;