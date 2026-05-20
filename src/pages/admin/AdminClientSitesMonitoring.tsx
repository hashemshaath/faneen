import React, { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity, AlertTriangle, Download, FileText, Layers, MapPin, QrCode,
  RefreshCw, ShieldCheck, Sparkles, TrendingUp, X, Zap,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import AdminClientSitesKpiGrid from '@/components/admin/client-sites/AdminClientSitesKpiGrid';
import AdminClientSitesFilters, {
  type ActiveFilter,
} from '@/components/admin/client-sites/AdminClientSitesFilters';
import AdminClientSitesTable from '@/components/admin/client-sites/AdminClientSitesTable';
import type { BusinessLogoLite } from '@/components/admin/client-sites/AdminClientSitesTable';
import {
  buildMonitoringCsv, DEFAULT_FILTERS, loadPersistedFilters, savePersistedFilters,
  sortRows, type MonitoringList, type MonitoringSummary, type PersistedFilters,
  type SiteDetail, type SortKey, type StatusFilter,
} from '@/lib/client-sites/admin-client-site-monitoring';

const QUERY_STALE_MS = 60_000;
const AUTO_REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 350;

const AdminClientSitesMonitoring: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { isRTL } = useLanguage();

  // Persisted filters (lazy init from localStorage)
  const initial = useRef<PersistedFilters>(loadPersistedFilters()).current;

  const [status, setStatus] = useState<StatusFilter>(initial.status);
  const [visibility, setVisibility] = useState<string>(initial.visibility);
  const [qrStatus, setQrStatus] = useState<string>(initial.qrStatus);
  const [siteType, setSiteType] = useState<string>(initial.siteType);
  const [search, setSearch] = useState<string>(initial.search);
  const [city, setCity] = useState<string>(initial.city);
  const [sortBy, setSortBy] = useState<SortKey>(initial.sortBy);
  const [density, setDensity] = useState<PersistedFilters['density']>(initial.density);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(initial.autoRefresh);
  const [pageSize, setPageSize] = useState<number>(initial.pageSize);
  const [page, setPage] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const h = window.location.hash.match(/^#site=([0-9a-f-]+)$/i);
    return h ? h[1] : null;
  });

  // Debounced search & city to avoid hammering RPC on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedCity, setDebouncedCity] = useState(city);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCity(city), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [city]);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Persist filters
  useEffect(() => {
    savePersistedFilters({
      status, visibility, qrStatus, siteType, search, city,
      sortBy, density, autoRefresh, pageSize,
    });
  }, [status, visibility, qrStatus, siteType, search, city, sortBy, density, autoRefresh, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [status, visibility, qrStatus, siteType, debouncedSearch, debouncedCity]);

  // -------- Queries ------------------------------------------------------
  const summaryQ = useQuery({
    queryKey: ['admin-client-sites-monitoring-summary'],
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data, error } = await supabase.rpc('admin_client_sites_monitoring_summary');
      if (error) throw error;
      return data as unknown as MonitoringSummary;
    },
    staleTime: QUERY_STALE_MS,
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
  });

  const listQ = useQuery({
    queryKey: [
      'admin-client-sites-monitoring-list',
      status, visibility, qrStatus, siteType,
      debouncedSearch, debouncedCity, page, pageSize,
    ],
    queryFn: async (): Promise<MonitoringList> => {
      const { data, error } = await supabase.rpc('admin_list_client_sites_monitoring', {
        _status: status,
        _city: debouncedCity || null,
        _visibility: visibility === 'all' ? null : visibility,
        _qr_status: qrStatus === 'all' ? null : qrStatus,
        _search: debouncedSearch || null,
        _site_type: siteType === 'all' ? null : siteType,
        _limit: pageSize,
        _offset: page * pageSize,
      });
      if (error) throw error;
      return data as unknown as MonitoringList;
    },
    staleTime: QUERY_STALE_MS,
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
  });

  // Detail query: only runs when a site is selected; sensitive panels do
  // their own gated RPC and never auto-fetch raw QR tokens or PII.
  const detailQ = useQuery({
    queryKey: ['admin-client-site-detail', selectedId],
    enabled: !!selectedId,
    staleTime: QUERY_STALE_MS,
    queryFn: async (): Promise<SiteDetail> => {
      const { data, error } = await supabase.rpc('admin_get_client_site_monitoring_detail', {
        _site_id: selectedId!,
      });
      if (error) throw error;
      return data as unknown as SiteDetail;
    },
  });

  const s = summaryQ.data;
  const rawRows = listQ.data?.rows ?? [];
  const rows = useMemo(() => sortRows(rawRows, sortBy), [rawRows, sortBy]);

  // Batch-fetch client business logos for the current page's rows. Stable
  // sorted list of distinct ids keeps the React Query cache reuseable
  // across re-renders and across pages.
  const businessIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of rawRows) if (r.business_id) set.add(r.business_id);
    return [...set].sort();
  }, [rawRows]);

  const logosQ = useQuery({
    queryKey: ['admin-client-sites-business-logos', businessIds],
    enabled: businessIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Map<string, BusinessLogoLite>> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, logo_url, name_ar, name_en, username')
        .in('id', businessIds);
      if (error) throw error;
      const map = new Map<string, BusinessLogoLite>();
      for (const b of (data ?? [])) {
        map.set(b.id, {
          logo_url: b.logo_url ?? null,
          name_ar: b.name_ar ?? null,
          name_en: b.name_en ?? null,
          username: b.username ?? null,
        });
      }
      return map;
    },
  });
  const businessLogos = logosQ.data ?? new Map<string, BusinessLogoLite>();

  // -------- Keyboard & deep-link ----------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && !inField) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && selectedId) {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  useEffect(() => {
    const target = selectedId ? `#site=${selectedId}` : '';
    if (window.location.hash !== target) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}${target}`);
    }
  }, [selectedId]);

  // -------- Presets ------------------------------------------------------
  const presets = useMemo(() => ([
    {
      id: 'pending', ar: 'طلبات معلّقة', en: 'Pending requests',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      apply: () => { setStatus('active'); setVisibility('all'); setQrStatus('all'); setSiteType('all'); setSortBy('pending_desc'); },
      active: sortBy === 'pending_desc',
    },
    {
      id: 'qr-on', ar: 'QR نشط', en: 'QR enabled',
      icon: <QrCode className="h-3.5 w-3.5" />,
      apply: () => { setQrStatus('enabled'); setStatus('active'); },
      active: qrStatus === 'enabled',
    },
    {
      id: 'qr-revoked', ar: 'QR ملغى', en: 'QR revoked',
      icon: <X className="h-3.5 w-3.5" />,
      apply: () => { setQrStatus('revoked'); setStatus('all'); },
      active: qrStatus === 'revoked',
    },
    {
      id: 'contracts', ar: 'لها عقود', en: 'In contracts',
      icon: <FileText className="h-3.5 w-3.5" />,
      apply: () => { setSortBy('contracts_desc'); setStatus('active'); },
      active: sortBy === 'contracts_desc',
    },
    {
      id: 'hot', ar: 'الأكثر مسحاً', en: 'Hottest scans',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      apply: () => { setSortBy('scans_desc'); setStatus('active'); },
      active: sortBy === 'scans_desc',
    },
    {
      id: 'archived', ar: 'المؤرشفة', en: 'Archived',
      icon: <Layers className="h-3.5 w-3.5" />,
      apply: () => { setStatus('archived'); },
      active: status === 'archived',
    },
  ]), [sortBy, qrStatus, status]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const f: ActiveFilter[] = [];
    if (status !== 'active') f.push({ key: 'status', label: `${bi('الحالة', 'Status')}: ${status}`, clear: () => setStatus('active') });
    if (visibility !== 'all') f.push({ key: 'visibility', label: `${bi('الرؤية', 'Visibility')}: ${visibility}`, clear: () => setVisibility('all') });
    if (qrStatus !== 'all') f.push({ key: 'qr', label: `QR: ${qrStatus}`, clear: () => setQrStatus('all') });
    if (siteType !== 'all') f.push({ key: 'type', label: `${bi('النوع', 'Type')}: ${siteType}`, clear: () => setSiteType('all') });
    if (search) f.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') });
    if (city) f.push({ key: 'city', label: `${bi('مدينة', 'City')}: ${city}`, clear: () => setCity('') });
    return f;
  }, [status, visibility, qrStatus, siteType, search, city, bi]);

  const resetAll = () => {
    setStatus(DEFAULT_FILTERS.status);
    setVisibility(DEFAULT_FILTERS.visibility);
    setQrStatus(DEFAULT_FILTERS.qrStatus);
    setSiteType(DEFAULT_FILTERS.siteType);
    setSearch(DEFAULT_FILTERS.search);
    setCity(DEFAULT_FILTERS.city);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const csv = buildMonitoringCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-sites-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
          <div className="absolute inset-0 pointer-events-none opacity-50 [background-image:radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary" aria-hidden>
                  <MapPin className="h-5 w-5" />
                </span>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                  {bi('مراقبة مواقع العملاء', 'Client Sites Monitoring')}
                </h1>
                <Badge variant="outline" className="ms-1 text-[10px] uppercase tracking-wider">
                  {bi('إداري', 'Admin')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                {bi(
                  'لوحة احترافية لمراقبة المواقع، رموز QR، الزيارات، طلبات الوصول، اهتمامات المزودين والعقود — مع تدقيق كامل لكل كشف بيانات حساسة.',
                  'Professional monitoring for sites, QR usage, visits, access requests, provider interests and contracts — with full audit on every sensitive reveal.',
                )}
              </p>
              {s && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary" className="tech-content">
                    {s.active_sites} {bi('نشط', 'active')} / {s.total_sites} {bi('إجمالي', 'total')}
                  </Badge>
                  <Badge variant="secondary" className="tech-content">
                    <QrCode className="h-3 w-3 me-1" aria-hidden /> {s.qr_enabled_sites} {bi('QR مفعّل', 'QR on')}
                  </Badge>
                  <Badge variant="secondary" className="tech-content">
                    <Activity className="h-3 w-3 me-1" aria-hidden /> {s.visits_last_7d} {bi('مسحة/٧ أيام', 'scans/7d')}
                  </Badge>
                  {s.pending_access_requests > 0 && (
                    <Badge variant="default" className="bg-warning text-warning-foreground tech-content">
                      {s.pending_access_requests} {bi('طلب معلّق', 'pending')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(v => !v)}
                title={bi('تحديث تلقائي كل 30 ثانية', 'Auto-refresh every 30s')}
                aria-pressed={autoRefresh}
                aria-label={bi('تحديث تلقائي', 'Auto-refresh')}
              >
                <Zap className={`h-4 w-4 me-2 ${autoRefresh ? 'fill-current' : ''}`} aria-hidden />
                {bi('تحديث تلقائي', 'Auto')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={!rows.length}
                aria-label={bi('تصدير CSV', 'Export CSV')}
              >
                <Download className="h-4 w-4 me-2" aria-hidden />
                {bi('تصدير CSV', 'Export CSV')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { summaryQ.refetch(); listQ.refetch(); }}
                aria-label={bi('تحديث', 'Refresh')}
              >
                <RefreshCw className={`h-4 w-4 me-2 ${listQ.isFetching ? 'animate-spin' : ''}`} aria-hidden />
                {bi('تحديث', 'Refresh')}
              </Button>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-warning mt-0.5 shrink-0" aria-hidden />
            <p>
              {bi(
                'يُسجَّل كل كشف لبيانات حساسة (العنوان، الهاتف، الإحداثيات) في سجل التدقيق. رموز QR الخام لا يمكن استرجاعها بعد الإصدار — استخدم زر «تدوير» للحصول على رمز جديد.',
                'Every sensitive reveal (address, phone, coordinates) is recorded in the audit log. Raw QR tokens cannot be retrieved after issuance — use Rotate to obtain a new one.',
              )}
            </p>
          </CardContent>
        </Card>

        {/* KPI tabs */}
        <AdminClientSitesKpiGrid summary={s} isLoading={summaryQ.isLoading} bi={bi} />

        {/* Filters */}
        <AdminClientSitesFilters
          bi={bi}
          search={search} setSearch={setSearch}
          city={city} setCity={setCity}
          status={status} setStatus={setStatus}
          visibility={visibility} setVisibility={setVisibility}
          qrStatus={qrStatus} setQrStatus={setQrStatus}
          siteType={siteType} setSiteType={setSiteType}
          activeFilters={activeFilters}
          onResetAll={resetAll}
          searchInputRef={searchInputRef}
        />

        {/* Quick presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {bi('عروض سريعة:', 'Quick views:')}
          </span>
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={p.apply}
              aria-pressed={p.active}
              className={`inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${p.active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}
            >
              {p.icon}
              {bi(p.ar, p.en)}
            </button>
          ))}
        </div>

        {/* List + inline detail */}
        <AdminClientSitesTable
          bi={bi}
          isRTL={isRTL}
          rows={rows}
          listQ={listQ}
          detailQ={detailQ}
          businessLogos={businessLogos}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          sortBy={sortBy}
          setSortBy={setSortBy}
          pageSize={pageSize}
          setPageSize={setPageSize}
          page={page}
          setPage={setPage}
          density={density}
          setDensity={setDensity}
          hasActiveFilters={activeFilters.length > 0}
          onResetAll={resetAll}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminClientSitesMonitoring;