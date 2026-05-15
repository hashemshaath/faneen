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
import { ArrowLeft, ArrowRight, MapPin, Tag, Calendar, Wallet, Loader2, ThumbsUp, ThumbsDown, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  LEAD_STATUS_LABEL_AR, LEAD_STATUS_TONE, type LeadStatus,
  SECTOR_LABEL_AR, TIMELINE_LABEL_AR, SERVICE_LOCATION_LABEL_AR,
} from '@/lib/quoteRequests';

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
  quote_request: {
    id: string;
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

const ProviderLeadDetails: React.FC = () => {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const Back = isRTL ? ArrowRight : ArrowLeft;

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['provider-lead', id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_request_leads')
        .select(`
          id, status, match_score, match_reasons, viewed_at, responded_at, created_at,
          provider_id, provider_user_id,
          quote_request:quote_requests(
            id, sector, city, district, project_description, approx_dimensions, quantity,
            execution_timeline, service_location_type, has_budget, budget_amount, budget_note
          )
        `)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LeadDetailRow | null;
    },
  });

  // Auto-mark as viewed
  useEffect(() => {
    if (lead && lead.status === 'new') {
      supabase.from('quote_request_leads').update({
        status: 'viewed', viewed_at: new Date().toISOString(),
      }).eq('id', lead.id).then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ['provider-lead', lead.id] });
      });
    }
  }, [lead, qc]);

  const respond = useMutation({
    mutationFn: async (status: 'interested' | 'not_interested') => {
      if (!lead) throw new Error('no lead');
      const { error } = await supabase
        .from('quote_request_leads')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === 'interested' ? 'تم تسجيل اهتمامك بهذه الفرصة' : 'تم تحديث حالة الفرصة');
      qc.invalidateQueries({ queryKey: ['provider-lead', id] });
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
    },
    onError: () => toast.error('تعذر تحديث الفرصة'),
  });

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

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            بيانات التواصل تُدار عبر فريق قطاعات في هذه المرحلة.
          </div>
        </CardContent></Card>

        {!responded ? (
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
            {status === 'interested'
              ? 'تم تسجيل اهتمامك. سيتابع فريق قطاعات الطلب معك.'
              : status === 'not_interested'
                ? 'تم تحديث الفرصة كغير مناسبة.'
                : 'تمت متابعة هذه الفرصة.'}
          </CardContent></Card>
        )}
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

export default ProviderLeadDetails;