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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, FileText, RefreshCw, History } from 'lucide-react';
import { format } from 'date-fns';
import { useNoIndex } from '@/hooks/useNoIndex';
import { setupArabicDoc, getArabicTableStyles } from '@/lib/pdf-arabic-font';
import {
  OperationsAdminPageShell,
  OperationsFiltersBar,
  type OperationsSelectOption,
} from '@/components/admin/ops';
import {
  ContactAuditLogTableSection,
  type ContactAuditLogRow,
  type ContactAuditEventLabel,
} from '@/components/admin/ops/contact-logs';

type AuditRow = ContactAuditLogRow;

const EVENT_TYPES = [
  'created', 'status_changed', 'assignee_changed', 'priority_changed',
  'work_state_changed', 'ai_triaged', 'replied', 'note_added',
] as const;

const EVENT_LABELS: Record<string, ContactAuditEventLabel> = {
  created:            { ar: 'إنشاء', en: 'Created', color: 'bg-info/15 text-info' },
  status_changed:     { ar: 'تغيير الحالة', en: 'Status', color: 'bg-warning/15 text-warning' },
  assignee_changed:   { ar: 'تغيير المسؤول', en: 'Assignee', color: 'bg-secondary/15 text-secondary' },
  priority_changed:   { ar: 'تغيير الأولوية', en: 'Priority', color: 'bg-destructive/15 text-destructive' },
  work_state_changed: { ar: 'سير العمل', en: 'Work state', color: 'bg-info/15 text-info' },
  ai_triaged:         { ar: 'فرز ذكي', en: 'AI triage', color: 'bg-success/15 text-success' },
  replied:            { ar: 'تم الرد', en: 'Replied', color: 'bg-success/15 text-success' },
  note_added:         { ar: 'ملاحظة', en: 'Note', color: 'bg-slate-500/15 text-slate-700' },
};

export default function AdminContactAuditLog() {
  useNoIndex();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [from, setFrom] = useState<string>(() => format(new Date(Date.now() - 7 * 86400_000), 'yyyy-MM-dd'));
  const [to, setTo] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [eventType, setEventType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['contact-audit-log', from, to, eventType],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (n: string, a: unknown) => Promise<{ data: AuditRow[] | null; error: Error | null }>)(
        'list_contact_audit_events',
        {
          _from: from ? new Date(from).toISOString() : null,
          _to:   to ? new Date(to + 'T23:59:59').toISOString() : null,
          _event_types: eventType === 'all' ? null : [eventType],
          _actor: null,
          _message_id: null,
          _limit: 2000,
        },
      );
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.ticket_number, r.actor_name, r.actor_email, r.message_subject, r.message_name, r.message_email, r.note]
        .some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const exportCSV = () => {
    const headers = isRTL
      ? ['التاريخ', 'التذكرة', 'الحدث', 'من', 'إلى', 'الفاعل', 'بريد الفاعل', 'موضوع الرسالة', 'العميل', 'ملاحظة']
      : ['Date', 'Ticket', 'Event', 'From', 'To', 'Actor', 'Actor email', 'Subject', 'Customer', 'Note'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`;
    const lines = filtered.map((r) => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.ticket_number ?? '', r.event_type,
      r.from_value ?? '', r.to_value ?? '',
      r.actor_name ?? '', r.actor_email ?? '',
      r.message_subject ?? '', r.message_name ?? '',
      r.note ?? '',
    ].map(esc).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير CSV' : 'CSV exported');
  };

  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'), import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fontLoaded = await setupArabicDoc(doc, isRTL);
    const pageWidth = doc.internal.pageSize.getWidth();
    const styles = getArabicTableStyles(isRTL, fontLoaded);

    doc.setFontSize(16);
    doc.text(isRTL ? 'سجل تدقيق رسائل التواصل' : 'Contact Audit Log', pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`${from} → ${to} · ${filtered.length}`, pageWidth / 2, 20, { align: 'center' });

    const head = [isRTL
      ? ['التاريخ', 'التذكرة', 'الحدث', 'من → إلى', 'الفاعل', 'العميل/الموضوع', 'ملاحظة']
      : ['Date', 'Ticket', 'Event', 'From → To', 'Actor', 'Customer / Subject', 'Note']];
    const body = filtered.map((r) => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.ticket_number ?? '—',
      r.event_type,
      `${r.from_value ?? '—'} → ${r.to_value ?? '—'}`,
      r.actor_name ?? r.actor_email ?? (isRTL ? 'النظام' : 'system'),
      `${r.message_name ?? ''}${r.message_subject ? ' · ' + r.message_subject : ''}`.slice(0, 80),
      (r.note ?? '').slice(0, 80),
    ]);
    autoTable(doc, {
      startY: 26, head, body, theme: 'grid',
      styles: { ...styles, fontSize: 7, cellPadding: 1.5 },
      headStyles: { ...styles, fontSize: 8, fillColor: [40, 40, 40], textColor: 255 },
    });
    doc.save(`contact-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success(isRTL ? 'تم تصدير PDF' : 'PDF exported');
  };

  const typeOptions: OperationsSelectOption[] = useMemo(() => [
    { value: 'all', label: isRTL ? 'كل الأحداث' : 'All events' },
    ...EVENT_TYPES.map((e) => ({
      value: e,
      label: isRTL ? EVENT_LABELS[e]?.ar ?? e : EVENT_LABELS[e]?.en ?? e,
    })),
  ], [isRTL]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <OperationsAdminPageShell
          header={(
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              {isRTL ? 'سجل تدقيق رسائل التواصل' : 'Contact Audit Log'}
            </h1>
          )}
          description={isRTL ? 'كل تغييرات الحالة والمسؤول والأولوية والرد' : 'All status, assignee, priority and reply changes'}
          actionsSlot={(
            <>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`w-4 h-4 me-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={exportCSV} disabled={filtered.length === 0}>
                <Download className="w-4 h-4 me-2" />CSV
              </Button>
              <Button size="sm" className="rounded-lg" onClick={exportPDF} disabled={filtered.length === 0}>
                <FileText className="w-4 h-4 me-2" />PDF
              </Button>
            </>
          )}
          filtersSlot={(
            <OperationsFiltersBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={isRTL ? 'تذكرة / شخص / موضوع…' : 'Ticket / person / subject…'}
              typeOptions={typeOptions}
              typeValue={eventType}
              onTypeChange={setEventType}
              typePlaceholder={isRTL ? 'نوع الحدث' : 'Event type'}
              fromDate={from}
              toDate={to}
              onFromDateChange={setFrom}
              onToDateChange={setTo}
              fromLabel={isRTL ? 'من' : 'From'}
              toLabel={isRTL ? 'إلى' : 'To'}
            />
          )}
          contentSlot={(
            <ContactAuditLogTableSection
              title={isRTL ? `${filtered.length} حدث` : `${filtered.length} events`}
              rows={filtered}
              isLoading={isLoading}
              emptyLabel={isRTL ? 'لا توجد أحداث' : 'No events'}
              isRTL={isRTL}
              eventLabels={EVENT_LABELS}
              labels={{
                date: isRTL ? 'التاريخ' : 'Date',
                ticket: isRTL ? 'التذكرة' : 'Ticket',
                event: isRTL ? 'الحدث' : 'Event',
                change: isRTL ? 'التغيير' : 'Change',
                actor: isRTL ? 'الفاعل' : 'Actor',
                customer: isRTL ? 'العميل / الموضوع' : 'Customer / Subject',
                system: isRTL ? 'النظام' : 'system',
              }}
            />
          )}
        />
      </div>
    </DashboardLayout>
  );
}