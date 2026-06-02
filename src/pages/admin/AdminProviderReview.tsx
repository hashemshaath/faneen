import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Search, CheckCircle2, XCircle, Eye,
  AlertCircle, Loader2, Send, Globe, Tag, Lock, UserPlus, Users as UsersIcon,
  ArrowUpDown, Building2, ExternalLink, Clock, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { listAdminBusinesses, countBusinesses, type ListAdminBusinessesFilter } from '@/modules/businesses';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { trackProviderApproved, trackProviderRejected, trackProviderNeedsChanges } from '@/lib/analytics-events';
import { useNoIndex } from "@/hooks/useNoIndex";
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { createNotification } from '@/modules/notifications/services/createNotification';
import { AdminProviderGrowthPanel } from '@/components/admin/AdminProviderGrowthPanel';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import {
  STATUSES, NOTIFY_MAP,
  type ApprovalStatus, type UsernameStatus, type SortKey, type ProviderRow,
} from '@/components/admin/provider-review/types';
import { ProviderReviewListItem } from '@/components/admin/provider-review/ProviderReviewListItem';
import { ProviderReviewDetailPanel } from '@/components/admin/provider-review/ProviderReviewDetailPanel';

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
  const [sortKey, setSortKey] = useState<SortKey>('submitted_desc');

  const { data: rows, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-provider-review', statusFilter],
    queryFn: async () => {
      const filters: ListAdminBusinessesFilter[] = [];
      if (statusFilter !== 'all') filters.push({ column: 'approval_status', op: 'eq', value: statusFilter });
      const { data, error } = await listAdminBusinesses({
        select: 'id,ref_id,user_id,name_ar,name_en,username,username_status,logo_url,description_ar,short_description_ar,email,phone,approval_status,approval_notes,onboarding_completion,sectors,sub_services,submitted_at,reviewed_at,published_at,created_at,national_id,unified_number,vat_number,cr_document_url,cr_document_uploaded_at,cr_owner_name,cr_legal_entity,cr_issue_date,cr_expiry_date,is_active,is_demo',
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

  // ── Per-status counts (drives KPI strip + tab badges). One light
  //    head-only count per status — runs in parallel. Refreshes
  //    whenever the main list mutates (same query-key prefix).
  const COUNT_STATUSES: ApprovalStatus[] = [
    'submitted', 'under_review', 'needs_changes', 'approved', 'published', 'rejected', 'draft',
  ];
  const { data: statusCounts } = useQuery({
    queryKey: ['admin-provider-review', 'counts'],
    queryFn: async () => {
      const entries = await Promise.all(
        COUNT_STATUSES.map(async (s) => {
          const { count } = await countBusinesses({
            select: 'id',
            filters: [{ column: 'approval_status', op: 'eq', value: s }],
          });
          return [s, count ?? 0] as const;
        }),
      );
      const map: Record<string, number> = {};
      let total = 0;
      for (const [s, n] of entries) { map[s] = n; total += n; }
      map.all = total;
      return map;
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const t = searchTerm.trim().toLowerCase();
    const searched = !t ? list : list.filter((r) =>
      [r.name_ar, r.name_en, r.username, r.email, r.phone, r.ref_id]
        .some((f) => f?.toLowerCase().includes(t)),
    );
    const sorted = [...searched].sort((a, b) => {
      switch (sortKey) {
        case 'submitted_asc': {
          const av = a.submitted_at ?? a.created_at;
          const bv = b.submitted_at ?? b.created_at;
          return new Date(av).getTime() - new Date(bv).getTime();
        }
        case 'completion_desc':
          return (b.onboarding_completion ?? 0) - (a.onboarding_completion ?? 0);
        case 'name_asc': {
          const an = (language === 'ar' ? a.name_ar : a.name_en) ?? '';
          const bn = (language === 'ar' ? b.name_ar : b.name_en) ?? '';
          return an.localeCompare(bn, language === 'ar' ? 'ar' : 'en');
        }
        case 'submitted_desc':
        default: {
          const av = a.submitted_at ?? a.created_at;
          const bv = b.submitted_at ?? b.created_at;
          return new Date(bv).getTime() - new Date(av).getTime();
        }
      }
    });
    return sorted;
  }, [rows, searchTerm, sortKey, language]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  // Auto-select first row when filter/sort changes and nothing is selected.
  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
      setNotes(filtered[0].approval_notes ?? '');
    }
  }, [filtered, selectedId]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <AdminPageHeader
          tone="success"
          icon={ShieldCheck}
          eyebrow={isRTL ? 'مراجعة الجودة' : 'Quality Review'}
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'مراجعة المزودين' : 'Provider Review' },
          ]}
          title={isRTL ? 'مراجعة ملفات المزودين' : 'Provider Profile Review'}
          subtitle={
            isRTL
              ? `${statusCounts?.all ?? 0} ملف إجمالاً • اعتماد، طلب تعديلات، رفض، أو نشر ملفات المزودين قبل ظهورها للجمهور.`
              : `${statusCounts?.all ?? 0} profiles total • Approve, request changes, reject, or publish provider profiles before they go public.`
          }
          actions={
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['admin-provider-review', 'counts'] }); }}
                disabled={isFetching}
                className="gap-1.5 rounded-xl h-10"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl h-10">
                <Link to="/admin/businesses">
                  <Building2 className="h-4 w-4" />
                  {isRTL ? 'كل المنشآت' : 'All Businesses'}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl h-10">
                <Link to="/admin/provider-analytics">
                  <Eye className="h-4 w-4" />
                  {isRTL ? 'التحليلات' : 'Analytics'}
                </Link>
              </Button>
              {isSuperAdmin && (
                <Button asChild size="sm" className="gap-1.5 rounded-xl h-10">
                  <Link to="/admin/users?create=provider">
                    <UserPlus className="h-4 w-4" />
                    {isRTL ? 'مزود جديد' : 'New Provider'}
                  </Link>
                </Button>
              )}
            </>
          }
          kpiSlot={
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {STATUSES.filter((s) => s.value !== 'all').map((s) => {
                const key = s.value as ApprovalStatus;
                const n = statusCounts?.[key] ?? 0;
                const active = statusFilter === key;
                const toneMap: Record<ApprovalStatus, 'success' | 'info' | 'warning' | 'destructive' | 'muted'> = {
                  draft: 'muted',
                  submitted: 'info',
                  under_review: 'info',
                  needs_changes: 'warning',
                  approved: 'success',
                  rejected: 'destructive',
                  published: 'success',
                };
                const iconMap: Record<ApprovalStatus, React.ElementType> = {
                  draft: Clock,
                  submitted: Send,
                  under_review: Eye,
                  needs_changes: AlertCircle,
                  approved: CheckCircle2,
                  rejected: XCircle,
                  published: Globe,
                };
                return (
                  <AdminKpiCard
                    key={s.value}
                    label={language === 'ar' ? s.ar : s.en}
                    value={n}
                    icon={iconMap[key]}
                    tone={toneMap[key]}
                    active={active}
                    onClick={() => { setStatusFilter(key); setSelectedId(null); }}
                  />
                );
              })}
            </div>
          }
        />

        {/* ─────── Toolbar: tabs + search + sort ─────── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as ApprovalStatus | 'all'); setSelectedId(null); }}
            className="min-w-0 flex-1"
          >
            <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
              {STATUSES.map((s) => {
                const n = statusCounts?.[s.value] ?? (s.value === 'all' ? 0 : 0);
                return (
                  <TabsTrigger key={s.value} value={s.value} className="gap-1.5 text-xs">
                    <span>{language === 'ar' ? s.ar : s.en}</span>
                    {statusCounts && (
                      <span className="rounded-md bg-background/70 px-1.5 py-0 text-[10px] tabular-nums tech-content text-muted-foreground">
                        {n}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ insetInlineStart: '12px' }} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isRTL ? 'بحث بالاسم، المعرّف، اسم المستخدم' : 'Search name, ref, username'}
                dir="auto"
                className="h-10"
                style={{ paddingInlineStart: '36px' }}
              />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-10 w-[170px] gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_desc">{isRTL ? 'الأحدث إرسالاً' : 'Newest submitted'}</SelectItem>
                <SelectItem value="submitted_asc">{isRTL ? 'الأقدم إرسالاً' : 'Oldest submitted'}</SelectItem>
                <SelectItem value="completion_desc">{isRTL ? 'الأعلى اكتمالاً' : 'Highest completion'}</SelectItem>
                <SelectItem value="name_asc">{isRTL ? 'الاسم (أ–ي)' : 'Name (A–Z)'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AdminProviderGrowthPanel
          providers={(rows ?? []).map((r) => ({ ...r, id: r.id }))}
          onSelectProvider={(id) => { setStatusFilter('all'); setSelectedId(id); }}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* List */}
          <Card className="lg:max-h-[calc(100vh-260px)] lg:overflow-hidden lg:flex lg:flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isRTL ? 'القائمة' : 'List'}{' '}
                <Badge variant="outline" className="ms-1 tech-content text-[11px]">
                  {filtered.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 lg:overflow-y-auto lg:flex-1">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 opacity-50" />
                  {isRTL ? 'لا توجد ملفات في هذه الحالة' : 'No providers in this status'}
                </div>
              )}
              {filtered.map((r) => (
                <ProviderReviewListItem
                  key={r.id}
                  row={r}
                  active={selectedId === r.id}
                  language={language === 'ar' ? 'ar' : 'en'}
                  onSelect={(row) => { setSelectedId(row.id); setNotes(row.approval_notes ?? ''); }}
                />
              ))}
            </CardContent>
          </Card>

          {/* Detail */}
          <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
            <ProviderReviewDetailPanel
              selected={selected}
              notes={notes}
              setNotes={setNotes}
              language={language === 'ar' ? 'ar' : 'en'}
              isRTL={isRTL}
              isSuperAdmin={isSuperAdmin}
              approvalPending={approvalMutation.isPending}
              usernamePending={usernameMutation.isPending}
              onApprovalChange={(status) => approvalMutation.mutate({ id: selected!.id, status, notes })}
              onUsernameChange={(status) => usernameMutation.mutate({ id: selected!.id, status, notes: status === 'rejected' ? notes : undefined })}
            />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}