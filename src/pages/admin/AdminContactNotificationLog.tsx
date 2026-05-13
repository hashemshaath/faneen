import React, { useMemo, useState } from 'react';
import { DashboardLayout as RealDashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAdminEmbedded } from '@/contexts/AdminTabsContext';
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const embedded = useAdminEmbedded();
  return embedded ? <>{children}</> : <RealDashboardLayout>{children}</RealDashboardLayout>;
};
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, FileSpreadsheet, ChevronDown, ChevronUp, RefreshCw, Mail, Webhook } from 'lucide-react';
import { setupArabicDoc, getArabicTableStyles } from '@/lib/pdf-arabic-font';

type LogRow = {
  id: string; event_id: string | null; message_id: string | null; ticket_number: string | null;
  event_type: string | null; channel: 'email' | 'webhook'; recipient: string;
  status: 'pending' | 'success' | 'failed' | 'max_retries' | 'skipped';
  attempt_count: number; max_attempts: number;
  http_status: number | null; error_code: string | null; error_message: string | null;
  response_body: string | null; next_retry_at: string | null; last_attempt_at: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  success:     'bg-success text-success',
  pending:     'bg-warning text-warning',
  failed:      'bg-destructive text-destructive',
  max_retries: 'bg-destructive text-destructive',
  skipped:     'bg-muted text-muted-foreground',
};

export default function AdminContactNotificationLog() {
  useNoIndex();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 7 * 86400000);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [channel, setChannel] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [eventType, setEventType] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fromIso = useMemo(() => new Date(from + 'T00:00:00Z').toISOString(), [from]);
  const toIso   = useMemo(() => new Date(to   + 'T23:59:59Z').toISOString(), [to]);

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['contact-notification-log', fromIso, toIso, channel, status, eventType],
    queryFn: async () => {
      const args: Record<string, unknown> = { _from: fromIso, _to: toIso, _limit: 1000 };
      if (channel !== 'all') args._channel = channel;
      if (status !== 'all') args._status = status;
      if (eventType !== 'all') args._event_type = eventType;
      const { data, error } = await (supabase.rpc as unknown as (n: string, a: unknown) => Promise<{ data: LogRow[] | null; error: Error | null }>)(
        'list_contact_notification_log', args,
      );
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const stats = useMemo(() => {
    const s = { total: rows.length, success: 0, pending: 0, failed: 0 };
    for (const r of rows) {
      if (r.status === 'success') s.success++;
      else if (r.status === 'pending') s.pending++;
      else if (r.status === 'failed' || r.status === 'max_retries') s.failed++;
    }
    return s;
  }, [rows]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const exportCSV = () => {
    const headers = ['Created','Channel','Event','Recipient','Status','Attempts','HTTP','Error code','Error message','Ticket'];
    const lines = rows.map(r => [
      r.created_at, r.channel, r.event_type ?? '', r.recipient,
      r.status, `${r.attempt_count}/${r.max_attempts}`,
      r.http_status ?? '', r.error_code ?? '', (r.error_message ?? '').replace(/[\r\n]+/g, ' '), r.ticket_number ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-log-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'), import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fontLoaded = await setupArabicDoc(doc, isRTL);
    const styles = getArabicTableStyles(isRTL, fontLoaded);
    const w = doc.internal.pageSize.getWidth();

    doc.setFontSize(15);
    doc.text(isRTL ? 'سجل إرسال الإشعارات' : 'Notification Delivery Log', w/2, 14, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text(`${from} → ${to} • ${rows.length} ${isRTL ? 'سجل' : 'rows'}`, w/2, 20, { align: 'center' });

    autoTable(doc, {
      startY: 26,
      head: [[
        isRTL ? 'التاريخ' : 'Date', isRTL ? 'القناة' : 'Channel', isRTL ? 'الحدث' : 'Event',
        isRTL ? 'المستلم' : 'Recipient', isRTL ? 'الحالة' : 'Status',
        isRTL ? 'المحاولات' : 'Attempts', 'HTTP', isRTL ? 'الخطأ' : 'Error',
      ]],
      body: rows.map(r => [
        r.created_at.slice(0, 16).replace('T', ' '), r.channel, r.event_type ?? '—',
        r.recipient, r.status, `${r.attempt_count}/${r.max_attempts}`,
        r.http_status ?? '—', (r.error_message ?? '').slice(0, 60),
      ]),
      theme: 'grid',
      styles: { ...styles, fontSize: 7, cellPadding: 1.5 },
      headStyles: { ...styles, fontSize: 8, fillColor: [40,40,40], textColor: 255 },
    });
    doc.save(`notification-log-${new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? 'سجل إرسال الإشعارات' : 'Notification Delivery Log'}</h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'سجل محاولات Email/Webhook لكل حدث' : 'Email/Webhook attempts per event'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-lg h-12" onClick={exportCSV} disabled={rows.length === 0}>
              <FileSpreadsheet className="w-4 h-4 me-2" />CSV
            </Button>
            <Button variant="outline" className="rounded-lg h-12" onClick={exportPDF} disabled={rows.length === 0}>
              <FileText className="w-4 h-4 me-2" />PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card><CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="space-y-1"><Label className="text-xs">{isRTL ? 'من' : 'From'}</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-12 rounded-xl tech-content" /></div>
          <div className="space-y-1"><Label className="text-xs">{isRTL ? 'إلى' : 'To'}</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-12 rounded-xl tech-content" /></div>
          <div className="space-y-1"><Label className="text-xs">{isRTL ? 'القناة' : 'Channel'}</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="text-xs">{isRTL ? 'الحالة' : 'Status'}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="success">success</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="failed">failed</SelectItem>
                <SelectItem value="max_retries">max_retries</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="text-xs">{isRTL ? 'الحدث' : 'Event'}</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="assignee_changed">assignee_changed</SelectItem>
                <SelectItem value="status_changed">status_changed</SelectItem>
                <SelectItem value="priority_changed">priority_changed</SelectItem>
                <SelectItem value="ai_triaged">ai_triaged</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="text-xs opacity-0">refresh</Label>
            <Button onClick={() => refetch()} disabled={isFetching} className="h-12 rounded-xl w-full">
              <RefreshCw className={`w-4 h-4 me-2 ${isFetching ? 'animate-spin' : ''}`} />{isRTL ? 'تحديث' : 'Refresh'}
            </Button></div>
        </CardContent></Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={isRTL ? 'الإجمالي' : 'Total'} value={stats.total} />
          <Stat label={isRTL ? 'ناجح' : 'Success'} value={stats.success} color="text-success" />
          <Stat label={isRTL ? 'قيد الإرسال' : 'Pending'} value={stats.pending} color="text-warning" />
          <Stat label={isRTL ? 'فشل/مستنفذ' : 'Failed'} value={stats.failed} color="text-destructive" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? 'محاولات الإرسال' : 'Delivery attempts'}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">{isRTL ? 'لا توجد سجلات' : 'No records'}</p>
            ) : (
              <div className="divide-y">
                {rows.map((r) => {
                  const isOpen = expanded.has(r.id);
                  return (
                    <div key={r.id} className="px-4 py-3 hover:bg-muted/30">
                      <div className="flex items-center gap-3 flex-wrap">
                        {r.channel === 'email'
                          ? <Mail className="w-4 h-4 text-info" />
                          : <Webhook className="w-4 h-4 text-secondary" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                            {r.event_type && <Badge variant="outline" className="rounded-md text-xs tech-content">{r.event_type}</Badge>}
                            {r.ticket_number && <Badge variant="secondary" className="rounded-md text-xs tech-content">{r.ticket_number}</Badge>}
                            <span className="text-xs text-muted-foreground tech-content">
                              {isRTL ? 'محاولة' : 'attempt'} {r.attempt_count}/{r.max_attempts}
                              {r.http_status ? ` • HTTP ${r.http_status}` : ''}
                            </span>
                          </div>
                          <div className="text-sm tech-content truncate mt-0.5" dir="ltr">{r.recipient}</div>
                          {r.error_message && (
                            <div className="text-xs text-destructive mt-0.5 line-clamp-1 tech-content">
                              {r.error_code ? `[${r.error_code}] ` : ''}{r.error_message}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground tech-content whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggle(r.id)}>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                      {isOpen && (
                        <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
                          {r.next_retry_at && (
                            <div className="bg-warning text-warning p-2 rounded-lg">
                              <b>{isRTL ? 'إعادة المحاولة في' : 'Next retry'}:</b>{' '}
                              <span className="tech-content">{new Date(r.next_retry_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</span>
                            </div>
                          )}
                          {r.response_body && (
                            <div className="bg-muted/50 p-2 rounded-lg md:col-span-2">
                              <div className="text-muted-foreground mb-1">{isRTL ? 'الاستجابة' : 'Response'}</div>
                              <pre className="text-[11px] whitespace-pre-wrap break-all max-h-48 overflow-auto tech-content" dir="ltr">{r.response_body}</pre>
                            </div>
                          )}
                          {r.error_message && (
                            <div className="bg-destructive text-destructive p-2 rounded-lg md:col-span-2">
                              <div className="font-medium mb-1">{isRTL ? 'تفاصيل الخطأ' : 'Error details'}</div>
                              <pre className="text-[11px] whitespace-pre-wrap break-all tech-content" dir="ltr">{r.error_code ? `[${r.error_code}]\n` : ''}{r.error_message}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold tech-content ${color ?? ''}`}>{value}</div>
    </CardContent></Card>
  );
}
