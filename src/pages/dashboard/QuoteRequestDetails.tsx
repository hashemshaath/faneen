import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMyQuoteRequestDetail, listQuoteRequestFiles } from '@/modules/leads/services/detail';
import { updateMyQuoteRequest } from '@/modules/leads/services/mutations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, ArrowRight, Loader2, Paperclip, Download, Plus, X, Edit2, Save,
  AlertCircle, FileText, MapPin, Tag, Wallet, Phone, Mail, User, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  QUOTE_STATUS_LABEL_AR, QUOTE_STATUS_LABEL_EN, QUOTE_STATUS_DESC_AR, QUOTE_STATUS_TONE,
  CUSTOMER_TYPE_LABEL_AR, CONTACT_METHOD_LABEL_AR, SERVICE_LOCATION_LABEL_AR,
  TIMELINE_LABEL_AR, SECTOR_LABEL_AR,
  QUOTE_BUCKET, createSignedQuoteFileUrl, formatFileSize, type QuoteStatus,
} from '@/lib/quoteRequests';

interface QuoteRow {
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
  created_at: string;
}

const MAX_FILES = 8;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-120) || 'file';
}

const QuoteRequestDetails: React.FC = () => {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const Back = isRTL ? ArrowRight : ArrowLeft;

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<QuoteRow>>({});
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote-request', id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: () => getMyQuoteRequestDetail(id!, user!.id) as Promise<QuoteRow | null>,
  });

  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ['quote-request-files', id],
    enabled: !!id && !!quote,
    queryFn: () => listQuoteRequestFiles(id!) as Promise<FileRow[]>,
  });

  const canEdit = useMemo(
    () => !!quote && (quote.status === 'new' || quote.status === 'under_review'),
    [quote],
  );

  type UpdatePatch = {
    project_description: string;
    approx_dimensions: string | null;
    quantity: string | null;
    execution_timeline: string;
    has_budget: boolean;
    budget_amount: number | null;
    budget_note: string | null;
    preferred_contact_method: string;
    customer_email: string | null;
  };
  const updateMutation = useMutation({
    mutationFn: async (patch: UpdatePatch) => {
      await updateMyQuoteRequest(id!, user!.id, patch);
    },
    onSuccess: () => {
      toast.success('تم تحديث الطلب بنجاح');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['quote-request', id] });
      qc.invalidateQueries({ queryKey: ['my-quote-requests'] });
    },
    onError: () => toast.error('تعذر تحديث الطلب حاليًا'),
  });

  const startEdit = () => {
    if (!quote) return;
    setEditForm({
      project_description: quote.project_description,
      approx_dimensions: quote.approx_dimensions,
      quantity: quote.quantity,
      execution_timeline: quote.execution_timeline,
      has_budget: quote.has_budget,
      budget_amount: quote.budget_amount,
      budget_note: quote.budget_note,
      preferred_contact_method: quote.preferred_contact_method,
      customer_email: quote.customer_email,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    const desc = (editForm.project_description ?? '').toString().trim();
    if (desc.length < 10) {
      toast.error('وصف المشروع قصير جدًا');
      return;
    }
    updateMutation.mutate({
      project_description: desc,
      approx_dimensions: editForm.approx_dimensions || null,
      quantity: editForm.quantity || null,
      execution_timeline: editForm.execution_timeline as string,
      has_budget: !!editForm.has_budget,
      budget_amount: editForm.has_budget ? (editForm.budget_amount ?? null) : null,
      budget_note: editForm.budget_note || null,
      preferred_contact_method: editForm.preferred_contact_method as string,
      customer_email: editForm.customer_email || null,
    });
  };

  const handleFilesAdd = async (filesList: FileList | null) => {
    if (!filesList || !quote) return;
    const current = files?.length ?? 0;
    const remaining = MAX_FILES - current;
    if (remaining <= 0) {
      toast.error(`الحد الأقصى ${MAX_FILES} ملفات`);
      return;
    }
    const toUpload = Array.from(filesList).slice(0, remaining).filter((f) => {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`الملف ${f.name} يتجاوز 10MB`);
        return false;
      }
      if (/\.(exe|bat|cmd|sh|js|html|svg)$/i.test(f.name)) {
        toast.error(`نوع الملف غير مسموح: ${f.name}`);
        return false;
      }
      return true;
    });
    if (!toUpload.length) return;
    setUploading({ done: 0, total: toUpload.length });
    let failed = 0;
    for (let i = 0; i < toUpload.length; i++) {
      const f = toUpload[i];
      const path = `${quote.id}/${Date.now()}-${i}-${safeFileName(f.name)}`;
      const { error: upErr } = await supabase.storage
        .from(QUOTE_BUCKET)
        .upload(path, f, { upsert: false, contentType: f.type || undefined });
      if (upErr) { failed++; }
      else {
        await supabase.from('quote_request_files').insert({
          quote_request_id: quote.id,
          user_id: user?.id ?? null,
          file_name: f.name,
          file_path: path,
          file_size: f.size,
          file_type: f.type || null,
        });
      }
      setUploading({ done: i + 1, total: toUpload.length });
    }
    setUploading(null);
    if (failed === 0) toast.success('تمت إضافة الملفات بنجاح');
    else toast.error('تعذر رفع الملفات حاليًا. حاول مرة أخرى.');
    await refetchFiles();
  };

  const openFile = async (path: string) => {
    const url = await createSignedQuoteFileUrl(path);
    if (!url) { toast.error('تعذر عرض الملف حاليًا'); return; }
    window.open(url, '_blank', 'noopener');
  };

  // ---------- Render ----------

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-4xl">
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
        <Card className="max-w-2xl">
          <CardContent className="py-14 text-center space-y-4">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="font-heading font-bold text-xl">
              {error ? 'لا يمكنك الوصول إلى هذا الطلب' : 'لم يتم العثور على الطلب'}
            </h1>
            <Button asChild className="min-h-[44px]">
              <Link to="/dashboard/my-requests"><Back className="h-4 w-4" /> العودة إلى طلباتي</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const status = quote.status as QuoteStatus;
  const tone = QUOTE_STATUS_TONE[status] ?? 'bg-muted text-foreground border-border';

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl">
              تفاصيل طلب عرض السعر
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              راجع تفاصيل طلبك والملفات المرفقة وحالة المعالجة.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="min-h-[40px] shrink-0">
            <Link to="/dashboard/my-requests"><Back className="h-4 w-4" /> العودة</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground tech-content">#{quote.id.slice(-6)}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${tone}`}>
                {isRTL ? QUOTE_STATUS_LABEL_AR[status] : QUOTE_STATUS_LABEL_EN[status]}
              </span>
              <span className="text-xs text-muted-foreground tech-content inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(quote.created_at).toLocaleDateString('ar-SA-u-nu-latn')}
              </span>
              <span className="text-xs text-muted-foreground ms-auto">
                آخر تحديث: <span className="tech-content">{new Date(quote.updated_at).toLocaleDateString('ar-SA-u-nu-latn')}</span>
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-6">{QUOTE_STATUS_DESC_AR[status]}</p>
          </CardContent>
        </Card>

        {/* Project info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base">معلومات المشروع</h2>
              {canEdit && !editing && (
                <Button size="sm" variant="outline" onClick={startEdit} className="min-h-[36px]">
                  <Edit2 className="h-3.5 w-3.5" /> تعديل الطلب
                </Button>
              )}
            </div>

            {!editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Info icon={<Tag className="h-4 w-4" />} label="القطاع" value={SECTOR_LABEL_AR[quote.sector] ?? quote.sector} />
                <Info icon={<MapPin className="h-4 w-4" />} label="المدينة" value={quote.city + (quote.district ? ` · ${quote.district}` : '')} />
                <Info icon={<MapPin className="h-4 w-4" />} label="مكان الخدمة" value={SERVICE_LOCATION_LABEL_AR[quote.service_location_type] ?? quote.service_location_type} />
                <Info icon={<Calendar className="h-4 w-4" />} label="موعد التنفيذ" value={TIMELINE_LABEL_AR[quote.execution_timeline] ?? quote.execution_timeline} />
                {quote.approx_dimensions && <Info label="المقاسات التقريبية" value={quote.approx_dimensions} />}
                {quote.quantity && <Info label="الكمية" value={quote.quantity} />}
                <div className="sm:col-span-2 flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">وصف المشروع</div>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-6">{quote.project_description}</p>
                  </div>
                </div>
                <Info icon={<Wallet className="h-4 w-4" />} label="ميزانية" value={
                  quote.has_budget
                    ? (quote.budget_amount ? `${Number(quote.budget_amount).toLocaleString('en-US')} ر.س` : 'نعم')
                    : (quote.budget_note === 'after-quotes' ? 'بعد العروض' : 'بدون ميزانية محددة')
                } />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <Label className="text-xs">وصف المشروع</Label>
                  <Textarea
                    dir="auto" rows={4}
                    value={editForm.project_description ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, project_description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">المقاسات التقريبية</Label>
                    <Input dir="auto" value={editForm.approx_dimensions ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, approx_dimensions: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">الكمية</Label>
                    <Input dir="auto" value={editForm.quantity ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">موعد التنفيذ</Label>
                    <Select value={(editForm.execution_timeline as string) ?? ''} onValueChange={(v) => setEditForm((p) => ({ ...p, execution_timeline: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIMELINE_LABEL_AR).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">طريقة التواصل</Label>
                    <Select value={(editForm.preferred_contact_method as string) ?? ''} onValueChange={(v) => setEditForm((p) => ({ ...p, preferred_contact_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTACT_METHOD_LABEL_AR).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">البريد الإلكتروني</Label>
                    <Input type="email" dir="auto" value={editForm.customer_email ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, customer_email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">الميزانية</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!editForm.has_budget}
                        onChange={(e) => setEditForm((p) => ({ ...p, has_budget: e.target.checked }))}
                      />
                      <Input
                        type="number" placeholder="مبلغ تقديري"
                        disabled={!editForm.has_budget}
                        value={editForm.budget_amount ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, budget_amount: e.target.value ? Number(e.target.value) : null }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={saveEdit} disabled={updateMutation.isPending} className="min-h-[40px]">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ التعديلات
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="min-h-[40px]">إلغاء</Button>
                </div>
              </div>
            )}

            {!canEdit && !editing && (
              <p className="text-xs text-muted-foreground italic border-t pt-3">
                لا يمكن تعديل الطلب بعد بدء معالجته. يمكنك التواصل معنا إذا احتجت إلى تغيير مهم.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contact card */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-heading font-semibold text-base">بيانات التواصل</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info icon={<User className="h-4 w-4" />} label="الاسم" value={quote.customer_name} />
              <Info icon={<Phone className="h-4 w-4" />} label="رقم الجوال" value={<span className="tech-content">{quote.customer_phone}</span>} />
              {quote.customer_email && <Info icon={<Mail className="h-4 w-4" />} label="البريد الإلكتروني" value={quote.customer_email} />}
              <Info label="نوع العميل" value={CUSTOMER_TYPE_LABEL_AR[quote.customer_type] ?? quote.customer_type} />
              <Info label="طريقة التواصل المفضلة" value={CONTACT_METHOD_LABEL_AR[quote.preferred_contact_method] ?? quote.preferred_contact_method} />
            </div>
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> الملفات المرفقة
                <span className="text-xs text-muted-foreground tech-content">({files?.length ?? 0}/{MAX_FILES})</span>
              </h2>
              {canEdit && (files?.length ?? 0) < MAX_FILES && (
                <label>
                  <input
                    type="file" multiple className="hidden"
                    onChange={(e) => { handleFilesAdd(e.target.files); e.currentTarget.value = ''; }}
                  />
                  <Button asChild size="sm" variant="outline" className="min-h-[36px] cursor-pointer">
                    <span><Plus className="h-3.5 w-3.5" /> إضافة ملفات</span>
                  </Button>
                </label>
              )}
            </div>

            {uploading && (
              <p className="text-sm text-muted-foreground">
                جارٍ رفع الملفات ({uploading.done}/{uploading.total})...
              </p>
            )}

            {(files?.length ?? 0) === 0 && !uploading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد ملفات مرفقة حاليًا.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(files ?? []).map((f) => (
                  <li key={f.id} className="py-2.5 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground tech-content">
                        {formatFileSize(f.file_size)} {f.file_type ? `· ${f.file_type}` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openFile(f.file_path)} className="min-h-[36px]">
                      <Download className="h-3.5 w-3.5" /> عرض
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
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

export default QuoteRequestDetails;