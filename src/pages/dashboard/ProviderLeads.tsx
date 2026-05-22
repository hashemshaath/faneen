import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { listProviderLeads, type ProviderLeadRow } from '@/modules/leads/services/list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, MapPin, Tag, Calendar, ChevronLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useProviderActivityPing } from '@/hooks/useProviderActivityPing';
import {
  LEAD_STATUS_LABEL_AR, LEAD_STATUS_TONE, type LeadStatus,
  SECTOR_LABEL_AR, TIMELINE_LABEL_AR,
} from '@/lib/quoteRequests';

type LeadRow = ProviderLeadRow;

const ProviderLeads: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  useProviderActivityPing(!!user);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['provider-leads', user?.id],
    enabled: !!user,
    queryFn: () => listProviderLeads(),
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        <header>
          <h1 className="font-heading font-bold text-xl sm:text-2xl">فرص عروض الأسعار</h1>
          <p className="text-sm text-muted-foreground mt-1">
            طلبات جديدة تم توجيهها لك بناءً على قطاعك ومدينة خدمتك.
          </p>
        </header>

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
              <Link to="/dashboard/provider/service-areas">مناطق الخدمة</Link>
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
                <Link to="/dashboard/provider/service-areas">تحديث مناطق الخدمة</Link>
              </Button>
            </div>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads!.map((lead) => {
              const q = lead.quote_request;
              const status = lead.status as LeadStatus;
              const tone = LEAD_STATUS_TONE[status] ?? 'bg-muted';
              const showRevealed = lead.contact_revealed;
              const showAwaiting = status === 'interested' && !lead.contact_revealed;
              return (
                <Card key={lead.id} className="hover-lift">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${tone}`}>
                          {LEAD_STATUS_LABEL_AR[status] ?? status}
                        </span>
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