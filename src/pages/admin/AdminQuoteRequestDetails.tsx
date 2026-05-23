import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications/services/createNotification';
import {
  getAdminQuoteRequestById,
  listAdminQuoteRequestFiles,
  listAdminQuoteRequestLeads,
  listAdminQuoteRequestEvents,
  listAdminQuoteRequestLeadEvents,
  updateQuoteRequestById,
  insertQuoteRequestEvent,
  adminRevealLeadContact,
  matchQuoteRequest,
} from '@/modules/quotes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, ArrowRight, Loader2, Phone, Copy, MessageCircle, FileText, Download,
  AlertCircle, MapPin, Tag, Calendar, Wallet, User, Mail, Save, Lock, Send, Users,
  CheckCircle2, XCircle, Sparkles, Eye, ShieldCheck, Activity, RefreshCw, ChevronDown,
  ChevronUp, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { trackEvent } from '@/lib/analytics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { PROVIDER_COMMERCIAL_CONFIG } from '@/lib/providerCommercialConfig';
import {
  QUOTE_STATUS_LABEL_AR, QUOTE_STATUS_TONE, QUOTE_STATUSES,
  CUSTOMER_TYPE_LABEL_AR, CONTACT_METHOD_LABEL_AR, SERVICE_LOCATION_LABEL_AR,
  TIMELINE_LABEL_AR, SECTOR_LABEL_AR, createSignedQuoteFileUrl, formatFileSize,
  normalizePhoneForWhatsApp, type QuoteStatus,
  LEAD_STATUS_LABEL_AR, LEAD_STATUS_TONE, type LeadStatus,
} from '@/lib/quoteRequests';

interface AdminQuoteRow {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_type: string;
  preferred_contact_method: string;
  sector: string;
  city: string;
  district: string | null;
  service_location_type: string;
  project_description: string;
  approx_dimensions: string | null;
  quantity: string | null;
  execution_timeline: string;
  has_budget: boolean;
  budget_amount: number | null;
  budget_note: string | null;
  status: string;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface FileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
}

interface LeadSummaryRow {
  id: string;
  status: string;
  match_score: number;
  match_reasons: string[];
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  contact_revealed: boolean;
  contact_revealed_at: string | null;
  contact_view_count: number;
  provider: { id: string; name_ar: string; city_id: string | null } | null;
}

interface StatusHistoryEntry {
  status: string;
  changed_at: string;
  changed_by: string | null;
}

const AdminQuoteRequestDetails: React.FC = () => {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const Back = isRTL ? ArrowRight : ArrowLeft;

  const [adminNotes, setAdminNotes] = useState('');
  const [pendingStatus, setPendingStatus] = useState<QuoteStatus | ''>('');
  const [revealLeadId, setRevealLeadId] = useState<string | null>(null);
  const [revealNote, setRevealNote] = useState('');
  const [revealOverride, setRevealOverride] = useState(false);
  const [leadFilter, setLeadFilter] = useState<'all' | 'interested' | 'pending_reveal' | 'revealed'>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'quote' | 'lead' | 'matching' | 'interest' | 'contact'>('all');
  const [eventOrderDesc, setEventOrderDesc] = useState(true);
  const [rawEventId, setRawEventId] = useState<string | null>(null);

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['admin-quote-request', id],
    enabled: !!id,
    queryFn: async () => {
      return await getAdminQuoteRequestById<AdminQuoteRow>(id!);
    },
  });

  useEffect(() => {
    if (quote) {
      const md = (quote.metadata ?? {}) as Record<string, unknown>;
      setAdminNotes(typeof md.admin_notes === 'string' ? md.admin_notes : '');
      setPendingStatus(quote.status as QuoteStatus);
    }
  }, [quote]);

  const { data: files } = useQuery({
    queryKey: ['admin-quote-files', id],
    enabled: !!id && !!quote,
    queryFn: async () => {
      return (await listAdminQuoteRequestFiles(id!)) as FileRow[];
    },
  });

  const { data: leads, refetch: refetchLeads } = useQuery({
    queryKey: ['admin-quote-leads', id],
    enabled: !!id,
    queryFn: async () => {
      return await listAdminQuoteRequestLeads<LeadSummaryRow>(id!);
    },
  });

  const revealMutation = useMutation({
    mutationFn: async (vars: { lead_id: string; note: string; override_credit_check?: boolean }) => {
      trackEvent('admin_contact_reveal_clicked', { lead_id: vars.lead_id });
      const { data, error } = await adminRevealLeadContact({
        lead_id: vars.lead_id,
        note: vars.note || undefined,
        override_credit_check: vars.override_credit_check || undefined,
      });
      if (error) throw error;
      return data as { success: boolean; message?: string };
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success('تمت إتاحة بيانات التواصل للمزود');
        trackEvent('admin_contact_revealed', { lead_id: revealLeadId });
      } else {
        toast.error(res?.message ?? 'تعذر إتاحة بيانات التواصل');
      }
      setRevealLeadId(null);
      setRevealNote('');
      setRevealOverride(false);
      refetchLeads();
    },
    onError: () => toast.error('تعذر إتاحة بيانات التواصل'),
  });

  // Active reveal lead → look up provider business + subscription for commercial info
  const revealLeadRow = (leads ?? []).find((l) => l.id === revealLeadId) ?? null;
  const revealProviderBizId = revealLeadRow?.provider?.id ?? null;
  const { data: revealSub } = useQuery({
    queryKey: ['reveal-sub', revealProviderBizId],
    enabled: !!revealProviderBizId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_subscriptions')
        .select('lead_credits_balance, status, plan:provider_plans(name_ar, lead_credits_per_month)')
        .eq('business_id', revealProviderBizId!)
        .maybeSingle();
      if (error) throw error;
      return data as { lead_credits_balance: number; status: string; plan: { name_ar: string; lead_credits_per_month: number } | null } | null;
    },
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      trackEvent('quote_matching_started', { quote_request_id: id });
      const { data, error } = await matchQuoteRequest({ quote_request_id: id, limit: 10 });
      if (error) throw error;
      return data as {
        success: boolean; matched_count: number; message?: string;
        candidates_evaluated?: number; top_score?: number; avg_score?: number;
        reason_counts?: Record<string, number>;
      };
    },
    onSuccess: (res) => {
      if (res?.success) toast.success(`تم توجيه الطلب إلى ${res.matched_count} مزودين`);
      else toast.message(res?.message ?? 'لم يتم العثور على مزودين مناسبين حاليًا');
      trackEvent('quote_matching_completed', { matched: res?.matched_count ?? 0 });
      refetchLeads();
      qc.invalidateQueries({ queryKey: ['admin-quote-request', id] });
      qc.invalidateQueries({ queryKey: ['admin-quote-events', id] });
    },
    onError: () => toast.error('تعذر تشغيل عملية التوجيه'),
  });

  // Events timeline (admin only)
  type QuoteEventRow = {
    id: string; event_type: string; actor_user_id: string | null;
    metadata: Record<string, unknown> | null; created_at: string;
    source: 'quote' | 'lead'; lead_id?: string | null;
    provider_name?: string | null;
  };
  const eventsQuery = useQuery({
    queryKey: ['admin-quote-events', id],
    enabled: !!id,
    queryFn: async (): Promise<QuoteEventRow[]> => {
      const [qe, le] = await Promise.all([
        listAdminQuoteRequestEvents(id!),
        listAdminQuoteRequestLeadEvents<{
          id: string; event_type: string; actor_user_id: string | null;
          metadata: Record<string, unknown> | null; created_at: string; lead_id: string;
          lead?: { provider?: { name_ar: string | null } | null } | null;
        }>(id!),
      ]);
      if (qe.error) throw qe.error;
      if (le.error) throw le.error;
      const rows: QuoteEventRow[] = [];
      for (const r of (qe.data ?? [])) {
        rows.push({
          id: r.id, event_type: r.event_type, actor_user_id: r.actor_user_id,
          metadata: (r.metadata as Record<string, unknown>) ?? null,
          created_at: r.created_at, source: 'quote',
        });
      }
      for (const r of (le.data ?? [])) {
        rows.push({
          id: r.id, event_type: r.event_type, actor_user_id: r.actor_user_id,
          metadata: r.metadata ?? null, created_at: r.created_at, source: 'lead',
          lead_id: r.lead_id, provider_name: r.lead?.provider?.name_ar ?? null,
        });
      }
      return rows;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (vars: { newStatus: QuoteStatus; notes: string; statusChanged: boolean }) => {
      if (!quote) throw new Error('no quote');
      const md = (quote.metadata ?? {}) as Record<string, unknown>;
      const history = Array.isArray(md.status_history) ? md.status_history as StatusHistoryEntry[] : [];
      const newMd: Record<string, unknown> = { ...md, admin_notes: vars.notes };
      if (vars.statusChanged) {
        newMd.status_history = [
          ...history,
          { status: vars.newStatus, changed_at: new Date().toISOString(), changed_by: user?.id ?? null },
        ];
      }
      const { error } = await updateQuoteRequestById({
        id: quote.id,
        values: {
          status: vars.newStatus,
          metadata: newMd,
        },
      });
      if (error) throw error;

      // Audit: quote_status_changed (+ specific event for key transitions)
      if (vars.statusChanged) {
        const previousStatus = quote.status;
        await insertQuoteRequestEvent({
          quote_request_id: quote.id,
          event_type: 'quote_status_changed',
          actor_user_id: user?.id ?? null,
          metadata: {
            previous_status: previousStatus,
            new_status: vars.newStatus,
            has_admin_notes: !!vars.notes,
          },
        });
        const specific: Record<string, string> = {
          contacted: 'quote_contacted',
          completed: 'quote_completed',
          cancelled: 'quote_cancelled',
        };
        const specificType = specific[vars.newStatus];
        if (specificType) {
          await insertQuoteRequestEvent({
            quote_request_id: quote.id,
            event_type: specificType,
            actor_user_id: user?.id ?? null,
            metadata: { previous_status: previousStatus },
          });
        }
      }

      // Notify owner if status actually changed
      if (vars.statusChanged && quote.user_id) {
        const titleMap: Record<QuoteStatus, string> = {
          new: 'تحديث طلبك',
          under_review: 'طلبك قيد المراجعة',
          matched: 'تم توجيه طلبك لمزودين',
          contacted: 'تم التواصل بخصوص طلبك',
          completed: 'تم إغلاق طلبك كمكتمل',
          cancelled: 'تم إلغاء الطلب',
        };
        await createNotification({
          user_id: quote.user_id,
          notification_type: 'quote_request_status_updated',
          title_ar: titleMap[vars.newStatus],
          title_en: 'Quote request updated',
          body_ar: 'تم تحديث حالة طلب عرض السعر الخاص بك في قطاعات.',
          body_en: 'Your quote request status has been updated.',
          reference_id: quote.id,
          reference_type: 'quote_request',
          action_url: `/dashboard/my-requests/${quote.id}`,
        });
      }
    },
    onSuccess: () => {
      toast.success('تم حفظ التحديثات');
      qc.invalidateQueries({ queryKey: ['admin-quote-request', id] });
      qc.invalidateQueries({ queryKey: ['admin-quote-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-quote-events', id] });
      // Auto-route to providers when admin moves the quote into review.
      if (pendingStatus === 'under_review' && quote?.status !== 'under_review') {
        matchMutation.mutate();
      }
    },
    onError: () => toast.error('تعذر حفظ التحديثات'),
  });

  const openFile = async (path: string) => {
    const url = await createSignedQuoteFileUrl(path);
    if (!url) { toast.error('تعذر عرض الملف حاليًا'); return; }
    window.open(url, '_blank', 'noopener');
  };

  const copyPhone = async () => {
    if (!quote) return;
    try {
      await navigator.clipboard.writeText(quote.customer_phone);
      toast.success('تم نسخ رقم الجوال');
    } catch { toast.error('تعذر النسخ'); }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-3 max-w-4xl">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quote) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl"><CardContent className="py-14 text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-heading font-bold text-xl">لم يتم العثور على الطلب</h1>
          <Button asChild className="min-h-[44px]">
            <Link to="/admin/quote-requests"><Back className="h-4 w-4" /> العودة للقائمة</Link>
          </Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const status = quote.status as QuoteStatus;
  const tone = QUOTE_STATUS_TONE[status] ?? 'bg-muted text-foreground border-border';
  const waPhone = normalizePhoneForWhatsApp(quote.customer_phone);
  const waMsg = encodeURIComponent(
    `مرحبًا ${quote.customer_name}، وصلنا طلب عرض السعر الخاص بك عبر منصة قطاعات بخصوص ${SECTOR_LABEL_AR[quote.sector] ?? quote.sector} في ${quote.city}. نحتاج تأكيد بعض التفاصيل لمساعدتك بشكل أفضل.`,
  );
  const md = (quote.metadata ?? {}) as Record<string, unknown>;
  const statusHistory = Array.isArray(md.status_history) ? (md.status_history as StatusHistoryEntry[]) : [];
  const statusChanged = pendingStatus !== quote.status;
  const notesChanged = adminNotes !== (typeof md.admin_notes === 'string' ? md.admin_notes : '');
  const dirty = statusChanged || notesChanged;

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl">طلب عرض سعر <span className="font-mono text-base text-muted-foreground tech-content">#{quote.id.slice(-6)}</span></h1>
            <p className="text-sm text-muted-foreground mt-1">إدارة الطلب وتحديث حالته.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="min-h-[40px] shrink-0">
            <Link to="/admin/quote-requests"><Back className="h-4 w-4" /> العودة للقائمة</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main */}
          <div className="lg:col-span-2 space-y-4">
            <Card><CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${tone}`}>
                  {QUOTE_STATUS_LABEL_AR[status] ?? status}
                </span>
                <span className="text-xs text-muted-foreground">المصدر: {quote.source}</span>
                <span className="text-xs text-muted-foreground tech-content ms-auto">
                  {new Date(quote.created_at).toLocaleString('ar-SA-u-nu-latn')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                <Info icon={<User className="h-4 w-4" />} label="الاسم" value={quote.customer_name} />
                <Info icon={<Phone className="h-4 w-4" />} label="رقم الجوال" value={
                  <span className="inline-flex items-center gap-2">
                    <span className="tech-content">{quote.customer_phone}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyPhone}><Copy className="h-3 w-3" /></Button>
                  </span>
                } />
                {quote.customer_email && <Info icon={<Mail className="h-4 w-4" />} label="البريد" value={quote.customer_email} />}
                <Info label="نوع العميل" value={CUSTOMER_TYPE_LABEL_AR[quote.customer_type] ?? quote.customer_type} />
                <Info label="طريقة التواصل" value={CONTACT_METHOD_LABEL_AR[quote.preferred_contact_method] ?? quote.preferred_contact_method} />
                <Info icon={<Tag className="h-4 w-4" />} label="القطاع" value={SECTOR_LABEL_AR[quote.sector] ?? quote.sector} />
                <Info icon={<MapPin className="h-4 w-4" />} label="المدينة" value={quote.city + (quote.district ? ` · ${quote.district}` : '')} />
                <Info label="مكان الخدمة" value={SERVICE_LOCATION_LABEL_AR[quote.service_location_type] ?? quote.service_location_type} />
                <Info icon={<Calendar className="h-4 w-4" />} label="موعد التنفيذ" value={TIMELINE_LABEL_AR[quote.execution_timeline] ?? quote.execution_timeline} />
                {quote.approx_dimensions && <Info label="المقاسات" value={quote.approx_dimensions} />}
                {quote.quantity && <Info label="الكمية" value={quote.quantity} />}
                <Info icon={<Wallet className="h-4 w-4" />} label="ميزانية" value={
                  quote.has_budget
                    ? (quote.budget_amount ? `${Number(quote.budget_amount).toLocaleString('en-US')} ر.س` : 'نعم')
                    : (quote.budget_note === 'after-quotes' ? 'بعد العروض' : 'بدون')
                } />
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">وصف المشروع</div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-6">{quote.project_description}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild className="min-h-[40px]" variant="default">
                  <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> افتح واتساب
                  </a>
                </Button>
                <Button asChild variant="outline" className="min-h-[40px]">
                  <a href={`tel:${quote.customer_phone}`}><Phone className="h-4 w-4" /> اتصال</a>
                </Button>
              </div>
            </CardContent></Card>

            {/* Files */}
            <Card><CardContent className="p-5 space-y-3">
              <h2 className="font-heading font-semibold text-base">الملفات المرفقة</h2>
              {(files?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد ملفات.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(files ?? []).map((f) => (
                    <li key={f.id} className="py-2.5 flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground tech-content">{formatFileSize(f.file_size)} {f.file_type ? `· ${f.file_type}` : ''}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openFile(f.file_path)} className="min-h-[36px]">
                        <Download className="h-3.5 w-3.5" /> عرض
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>

            {statusHistory.length > 0 && (
              <Card><CardContent className="p-5 space-y-2">
                <h2 className="font-heading font-semibold text-base">سجل الحالة</h2>
                <ul className="space-y-1.5 text-sm">
                  {statusHistory.slice().reverse().map((e, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${QUOTE_STATUS_TONE[e.status as QuoteStatus] ?? ''}`}>
                        {QUOTE_STATUS_LABEL_AR[e.status as QuoteStatus] ?? e.status}
                      </span>
                      <span className="text-xs text-muted-foreground tech-content">
                        {new Date(e.changed_at).toLocaleString('ar-SA-u-nu-latn')}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent></Card>
            )}

            {/* Provider matching */}
            <Card><CardContent className="p-5 space-y-3">
              {/* Readiness checklist */}
              {(() => {
                const checks = [
                  { ok: !!quote.sector, label: 'القطاع موجود' },
                  { ok: !!quote.city, label: 'المدينة موجودة' },
                  { ok: (quote.project_description ?? '').length >= 30, label: 'الوصف واضح' },
                  { ok: (files?.length ?? 0) > 0, label: 'صور أو ملفات مرفقة' },
                  { ok: !!quote.approx_dimensions, label: 'المقاسات مذكورة' },
                  { ok: !!quote.district, label: 'الحي موجود' },
                ];
                const ready = checks.filter((c) => c.ok).length;
                return (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">جاهزية الطلب للتوجيه</h3>
                      <span className="text-xs text-muted-foreground tech-content">{ready}/{checks.length}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">كلما كانت بيانات الطلب أوضح، كانت المطابقة أفضل.</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                      {checks.map((c, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          {c.ok
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> توجيه الطلب للمزودين
                </h2>
                <Button
                  size="sm" className="min-h-[36px]"
                  onClick={() => matchMutation.mutate()}
                  disabled={matchMutation.isPending}
                >
                  {matchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  تشغيل المطابقة الذكية
                </Button>
              </div>
              {quote.status === 'new' && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs text-warning">
                  يفضّل مراجعة الطلب قبل توجيهه للمزودين.
                </div>
              )}
              {quote.status === 'under_review' && (
                <div className="rounded-md border border-info/30 bg-info/5 p-2.5 text-xs text-info">
                  الطلب جاهز للتوجيه للمزودين المناسبين.
                </div>
              )}
              {matchMutation.data?.success && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
                  <div>أعلى درجة مطابقة: <span className="tech-content font-bold">{matchMutation.data.top_score}</span></div>
                  <div>متوسط الدرجة: <span className="tech-content font-bold">{matchMutation.data.avg_score}</span></div>
                  {matchMutation.data.reason_counts && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(matchMutation.data.reason_counts).slice(0, 6).map(([r, n]) => (
                        <span key={r} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r} · {n}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const list = leads ?? [];
                const interestedCount = list.filter((l) => l.status === 'interested').length;
                const viewedCount = list.filter((l) => l.viewed_at).length;
                const notInterested = list.filter((l) => l.status === 'not_interested').length;
                const pending = list.filter((l) => !l.viewed_at).length;
                const revealedCount = list.filter((l) => l.contact_revealed).length;
                const totalContactViews = list.reduce((sum, l) => sum + (l.contact_view_count ?? 0), 0);
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <Stat label="موجه لهم" value={list.length} />
                      <Stat label="شاهدوا" value={viewedCount} />
                      <Stat label="مهتمون" value={interestedCount} />
                      <Stat label="غير مناسب" value={notInterested} />
                      <Stat label="بيانات متاحة" value={revealedCount} />
                      <Stat label="بانتظار الإتاحة" value={Math.max(0, interestedCount - revealedCount)} />
                      <Stat label="مرات عرض البيانات" value={totalContactViews} />
                    </div>
                    {interestedCount > 0 && quote.status !== 'contacted' && quote.status !== 'completed' && (
                      <div className="rounded-md border border-success/30 bg-success/5 p-3 text-xs text-success">
                        يوجد مزودون مهتمون بهذا الطلب. يمكنك تحديث الحالة إلى "تم التواصل".
                      </div>
                    )}
                    {pending > 0 && (
                      <div className="text-[11px] text-muted-foreground">{pending} مزود لم يفتح الفرصة بعد.</div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      إتاحة بيانات التواصل تمنح المزود صلاحية الاطلاع على بيانات العميل لهذه الفرصة فقط.
                    </p>
                  </>
                );
              })()}

              {(leads?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {([
                    ['all', 'الكل'],
                    ['interested', 'مهتم'],
                    ['pending_reveal', 'بانتظار الإتاحة'],
                    ['revealed', 'بيانات متاحة'],
                  ] as const).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLeadFilter(k)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition ${
                        leadFilter === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {(leads?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لم يتم توجيه الطلب لأي مزود بعد.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(leads ?? []).filter((l) => {
                    if (leadFilter === 'interested') return l.status === 'interested';
                    if (leadFilter === 'pending_reveal') return l.status === 'interested' && !l.contact_revealed;
                    if (leadFilter === 'revealed') return l.contact_revealed;
                    return true;
                  }).map((l) => (
                    <li key={l.id} className="py-2.5 flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{l.provider?.name_ar ?? '—'}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(l.match_reasons ?? []).slice(0, 4).map((r, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r}</span>
                          ))}
                        </div>
                        {l.contact_revealed && (
                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-success">
                              <ShieldCheck className="h-3 w-3" /> بيانات التواصل متاحة
                            </span>
                            {l.contact_revealed_at && (
                              <span className="tech-content">{new Date(l.contact_revealed_at).toLocaleDateString('ar-SA-u-nu-latn')}</span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" /> <span className="tech-content">{l.contact_view_count ?? 0}</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tech-content">{l.match_score}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${LEAD_STATUS_TONE[l.status as LeadStatus] ?? ''}`}>
                        {LEAD_STATUS_LABEL_AR[l.status as LeadStatus] ?? l.status}
                      </span>
                      {l.status === 'interested' && !l.contact_revealed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[32px] text-xs"
                          onClick={() => { setRevealLeadId(l.id); setRevealNote(''); }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> إتاحة بيانات التواصل
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </div>

          {/* Side panel: status & admin notes */}
          <div className="space-y-4">
            <Card><CardContent className="p-5 space-y-3">
              <h3 className="font-heading font-semibold text-sm">تغيير الحالة</h3>
              <Select value={pendingStatus} onValueChange={(v) => setPendingStatus(v as QuoteStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{QUOTE_STATUS_LABEL_AR[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent></Card>

            <Card><CardContent className="p-5 space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> ملاحظات داخلية
              </Label>
              <p className="text-xs text-muted-foreground">هذه الملاحظات داخلية ولا تظهر للعميل.</p>
              <Textarea
                rows={6} dir="auto" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظات للفريق..."
              />
            </CardContent></Card>

            <Button
              className="w-full min-h-[44px]"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ newStatus: pendingStatus as QuoteStatus, notes: adminNotes, statusChanged })}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ التحديثات
            </Button>
          </div>
        </div>

        {/* Events Timeline (full width) */}
        <EventsTimelineCard
          events={eventsQuery.data ?? []}
          loading={eventsQuery.isLoading}
          onRefresh={() => eventsQuery.refetch()}
          filter={eventFilter}
          setFilter={setEventFilter}
          orderDesc={eventOrderDesc}
          setOrderDesc={setEventOrderDesc}
          rawEventId={rawEventId}
          setRawEventId={setRawEventId}
        />

        <Dialog open={!!revealLeadId} onOpenChange={(open) => { if (!open) { setRevealLeadId(null); setRevealNote(''); setRevealOverride(false); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إتاحة بيانات التواصل للمزود؟</DialogTitle>
              <DialogDescription>
                سيتمكن هذا المزود من الاطلاع على اسم العميل ورقم الجوال والبريد الإلكتروني إن وجد. لا يمكن التراجع عن هذا الإجراء من ناحية أن المزود قد يرى البيانات بعد الإتاحة.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">خطة المزود</span>
                <span className="font-medium">{revealSub?.plan?.name_ar ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">رصيد فرص التواصل</span>
                <span className="tech-content font-medium">{revealSub?.lead_credits_balance ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">تكلفة الإتاحة</span>
                <span className="tech-content font-medium">
                  {PROVIDER_COMMERCIAL_CONFIG.requireCreditForContactReveal
                    ? `${PROVIDER_COMMERCIAL_CONFIG.defaultLeadRevealCost} رصيد`
                    : '0 (مرحلة الإطلاق)'}
                </span>
              </div>
              <p className="pt-1 text-muted-foreground">
                {PROVIDER_COMMERCIAL_CONFIG.requireCreditForContactReveal
                  ? `سيتم خصم ${PROVIDER_COMMERCIAL_CONFIG.defaultLeadRevealCost} رصيد من المزود عند إتاحة بيانات التواصل.`
                  : 'مرحلة الإطلاق: لن يتم خصم رصيد عند إتاحة بيانات التواصل.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">ملاحظة داخلية (اختياري)</Label>
              <Textarea
                rows={3} dir="auto" value={revealNote} onChange={(e) => setRevealNote(e.target.value)}
                placeholder="مثال: تم التحقق من اهتمام المزود هاتفيًا"
              />
            </div>
            {PROVIDER_COMMERCIAL_CONFIG.requireCreditForContactReveal && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={revealOverride} onCheckedChange={(v) => setRevealOverride(v === true)} />
                <span>تجاوز شرط الرصيد</span>
              </label>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRevealLeadId(null); setRevealNote(''); setRevealOverride(false); }} disabled={revealMutation.isPending}>
                إلغاء
              </Button>
              <Button
                onClick={() => revealLeadId && revealMutation.mutate({ lead_id: revealLeadId, note: revealNote, override_credit_check: revealOverride })}
                disabled={revealMutation.isPending}
              >
                {revealMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                إتاحة البيانات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

const Info: React.FC<{ icon?: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-foreground/90 break-words">{value}</div>
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-base font-bold tech-content">{value}</div>
  </div>
);

export default AdminQuoteRequestDetails;

// ===== Events timeline =====

const EVENT_TITLE_AR: Record<string, string> = {
  quote_created: 'تم إنشاء طلب عرض السعر',
  quote_status_changed: 'تم تغيير حالة الطلب',
  quote_matched: 'تم توجيه الطلب لمزودين',
  quote_matching_failed: 'لم يتم العثور على مزودين مطابقين',
  quote_contacted: 'تم بدء التواصل',
  quote_completed: 'تم إغلاق الطلب كمكتمل',
  quote_cancelled: 'تم إلغاء الطلب',
  lead_created: 'تم إنشاء فرصة لمزود',
  lead_viewed: 'شاهد المزود الفرصة',
  provider_interested: 'المزود مهتم',
  provider_not_interested: 'المزود غير مهتم',
  contact_revealed: 'تمت إتاحة بيانات التواصل',
  contact_viewed: 'شاهد المزود بيانات التواصل',
};

const EVENT_TONE: Record<string, string> = {
  quote_created: 'bg-info/10 text-info border-info/30',
  quote_status_changed: 'bg-muted text-foreground border-border',
  quote_matched: 'bg-primary/10 text-primary border-primary/30',
  quote_matching_failed: 'bg-warning/10 text-warning border-warning/30',
  quote_contacted: 'bg-success/10 text-success border-success/30',
  quote_completed: 'bg-success/10 text-success border-success/30',
  quote_cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
  lead_created: 'bg-muted text-foreground border-border',
  lead_viewed: 'bg-muted text-muted-foreground border-border',
  provider_interested: 'bg-success/10 text-success border-success/30',
  provider_not_interested: 'bg-muted text-muted-foreground border-border',
  contact_revealed: 'bg-primary/10 text-primary border-primary/30',
  contact_viewed: 'bg-info/10 text-info border-info/30',
};

function describeEvent(e: { event_type: string; metadata: Record<string, unknown> | null; provider_name?: string | null }): string {
  const md = e.metadata ?? {};
  switch (e.event_type) {
    case 'lead_created':
      return `تم توجيه الطلب إلى ${e.provider_name ?? 'مزود'} بدرجة مطابقة ${(md.match_score as number) ?? '—'}.`;
    case 'lead_viewed':
      return `قام ${e.provider_name ?? 'المزود'} بفتح تفاصيل الفرصة.`;
    case 'provider_interested':
      return `أبدى ${e.provider_name ?? 'المزود'} اهتمامه بهذه الفرصة.`;
    case 'provider_not_interested':
      return `اعتبر ${e.provider_name ?? 'المزود'} أن الفرصة غير مناسبة.`;
    case 'contact_revealed':
      return `أتاح الأدمن بيانات التواصل لـ ${e.provider_name ?? 'المزود'}.`;
    case 'contact_viewed':
      return `شاهد ${e.provider_name ?? 'المزود'} بيانات التواصل (المرة ${(md.view_count as number) ?? 1}).`;
    case 'quote_matched':
      return `تم توجيه الطلب إلى ${(md.matched_count as number) ?? 0} مزودين مناسبين.`;
    case 'quote_matching_failed':
      return 'لم يتم العثور على مزودين مناسبين حسب القطاع والمدينة ومناطق الخدمة.';
    case 'quote_status_changed':
      return `تم تغيير الحالة من ${(md.previous_status as string) ?? '—'} إلى ${(md.new_status as string) ?? '—'}.`;
    case 'quote_created':
      return `تم إنشاء طلب جديد في قطاع ${(md.sector as string) ?? '—'} بمدينة ${(md.city as string) ?? '—'}.`;
    case 'quote_contacted': return 'بدأ فريق قطاعات التواصل بخصوص هذا الطلب.';
    case 'quote_completed': return 'تم إغلاق هذا الطلب كمكتمل.';
    case 'quote_cancelled': return 'تم إلغاء هذا الطلب.';
    default: return e.event_type;
  }
}

type EventRow = {
  id: string; event_type: string; actor_user_id: string | null;
  metadata: Record<string, unknown> | null; created_at: string;
  source: 'quote' | 'lead'; lead_id?: string | null; provider_name?: string | null;
};

const EventsTimelineCard: React.FC<{
  events: EventRow[]; loading: boolean; onRefresh: () => void;
  filter: 'all' | 'quote' | 'lead' | 'matching' | 'interest' | 'contact';
  setFilter: (v: 'all' | 'quote' | 'lead' | 'matching' | 'interest' | 'contact') => void;
  orderDesc: boolean; setOrderDesc: (v: boolean) => void;
  rawEventId: string | null; setRawEventId: (v: string | null) => void;
}> = ({ events, loading, onRefresh, filter, setFilter, orderDesc, setOrderDesc, rawEventId, setRawEventId }) => {
  const total = events.length;
  const viewedProviders = new Set(events.filter((e) => e.event_type === 'lead_viewed').map((e) => e.provider_name)).size;
  const interestedProviders = new Set(events.filter((e) => e.event_type === 'provider_interested').map((e) => e.provider_name)).size;
  const contactViews = events.filter((e) => e.event_type === 'contact_viewed').length;
  const lastEvent = events[0];

  const matches = (e: EventRow): boolean => {
    switch (filter) {
      case 'all': return true;
      case 'quote': return e.source === 'quote';
      case 'lead': return e.source === 'lead';
      case 'matching': return ['quote_matched','quote_matching_failed','lead_created'].includes(e.event_type);
      case 'interest': return ['provider_interested','provider_not_interested'].includes(e.event_type);
      case 'contact': return ['contact_revealed','contact_viewed','quote_contacted'].includes(e.event_type);
      default: return true;
    }
  };

  const sorted = [...events].sort((a, b) => {
    const ta = new Date(a.created_at).getTime(); const tb = new Date(b.created_at).getTime();
    return orderDesc ? tb - ta : ta - tb;
  }).filter(matches);

  const rawEvent = rawEventId ? events.find((e) => e.id === rawEventId) ?? null : null;

  const filters: Array<[typeof filter, string]> = [
    ['all','الكل'], ['quote','أحداث الطلب'], ['lead','أحداث المزودين'],
    ['matching','المطابقة'], ['interest','الاهتمام'], ['contact','بيانات التواصل'],
  ];

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> سجل الأحداث
          </h2>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setOrderDesc(!orderDesc)}>
              {orderDesc ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {orderDesc ? 'الأحدث أولًا' : 'الأقدم أولًا'}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              تحديث
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <Stat label="إجمالي الأحداث" value={total} />
          <Stat label="مزودون شاهدوا" value={viewedProviders} />
          <Stat label="مهتمون" value={interestedProviders} />
          <Stat label="عرض البيانات" value={contactViews} />
          <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
            <div className="text-xs text-muted-foreground">آخر حدث</div>
            <div className="text-[11px] font-medium truncate">
              {lastEvent ? (EVENT_TITLE_AR[lastEvent.event_type] ?? lastEvent.event_type) : '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {filters.map(([k, label]) => (
            <button
              key={k} type="button" onClick={() => setFilter(k)}
              className={`text-[11px] px-2 py-1 rounded-full border transition ${
                filter === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
              }`}
            >{label}</button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-8 space-y-1.5">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">لا توجد أحداث مسجلة حتى الآن</p>
            <p className="text-xs text-muted-foreground">ستظهر هنا أحداث الطلب عند التوجيه، تفاعل المزودين، وإتاحة بيانات التواصل.</p>
          </div>
        ) : (
          <ol className="relative ms-2 border-s border-border space-y-3">
            {sorted.map((e) => {
              const tone = EVENT_TONE[e.event_type] ?? 'bg-muted text-foreground border-border';
              return (
                <li key={e.id} className="ps-4 relative">
                  <span className="absolute -start-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  <div className="rounded-md border border-border bg-card p-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tone}`}>
                        {EVENT_TITLE_AR[e.event_type] ?? e.event_type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {e.source === 'lead' ? 'حدث مزود' : 'حدث طلب'}
                      </span>
                      <span className="text-[11px] text-muted-foreground tech-content ms-auto">
                        {new Date(e.created_at).toLocaleString('ar-SA-u-nu-latn')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">{describeEvent(e)}</p>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <button className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" type="button">
                          عرض البيانات الخام
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-1.5 text-[10px] bg-muted/50 border border-border rounded p-2 overflow-x-auto tech-content">
{JSON.stringify({ id: e.id, type: e.event_type, source: e.source, actor: e.actor_user_id, metadata: e.metadata }, null, 2)}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <Dialog open={!!rawEvent} onOpenChange={(o) => { if (!o) setRawEventId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>تفاصيل الحدث</DialogTitle></DialogHeader>
            {rawEvent && (
              <pre className="text-[11px] bg-muted/50 border border-border rounded p-3 overflow-x-auto tech-content max-h-[60vh]">
{JSON.stringify(rawEvent, null, 2)}
              </pre>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};