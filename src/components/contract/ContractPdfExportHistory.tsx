/**
 * PDF-QA2B — Contract PDF export history (read-only) with pagination,
 * search, filters, and safe exporter display.
 *
 * Privacy guard:
 *   - Never displays raw exporter UUID, email, contact info, IP/UA hashes.
 *   - Uses the SECURITY DEFINER RPC `list_contract_pdf_exports` which
 *     resolves a safe display name (full_name || ref_id) server-side.
 *   - Falls back to a localized generic label when no safe name exists.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listContractPdfExports } from '@/modules/contracts/services/pdfExports';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileClock, Download, ChevronLeft, ChevronRight, Search, User2,
} from 'lucide-react';

interface Row {
  export_ref: string;
  exported_at: string;
  exporter_display_name: string | null;
  is_self: boolean;
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

const SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  contract_detail:     { ar: 'صفحة العقد',   en: 'Contract page' },
  dashboard_contracts: { ar: 'لوحة العقود',  en: 'Contracts dashboard' },
  admin:               { ar: 'الإدارة',       en: 'Admin' },
  unknown:             { ar: 'غير محدد',     en: 'Unknown' },
};
const SOURCE_KEYS = ['contract_detail', 'dashboard_contracts', 'admin', 'unknown'] as const;

const PAGE_SIZE = 20;

interface Props {
  contractId: string;
  isRTL: boolean;
}

// Defense-in-depth: redact any UUID-looking string the UI might receive.
const UUID_RX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const safeText = (s: string | null | undefined): string =>
  !s ? '' : UUID_RX.test(s) ? '' : s;

export const ContractPdfExportHistory: React.FC<Props> = ({ contractId, isRTL }) => {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [versionFilter, setVersionFilter] = useState<string>('');
  const [tplVersionFilter, setTplVersionFilter] = useState<string>('');

  const filters = useMemo(() => ({
    search: search.trim() || null,
    source: sourceFilter === 'all' ? null : sourceFilter,
    version: versionFilter ? Number(versionFilter) : null,
    tplVersion: tplVersionFilter ? Number(tplVersionFilter) : null,
  }), [search, sourceFilter, versionFilter, tplVersionFilter]);

  const q = useQuery({
    queryKey: ['contract-pdf-exports', contractId, page, filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await listContractPdfExports({
        _contract_id: contractId,
        _search: filters.search,
        _source: filters.source,
        _contract_version: filters.version,
        _template_version_number: filters.tplVersion,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const rows = q.data || [];
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < Number(total);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setPage(0);
    setSearchInput(''); setSearch('');
    setSourceFilter('all'); setVersionFilter(''); setTplVersionFilter('');
  };

  return (
    <Card data-testid="pdf-export-history">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileClock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">
              {isRTL ? 'سجل تصدير ملف العقد' : 'PDF Export History'}
            </h2>
            {Number(total) > 0 && (
              <Badge variant="secondary" className="text-[10px]" dir="ltr">
                {Number(total)}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost" size="sm" className="h-7 text-xs"
            onClick={resetFilters}
            disabled={!search && sourceFilter === 'all' && !versionFilter && !tplVersionFilter}
          >
            {isRTL ? 'إعادة الضبط' : 'Reset'}
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <form onSubmit={onSubmitSearch} className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground start-2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={isRTL ? 'ابحث (رقم العقد، #هاش، اسم القالب...)' : 'Search (contract #, hash, template...)'}
              className="h-8 text-xs ps-7"
              dir="auto"
            />
          </form>

          <Select value={sourceFilter} onValueChange={(v) => { setPage(0); setSourceFilter(v); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={isRTL ? 'المصدر' : 'Source'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل المصادر' : 'All sources'}</SelectItem>
              {SOURCE_KEYS.map((s) => (
                <SelectItem key={s} value={s}>
                  {isRTL ? SOURCE_LABEL[s].ar : SOURCE_LABEL[s].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number" min={1} inputMode="numeric"
            value={versionFilter}
            onChange={(e) => { setPage(0); setVersionFilter(e.target.value); }}
            placeholder={isRTL ? 'إصدار العقد (مثال 3)' : 'Contract version (e.g. 3)'}
            className="h-8 text-xs"
            dir="ltr"
          />
          <Input
            type="number" min={1} inputMode="numeric"
            value={tplVersionFilter}
            onChange={(e) => { setPage(0); setTplVersionFilter(e.target.value); }}
            placeholder={isRTL ? 'إصدار القالب' : 'Template version'}
            className="h-8 text-xs"
            dir="ltr"
          />
        </div>

        {/* States */}
        {q.isLoading && (
          <p className="text-xs text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</p>
        )}
        {q.isError && (
          <p className="text-xs text-destructive">
            {isRTL ? 'تعذّر تحميل السجل.' : 'Failed to load history.'}
          </p>
        )}
        {!q.isLoading && !q.isError && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لا توجد نتائج.' : 'No results.'}
          </p>
        )}

        {/* Retention notice */}
        <p className="text-[10px] text-muted-foreground/80 italic">
          {isRTL
            ? 'يتم الاحتفاظ بسجل التصدير لأغراض التدقيق وفق سياسة المنصة.'
            : 'Export history is retained for audit purposes according to platform policy.'}
        </p>

        {/* List */}
        <ol className="space-y-1.5">
          {rows.map((r) => {
            const src = SOURCE_LABEL[r.source] || SOURCE_LABEL.unknown;
            const tplName = isRTL
              ? safeText(r.template_name_ar || r.template_name_en)
              : safeText(r.template_name_en || r.template_name_ar);
            const safeName = safeText(r.exporter_display_name);
            const exporterLabel = r.is_self
              ? (isRTL ? 'أنت' : 'You')
              : (safeName || (isRTL ? 'مستخدم قِطاعات' : 'Qitaat user'));
            return (
              <li
                key={r.export_ref}
                className="rounded-md border px-2.5 py-2 text-xs flex items-start justify-between gap-2"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Download className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{isRTL ? src.ar : src.en}</Badge>
                    {r.contract_version != null && (
                      <span className="text-[10px] text-muted-foreground" dir="ltr">v{r.contract_version}</span>
                    )}
                    {tplName && (
                      <Badge variant="outline" className="text-[10px]">
                        {tplName}{r.template_version_number != null ? ` · v${r.template_version_number}` : ''}
                      </Badge>
                    )}
                    {r.document_hash_prefix && (
                      <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                        #{r.document_hash_prefix}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <User2 className="h-3 w-3" />
                      <span>{exporterLabel}</span>
                    </span>
                    <span>{isRTL ? `بنود: ${r.line_item_count}` : `${r.line_item_count} items`}</span>
                    <span>{isRTL ? `مجموعات BOQ: ${r.boq_group_count}` : `${r.boq_group_count} BOQ groups`}</span>
                    <span>{isRTL ? `ملاحق: ${r.amendment_count}` : `${r.amendment_count} amendments`}</span>
                    {r.export_locale && <span dir="ltr">{r.export_locale.toUpperCase()}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0" dir="ltr">
                  {new Date(r.exported_at).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Pagination */}
        {Number(total) > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {(() => {
                const from = page * PAGE_SIZE + 1;
                const to = Math.min((page + 1) * PAGE_SIZE, Number(total));
                return isRTL
                  ? `عرض ${from} إلى ${to} من ${Number(total)}`
                  : `Showing ${from}–${to} of ${Number(total)}`;
              })()}
              <span className="mx-2 opacity-50">·</span>
              <span dir="ltr">{page + 1} / {totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm" className="h-7 px-2"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!canPrev || q.isFetching}
              >
                {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                <span className="text-xs ms-1">{isRTL ? 'السابق' : 'Prev'}</span>
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 px-2"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext || q.isFetching}
              >
                <span className="text-xs me-1">{isRTL ? 'التالي' : 'Next'}</span>
                {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractPdfExportHistory;
