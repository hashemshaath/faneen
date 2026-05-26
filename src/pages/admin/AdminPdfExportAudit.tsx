/**
 * Admin Export Audit — read-only platform-wide view of contract PDF exports.
 * Uses SECURITY DEFINER RPC `admin_list_contract_pdf_exports` (admin gated).
 *
 * Privacy: never renders raw exporter UUID, email, IP/UA hash, PDF link,
 * BOQ details, or contract terms.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  adminListContractPdfExports,
  adminContractPdfExportsSummary,
} from '@/modules/contracts/services/pdfExports';
import { useLanguage } from '@/i18n/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileClock, Search, ChevronLeft, ChevronRight, User2, Activity,
  CalendarDays, FileText,
} from 'lucide-react';

interface Row {
  export_ref: string;
  exported_at: string;
  exporter_display_name: string | null;
  source: string;
  contract_number: string | null;
  contract_status: string | null;
  contract_version: number | null;
  official_version_number: number | null;
  document_hash_prefix: string | null;
  template_version_number: number | null;
  template_name_ar: string | null;
  template_name_en: string | null;
  amendment_count: number;
  line_item_count: number;
  boq_group_count: number;
  export_locale: string | null;
  total_count: number;
}
interface Summary {
  exports_today: number;
  exports_7d: number;
  unique_contracts_30d: number;
  top_source: string | null;
  archived_count: number;
}

const SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  contract_detail:     { ar: 'صفحة العقد',   en: 'Contract page' },
  dashboard_contracts: { ar: 'لوحة العقود',  en: 'Contracts dashboard' },
  admin:               { ar: 'الإدارة',       en: 'Admin' },
  unknown:             { ar: 'غير محدد',     en: 'Unknown' },
};
const SOURCE_KEYS = ['contract_detail', 'dashboard_contracts', 'admin', 'unknown'] as const;

const STATUS_KEYS = ['draft', 'pending_review', 'active', 'completed', 'cancelled', 'amended'] as const;

const PAGE_SIZE = 50;

const UUID_RX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const safeText = (s: string | null | undefined): string =>
  !s ? '' : UUID_RX.test(s) ? '' : s;

const AdminPdfExportAudit: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tplVersionFilter, setTplVersionFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const filters = useMemo(() => ({
    search: search.trim() || null,
    source: sourceFilter === 'all' ? null : sourceFilter,
    status: statusFilter === 'all' ? null : statusFilter,
    tplVersion: tplVersionFilter ? Number(tplVersionFilter) : null,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : null,
    dateTo:   dateTo   ? new Date(new Date(dateTo).getTime() + 86_400_000).toISOString() : null, // exclusive
  }), [search, sourceFilter, statusFilter, tplVersionFilter, dateFrom, dateTo]);

  const list = useQuery({
    queryKey: ['admin-pdf-exports', page, filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await adminListContractPdfExports({
        _search: filters.search,
        _source: filters.source,
        _contract_status: filters.status,
        _template_version_number: filters.tplVersion,
        _date_from: filters.dateFrom,
        _date_to: filters.dateTo,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const summary = useQuery({
    queryKey: ['admin-pdf-exports-summary'],
    queryFn: async () => {
      const { data, error } = await adminContractPdfExportsSummary();
      if (error) throw error;
      return (data?.[0] || null) as Summary | null;
    },
  });

  const rows = list.data || [];
  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };
  const reset = () => {
    setPage(0);
    setSearchInput(''); setSearch('');
    setSourceFilter('all'); setStatusFilter('all');
    setTplVersionFilter(''); setDateFrom(''); setDateTo('');
  };

  const title = isRTL ? 'سجل تصدير العقود' : 'PDF Export Audit';

  return (
    <DashboardLayout>
      <main className="container mx-auto p-4 md:p-6 space-y-5">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileClock className="h-5 w-5 text-primary" />
            <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
            {total > 0 && (
              <Badge variant="secondary" dir="ltr" className="text-xs">{total}</Badge>
            )}
          </div>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard
            label={isRTL ? 'تصديرات اليوم' : 'Today'}
            value={summary.data?.exports_today ?? '—'}
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
          />
          <SummaryCard
            label={isRTL ? 'آخر ٧ أيام' : 'Last 7 days'}
            value={summary.data?.exports_7d ?? '—'}
            icon={<Activity className="h-4 w-4 text-primary" />}
          />
          <SummaryCard
            label={isRTL ? 'عقود فريدة (٣٠ يوم)' : 'Unique contracts (30d)'}
            value={summary.data?.unique_contracts_30d ?? '—'}
            icon={<FileText className="h-4 w-4 text-primary" />}
          />
          <SummaryCard
            label={isRTL ? 'أعلى مصدر' : 'Top source'}
            value={(() => {
              const s = summary.data?.top_source;
              if (!s) return '—';
              return isRTL ? (SOURCE_LABEL[s]?.ar ?? s) : (SOURCE_LABEL[s]?.en ?? s);
            })()}
            icon={<User2 className="h-4 w-4 text-primary" />}
          />
          <SummaryCard
            label={isRTL ? 'مؤرشف' : 'Archived'}
            value={summary.data?.archived_count ?? '—'}
            icon={<FileClock className="h-4 w-4 text-muted-foreground" />}
          />
        </section>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 md:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <form onSubmit={onSubmitSearch} className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground start-2" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={isRTL ? 'بحث (رقم العقد، #هاش، قالب، مُصدِّر...)' : 'Search (contract #, hash, template, exporter...)'}
                  className="h-9 text-xs ps-7"
                  dir="auto"
                />
              </form>

              <Select value={sourceFilter} onValueChange={(v) => { setPage(0); setSourceFilter(v); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={isRTL ? 'المصدر' : 'Source'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل المصادر' : 'All sources'}</SelectItem>
                  {SOURCE_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>{isRTL ? SOURCE_LABEL[s].ar : SOURCE_LABEL[s].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setPage(0); setStatusFilter(v); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={isRTL ? 'حالة العقد' : 'Contract status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
                  {STATUS_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number" min={1} inputMode="numeric"
                value={tplVersionFilter}
                onChange={(e) => { setPage(0); setTplVersionFilter(e.target.value); }}
                placeholder={isRTL ? 'إصدار القالب' : 'Template version'}
                className="h-9 text-xs"
                dir="ltr"
              />

              <Input
                type="date" value={dateFrom}
                onChange={(e) => { setPage(0); setDateFrom(e.target.value); }}
                className="h-9 text-xs"
                dir="ltr"
              />
              <Input
                type="date" value={dateTo}
                onChange={(e) => { setPage(0); setDateTo(e.target.value); }}
                className="h-9 text-xs"
                dir="ltr"
              />

              <Button variant="ghost" size="sm" className="h-9 text-xs justify-self-start" onClick={reset}>
                {isRTL ? 'إعادة الضبط' : 'Reset'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardContent className="p-3 md:p-4 space-y-2">
            {list.isLoading && (
              <p className="text-xs text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</p>
            )}
            {list.isError && (
              <p className="text-xs text-destructive">{isRTL ? 'تعذّر تحميل السجل.' : 'Failed to load history.'}</p>
            )}
            {!list.isLoading && !list.isError && rows.length === 0 && (
              <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد نتائج.' : 'No results.'}</p>
            )}

            <ol className="divide-y">
              {rows.map((r) => {
                const src = SOURCE_LABEL[r.source] || SOURCE_LABEL.unknown;
                const tplName = isRTL
                  ? safeText(r.template_name_ar || r.template_name_en)
                  : safeText(r.template_name_en || r.template_name_ar);
                const exporterLabel = safeText(r.exporter_display_name)
                  || (isRTL ? 'مستخدم قِطاعات' : 'Qitaat user');
                return (
                  <li key={r.export_ref} className="py-2 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                    <div className="md:col-span-3 flex items-center gap-1.5 min-w-0 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{isRTL ? src.ar : src.en}</Badge>
                      <span className="font-mono truncate" dir="ltr">{safeText(r.contract_number) || '—'}</span>
                      {r.contract_status && (
                        <Badge variant="secondary" className="text-[10px]">{r.contract_status}</Badge>
                      )}
                    </div>
                    <div className="md:col-span-3 min-w-0 flex items-center gap-1.5 flex-wrap">
                      {tplName && (
                        <Badge variant="outline" className="text-[10px]">
                          {tplName}{r.template_version_number != null ? ` · v${r.template_version_number}` : ''}
                        </Badge>
                      )}
                      {r.contract_version != null && (
                        <span className="text-[10px] text-muted-foreground" dir="ltr">v{r.contract_version}</span>
                      )}
                      {r.document_hash_prefix && (
                        <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">#{r.document_hash_prefix}</span>
                      )}
                    </div>
                    <div className="md:col-span-3 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1"><User2 className="h-3 w-3" />{exporterLabel}</span>
                      <span>{isRTL ? `بنود: ${r.line_item_count}` : `${r.line_item_count} items`}</span>
                      <span>{isRTL ? `BOQ: ${r.boq_group_count}` : `${r.boq_group_count} BOQ`}</span>
                      <span>{isRTL ? `ملاحق: ${r.amendment_count}` : `${r.amendment_count} amend.`}</span>
                      {r.export_locale && <span dir="ltr">{r.export_locale.toUpperCase()}</span>}
                    </div>
                    <div className="md:col-span-3 text-[10px] text-muted-foreground md:text-end" dir="ltr">
                      {new Date(r.exported_at).toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-muted-foreground">
                  {(() => {
                    const from = page * PAGE_SIZE + 1;
                    const to = Math.min((page + 1) * PAGE_SIZE, total);
                    return isRTL ? `عرض ${from} إلى ${to} من ${total}` : `Showing ${from}–${to} of ${total}`;
                  })()}
                  <span className="mx-2 opacity-50">·</span>
                  <span dir="ltr">{page + 1} / {totalPages}</span>
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={!canPrev || list.isFetching}>
                    {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    <span className="text-xs ms-1">{isRTL ? 'السابق' : 'Prev'}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!canNext || list.isFetching}>
                    <span className="text-xs me-1">{isRTL ? 'التالي' : 'Next'}</span>
                    {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground/80 italic">
          {isRTL
            ? 'هذه الواجهة للقراءة فقط. لا تكشف معرّفات المستخدمين الخام أو البريد أو روابط الملفات.'
            : 'Read-only audit. No raw user IDs, emails, or file links are exposed.'}
        </p>
      </main>
    </DashboardLayout>
  );
};

const SummaryCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode }> =
  ({ label, value, icon }) => (
  <Card>
    <CardContent className="p-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-base font-semibold tabular-nums" dir="ltr">{value}</p>
      </div>
      {icon}
    </CardContent>
  </Card>
);

export default AdminPdfExportAudit;
