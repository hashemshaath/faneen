import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, Search, CheckCircle2, XCircle, Eye,
  AlertCircle, Loader2, Send, Globe, Tag, Lock, UserPlus, Users as UsersIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { listAdminBusinesses, type ListAdminBusinessesFilter } from '@/modules/businesses';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { maskEmail, maskPhone } from '@/lib/masking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getSectorById, type SectorId } from '@/data/onboarding-sectors';
import { trackProviderApproved, trackProviderRejected, trackProviderNeedsChanges } from '@/lib/analytics-events';
import { useNoIndex } from "@/hooks/useNoIndex";
import { CrDocumentScanner } from '@/components/admin/CrDocumentScanner';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { createNotification } from '@/modules/notifications/services/createNotification';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';

type ApprovalStatus =
  | 'draft' | 'submitted' | 'under_review'
  | 'approved' | 'rejected' | 'needs_changes' | 'published';

type UsernameStatus = 'pending' | 'approved' | 'rejected';

const STATUSES: { value: ApprovalStatus | 'all'; ar: string; en: string }[] = [
  { value: 'all',           ar: 'الكل',           en: 'All' },
  { value: 'submitted',     ar: 'تم الإرسال',     en: 'Submitted' },
  { value: 'under_review',  ar: 'قيد المراجعة',   en: 'Under Review' },
  { value: 'needs_changes', ar: 'يحتاج تعديل',    en: 'Needs Changes' },
  { value: 'approved',      ar: 'موافق',          en: 'Approved' },
  { value: 'published',     ar: 'منشور',          en: 'Published' },
  { value: 'rejected',      ar: 'مرفوض',          en: 'Rejected' },
  { value: 'draft',         ar: 'مسودة',          en: 'Draft' },
];

const TONE: Record<ApprovalStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  under_review: 'bg-info/10 text-info',
  needs_changes: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  published: 'bg-success/10 text-success',
};

/** Map approval status → (template, in-app notification copy). */
const NOTIFY_MAP: Partial<Record<ApprovalStatus, {
  template: 'provider-approved' | 'provider-rejected' | 'provider-revision-requested';
  titleAr: string;
  bodyAr: string;
  titleEn: string;
  bodyEn: string;
}>> = {
  approved: {
    template: 'provider-approved',
    titleAr: 'تم اعتماد حساب منشأتك في قِطاعات',
    bodyAr: 'تم اعتماد حساب منشأتك ويمكنك الآن إدارة ملفك واستقبال الطلبات عبر منصة قِطاعات.',
    titleEn: 'Your provider account has been approved',
    bodyEn: 'Your provider account is now active. You can manage your profile and receive requests on Qitaat.',
  },
  rejected: {
    template: 'provider-rejected',
    titleAr: 'لم يتم اعتماد حساب منشأتك',
    bodyAr: 'نأسف، لم يتم اعتماد حساب منشأتك حالياً. يمكنك مراجعة الملاحظات وتحديث البيانات عند الحاجة.',
    titleEn: 'Provider account not approved',
    bodyEn: 'Your provider account was not approved. Review the notes and update your details if needed.',
  },
  needs_changes: {
    template: 'provider-revision-requested',
    titleAr: 'مطلوب تحديث بيانات منشأتك',
    bodyAr: 'يحتاج طلب التسجيل إلى بعض التعديلات قبل الاعتماد. يرجى مراجعة الملاحظات وإعادة الإرسال.',
    titleEn: 'Updates required on your provider profile',
    bodyEn: 'Your registration needs a few updates before approval. Review the notes and resubmit.',
  },
};

interface ProviderRow {
  id: string;
  ref_id: string | null;
  user_id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  username_status: UsernameStatus | null;
  logo_url: string | null;
  description_ar: string | null;
  short_description_ar: string | null;
  email: string | null;
  phone: string | null;
  approval_status: ApprovalStatus | null;
  approval_notes: string | null;
  onboarding_completion: number | null;
  sectors: string[] | null;
  sub_services: string[] | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  national_id: string | null;
  unified_number: string | null;
  vat_number: string | null;
  cr_document_url: string | null;
  cr_document_uploaded_at: string | null;
  cr_owner_name: string | null;
  cr_legal_entity: string | null;
  cr_issue_date: string | null;
  cr_expiry_date: string | null;
}

export default function AdminProviderReview() {
  useNoIndex();
  const { language, isRTL } = useLanguage();
  const { isSuperAdmin } = useAuth();
  usePageMeta({
    title: isRTL ? 'مراجعة المزودين | الإدارة' : 'Provider Review | Admin',
    noindex: true,
  });

  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('submitted');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-provider-review', statusFilter],
    queryFn: async () => {
      const filters: ListAdminBusinessesFilter[] = [];
      if (statusFilter !== 'all') filters.push({ column: 'approval_status', op: 'eq', value: statusFilter });
      const { data, error } = await listAdminBusinesses({
        select: 'id,ref_id,user_id,name_ar,name_en,username,username_status,logo_url,description_ar,short_description_ar,email,phone,approval_status,approval_notes,onboarding_completion,sectors,sub_services,submitted_at,reviewed_at,published_at,created_at,national_id,unified_number,vat_number,cr_document_url,cr_document_uploaded_at,cr_owner_name,cr_legal_entity,cr_issue_date,cr_expiry_date',
        orderBy: [
          { column: 'submitted_at', ascending: false, nullsFirst: false },
          { column: 'created_at', ascending: false },
        ],
        limit: 200,
        filters,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ProviderRow[];
    },
  });

  const filtered = useMemo(() => {
    const list = rows ?? [];
    if (!searchTerm.trim()) return list;
    const t = searchTerm.toLowerCase();
    return list.filter((r) =>
      [r.name_ar, r.name_en, r.username, r.email, r.phone]
        .some((f) => f?.toLowerCase().includes(t))
    );
  }, [rows, searchTerm]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const approvalMutation = useMutation({
    mutationFn: async (vars: { id: string; status: ApprovalStatus; notes?: string }) => {
      const { error } = await supabase.rpc('admin_update_business_approval', {
        _business_id: vars.id,
        _new_status: vars.status,
        _notes: vars.notes ?? null,
      });
      if (error) throw error;
      // PII-free analytics — only outcome + has_notes flag.
      try {
        const payload = {
          source_page: 'admin_provider_review',
          outcome: vars.status,
          has_notes: !!vars.notes?.trim(),
        };
        if (vars.status === 'approved') trackProviderApproved(payload);
        else if (vars.status === 'rejected') trackProviderRejected(payload);
        else if (vars.status === 'needs_changes') trackProviderNeedsChanges(payload);
      } catch { /* analytics never breaks approval */ }
      // Best-effort: notify the provider (in-app + email). Failures must
      // never block the approval action itself.
      const target = (rows ?? []).find((r) => r.id === vars.id);
      const copy = NOTIFY_MAP[vars.status];
      if (!target || !copy) return;

      // 1) In-app notification (requires user_id).
      if (target.user_id) {
        try {
          await createNotification({
            user_id: target.user_id,
            title_ar: copy.titleAr,
            title_en: copy.titleEn,
            body_ar: copy.bodyAr,
            body_en: copy.bodyEn,
            notification_type: 'system',
            reference_type: 'business_approval',
            reference_id: target.id,
            action_url: '/dashboard',
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[AdminProviderReview] notification insert failed', err);
        }
      }

      // 2) Transactional email (requires recipient email).
      if (target.email) {
        try {
          // Only the rejection / revision templates show notes; the
          // approved template never displays them.
          const includeNotes = vars.status === 'rejected' || vars.status === 'needs_changes';
          await sendTransactionalEmail({
            templateName: copy.template,
            recipientEmail: target.email,
            idempotencyKey: `provider-${vars.status}-${target.id}`,
            templateData: {
              recipientName: target.name_ar ?? target.name_en ?? undefined,
              businessName: target.name_ar ?? target.name_en ?? undefined,
              username: target.username ?? undefined,
              notes: includeNotes ? (vars.notes ?? undefined) : undefined,
            },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[AdminProviderReview] email send failed', err);
        }
      }
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      qc.invalidateQueries({ queryKey: ['admin-provider-review'] });
      setNotes('');
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error');
    },
  });

  const usernameMutation = useMutation({
    mutationFn: async (vars: { id: string; status: UsernameStatus; notes?: string }) => {
      const { error } = await supabase.rpc('admin_update_username_status', {
        _business_id: vars.id,
        _new_status: vars.status,
        _notes: vars.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم تحديث اسم المستخدم' : 'Username updated');
      qc.invalidateQueries({ queryKey: ['admin-provider-review'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const renderSectors = (ids: string[] | null) => {
    if (!ids || !ids.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const s = getSectorById(id as SectorId);
          return (
            <Badge key={id} variant="outline" className="gap-1 text-[11px]">
              <Tag className="h-3 w-3" />
              {s ? (language === 'ar' ? s.name_ar : s.name_en) : id}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">
              {isRTL ? 'مراجعة ملفات المزودين' : 'Provider Review'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'موافقة، طلب تعديلات، رفض، أو نشر ملفات المزودين قبل الظهور للجمهور.'
                : 'Approve, request changes, reject, or publish provider profiles.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <>
                <Button asChild size="sm" className="gap-2 rounded-xl h-10">
                  <Link to="/admin/users?create=provider">
                    <UserPlus className="h-4 w-4" />
                    {isRTL ? 'إنشاء مزود جديد' : 'New Provider'}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-2 rounded-xl h-10">
                  <Link to="/admin/users">
                    <UsersIcon className="h-4 w-4" />
                    {isRTL ? 'إدارة المستخدمين' : 'Manage Users'}
                  </Link>
                </Button>
              </>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم أو اسم المستخدم' : 'Search by name or username'}
              dir="auto"
              style={{ paddingInlineStart: '36px' }}
            />
          </div>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ApprovalStatus | 'all'); setSelectedId(null); }}>
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
            {STATUSES.map((s) => (
              <TabsTrigger key={s.value} value={s.value} className="text-xs">
                {language === 'ar' ? s.ar : s.en}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isRTL ? 'القائمة' : 'List'}{' '}
                <Badge variant="outline" className="ms-1 tech-content text-[11px]">
                  {filtered.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 opacity-50" />
                  {isRTL ? 'لا توجد ملفات في هذه الحالة' : 'No providers in this status'}
                </div>
              )}
              {filtered.map((r) => {
                const status = (r.approval_status ?? 'draft') as ApprovalStatus;
                const active = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedId(r.id); setNotes(r.approval_notes ?? ''); }}
                    className={`w-full rounded-xl border p-3 text-start transition-colors hover-lift ${
                      active ? 'border-accent bg-accent/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={r.logo_url ?? undefined} />
                        <AvatarFallback>{(r.name_ar ?? '?').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-heading text-sm font-bold">
                            {language === 'ar' ? (r.name_ar ?? r.name_en) : (r.name_en ?? r.name_ar)}
                          </div>
                          <Badge className={`${TONE[status]} shrink-0 text-[10px]`}>
                            {STATUSES.find((s) => s.value === status)?.[language === 'ar' ? 'ar' : 'en']}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground tech-content">
                          {r.ref_id && <span className="font-mono">{r.ref_id}</span>}
                          {r.username && <span>@{r.username}</span>}
                          <span>{r.onboarding_completion ?? 0}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Detail */}
          <Card>
            {!selected ? (
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
                <Eye className="h-8 w-8 opacity-50" />
                {isRTL ? 'اختر ملفاً من القائمة لمراجعته' : 'Pick a profile from the list to review'}
              </CardContent>
            ) : (
              <>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selected.logo_url ?? undefined} />
                        <AvatarFallback>{(selected.name_ar ?? '?').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {language === 'ar' ? (selected.name_ar ?? selected.name_en) : (selected.name_en ?? selected.name_ar)}
                        </CardTitle>
                        {selected.username && (
                          <a
                            href={`/${selected.username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent tech-content hover:underline"
                          >
                            <Globe className="h-3 w-3" /> qitaat.com/{selected.username}
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge className={TONE[selected.approval_status ?? 'draft']}>
                      {STATUSES.find((s) => s.value === (selected.approval_status ?? 'draft'))?.[language === 'ar' ? 'ar' : 'en']}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Username controls */}
                  {selected.username && (
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-semibold text-muted-foreground">
                          {isRTL ? 'حالة اسم المستخدم' : 'Username status'}
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                          {selected.username_status ?? 'pending'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => usernameMutation.mutate({ id: selected.id, status: 'approved' })}
                          disabled={usernameMutation.isPending}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          {isRTL ? 'الموافقة على الاسم' : 'Approve username'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => usernameMutation.mutate({ id: selected.id, status: 'rejected', notes })}
                          disabled={usernameMutation.isPending}
                          className="gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          {isRTL ? 'رفض الاسم' : 'Reject username'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Profile details */}
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{isRTL ? 'البريد' : 'Email'}</div>
                      <div className="tech-content inline-flex items-center gap-1.5">
                        {selected.email
                          ? (isSuperAdmin ? selected.email : <>{maskEmail(selected.email)} <Lock className="w-3 h-3 opacity-60" aria-label={isRTL ? 'متاح فقط لمدير النظام' : 'Super Admin only'} /></>)
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{isRTL ? 'الجوال' : 'Phone'}</div>
                      <div className="tech-content inline-flex items-center gap-1.5">
                        {selected.phone
                          ? (isSuperAdmin ? selected.phone : <>{maskPhone(selected.phone)} <Lock className="w-3 h-3 opacity-60" aria-label={isRTL ? 'متاح فقط لمدير النظام' : 'Super Admin only'} /></>)
                          : '—'}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground">{isRTL ? 'الوصف' : 'Description'}</div>
                      <p className="leading-relaxed">
                        {selected.description_ar || selected.short_description_ar || (isRTL ? 'لا يوجد وصف' : 'No description')}
                      </p>
                    </div>
                  </div>

                  {/* Sectors */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {isRTL ? 'القطاعات' : 'Sectors'}
                    </div>
                    {renderSectors(selected.sectors) ?? (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Sub-services */}
                  {selected.sub_services && selected.sub_services.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">
                        {isRTL ? 'الخدمات الفرعية' : 'Sub-services'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.sub_services.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px] tech-content">
                    <div>
                      <div className="text-muted-foreground">{isRTL ? 'أُرسل' : 'Submitted'}</div>
                      <div>{selected.submitted_at ? new Date(selected.submitted_at).toLocaleDateString() : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{isRTL ? 'روجع' : 'Reviewed'}</div>
                      <div>{selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleDateString() : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{isRTL ? 'نُشر' : 'Published'}</div>
                      <div>{selected.published_at ? new Date(selected.published_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>

                  {/* Admin notes */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {isRTL ? 'ملاحظات للمزود' : 'Notes to provider'}
                    </div>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 800))}
                      rows={3}
                      dir="auto"
                      placeholder={isRTL ? 'سبب الرفض، تعديلات مطلوبة...' : 'Reason for rejection or required changes...'}
                    />
                    <p className="text-[11px] text-muted-foreground tech-content text-end">{notes.length}/800</p>
                  </div>

                  {/* Commercial Registration scanner */}
                  <CrDocumentScanner
                    businessId={selected.id}
                    defaults={{
                      cr_document_url: selected.cr_document_url,
                      cr_document_uploaded_at: selected.cr_document_uploaded_at,
                      cr_scan_data: null,
                      cr_scan_raw: null,
                      national_id: selected.national_id,
                      unified_number: selected.unified_number,
                      vat_number: selected.vat_number,
                      cr_owner_name: selected.cr_owner_name,
                      cr_legal_entity: selected.cr_legal_entity,
                      cr_issue_date: selected.cr_issue_date,
                      cr_expiry_date: selected.cr_expiry_date,
                      name_ar: selected.name_ar,
                      name_en: selected.name_en,
                    }}
                  />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approvalMutation.mutate({ id: selected.id, status: 'under_review', notes })}
                      disabled={approvalMutation.isPending}
                      className="gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {isRTL ? 'قيد المراجعة' : 'Under review'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!notes.trim()) {
                          toast.error(isRTL ? 'الرجاء كتابة ملاحظات' : 'Please add notes');
                          return;
                        }
                        approvalMutation.mutate({ id: selected.id, status: 'needs_changes', notes });
                      }}
                      disabled={approvalMutation.isPending}
                      className="gap-1"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-warning" />
                      {isRTL ? 'طلب تعديلات' : 'Request changes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approvalMutation.mutate({ id: selected.id, status: 'approved', notes })}
                      disabled={approvalMutation.isPending}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      {isRTL ? 'موافقة' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => approvalMutation.mutate({ id: selected.id, status: 'published', notes })}
                      disabled={approvalMutation.isPending}
                      className="gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isRTL ? 'نشر' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approvalMutation.mutate({ id: selected.id, status: 'submitted', notes })}
                      disabled={approvalMutation.isPending}
                      className="gap-1"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                      {isRTL ? 'إلغاء النشر' : 'Unpublish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!notes.trim()) {
                          toast.error(isRTL ? 'يلزم سبب الرفض' : 'Reason required');
                          return;
                        }
                        approvalMutation.mutate({ id: selected.id, status: 'rejected', notes });
                      }}
                      disabled={approvalMutation.isPending}
                      className="gap-1 text-destructive"
                    >
                      {approvalMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {isRTL ? 'رفض' : 'Reject'}
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/admin/businesses">{isRTL ? 'إدارة كاملة' : 'Full admin'}</Link>
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}