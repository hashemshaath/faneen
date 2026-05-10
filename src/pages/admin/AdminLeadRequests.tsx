import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, Search, Loader2, Mail, Phone, MessageSquare, Filter, RefreshCw, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';

type Status = 'new' | 'contacted' | 'qualified' | 'closed' | 'spam';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface LeadRow {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  budget_range: string | null;
  contact_preference: string | null;
  status: Status;
  priority: Priority;
  source: string | null;
  created_at: string;
}

const statusConfig: Record<Status, { ar: string; en: string; color: string }> = {
  new:       { ar: 'جديد',    en: 'New',       color: 'bg-info/10 text-info border-info/30' },
  contacted: { ar: 'تم التواصل', en: 'Contacted', color: 'bg-warning/10 text-warning border-warning/30' },
  qualified: { ar: 'مؤهَّل',   en: 'Qualified', color: 'bg-secondary/10 text-secondary border-secondary/30' },
  closed:    { ar: 'مغلق',    en: 'Closed',    color: 'bg-success/10 text-success border-success/30' },
  spam:      { ar: 'سبام',    en: 'Spam',      color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const priorityConfig: Record<Priority, { ar: string; en: string; color: string }> = {
  low:    { ar: 'منخفض',  en: 'Low',    color: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  normal: { ar: 'عادي',   en: 'Normal', color: 'bg-info/10 text-info border-info/30' },
  high:   { ar: 'مرتفع',  en: 'High',   color: 'bg-urgent/10 text-urgent border-urgent/30' },
  urgent: { ar: 'عاجل',   en: 'Urgent', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const STATUSES: Status[] = ['new', 'contacted', 'qualified', 'closed', 'spam'];

const AdminLeadRequests: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-lead-requests', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('lead_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as Status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter(r =>
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (r.phone ?? '').toLowerCase().includes(s) ||
      (r.subject ?? '').toLowerCase().includes(s) ||
      r.message.toLowerCase().includes(s)
    );
  }, [data, search]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: data?.length ?? 0 };
    STATUSES.forEach(s => { base[s] = 0; });
    (data ?? []).forEach(r => { base[r.status] = (base[r.status] ?? 0) + 1; });
    return base;
  }, [data]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from('lead_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
      qc.invalidateQueries({ queryKey: ['admin-lead-requests'] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : isRTL ? 'فشل التحديث' : 'Failed to update');
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Inbox className="h-6 w-6 text-primary" />
              {isRTL ? 'طلبات العملاء (Leads)' : 'Lead Requests'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'الاستفسارات الموجَّهة إلى المنشآت' : 'Inquiries directed to businesses'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {(['all', ...STATUSES] as const).map(s => {
            const cfg = s === 'all' ? null : statusConfig[s as Status];
            const active = statusFilter === s;
            const label = s === 'all' ? (isRTL ? 'الكل' : 'All') : (isRTL ? cfg!.ar : cfg!.en);
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-start rounded-xl border p-3 transition hover-lift ${active ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold tech-content">{counts[s] ?? 0}</div>
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
                placeholder={isRTL ? 'بحث بالاسم أو البريد أو الرسالة...' : 'Search by name, email, message...'}
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
                  <SelectItem key={s} value={s}>{isRTL ? statusConfig[s].ar : statusConfig[s].en}</SelectItem>
                ))}
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
              <p>{isRTL ? 'لا توجد طلبات بعد' : 'No lead requests yet'}</p>
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
                        <span className="font-semibold truncate">{r.name}</span>
                        <Badge variant="outline" className={statusConfig[r.status].color}>
                          {isRTL ? statusConfig[r.status].ar : statusConfig[r.status].en}
                        </Badge>
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

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Select
                      value={r.status}
                      onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v as Status })}
                    >
                      <SelectTrigger className="h-9 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{isRTL ? statusConfig[s].ar : statusConfig[s].en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${r.email}`} onClick={() => updateStatus.mutate({ id: r.id, status: 'contacted' })}>
                        <Send className="h-4 w-4" />
                        {isRTL ? 'الرد بالبريد' : 'Reply by email'}
                      </a>
                    </Button>
                    {r.phone && (
                      <Button asChild variant="outline" size="sm">
                        <a href={`tel:${r.phone}`}>
                          <Phone className="h-4 w-4" />
                          {isRTL ? 'اتصال' : 'Call'}
                        </a>
                      </Button>
                    )}
                  </div>
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