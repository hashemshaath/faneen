import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, Search, Loader2, Mail, Phone, Filter, RefreshCw, Send, Wallet, Calendar, ReceiptText, FileText, FileSignature, CheckCircle2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { listAdminLeadRequests } from '@/modules/leads/services/detail';
import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';
import { getContractAfterConvert } from '@/modules/leads/services/conversion';
import { adminConvertLeadToContract }  from '@/modules/leads/services/adminConvertLeadToContract';
import { sendLeadTransactionalEmail } from '@/modules/leads/services/sendLeadTransactionalEmail';
import { getLeadProviderContactForEmail } from '@/modules/leads/services/getLeadProviderContactForEmail';
import { ReferenceTag } from '@/components/reference/ReferenceTag';

// SR-4A: Service Request lifecycle statuses (new vocabulary).
type Status =
  | 'new' | 'viewed' | 'needs_info' | 'accepted' | 'quoted'
  | 'rejected' | 'cancelled' | 'closed';
// Legacy values that may still exist in older rows — read-only support.
type LegacyStatus = 'contacted' | 'qualified' | 'spam';
type AnyStatus = Status | LegacyStatus;
type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface LeadRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  budget_range: string | null;
  contact_preference: string | null;
  status: AnyStatus;
  priority: Priority;
  source: string | null;
  created_at: string;
  responded_at: string | null;
  quoted_at: string | null;
  quoted_by: string | null;
  quote_amount: number | string | null;
  quote_currency: string | null;
  quote_valid_until: string | null;
  quote_note: string | null;
  converted_contract_id: string | null;
  converted_at: string | null;
  converted_by: string | null;
}

const priorityConfig: Record<Priority, { ar: string; en: string; color: string }> = {
  low:    { ar: 'منخفض',  en: 'Low',    color: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  normal: { ar: 'عادي',   en: 'Normal', color: 'bg-info/10 text-info border-info/30' },
  high:   { ar: 'مرتفع',  en: 'High',   color: 'bg-urgent/10 text-urgent border-urgent/30' },
  urgent: { ar: 'عاجل',   en: 'Urgent', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const STATUSES: Status[] = [
  'new', 'viewed', 'needs_info', 'accepted', 'quoted', 'rejected', 'cancelled', 'closed',
];
const LEGACY_STATUSES: LegacyStatus[] = ['contacted', 'qualified', 'spam'];

const statusLabels: Record<Status, { ar: string; en: string }> = {
  new:        { ar: 'جديد',           en: 'New' },
  viewed:     { ar: 'تمت المشاهدة',    en: 'Viewed' },
  needs_info: { ar: 'بحاجة معلومات',   en: 'Needs info' },
  accepted:   { ar: 'مقبول',           en: 'Accepted' },
  quoted:     { ar: 'تم إرسال عرض سعر', en: 'Quote sent' },
  rejected:   { ar: 'مرفوض',           en: 'Rejected' },
  cancelled:  { ar: 'ملغي',            en: 'Cancelled' },
  closed:     { ar: 'مغلق',            en: 'Closed' },
};
const isLegacy = (s: string): s is LegacyStatus =>
  (LEGACY_STATUSES as string[]).includes(s);

const AdminLeadRequests: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-lead-requests', statusFilter],
    queryFn: () =>
      listAdminLeadRequests(statusFilter, LEGACY_STATUSES) as Promise<LeadRow[]>,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter(r =>
      (r.ref_id ?? '').toLowerCase().includes(s) ||
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (r.phone ?? '').toLowerCase().includes(s) ||
      (r.subject ?? '').toLowerCase().includes(s) ||
      r.message.toLowerCase().includes(s)
    );
  }, [data, search]);

  // KPI counts (current loaded set; capped at 200 for safety).
  const kpis = useMemo(() => {
    const rows = data ?? [];
    const base: Record<string, number> = { all: rows.length, legacy: 0 };
    STATUSES.forEach(s => { base[s] = 0; });
    let respondedSum = 0;
    let respondedCount = 0;
    rows.forEach(r => {
      if (isLegacy(r.status)) base.legacy += 1;
      else base[r.status] = (base[r.status] ?? 0) + 1;
      if (r.responded_at && r.created_at) {
        const dt = new Date(r.responded_at).getTime() - new Date(r.created_at).getTime();
        if (Number.isFinite(dt) && dt >= 0) {
          respondedSum += dt;
          respondedCount += 1;
        }
      }
    });
    const avgFirstResponseMs = respondedCount > 0 ? Math.round(respondedSum / respondedCount) : null;
    // Conversion funnel: new → accepted → quoted (uses presence of timestamps when available)
    const total = rows.length;
    const accepted = rows.filter(r => r.status === 'accepted' || r.status === 'quoted' || r.status === 'closed').length;
    const quoted = rows.filter(r => r.status === 'quoted' || (r.quoted_at != null)).length;
    return { ...base, avgFirstResponseMs, total, accepted, quoted };
  }, [data]);

  const fmtDuration = (ms: number | null) => {
    if (ms == null) return '—';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return isRTL ? `${mins} د` : `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return isRTL ? `${hrs} س` : `${hrs}h`;
    const days = Math.round(hrs / 24);
    return isRTL ? `${days} ي` : `${days}d`;
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      await updateLeadRequestStatus(id, status);
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
      qc.invalidateQueries({ queryKey: ['admin-lead-requests'] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : isRTL ? 'فشل التحديث' : 'Failed to update');
    },
  });

  const convertLead = useMutation({
    mutationFn: async (lead: LeadRow) => {
      const contractId = await adminConvertLeadToContract(lead.id);
      // Fail-soft: send draft-contract emails to client + provider. Errors are logged
      // but never roll back the conversion (contract + in-app notifications already
      // committed). converted_contract_id guard in RPC prevents duplicate sends.
      try {
        const contract = await getContractAfterConvert(contractId);
        const { businessName, providerEmail } = await getLeadProviderContactForEmail({
          businessId: lead.business_id,
          contractProviderUserId: contract?.provider_id,
        });
        const contractNumber = contract?.contract_number || undefined;
        const sends: Promise<unknown>[] = [];
        if (lead.email) {
          sends.push(sendLeadTransactionalEmail({
            templateName: 'contract-draft-created-client',
            recipientEmail: lead.email,
            idempotencyKey: `contract-draft-client-${contractId}`,
            templateData: { name: lead.name, businessName, contractNumber, contractId },
          }));
        }
        if (providerEmail) {
          sends.push(sendLeadTransactionalEmail({
            templateName: 'contract-draft-created-provider',
            recipientEmail: providerEmail,
            idempotencyKey: `contract-draft-provider-${contractId}`,
            templateData: { businessName, contractNumber, contractId },
          }));
        }
        await Promise.allSettled(sends);
      } catch (mailErr) {
        console.warn('[convert-lead] email side-effect failed (non-blocking)', mailErr);
      }
      return contractId;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم تحويل الطلب إلى عقد مسودة' : 'Lead converted to draft contract');
      setConfirmConvertId(null);
      qc.invalidateQueries({ queryKey: ['admin-lead-requests'] });
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : '';
      const map: Record<string, { ar: string; en: string }> = {
        forbidden: { ar: 'صلاحيات غير كافية', en: 'Insufficient permissions' },
        already_converted: { ar: 'تم تحويل هذا الطلب مسبقًا', en: 'Already converted' },
        invalid_status: { ar: 'لا يمكن التحويل من هذه الحالة', en: 'Status not eligible for conversion' },
        lead_has_no_registered_user: { ar: 'الطلب غير مرتبط بحساب مسجل', en: 'Lead is not linked to a registered user' },
        business_has_no_owner: { ar: 'لا يوجد مالك للمنشأة', en: 'Business has no owner' },
      };
      const key = Object.keys(map).find(k => raw.includes(k));
      const msg = key ? (isRTL ? map[key].ar : map[key].en) : (raw || (isRTL ? 'فشل التحويل' : 'Conversion failed'));
      toast.error(msg);
    },
  });

  const isEligible = (r: LeadRow) =>
    !r.converted_contract_id && (r.status === 'accepted' || r.status === 'quoted') && !!r.user_id;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Inbox className="h-6 w-6 text-primary" />
              {isRTL ? 'طلبات الخدمة' : 'Service Requests'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'إدارة طلبات العملاء وعروض الأسعار' : 'Manage customer requests and quotes'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label={isRTL ? 'تحديث' : 'Refresh'}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </header>

        {/* KPI summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{isRTL ? 'متوسط زمن أول رد' : 'Avg. first response'}</div>
            <div className="text-2xl font-bold tech-content">{fmtDuration(kpis.avgFirstResponseMs)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{isRTL ? 'نسبة القبول' : 'Acceptance rate'}</div>
            <div className="text-2xl font-bold tech-content">
              {kpis.total > 0 ? `${Math.round((kpis.accepted / kpis.total) * 100)}%` : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{isRTL ? 'نسبة العروض المرسلة' : 'Quoted rate'}</div>
            <div className="text-2xl font-bold tech-content">
              {kpis.total > 0 ? `${Math.round((kpis.quoted / kpis.total) * 100)}%` : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{isRTL ? 'سجلات قديمة' : 'Legacy records'}</div>
            <div className="text-2xl font-bold tech-content">{(kpis as unknown as Record<string, number>).legacy ?? 0}</div>
          </div>
        </div>

        {/* Status filter chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
          {(['all', ...STATUSES, 'legacy'] as const).map(s => {
            const active = statusFilter === s;
            const label = s === 'all' ? (isRTL ? 'الكل' : 'All')
              : s === 'legacy' ? (isRTL ? 'قديم' : 'Legacy')
              : (isRTL ? statusLabels[s].ar : statusLabels[s].en);
            const count = (kpis as unknown as Record<string, number>)[s] ?? 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={active}
                className={`text-start rounded-xl border p-3 transition hover-lift min-h-[64px] ${active ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <div className="text-[11px] text-muted-foreground truncate">{label}</div>
                <div className="text-xl font-bold tech-content">{count}</div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث برقم الطلب أو الاسم أو البريد...' : 'Search by ref, name, or email...'}
                className="ps-9 h-11"
                dir="auto"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{isRTL ? statusLabels[s].ar : statusLabels[s].en}</SelectItem>
                ))}
                <SelectItem value="legacy">{isRTL ? 'قديم (legacy)' : 'Legacy'}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin me-2" />
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{isRTL ? 'لا توجد طلبات مطابقة' : 'No matching requests'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <Card key={r.id} className="hover-lift">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.ref_id
                          ? <ReferenceTag refId={r.ref_id} isRTL={isRTL} />
                          : <span className="font-mono text-xs text-muted-foreground tech-content">—</span>}
                        <span className="font-semibold truncate">{r.name}</span>
                        <LeadStatusBadge status={r.status} />
                        {isLegacy(r.status) && (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                            {isRTL ? 'قديم' : 'Legacy'}
                          </Badge>
                        )}
                        <Badge variant="outline" className={priorityConfig[r.priority].color}>
                          {isRTL ? priorityConfig[r.priority].ar : priorityConfig[r.priority].en}
                        </Badge>
                        {r.source && (
                          <Badge variant="outline" className="text-xs">{r.source}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1 tech-content">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>
                        {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                        {r.budget_range && <span>{isRTL ? 'الميزانية:' : 'Budget:'} {r.budget_range}</span>}
                        {r.contact_preference && <span>{isRTL ? 'يفضل:' : 'Via:'} {r.contact_preference}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: isRTL ? ar : undefined })}
                    </div>
                  </div>

                  {r.subject && <div className="text-sm font-medium">{r.subject}</div>}
                  <div className="text-sm whitespace-pre-wrap text-foreground/90 bg-muted/30 rounded-lg p-3">
                    {r.message}
                  </div>

                  {/* Quote details — read-only, admin view only */}
                  {(r.status === 'quoted' || r.quote_amount != null) && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <ReceiptText className="h-3.5 w-3.5 text-primary" />
                        <span>{isRTL ? 'تفاصيل عرض السعر' : 'Quote details'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {r.quote_amount != null && (
                          <span className="inline-flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="tech-content font-medium">
                              {Number(r.quote_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} {r.quote_currency ?? 'SAR'}
                            </span>
                          </span>
                        )}
                        {r.quote_valid_until && (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="tech-content">
                              {isRTL ? 'صالح حتى:' : 'Valid until:'} {r.quote_valid_until}
                            </span>
                          </span>
                        )}
                        {r.quoted_at && (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground sm:col-span-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="tech-content">
                              {new Date(r.quoted_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                            </span>
                          </span>
                        )}
                        {r.quote_note && (
                          <span className="inline-flex items-start gap-1.5 sm:col-span-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                            <span className="leading-5 whitespace-pre-wrap text-foreground/90">{r.quote_note}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Select
                      value={isLegacy(r.status) ? '' : r.status}
                      onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v as Status })}
                    >
                      <SelectTrigger className="h-9 w-[180px]" aria-label={isRTL ? 'تغيير الحالة' : 'Change status'}>
                        <SelectValue placeholder={isLegacy(r.status) ? (isRTL ? 'تحديث للحالة الجديدة' : 'Update to new status') : undefined} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{isRTL ? statusLabels[s].ar : statusLabels[s].en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild variant="outline" size="sm" aria-label={isRTL ? 'الرد بالبريد' : 'Reply by email'}>
                      <a href={`mailto:${r.email}`}>
                        <Send className="h-4 w-4" />
                        {isRTL ? 'الرد بالبريد' : 'Reply by email'}
                      </a>
                    </Button>
                    {r.phone && (
                      <Button asChild variant="outline" size="sm" aria-label={isRTL ? 'اتصال' : 'Call'}>
                        <a href={`tel:${r.phone}`}>
                          <Phone className="h-4 w-4" />
                          {isRTL ? 'اتصال' : 'Call'}
                        </a>
                      </Button>
                    )}
                    {r.converted_contract_id ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                        <FileSignature className="h-3.5 w-3.5 me-1" />
                        {isRTL ? 'تم التحويل إلى عقد' : 'Converted to contract'}
                      </Badge>
                    ) : isEligible(r) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setConfirmConvertId(r.id)}
                        disabled={convertLead.isPending}
                        aria-label={isRTL ? 'تحويل إلى عقد' : 'Convert to contract'}
                      >
                        <FileSignature className="h-4 w-4" />
                        {isRTL ? 'تحويل إلى عقد' : 'Convert to contract'}
                      </Button>
                    )}
                  </div>

                  {confirmConvertId === r.id && (
                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
                      <div className="text-sm font-medium">
                        {isRTL
                          ? 'هل تريد إنشاء عقد مسودة من هذا الطلب؟ سيتم ربط العميل والمزود تلقائيًا.'
                          : 'Create a draft contract from this request? Client and provider will be linked automatically.'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => convertLead.mutate(r)}
                          disabled={convertLead.isPending}
                          aria-label={isRTL ? 'تأكيد التحويل' : 'Confirm conversion'}
                        >
                          {convertLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {isRTL ? 'تأكيد' : 'Confirm'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmConvertId(null)}
                          disabled={convertLead.isPending}
                          aria-label={isRTL ? 'إلغاء' : 'Cancel'}
                        >
                          <X className="h-4 w-4" />
                          {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminLeadRequests;