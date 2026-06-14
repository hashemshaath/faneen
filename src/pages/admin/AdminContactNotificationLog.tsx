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
import { Button } from '@/components/ui/button';
import {
  FileText, FileSpreadsheet, RefreshCw, Activity, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { setupArabicDoc, getArabicTableStyles } from '@/lib/pdf-arabic-font';
import {
  OperationsAdminPageShell,
  OperationsFiltersBar,
  OperationsStatsStrip,
  type OperationsSelectOption,
} from '@/components/admin/ops';
import {
  ContactNotificationLogTableSection,
  type ContactNotificationLogRow,
} from '@/components/admin/ops/contact-logs';

type LogRow = ContactNotificationLogRow;

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

  const channelOptions: OperationsSelectOption[] = [
    { value: 'all', label: isRTL ? 'كل القنوات' : 'All channels' },
    { value: 'email', label: 'Email' },
    { value: 'webhook', label: 'Webhook' },
  ];
  const statusOptions: OperationsSelectOption[] = [
    { value: 'all', label: isRTL ? 'كل الحالات' : 'All statuses' },
    { value: 'success', label: 'success' },
    { value: 'pending', label: 'pending' },
    { value: 'failed', label: 'failed' },
    { value: 'max_retries', label: 'max_retries' },
  ];
  const eventOptions: OperationsSelectOption[] = [
    { value: 'all', label: isRTL ? 'كل الأحداث' : 'All events' },
    { value: 'assignee_changed', label: 'assignee_changed' },
    { value: 'status_changed', label: 'status_changed' },
    { value: 'priority_changed', label: 'priority_changed' },
    { value: 'ai_triaged', label: 'ai_triaged' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <OperationsAdminPageShell
          header={<h1 className="text-2xl font-bold">{isRTL ? 'سجل إرسال الإشعارات' : 'Notification Delivery Log'}</h1>}
          description={isRTL ? 'سجل محاولات Email/Webhook لكل حدث' : 'Email/Webhook attempts per event'}
          actionsSlot={(
            <>
              <Button variant="outline" className="rounded-lg" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`w-4 h-4 me-2 ${isFetching ? 'animate-spin' : ''}`} />{isRTL ? 'تحديث' : 'Refresh'}
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={exportCSV} disabled={rows.length === 0}>
                <FileSpreadsheet className="w-4 h-4 me-2" />CSV
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={exportPDF} disabled={rows.length === 0}>
                <FileText className="w-4 h-4 me-2" />PDF
              </Button>
            </>
          )}
          statsSlot={(
            <OperationsStatsStrip
              columns={4}
              items={[
                { key: 'total', label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, icon: Activity, tone: 'muted' },
                { key: 'success', label: isRTL ? 'ناجح' : 'Success', value: stats.success, icon: CheckCircle2, tone: 'success' },
                { key: 'pending', label: isRTL ? 'قيد الإرسال' : 'Pending', value: stats.pending, icon: Clock, tone: 'warning' },
                { key: 'failed', label: isRTL ? 'فشل/مستنفذ' : 'Failed', value: stats.failed, icon: XCircle, tone: 'destructive' },
              ]}
            />
          )}
          filtersSlot={(
            <OperationsFiltersBar
              fromDate={from}
              toDate={to}
              onFromDateChange={setFrom}
              onToDateChange={setTo}
              fromLabel={isRTL ? 'من' : 'From'}
              toLabel={isRTL ? 'إلى' : 'To'}
              statusOptions={statusOptions}
              statusValue={status}
              onStatusChange={setStatus}
              statusPlaceholder={isRTL ? 'الحالة' : 'Status'}
              typeOptions={channelOptions}
              typeValue={channel}
              onTypeChange={setChannel}
              typePlaceholder={isRTL ? 'القناة' : 'Channel'}
              rightSlot={(
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="h-11 rounded-xl bg-background/60 border border-input px-3 text-sm"
                  aria-label={isRTL ? 'الحدث' : 'Event'}
                >
                  {eventOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            />
          )}
          contentSlot={(
            <ContactNotificationLogTableSection
              title={isRTL ? 'محاولات الإرسال' : 'Delivery attempts'}
              rows={rows}
              isLoading={isLoading}
              emptyLabel={isRTL ? 'لا توجد سجلات' : 'No records'}
              expanded={expanded}
              onToggle={toggle}
              isRTL={isRTL}
              labels={{
                attempt: isRTL ? 'محاولة' : 'attempt',
                nextRetry: isRTL ? 'إعادة المحاولة في' : 'Next retry',
                response: isRTL ? 'الاستجابة' : 'Response',
                errorDetails: isRTL ? 'تفاصيل الخطأ' : 'Error details',
              }}
            />
          )}
        />
      </div>
    </DashboardLayout>
  );
}