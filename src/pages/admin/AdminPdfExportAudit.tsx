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
import { Badge } from '@/components/ui/badge';
import { FileClock } from 'lucide-react';
import {
  PdfExportAuditStatsSection,
  PdfExportAuditFiltersBar,
  PdfExportAuditTableSection,
  PdfExportPrivacyNotice,
} from '@/components/admin/contracts/pdf-audit';
import type {
  PdfExportAuditRow as PdfExportAuditRowType,
  PdfExportAuditSummary,
} from '@/components/admin/contracts/pdf-audit';

const PAGE_SIZE = 50;

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
      return (data || []) as PdfExportAuditRowType[];
    },
  });

  const summary = useQuery({
    queryKey: ['admin-pdf-exports-summary'],
    queryFn: async () => {
      const { data, error } = await adminContractPdfExportsSummary();
      if (error) throw error;
      return (data?.[0] || null) as PdfExportAuditSummary | null;
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

        <PdfExportAuditStatsSection summary={summary.data ?? null} isRTL={isRTL} />

        <PdfExportAuditFiltersBar
          isRTL={isRTL}
          searchInput={searchInput}
          sourceFilter={sourceFilter}
          statusFilter={statusFilter}
          tplVersionFilter={tplVersionFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSearchInputChange={setSearchInput}
          onSubmitSearch={onSubmitSearch}
          onSourceChange={(v) => { setPage(0); setSourceFilter(v); }}
          onStatusChange={(v) => { setPage(0); setStatusFilter(v); }}
          onTplVersionChange={(v) => { setPage(0); setTplVersionFilter(v); }}
          onDateFromChange={(v) => { setPage(0); setDateFrom(v); }}
          onDateToChange={(v) => { setPage(0); setDateTo(v); }}
          onReset={reset}
        />

        <PdfExportAuditTableSection
          rows={rows}
          isLoading={list.isLoading}
          isError={list.isError}
          isFetching={list.isFetching}
          isRTL={isRTL}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          totalPages={totalPages}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />

        <PdfExportPrivacyNotice isRTL={isRTL} />
      </main>
    </DashboardLayout>
  );
};

export default AdminPdfExportAudit;
