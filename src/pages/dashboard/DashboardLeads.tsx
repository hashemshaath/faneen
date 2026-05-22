import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LeadStatusBadge, type LeadStatus } from '@/components/leads/LeadStatusBadge';
import { LeadDetailPanel, type LeadRow } from '@/components/leads/LeadDetailPanel';
import { trackEvent } from '@/lib/analytics-events';
import { listProviderLeadRequests } from '@/modules/leads/services/detail';
import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';
import { notifyCustomerLeadUpdate } from '@/modules/leads/services/notifyCustomerLeadUpdate';
import { createOrGetLeadConversation } from '@/modules/leads/services/createOrGetLeadConversation';

const FILTERS: Array<{ key: 'all' | LeadStatus; ar: string; en: string }> = [
  { key: 'all',        ar: 'الكل',           en: 'All' },
  { key: 'new',        ar: 'جديد',           en: 'New' },
  { key: 'viewed',     ar: 'تمت المشاهدة',    en: 'Viewed' },
  { key: 'needs_info', ar: 'بحاجة معلومات',   en: 'Needs info' },
  { key: 'accepted',   ar: 'مقبول',           en: 'Accepted' },
  { key: 'quoted',     ar: 'تم إرسال عرض',    en: 'Quoted' },
  { key: 'rejected',   ar: 'مرفوض',           en: 'Rejected' },
  { key: 'closed',     ar: 'مغلق',            en: 'Closed' },
];

function safeTrack(event: Parameters<typeof trackEvent>[0], payload: Parameters<typeof trackEvent>[1]) {
  try { trackEvent(event, payload); } catch { /* analytics must not throw */ }
}

const DashboardLeads: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Resolve user's businesses (owner or manager)
  const { data: bizIds } = useQuery({
    queryKey: ['my-managed-businesses', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [owned, staff] = await Promise.all([
        supabase.from('businesses').select('id, name_ar, name_en').eq('user_id', user!.id),
        supabase.from('business_staff')
          .select('business_id, role, businesses:business_id(id, name_ar, name_en)')
          .eq('user_id', user!.id).eq('is_active', true).in('role', ['owner','manager']),
      ]);
      const map = new Map<string, { id: string; name_ar: string | null; name_en: string | null }>();
      (owned.data ?? []).forEach((b) => map.set(b.id, b));
      (staff.data ?? []).forEach((s) => {
        const b = (s as unknown as { businesses?: { id: string; name_ar: string | null; name_en: string | null } }).businesses;
        if (b) map.set(b.id, b);
      });
      return Array.from(map.values());
    },
  });

  const businessNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (bizIds ?? []).forEach((b) => m.set(b.id, (isRTL ? b.name_ar : b.name_en) ?? b.name_ar ?? b.name_en ?? ''));
    return m;
  }, [bizIds, isRTL]);

  const ids = (bizIds ?? []).map((b) => b.id);

  const { data: leads, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['provider-leads', ids.join(','), filter],
    enabled: ids.length > 0,
    queryFn: () =>
      listProviderLeadRequests(ids, filter) as unknown as Promise<LeadRow[]>,
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s || !leads) return leads ?? [];
    return leads.filter((l) =>
      (l.ref_id ?? '').toLowerCase().includes(s) ||
      (l.name ?? '').toLowerCase().includes(s) ||
      (l.subject ?? '').toLowerCase().includes(s),
    );
  }, [leads, search]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: LeadStatus }) => {
      await updateLeadRequestStatus(id, next);
      // Fire-and-forget lifecycle notifier — must not block the optimistic UX.
      try {
        await notifyCustomerLeadUpdate({ lead_id: id, status: next });
      } catch { /* fail-soft */ }
      // SR-3A: when provider engages, ensure a conversation exists so both
      // sides can chat. Fail-soft — never block status update.
      if (next === 'accepted' || next === 'needs_info') {
        try {
          const lead = leads?.find((l) => l.id === id);
          if (lead?.user_id) {
            const { data: convId } = await createOrGetLeadConversation({ _lead_id: id });
            if (convId) {
              safeTrack('service_request_conversation_created', {
                source_page: 'dashboard_leads',
                outcome: next,
                is_authenticated: true,
                has_budget: !!lead?.budget_range,
              } as Parameters<typeof trackEvent>[1]);
            }
          }
        } catch { /* fail-soft */ }
      }
      return next;
    },
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: (next, { id }) => {
      const lead = leads?.find((l) => l.id === id);
      const eventMap: Partial<Record<string, string>> = {
        viewed: 'service_request_viewed',
        accepted: 'service_request_accepted',
        rejected: 'service_request_rejected',
        needs_info: 'service_request_needs_info',
        closed: 'service_request_closed',
      };
      const ev = eventMap[next];
      if (ev) {
        safeTrack(ev as Parameters<typeof trackEvent>[0], {
          source_page: 'dashboard_leads',
          outcome: next,
          has_budget: !!lead?.budget_range,
        } as Parameters<typeof trackEvent>[1]);
      }
      toast.success(isRTL ? 'تم تحديث حالة الطلب' : 'Request status updated');
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(isRTL ? `تعذر التحديث: ${msg}` : `Update failed: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  const handleAction = (id: string, next: LeadStatus) => updateStatus.mutate({ id, next });

  const ensureConversation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await createOrGetLeadConversation({ _lead_id: id });
      if (error) throw error;
      return data as string;
    },
    onMutate: (id) => setPendingId(id),
    onSuccess: (convId, id) => {
      const lead = leads?.find((l) => l.id === id);
      safeTrack('service_request_conversation_opened', {
        source_page: 'dashboard_leads',
        outcome: lead?.status ?? 'unknown',
        is_authenticated: true,
      } as Parameters<typeof trackEvent>[1]);
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
      window.location.assign(`/dashboard/messages?conversation=${convId}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to open conversation';
      toast.error(isRTL ? `تعذر فتح المحادثة: ${msg}` : `Could not open conversation: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  // SR-3B: Send a quote — updates lead_requests with quote fields and status=quoted.
  const sendQuote = useMutation({
    mutationFn: async (input: { id: string; amount: number; currency: 'SAR'; note: string | null; valid_until: string | null }) => {
      await updateLeadRequestStatus(input.id, 'quoted', {
        quote_amount: input.amount,
        quote_currency: input.currency,
        quote_note: input.note,
        quote_valid_until: input.valid_until,
      });
      // Lifecycle email + in-app notification (fail-soft).
      try {
        await notifyCustomerLeadUpdate({ lead_id: input.id, status: 'quoted' });
      } catch { /* fail-soft */ }
      // Ensure conversation exists for registered customer (fail-soft).
      const lead = leads?.find((l) => l.id === input.id);
      if (lead?.user_id) {
        try { await createOrGetLeadConversation({ _lead_id: input.id }); } catch { /* fail-soft */ }
      }
      return input;
    },
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: (input) => {
      const lead = leads?.find((l) => l.id === input.id);
      const validityBucket: 'none' | '1-7d' | '8-30d' | '30d_plus' = (() => {
        if (!input.valid_until) return 'none';
        const days = Math.ceil((new Date(input.valid_until).getTime() - Date.now()) / 86_400_000);
        if (days <= 7) return '1-7d';
        if (days <= 30) return '8-30d';
        return '30d_plus';
      })();
      safeTrack('service_request_quoted', {
        source_page: 'dashboard_leads',
        outcome: 'quoted',
        has_budget: !!lead?.budget_range,
        has_quote_amount: true,
        quote_validity_bucket: validityBucket,
      } as Parameters<typeof trackEvent>[1]);
      toast.success(isRTL ? 'تم إرسال عرض السعر' : 'Quote sent');
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to send quote';
      toast.error(isRTL ? `تعذر الإرسال: ${msg}` : `Could not send quote: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              {isRTL ? 'طلبات الخدمة' : 'Service Requests'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'استقبل وأدر طلبات العملاء لمنشآتك' : 'Receive and manage customer requests for your businesses'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label={isRTL ? 'تحديث' : 'Refresh'}>
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
            <span>{isRTL ? 'تحديث' : 'Refresh'}</span>
          </Button>
        </header>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? 'بحث برقم الطلب أو الاسم أو الموضوع' : 'Search by ref, name, or subject'}
              className="ps-9 h-11"
              dir="auto"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              onClick={() => setFilter(f.key)}
              className="min-h-[40px]"
            >
              {isRTL ? f.ar : f.en}
            </Button>
          ))}
        </div>

        {ids.length === 0 && !isLoading && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            {isRTL ? 'لا توجد منشأة مرتبطة بحسابك بعد.' : 'No business linked to your account yet.'}
          </CardContent></Card>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        )}

        {!isLoading && ids.length > 0 && filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد طلبات مطابقة' : 'No matching requests'}
            </p>
          </CardContent></Card>
        )}

        <div className="space-y-3">
          {filtered.map((lead) => {
            const open = openId === lead.id;
            return (
              <Card key={lead.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : lead.id)}
                    className="w-full text-start p-4 sm:p-5 flex flex-wrap items-center gap-3 hover:bg-muted/40 transition-colors min-h-[64px]"
                    aria-expanded={open}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground tech-content">{lead.ref_id ?? '—'}</span>
                        <LeadStatusBadge status={lead.status} />
                        {lead.priority && lead.priority !== 'normal' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">{lead.priority}</span>
                        )}
                      </div>
                      <div className="font-medium truncate">{lead.subject || lead.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {businessNameMap.get(lead.business_id) ?? ''} · {new Date(lead.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                      </div>
                    </div>
                    {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {open && (
                    <div className="p-4 sm:p-5 border-t border-border">
                      <LeadDetailPanel
                        lead={{ ...lead, business_name: businessNameMap.get(lead.business_id) ?? null }}
                        pending={pendingId === lead.id}
                        onAction={(next) => handleAction(lead.id, next)}
                        onOpenConversation={() => ensureConversation.mutate(lead.id)}
                        onSendQuote={(input) => sendQuote.mutate({ id: lead.id, ...input })}
                      />
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

export default DashboardLeads;