import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Mail, AlertTriangle, CheckCircle2, XCircle, Inbox, ShieldAlert,
  Loader2, RefreshCw, Bell, BellOff, Search, Send, Radio, MousePointerClick, Eye,
  Tags, DollarSign, FileText, Wrench, Users, Calendar, CreditCard, MessageSquare, Briefcase, LayoutDashboard, Link2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useNoIndex } from "@/hooks/useNoIndex";

interface DeliverabilityStats {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  complained: number;
  suppressed: number;
  pending: number;
  dlq: number;
  failure_rate: number;
  bounce_rate: number;
  complaint_rate: number;
}

interface EmailLogRow {
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  opens_count?: number;
  clicks_count?: number;
  first_opened_at?: string | null;
  first_clicked_at?: string | null;
}

interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  window_minutes: number;
  total_emails: number;
  failed_count: number;
  bounced_count: number;
  complained_count: number;
  rate: number;
  threshold: number;
  message: string | null;
  acknowledged: boolean;
  created_at: string;
}

const WINDOWS: Record<string, number> = {
  '1h': 60,
  '24h': 60 * 24,
  '7d': 60 * 24 * 7,
  '30d': 60 * 24 * 30,
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    sent: 'bg-success/10 text-success border-success/30',
    pending: 'bg-info/10 text-info border-info/30',
    failed: 'bg-destructive/10 text-destructive border-destructive/30',
    dlq: 'bg-destructive/15 text-destructive border-destructive/40',
    bounced: 'bg-warning/10 text-warning border-warning/30',
    complained: 'bg-secondary/10 text-secondary border-secondary/30',
    suppressed: 'bg-muted text-muted-foreground border-border',
  };
  return map[status] ?? 'bg-muted text-muted-foreground border-border';
};

const severityBadge = (sev: string) => {
  if (sev === 'critical') return 'bg-destructive/15 text-destructive border-destructive/40';
  if (sev === 'warning') return 'bg-warning/10 text-warning border-warning/30';
  return 'bg-info/10 text-info border-info/30';
};

const AdminEmailDeliverability: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [windowKey, setWindowKey] = useState<keyof typeof WINDOWS>('24h');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const windowMinutes = WINDOWS[windowKey];
  const sinceIso = useMemo(
    () => new Date(Date.now() - windowMinutes * 60_000).toISOString(),
    [windowMinutes],
  );

  // Latest-isRTL ref so realtime channel can read current language for toast
  // strings WITHOUT tearing down & re-subscribing on language flips.
  const isRTLRef = useRef(isRTL);
  useEffect(() => { isRTLRef.current = isRTL; }, [isRTL]);

  // Realtime subscription: refresh logs/alerts/stats whenever a new event lands
  useEffect(() => {
    const channel = supabase
      .channel('email-deliverability-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_send_log' }, (payload) => {
        setLiveTick(t => t + 1);
        queryClient.invalidateQueries({ queryKey: ['email-logs'] });
        queryClient.invalidateQueries({ queryKey: ['email-stats'] });
        const row = (payload.new ?? payload.old) as EmailLogRow | undefined;
        if (row && payload.eventType === 'INSERT') {
          const rtl = isRTLRef.current;
          if (row.status === 'sent') {
            toast.success(rtl ? `تم تسليم: ${row.recipient_email}` : `Delivered: ${row.recipient_email}`, { duration: 3000 });
          } else if (row.status === 'bounced') {
            toast.error(rtl ? `ارتداد: ${row.recipient_email}` : `Bounced: ${row.recipient_email}`);
          } else if (row.status === 'complained') {
            toast.error(rtl ? `شكوى spam: ${row.recipient_email}` : `Complaint: ${row.recipient_email}`);
          } else if (row.status === 'failed' || row.status === 'dlq') {
            toast.error(rtl ? `فشل الإرسال: ${row.recipient_email}` : `Failed: ${row.recipient_email}`);
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'email_deliverability_alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['email-alerts'] });
        toast.warning(isRTLRef.current ? 'تنبيه جديد: ارتفاع في معدل الفشل/الارتداد' : 'New deliverability alert');
      })
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['email-stats', windowMinutes],
    queryFn: async (): Promise<DeliverabilityStats> => {
      const { data, error } = await supabase.rpc('get_email_deliverability_stats', {
        _window_minutes: windowMinutes,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? {
        total: 0, sent: 0, failed: 0, bounced: 0, complained: 0,
        suppressed: 0, pending: 0, dlq: 0,
        failure_rate: 0, bounce_rate: 0, complaint_rate: 0,
      }) as DeliverabilityStats;
    },
    refetchInterval: 30_000,
  });

  // Logs (deduped by message_id via DISTINCT ON not supported in PostgREST → fetch latest 500 then dedupe client-side)
  const { data: logsRaw = [], isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs', windowMinutes, statusFilter, templateFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('email_send_log')
        .select('message_id, template_name, recipient_email, status, error_message, created_at, opens_count, clicks_count, first_opened_at, first_clicked_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (templateFilter !== 'all') q = q.eq('template_name', templateFilter);
      if (search.trim()) q = q.ilike('recipient_email', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
    refetchInterval: 30_000,
  });

  // Dedupe by message_id keeping latest
  const logs = useMemo(() => {
    const seen = new Set<string>();
    const out: EmailLogRow[] = [];
    for (const r of logsRaw) {
      if (!r.message_id || seen.has(r.message_id)) continue;
      seen.add(r.message_id);
      out.push(r);
    }
    return out.slice(0, 100);
  }, [logsRaw]);

  // Engagement stats (opens / clicks)
  const { data: engagement } = useQuery({
    queryKey: ['email-engagement', windowMinutes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_email_engagement_stats', { _window_minutes: windowMinutes });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { delivered: number; unique_opens: number; unique_clicks: number; total_opens: number; total_clicks: number; open_rate: number; click_rate: number } | null;
    },
    refetchInterval: 60_000,
  });

  // Per-category click stats
  const { data: categoryStats = [] } = useQuery({
    queryKey: ['email-link-categories', windowMinutes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_email_link_category_stats', { _window_minutes: windowMinutes });
      if (error) throw error;
      return (data ?? []) as Array<{ category: string; total_clicks: number; unique_clicks: number; unique_messages: number; ctr: number }>;
    },
    refetchInterval: 60_000,
  });

  // Distinct templates for filter
  const templates = useMemo(() => {
    const set = new Set<string>();
    for (const r of logsRaw) if (r.template_name) set.add(r.template_name);
    return Array.from(set).sort();
  }, [logsRaw]);

  // Alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['email-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_deliverability_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
    refetchInterval: 60_000,
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_deliverability_alerts')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-alerts'] });
      toast.success(isRTL ? 'تم تأكيد التنبيه' : 'Alert acknowledged');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('check_email_deliverability');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-alerts'] });
      toast.success(isRTL ? 'تم تشغيل فحص قابلية التسليم' : 'Deliverability check run');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const activeAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              {isRTL ? 'مراقبة قابلية تسليم البريد' : 'Email Deliverability'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'تتبع نسب التسليم والارتداد والشكاوى مع تنبيهات تلقائية كل 15 دقيقة.'
                : 'Track delivery, bounce, and complaint rates with automatic alerts every 15 minutes.'}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${liveConnected ? 'border-success/40 bg-success/10 text-success' : 'border-muted-foreground/30 bg-muted text-muted-foreground'}`}>
                <Radio className={`h-3 w-3 ${liveConnected ? 'animate-pulse' : ''}`} />
                {liveConnected ? (isRTL ? 'متّصل · بث مباشر' : 'Live') : (isRTL ? 'غير متّصل' : 'Offline')}
              </span>
              {liveTick > 0 && (
                <span className="text-muted-foreground tech-content">{isRTL ? 'أحداث:' : 'events:'} {liveTick}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={windowKey} onValueChange={(v) => setWindowKey(v as keyof typeof WINDOWS)}>
              <SelectTrigger className="w-32 h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">{isRTL ? 'آخر ساعة' : 'Last 1h'}</SelectItem>
                <SelectItem value="24h">{isRTL ? 'آخر 24 ساعة' : 'Last 24h'}</SelectItem>
                <SelectItem value="7d">{isRTL ? 'آخر 7 أيام' : 'Last 7d'}</SelectItem>
                <SelectItem value="30d">{isRTL ? 'آخر 30 يوم' : 'Last 30d'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { refetchStats(); queryClient.invalidateQueries({ queryKey: ['email-logs'] }); }} className="h-10 rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => runCheckMutation.mutate()} disabled={runCheckMutation.isPending} className="h-10 rounded-xl">
              {runCheckMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4 me-1" />}
              {isRTL ? 'فحص الآن' : 'Run check'}
            </Button>
          </div>
        </div>

        {/* Active alerts */}
        {activeAlerts.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive text-base">
                <AlertTriangle className="h-5 w-5" />
                {isRTL ? `تنبيهات نشطة (${activeAlerts.length})` : `Active alerts (${activeAlerts.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeAlerts.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={severityBadge(a.severity)} variant="outline">{a.severity.toUpperCase()}</Badge>
                      <span className="text-sm font-medium">{a.message ?? a.alert_type}</span>
                    </div>
                    <div className="text-xs text-muted-foreground tech-content">
                      {isRTL ? 'النسبة:' : 'Rate:'} {a.rate}% / {isRTL ? 'الحد:' : 'threshold:'} {a.threshold}% · {isRTL ? 'الإجمالي:' : 'total:'} {a.total_emails}
                      · {format(new Date(a.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-9 rounded-xl" onClick={() => ackMutation.mutate(a.id)} disabled={ackMutation.isPending}>
                    <BellOff className="h-4 w-4 me-1" />
                    {isRTL ? 'تأكيد' : 'Ack'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Inbox} label={isRTL ? 'إجمالي البريد' : 'Total emails'} value={stats?.total ?? 0} loading={statsLoading} />
          <StatCard icon={CheckCircle2} label={isRTL ? 'تم التسليم' : 'Sent'} value={stats?.sent ?? 0} accent="emerald" loading={statsLoading} />
          <StatCard icon={XCircle} label={isRTL ? 'فشل / DLQ' : 'Failed / DLQ'} value={(stats?.failed ?? 0) + (stats?.dlq ?? 0)} accent="rose" loading={statsLoading} />
          <StatCard icon={AlertTriangle} label={isRTL ? 'مرتدّ' : 'Bounced'} value={stats?.bounced ?? 0} accent="amber" loading={statsLoading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RateCard label={isRTL ? 'معدل الفشل' : 'Failure rate'} value={stats?.failure_rate ?? 0} threshold={20} />
          <RateCard label={isRTL ? 'معدل الارتداد' : 'Bounce rate'} value={stats?.bounce_rate ?? 0} threshold={10} />
          <RateCard label={isRTL ? 'معدل الشكاوى' : 'Complaint rate'} value={stats?.complaint_rate ?? 0} threshold={2} />
        </div>

        {/* Engagement (opens/clicks) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Eye} label={isRTL ? 'مرّات الفتح (فريدة)' : 'Unique opens'} value={engagement?.unique_opens ?? 0} accent="emerald" />
          <StatCard icon={MousePointerClick} label={isRTL ? 'النقرات (فريدة)' : 'Unique clicks'} value={engagement?.unique_clicks ?? 0} accent="emerald" />
          <RateCard label={isRTL ? 'معدل الفتح' : 'Open rate'} value={engagement?.open_rate ?? 0} threshold={100} />
          <RateCard label={isRTL ? 'معدل النقر' : 'Click rate'} value={engagement?.click_rate ?? 0} threshold={100} />
        </div>

        {/* Per-category link clicks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-5 w-5 text-primary" />
              {isRTL ? 'النقرات حسب نوع الرابط' : 'Clicks by link category'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isRTL ? 'لا توجد نقرات في هذه الفترة.' : 'No clicks in this period.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryStats.map((c) => <CategoryCard key={c.category} row={c} isRTL={isRTL} />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-5 w-5 text-primary" />
              {isRTL ? 'سجل الإرسال' : 'Send log'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث بالبريد…' : 'Search email…'} className="ps-9 h-10 rounded-xl" dir="auto" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="dlq">DLQ</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="complained">Complained</SelectItem>
                  <SelectItem value="suppressed">Suppressed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-44 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل القوالب' : 'All templates'}</SelectItem>
                  {templates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin me-2" /> {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {isRTL ? 'لا توجد سجلات في هذه الفترة.' : 'No logs in this period.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'القالب' : 'Template'}</th>
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'المستلم' : 'Recipient'}</th>
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'فتح/نقر' : 'Open/Click'}</th>
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'الوقت' : 'Time'}</th>
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'الخطأ' : 'Error'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(r => (
                      <tr key={r.message_id} className="border-b border-border/60 hover:bg-muted/40">
                        <td className="py-2 px-2 tech-content">{r.template_name}</td>
                        <td className="py-2 px-2 tech-content">{r.recipient_email}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge>
                        </td>
                        <td className="py-2 px-2 text-xs tech-content">
                          <span className="inline-flex items-center gap-1 text-success"><Eye className="h-3 w-3" />{r.opens_count ?? 0}</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          <span className="inline-flex items-center gap-1 text-success"><MousePointerClick className="h-3 w-3" />{r.clicks_count ?? 0}</span>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground tech-content">
                          {format(new Date(r.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                        </td>
                        <td className="py-2 px-2 text-xs text-destructive max-w-[260px] truncate" title={r.error_message ?? ''}>
                          {r.error_message ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              {isRTL ? 'سجل التنبيهات' : 'Alert history'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isRTL ? 'لا توجد تنبيهات مسجلة.' : 'No alerts recorded.'}
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={`rounded-xl border p-3 ${a.acknowledged ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge className={severityBadge(a.severity)} variant="outline">{a.severity}</Badge>
                      <span className="font-medium">{a.message ?? a.alert_type}</span>
                      <span className="text-xs text-muted-foreground tech-content ms-auto">
                        {format(new Date(a.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground tech-content mt-1">
                      {a.rate}% (≥ {a.threshold}%) · {a.total_emails} emails · failed: {a.failed_count} · bounced: {a.bounced_count} · complained: {a.complained_count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: number; accent?: string; loading?: boolean }> = ({ icon: Icon, label, value, accent, loading }) => {
  const accentMap: Record<string, string> = {
    emerald: 'text-success bg-success/10',
    rose: 'text-destructive bg-destructive/10',
    amber: 'text-warning bg-warning/10',
  };
  const cls = accent ? accentMap[accent] : 'text-primary bg-primary/10';
  return (
    <Card className="hover-lift">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tech-content">{loading ? '—' : value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const RateCard: React.FC<{ label: string; value: number; threshold: number }> = ({ label, value, threshold }) => {
  const breached = value >= threshold;
  const pct = Math.min(100, value);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Badge variant="outline" className={breached ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-success/10 text-success border-success/30'}>
            {value}%
          </Badge>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${breached ? 'bg-destructive' : 'bg-success'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1 tech-content">threshold: {threshold}%</div>
      </CardContent>
    </Card>
  );
};

const CATEGORY_META: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
  pricing:     { ar: 'التسعير',    en: 'Pricing',     icon: DollarSign,       color: 'text-success' },
  contract:    { ar: 'العقود',     en: 'Contracts',   icon: FileText,         color: 'text-info' },
  maintenance: { ar: 'الصيانة',    en: 'Maintenance', icon: Wrench,           color: 'text-warning' },
  leads:       { ar: 'العروض',     en: 'Leads',       icon: Users,            color: 'text-secondary' },
  booking:     { ar: 'الحجوزات',   en: 'Bookings',    icon: Calendar,         color: 'text-info' },
  payment:     { ar: 'المدفوعات',  en: 'Payments',    icon: CreditCard,       color: 'text-destructive' },
  messages:    { ar: 'الرسائل',    en: 'Messages',    icon: MessageSquare,    color: 'text-secondary' },
  projects:    { ar: 'المشاريع',   en: 'Projects',    icon: Briefcase,        color: 'text-urgent' },
  dashboard:   { ar: 'لوحة التحكم', en: 'Dashboard',  icon: LayoutDashboard,  color: 'text-slate-600' },
  other:       { ar: 'أخرى',       en: 'Other',       icon: Link2,            color: 'text-muted-foreground' },
};

const CategoryCard: React.FC<{ row: { category: string; total_clicks: number; unique_clicks: number; ctr: number }; isRTL: boolean }> = ({ row, isRTL }) => {
  const meta = CATEGORY_META[row.category] ?? CATEGORY_META.other;
  const Icon = meta.icon;
  return (
    <Card className="hover-lift">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${meta.color}`} />
            <span className="text-sm font-medium">{isRTL ? meta.ar : meta.en}</span>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 tech-content">
            {row.ctr}%
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground tech-content">
          <span>{isRTL ? 'النقرات:' : 'Clicks:'} {row.total_clicks}</span>
          <span>{isRTL ? 'فريدة:' : 'Unique:'} {row.unique_clicks}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminEmailDeliverability;