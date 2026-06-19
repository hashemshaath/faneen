/**
 * AdminProviderLeads — professional CRM-lite for provider candidates.
 *
 * Features:
 *  - KPI strip (already shipped) + advanced filters (status pills, city,
 *    completeness slider, sort, search).
 *  - Tabs: dense Table view ⇄ Kanban-by-status view.
 *  - Inline side-by-side Detail panel (no popups) with completeness
 *    breakdown, quick-action status moves, and a deep-link to enrichment.
 *  - Bulk selection bar — approve / reject / under_review / needs_info
 *    across many leads in one go.
 *  - CSV export of the filtered view.
 *  - Possible-duplicate detection (email/phone/cr/unified) with cross-
 *    navigation between the candidates.
 *
 * No new tables, no new RPCs — everything runs on the existing
 * `admin_update_provider_lead` RPC and `listProviderLeads` query.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, TableProperties, Kanban, Rows3, Rows4, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  listProviderLeads,
  updateProviderLeadStatus,
  type ProviderLeadRow,
  type ProviderLeadStatus,
} from '@/modules/providers';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  IntakeKpiStrip,
  type IntakeKpiItem,
} from '@/components/admin/provider-intake/IntakeKpiStrip';
import { PilotContactTemplateCard } from '@/components/admin/provider-intake/PilotContactTemplateCard';
import { ProviderLeadsFilters, type SortKey } from '@/components/admin/provider-leads/ProviderLeadsFilters';
import { ProviderLeadsTable } from '@/components/admin/provider-leads/ProviderLeadsTable';
import { ProviderLeadsKanban } from '@/components/admin/provider-leads/ProviderLeadsKanban';
import { ProviderLeadDetail } from '@/components/admin/provider-leads/ProviderLeadDetail';
import { BulkActionBar } from '@/components/admin/provider-leads/BulkActionBar';
import {
  STATUS_ORDER,
  STATUS_LABEL,
  computeCompleteness,
  computeLeadScore,
  distinctCities,
  downloadCsv,
  findDuplicateGroups,
  lastNDaysSeries,
  leadsToCsv,
} from '@/components/admin/provider-leads/providerLeadHelpers';
import { SavedViewsBar, type ViewSnapshot } from '@/components/admin/provider-leads/SavedViewsBar';
import { Bi } from '@/components/common/Bilingual';

const AdminProviderLeads: React.FC = () => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  useNoIndex();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const batchFilter = searchParams.get('batch');

  // Data state
  const [rows, setRows] = useState<ProviderLeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters — initial values read from URL so the page is shareable / reloadable.
  const [status, setStatus] = useState<ProviderLeadStatus | 'all'>(
    (searchParams.get('status') as ProviderLeadStatus | 'all' | null) ?? 'all',
  );
  const [city, setCity] = useState<string | 'all'>(searchParams.get('city') ?? 'all');
  const [minCompleteness, setMinCompleteness] = useState<number>(
    Number(searchParams.get('min') ?? '0') || 0,
  );
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [sort, setSort] = useState<SortKey>((searchParams.get('sort') as SortKey | null) ?? 'newest');
  const [density, setDensity] = useState<'compact' | 'comfortable'>(
    (searchParams.get('d') as 'compact' | 'comfortable' | null) ?? 'comfortable',
  );
  const [showHelp, setShowHelp] = useState(false);

  // Selection + view
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(searchParams.get('open'));
  const [view, setView] = useState<'table' | 'kanban'>(
    (searchParams.get('view') as 'table' | 'kanban' | null) ?? 'table',
  );
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    // Always pull the full set; filtering happens client-side for instant
    // KPIs, completeness scoring, and duplicate detection.
    const res = await listProviderLeads({ status: 'all', search: '' });
    if (res.error) toast.error(t('تعذر تحميل الطلبات', 'Could not load requests'));
    setRows(res.rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Sync filters → URL (shareable links + reload safety).
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const set = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
    set('status', status !== 'all' ? status : '');
    set('city', city !== 'all' ? city : '');
    set('min', minCompleteness > 0 ? String(minCompleteness) : '');
    set('q', search);
    set('sort', sort !== 'newest' ? sort : '');
    set('view', view !== 'table' ? view : '');
    set('d', density !== 'comfortable' ? density : '');
    set('open', openId ?? '');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, city, minCompleteness, search, sort, view, density, openId]);

  // Counts for status pills (computed from the full unfiltered list).
  const statusCounts = useMemo(() => {
    const c: Record<ProviderLeadStatus | 'all', number> = {
      all: rows.length,
      new: 0,
      under_review: 0,
      needs_info: 0,
      approved: 0,
      rejected: 0,
      converted_to_business: 0,
    };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const cities = useMemo(() => distinctCities(rows), [rows]);

  // Filtered + sorted view.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (city !== 'all' && (r.city ?? '') !== city) return false;
      if (minCompleteness > 0 && computeCompleteness(r).pct < minCompleteness) return false;
      if (batchFilter && !(r.admin_notes ?? '').includes(batchFilter)) return false;
      if (q) {
        const hay = [
          r.name_ar,
          r.name_en,
          r.email,
          r.phone,
          r.reference_code,
          r.cr_number,
          r.unified_number,
          r.contact_name,
          r.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    switch (sort) {
      case 'oldest':
        out = [...out].sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case 'completeness_desc':
        out = [...out].sort(
          (a, b) => computeCompleteness(b).pct - computeCompleteness(a).pct,
        );
        break;
      case 'completeness_asc':
        out = [...out].sort(
          (a, b) => computeCompleteness(a).pct - computeCompleteness(b).pct,
        );
        break;
      case 'name':
        out = [...out].sort((a, b) =>
          (a.name_ar || a.name_en || '').localeCompare(b.name_ar || b.name_en || ''),
        );
        break;
      default:
        out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return out;
  }, [rows, status, city, minCompleteness, search, sort, batchFilter]);

  const duplicates = useMemo(() => findDuplicateGroups(rows), [rows]);

  const selectedLead = useMemo(
    () => (openId ? rows.find((r) => r.id === openId) ?? null : null),
    [rows, openId],
  );
  const selectedDupIds = openId ? duplicates.get(openId) ?? [] : [];
  const selectedDupLeads = selectedDupIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is ProviderLeadRow => Boolean(r));

  // KPI strip
  const kpiItems = useMemo<IntakeKpiItem[]>(
    () => {
      const spark = (pred: (r: ProviderLeadRow) => boolean) => lastNDaysSeries(rows, 14, pred);
      return [
        { id: 'total', label: t('إجمالي المرشحين', 'Total candidates'), value: statusCounts.all, tone: 'neutral', spark: lastNDaysSeries(rows, 14) },
        { id: 'ready-review', label: t('جاهز للمراجعة', 'Ready to review'), value: statusCounts.new + statusCounts.under_review, tone: 'primary', spark: spark((r) => r.status === 'new' || r.status === 'under_review') },
        { id: 'needs-data', label: t('يحتاج بيانات', 'Needs info'), value: statusCounts.needs_info, tone: 'warning', spark: spark((r) => r.status === 'needs_info') },
        { id: 'ready-convert', label: t('جاهز للتحويل', 'Ready to convert'), value: statusCounts.approved, tone: 'success', spark: spark((r) => r.status === 'approved') },
        { id: 'converted', label: t('تم التحويل', 'Converted'), value: statusCounts.converted_to_business, tone: 'info', spark: spark((r) => r.status === 'converted_to_business') },
        { id: 'rejected', label: t('مرفوض', 'Rejected'), value: statusCounts.rejected, tone: 'destructive', spark: spark((r) => r.status === 'rejected') },
      ];
    },
    [statusCounts, isRTL, rows, t],
  );

  // Selection helpers
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => {
    const ids = filtered.map((r) => r.id);
    setSelectedIds((prev) =>
      prev.size === ids.length ? new Set() : new Set(ids),
    );
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Bulk status mutation — runs sequentially against the existing RPC.
  const bulkSetStatus = async (target: ProviderLeadStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      const res = await updateProviderLeadStatus({ leadId: id, status: target });
      if (res.error) fail += 1;
      else ok += 1;
    }
    setBulkBusy(false);
    if (ok > 0) toast.success(`${ok} ${t('تم تحديثها إلى', 'updated to')} ${STATUS_LABEL[target].ar}`);
    if (fail > 0) toast.error(`${fail} ${t('فشل تحديثها', 'failed to update')}`);
    clearSelection();
    await load();
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const csv = leadsToCsv(filtered);
    const name = `provider-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(name, csv);
    toast.success(t('تم تصدير CSV', 'CSV exported'));
  };

  const enrich = (lead: ProviderLeadRow) => {
    const q = encodeURIComponent(lead.name_ar || lead.name_en || lead.reference_code);
    navigate(`/admin/data-enrichment?q=${q}&ref=${encodeURIComponent(lead.reference_code)}`);
  };

  const moveOne = async (id: string, target: ProviderLeadStatus) => {
    const res = await updateProviderLeadStatus({ leadId: id, status: target });
    if (res.error) {
      toast.error(t('تعذر التحديث', 'Update failed'));
      return;
    }
    toast.success(t('تم التحديث', 'Updated'));
    await load();
  };

  /* ---------- Keyboard shortcuts ----------
   *  J / K   navigate between rows in the filtered list
   *  A       approve open lead
   *  R       reject open lead
   *  U       under review
   *  N       needs info
   *  E       enrich open lead
   *  Esc     close detail
   *  ?       toggle help
   */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement | null)?.isContentEditable;
      if (editing) return;
      const idx = openId ? filtered.findIndex((r) => r.id === openId) : -1;
      switch (e.key) {
        case 'j': {
          const n = idx < 0 ? 0 : Math.min(filtered.length - 1, idx + 1);
          if (filtered[n]) setOpenId(filtered[n].id);
          break;
        }
        case 'k': {
          const n = idx <= 0 ? 0 : idx - 1;
          if (filtered[n]) setOpenId(filtered[n].id);
          break;
        }
        case 'Escape':
          if (openId) setOpenId(null);
          break;
        case 'a':
          if (openId) moveOne(openId, 'approved');
          break;
        case 'r':
          if (openId) moveOne(openId, 'rejected');
          break;
        case 'u':
          if (openId) moveOne(openId, 'under_review');
          break;
        case 'n':
          if (openId) moveOne(openId, 'needs_info');
          break;
        case 'e': {
          const r = openId ? rows.find((x) => x.id === openId) : null;
          if (r) enrich(r);
          break;
        }
        case '?':
          setShowHelp((v) => !v);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, filtered, rows]);

  const applyView = (v: ViewSnapshot) => {
    setStatus(v.status);
    setCity(v.city);
    setMinCompleteness(v.minCompleteness);
    setSearch(v.search);
    setSort(v.sort);
    toast.success(t('تم تطبيق العرض', 'View applied'));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="container mx-auto max-w-[1400px] flex-1 px-4 py-8">
        <header className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <Bi ar="العملاء المحتملون — المزودون" en="Provider Leads" />
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <Bi
                  ar="مرشحو الانضمام: لا يُحتسبون ولا يُمنحون رقمًا تعريفيًا حتى يكتمل الاعتماد. كل البيانات قابلة للإثراء قبل التحويل."
                  en="Join candidates — not counted as providers and not granted a reference until the admin completes the data and approves them."
                />
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {batchFilter && (
                <button
                  onClick={() => navigate('/admin/provider-leads')}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/15"
                >
                  <Bi
                    ar={`عرض دفعة: ${batchFilter} · إزالة الفلتر`}
                    en={`Batch: ${batchFilter} · clear filter`}
                  />
                </button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
                className="h-8 rounded-lg text-[11px]"
                title={t('كثافة العرض', 'Density')}
              >
                {density === 'compact' ? <Rows4 className="me-1 h-3.5 w-3.5" /> : <Rows3 className="me-1 h-3.5 w-3.5" />}
                {density === 'compact' ? t('مضغوط', 'Compact') : t('مريح', 'Comfortable')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHelp((v) => !v)}
                className="h-8 rounded-lg text-[11px]"
                title={t('اختصارات', 'Shortcuts')}
              >
                <Keyboard className="me-1 h-3.5 w-3.5" />?
              </Button>
            </div>
          </div>
          {showHelp && (
            <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <span className="me-3 font-semibold">{t('اختصارات لوحة المفاتيح:', 'Shortcuts:')}</span>
              <kbd className="rounded border bg-background px-1">J</kbd>/<kbd className="rounded border bg-background px-1">K</kbd> {t('تنقل', 'navigate')}
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1">A</kbd> {t('اعتماد', 'approve')}
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1">R</kbd> {t('رفض', 'reject')}
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1">U</kbd> {t('مراجعة', 'review')}
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1">N</kbd> {t('يحتاج بيانات', 'needs info')}
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1">E</kbd> {t('إثراء', 'enrich')}
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1">Esc</kbd> {t('إغلاق', 'close')}
            </div>
          )}
        </header>

        <IntakeKpiStrip items={kpiItems} testId="provider-leads-kpis" />

        <SavedViewsBar
          current={{ status, city, minCompleteness, search, sort }}
          onApply={applyView}
        />

        <ProviderLeadsFilters
          status={status}
          onStatus={setStatus}
          city={city}
          onCity={setCity}
          cities={cities}
          minCompleteness={minCompleteness}
          onMinCompleteness={setMinCompleteness}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          loading={loading}
          onRefresh={load}
          onExport={exportCsv}
          totalCount={rows.length}
          filteredCount={filtered.length}
          statusCounts={statusCounts}
        />

        <BulkActionBar
          count={selectedIds.size}
          busy={bulkBusy}
          onApprove={() => bulkSetStatus('approved')}
          onReject={() => bulkSetStatus('rejected')}
          onNeedsInfo={() => bulkSetStatus('needs_info')}
          onUnderReview={() => bulkSetStatus('under_review')}
          onClear={clearSelection}
        />

        {/* Hybrid view: list on the left, sticky detail on the right */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'kanban')}>
              <TabsList className="mb-3 rounded-xl">
                <TabsTrigger value="table" className="rounded-lg text-xs">
                  <TableProperties className="me-1.5 h-3.5 w-3.5" aria-hidden />
                  <Bi ar="جدول" en="Table" />
                </TabsTrigger>
                <TabsTrigger value="kanban" className="rounded-lg text-xs">
                  <Kanban className="me-1.5 h-3.5 w-3.5" aria-hidden />
                  <Bi ar="حسب الحالة" en="Kanban" />
                </TabsTrigger>
              </TabsList>
              <TabsContent value="table" className="m-0">
                {loading && rows.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ProviderLeadsTable
                    rows={filtered}
                    selected={selectedIds}
                    onToggle={toggleOne}
                    onToggleAll={toggleAll}
                    selectedId={openId}
                    onOpen={setOpenId}
                    onEnrich={enrich}
                    duplicates={duplicates}
                    density={density}
                  />
                )}
              </TabsContent>
              <TabsContent value="kanban" className="m-0">
                {loading && rows.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ProviderLeadsKanban
                    rows={filtered}
                    selectedId={openId}
                    onOpen={setOpenId}
                    onMove={moveOne}
                    onEnrich={enrich}
                    duplicates={duplicates}
                  />
                )}
              </TabsContent>
            </Tabs>

            <PilotContactTemplateCard
              className="mt-5"
              testId="provider-leads-pilot-contact-template"
            />
          </div>

          {/* Detail column */}
          <aside className="min-w-0">
            {selectedLead ? (
              <ProviderLeadDetail
                lead={selectedLead}
                duplicateIds={selectedDupIds}
                duplicateLeads={selectedDupLeads}
                onClose={() => setOpenId(null)}
                onSaved={load}
                onEnrich={enrich}
                onJumpTo={setOpenId}
              />
            ) : (
              <Card className="sticky top-2 rounded-2xl">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  <Bi
                    ar="اختر عميلًا محتملًا لعرض التفاصيل والاعتماد."
                    en="Select a lead to view details and approve."
                  />
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          <Bi
            ar={`عرض ${filtered.length} من أصل ${rows.length} عميلًا محتملًا · لا يتم احتسابهم ضمن المزودين حتى الاعتماد.`}
            en={`Showing ${filtered.length} of ${rows.length} leads · not counted as providers until approved.`}
          />
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default AdminProviderLeads;