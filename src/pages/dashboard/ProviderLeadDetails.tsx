import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, ArrowRight, MapPin, Tag, Calendar, Wallet, Loader2, ThumbsUp, ThumbsDown,
  Lock, AlertCircle, ShieldCheck, Phone, Copy, MessageCircle, Mail, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { pingProviderActive, useProviderActivityPing } from '@/hooks/useProviderActivityPing';
import { trackEvent } from '@/lib/analytics';
import {
  LEAD_STATUS_LABEL_AR, LEAD_STATUS_TONE, type LeadStatus,
  SECTOR_LABEL_AR, TIMELINE_LABEL_AR, SERVICE_LOCATION_LABEL_AR,
  CUSTOMER_TYPE_LABEL_AR, CONTACT_METHOD_LABEL_AR, normalizePhoneForWhatsApp,
} from '@/lib/quoteRequests';
import { getProviderLeadDetail } from '@/modules/leads/services/detail';
import { getRevealedContact } from '@/modules/leads/services/getRevealedContact';
import {
  markProviderLeadViewed,
  updateProviderLeadResponse,
  insertProviderLeadEvent,
} from '@/modules/leads/services/mutations';
import { CreateWorkOrderFromQuoteButton } from '@/components/workOrders/CreateWorkOrderFromQuoteButton';

interface LeadDetailRow {
  id: string;
  status: string;
  match_score: number;
  match_reasons: string[];
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  provider_id: string;
  provider_user_id: string | null;
  contact_revealed: boolean;
  contact_revealed_at: string | null;
  contact_view_count: number;
  quote_request: {
    id: string;
    ref_id: string | null;
    sector: string;
    city: string;
    district: string | null;
    project_description: string;
    approx_dimensions: string | null;
    quantity: string | null;
    execution_timeline: string;
    service_location_type: string;
    has_budget: boolean;
    budget_amount: number | null;
    budget_note: string | null;
  } | null;
}

interface RevealedContact {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  preferred_contact_method: string;
  customer_type: string;
}

const ProviderLeadDetails: React.FC = () => {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  useProviderActivityPing(!!user);
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const Back = isRTL ? ArrowRight : ArrowLeft;
  const [contact, setContact] = React.useState<RevealedContact | null>(null);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [loadingContact, setLoadingContact] = React.useState(false);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['provider-lead', id],
    enabled: !!id && !!user,
    queryFn: () => getProviderLeadDetail(id!) as Promise<LeadDetailRow | null>,
  });

  // Auto-mark as viewed
  useEffect(() => {
    if (lead && lead.status === 'new') {
      const previousStatus = lead.status;
      void markProviderLeadViewed(lead.id).then(({ ok }) => {
        if (ok) {
          // Audit lead_viewed (only on new -> viewed transition) — fire-and-forget.
          void insertProviderLeadEvent({
            lead_id: lead.id,
            quote_request_id: lead.quote_request?.id ?? null,
            event_type: 'lead_viewed',
            actor_user_id: user?.id ?? null,
            metadata: { previous_status: previousStatus, new_status: 'viewed' },
          }).catch(() => { /* fail-soft */ });
          qc.invalidateQueries({ queryKey: ['provider-lead', lead.id] });
        }
      });
    }
  }, [lead, qc, user?.id]);

  const respond = useMutation({
    mutationFn: async (status: 'interested' | 'not_interested') => {
      if (!lead) throw new Error('no lead');
      const previousStatus = lead.status;
      await updateProviderLeadResponse(lead.id, status);
      // Audit provider response (skip if already at same state)
      if (previousStatus !== status) {
        await insertProviderLeadEvent({
          lead_id: lead.id,
          quote_request_id: lead.quote_request?.id ?? null,
          event_type: status === 'interested' ? 'provider_interested' : 'provider_not_interested',
          actor_user_id: user?.id ?? null,
          metadata: { previous_status: previousStatus, new_status: status },
        });
      }
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === 'interested' ? 'تم تسجيل اهتمامك بهذه الفرصة' : 'تم تحديث حالة الفرصة');
      void pingProviderActive(true);
      qc.invalidateQueries({ queryKey: ['provider-lead', id] });
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
    },
    onError: () => toast.error('تعذر تحديث الفرصة'),
  });

  const fetchContact = async () => {
    if (!lead) return;
    setLoadingContact(true);
    trackEvent('provider_contact_viewed', { lead_id: lead.id });
    try {
      const { data, error } = await getRevealedContact({ lead_id: lead.id });
      if (error) throw error;
      const res = data as { success: boolean; contact?: RevealedContact; message?: string };
      if (!res?.success || !res.contact) {
        toast.error(res?.message ?? 'تعذر جلب بيانات التواصل');
        return;
      }
      setContact(res.contact);
      setContactOpen(true);
      qc.invalidateQueries({ queryKey: ['provider-lead', lead.id] });
    } catch {
      toast.error('تعذر جلب بيانات التواصل');
    } finally {
      setLoadingContact(false);
    }
  };

  const copyPhone = async () => {
    if (!contact?.customer_phone) return;
    try {
      await navigator.clipboard.writeText(contact.customer_phone);
      toast.success('تم نسخ رقم الجوال');
      trackEvent('provider_phone_copied', { lead_id: lead?.id });
    } catch { toast.error('تعذر النسخ'); }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-3 max-w-3xl">
          <Skeleton className="h-10 w-64" /><Skeleton className="h-48" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !lead || !lead.quote_request) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl"><CardContent className="py-14 text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-heading font-bold text-xl">لم يتم العثور على الفرصة</h1>
          <Button asChild className="min-h-[44px]">
            <Link to="/dashboard/provider/leads"><Back className="h-4 w-4" /> الرجوع للفرص</Link>
          </Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const q = lead.quote_request;
  const status = lead.status as LeadStatus;
  const responded = status === 'interested' || status === 'not_interested' || status === 'contacted';
  const tone = LEAD_STATUS_TONE[status] ?? '';
  const budgetText = q.has_budget
    ? (q.budget_amount ? `${Number(q.budget_amount).toLocaleString('en-US')} ر.س` : 'محدد')
    : (q.budget_note === 'after-quotes' ? 'بعد العروض' : 'غير محددة');

  const waPhone = contact ? normalizePhoneForWhatsApp(contact.customer_phone) : '';
  const waMsg = contact ? encodeURIComponent(
    `مرحبًا ${contact.customer_name}، أنا من مزودي الخدمة في منصة قطاعات بخصوص طلب عرض السعر الخاص بـ ${SECTOR_LABEL_AR[q.sector] ?? q.sector} في ${q.city}. يسعدني معرفة المزيد من التفاصيل لتقديم عرض مناسب.`,
  ) : '';

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-heading font-bold text-xl sm:text-2xl">تفاصيل الفرصة</h1>
          <Button variant="outline" size="sm" asChild className="min-h-[40px] shrink-0">
            <Link to="/dashboard/provider/leads"><Back className="h-4 w-4" /> الرجوع للفرص</Link>
          </Button>
        </div>

        <Card><CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${tone}`}>
              {LEAD_STATUS_LABEL_AR[status] ?? status}
            </span>
            <span className="text-xs text-muted-foreground">درجة المطابقة: <span className="tech-content">{lead.match_score}</span></span>
            <span className="text-xs text-muted-foreground tech-content ms-auto">
              {new Date(lead.created_at).toLocaleString('ar-SA-u-nu-latn')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Info icon={<Tag className="h-4 w-4" />} label="القطاع" value={SECTOR_LABEL_AR[q.sector] ?? q.sector} />
            <Info icon={<MapPin className="h-4 w-4" />} label="المدينة" value={q.city + (q.district ? ` · ${q.district}` : '')} />
            <Info icon={<Calendar className="h-4 w-4" />} label="موعد التنفيذ" value={TIMELINE_LABEL_AR[q.execution_timeline] ?? q.execution_timeline} />
            <Info label="مكان الخدمة" value={SERVICE_LOCATION_LABEL_AR[q.service_location_type] ?? q.service_location_type} />
            {q.approx_dimensions && <Info label="المقاسات" value={q.approx_dimensions} />}
            {q.quantity && <Info label="الكمية" value={q.quantity} />}
            <Info icon={<Wallet className="h-4 w-4" />} label="الميزانية" value={budgetText} />
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">وصف المشروع</div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-6">{q.project_description}</p>
          </div>

          {(lead.match_reasons?.length ?? 0) > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-2">أسباب المطابقة</div>
              <div className="flex flex-wrap gap-1.5">
                {lead.match_reasons.map((r, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80 border border-border">{r}</span>
                ))}
              </div>
            </div>
          )}

          {!lead.contact_revealed && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              بيانات التواصل تُدار عبر فريق قطاعات في هذه المرحلة.
            </div>
          )}
        </CardContent></Card>

        {lead.contact_revealed ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading font-semibold">بيانات التواصل متاحة</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    يمكنك التواصل مع العميل حسب الطريقة المفضلة المذكورة. احرص على تقديم عرض واضح ومهني.
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                احرص على التواصل باحترافية وتقديم عرض واضح يتضمن نطاق العمل، السعر، ومدة التنفيذ.
              </div>
              <Button onClick={fetchContact} disabled={loadingContact} className="w-full min-h-[44px]">
                {loadingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                عرض بيانات التواصل
              </Button>
            </CardContent>
          </Card>
        ) : status === 'interested' ? (
          <Card>
            <CardContent className="p-5 space-y-2">
              <h2 className="font-heading font-semibold text-base">تم تسجيل اهتمامك</h2>
              <p className="text-sm text-muted-foreground">
                سيتابع فريق قطاعات هذه الفرصة، وسيتم إشعارك عند إتاحة بيانات التواصل إذا كانت مناسبة.
              </p>
            </CardContent>
          </Card>
        ) : !responded ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 min-h-[44px]"
              onClick={() => respond.mutate('interested')}
              disabled={respond.isPending}
            >
              {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              مهتم بهذه الفرصة
            </Button>
            <Button
              variant="outline" className="flex-1 min-h-[44px]"
              onClick={() => respond.mutate('not_interested')}
              disabled={respond.isPending}
            >
              <ThumbsDown className="h-4 w-4" /> غير مناسب
            </Button>
          </div>
        ) : (
          <Card><CardContent className="p-4 text-sm text-center text-muted-foreground">
            {status === 'not_interested'
              ? 'تم تحديث الفرصة كغير مناسبة.'
              : 'تمت متابعة هذه الفرصة.'}
          </CardContent></Card>
        )}

        {/* BUSINESS-CORE-9 — Create work order from quote request */}
        {lead.provider_id && q.id && (
          <CreateWorkOrderFromQuoteButton
            quoteRequestId={q.id}
            businessId={lead.provider_id}
            defaultTitle={q.project_description}
            quoteRefId={q.ref_id}
          />
        )}
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" /> بيانات التواصل
            </DialogTitle>
          </DialogHeader>
          {contact && (
            <div className="space-y-3 text-sm">
              <Info label="الاسم" value={contact.customer_name} />
              <Info icon={<Phone className="h-4 w-4" />} label="رقم الجوال" value={
                <span className="inline-flex items-center gap-2">
                  <span className="tech-content">{contact.customer_phone}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyPhone}><Copy className="h-3 w-3" /></Button>
                </span>
              } />
              {contact.customer_email && (
                <Info icon={<Mail className="h-4 w-4" />} label="البريد" value={contact.customer_email} />
              )}
              <Info label="طريقة التواصل المفضلة" value={CONTACT_METHOD_LABEL_AR[contact.preferred_contact_method] ?? contact.preferred_contact_method} />
              <Info label="نوع العميل" value={CUSTOMER_TYPE_LABEL_AR[contact.customer_type] ?? contact.customer_type} />
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button asChild className="flex-1 min-h-[44px]" onClick={() => trackEvent('provider_whatsapp_opened', { lead_id: lead.id })}>
                  <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> فتح واتساب
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1 min-h-[44px]">
                  <a href={`tel:${contact.customer_phone}`}><Phone className="h-4 w-4" /> اتصال</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

export default ProviderLeadDetails;