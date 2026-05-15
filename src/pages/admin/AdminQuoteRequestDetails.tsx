import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, ArrowRight, Loader2, Phone, Copy, MessageCircle, FileText, Download,
  AlertCircle, MapPin, Tag, Calendar, Wallet, User, Mail, Save, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  QUOTE_STATUS_LABEL_AR, QUOTE_STATUS_TONE, QUOTE_STATUSES,
  CUSTOMER_TYPE_LABEL_AR, CONTACT_METHOD_LABEL_AR, SERVICE_LOCATION_LABEL_AR,
  TIMELINE_LABEL_AR, SECTOR_LABEL_AR, createSignedQuoteFileUrl, formatFileSize,
  normalizePhoneForWhatsApp, type QuoteStatus,
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

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['admin-quote-request', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as AdminQuoteRow | null;
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
      const { data, error } = await supabase
        .from('quote_request_files')
        .select('id, file_name, file_path, file_size, file_type')
        .eq('quote_request_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FileRow[];
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
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: vars.newStatus,
          metadata: newMd as never,
        })
        .eq('id', quote.id);
      if (error) throw error;

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
        await supabase.from('notifications').insert({
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

export default AdminQuoteRequestDetails;