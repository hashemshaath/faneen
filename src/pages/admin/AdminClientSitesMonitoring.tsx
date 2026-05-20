import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Activity, MapPin, QrCode, RefreshCw, Search, AlertTriangle, Eye,
  X, Download, Building2, Home, Warehouse, Briefcase, Store, HardHat, Layers,
  ShieldCheck, FileText, Users, TrendingUp, Filter, ChevronDown,
} from 'lucide-react';
import AdminSiteSensitivePanel from '@/components/admin/client-sites/AdminSiteSensitivePanel';
import AdminSiteQrManager from '@/components/admin/client-sites/AdminSiteQrManager';
import AdminSiteSensitiveInline from '@/components/admin/client-sites/AdminSiteSensitiveInline';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface MonitoringRow {
  id: string;
  site_ref: string;
  site_name: string | null;
  label: string;
  site_type: string;
  city_name: string | null;
  visibility: string;
  qr_enabled: boolean;
  qr_revoked_at: string | null;
  archived_at: string | null;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
  business_id: string | null;
  business_name_ar: string | null;
  business_name_en: string | null;
  access_requests_count: number;
  pending_requests_count: number;
  approved_access_count: number;
  provider_interests_count: number;
  contracts_count: number;
  latest_activity_at: string;
}

interface MonitoringList {
  total: number;
  limit: number;
  offset: number;
  rows: MonitoringRow[];
}

interface MonitoringSummary {
  total_sites: number;
  active_sites: number;
  archived_sites: number;
  qr_enabled_sites: number;
  qr_revoked_sites: number;
  qr_disabled_sites: number;
  shared_by_qr_sites: number;
  public_limited_sites: number;
  total_scans: number;
  sites_with_access_requests: number;
  pending_access_requests: number;
  approved_access_grants: number;
  rejected_access_grants: number;
  revoked_access_grants: number;
  provider_interests: number;
  sites_linked_to_contracts: number;
  total_contracts_with_site: number;
  visits_last_7d: number;
}

interface SiteDetail {
  site: {
    id: string;
    site_ref: string;
    site_name: string | null;
    label: string;
    site_type: string;
    city_name: string | null;
    district: string | null;
    visibility: string;
    qr_enabled: boolean;
    qr_revoked: boolean;
    qr_revoked_at: string | null;
    scan_count: number;
    last_scanned_at: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    business_id: string | null;
    business_name_ar: string | null;
    business_name_en: string | null;
  } | null;
  recent_visits: Array<{
    created_at: string;
    visit_source: string;
    action: string;
    attempted_section: string | null;
    provider_business_id: string | null;
    provider_name_ar: string | null;
    provider_name_en: string | null;
  }>;
  recent_grants: Array<{
    id: string;
    status: string;
    access_level: string;
    requested_at: string;
    approved_at: string | null;
    rejected_at: string | null;
    revoked_at: string | null;
    ignored_at: string | null;
    reason: string | null;
    provider_business_id: string;
    provider_name_ar: string | null;
    provider_name_en: string | null;
  }>;
  recent_interests: Array<{
    id: string;
    lead_ref_id: string | null;
    subject: string | null;
    status: string;
    created_at: string;
    initiated_by: string | null;
    converted: boolean;
    business_id: string | null;
    provider_name_ar: string | null;
    provider_name_en: string | null;
  }>;
  related_contracts: {
    total: number;
    active: number;
    last_created_at: string | null;
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtDate = (iso: string | null | undefined, isRTL: boolean): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const qrStatusOf = (row: { qr_enabled: boolean; qr_revoked_at: string | null }) => {
  if (row.qr_revoked_at) return 'revoked' as const;
  if (row.qr_enabled) return 'enabled' as const;
  return 'disabled' as const;
};

/* ------------------------------------------------------------------ */
/* KPI card                                                           */
/* ------------------------------------------------------------------ */

const StatCard: React.FC<{
  label: string; value: number | string; icon?: React.ReactNode;
  tone?: string; hint?: string;
}> = ({ label, value, icon, tone = 'text-primary', hint }) => (
  <Card className="hover-lift border-border/60 group">
    <CardContent className="p-4 flex items-center gap-3">
      {icon && (
        <div className={`h-11 w-11 rounded-xl bg-muted/70 flex items-center justify-center ${tone} group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tech-content leading-tight">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </CardContent>
  </Card>
);

const SITE_TYPE_ICONS: Record<string, React.ReactNode> = {
  apartment: <Home className="h-4 w-4" />,
  villa: <Home className="h-4 w-4" />,
  showroom: <Store className="h-4 w-4" />,
  office: <Briefcase className="h-4 w-4" />,
  branch: <Building2 className="h-4 w-4" />,
  warehouse: <Warehouse className="h-4 w-4" />,
  project: <HardHat className="h-4 w-4" />,
  commercial: <Building2 className="h-4 w-4" />,
  other: <Layers className="h-4 w-4" />,
};
const iconForType = (t: string) => SITE_TYPE_ICONS[t] ?? <MapPin className="h-4 w-4" />;

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

const AdminClientSitesMonitoring: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { isRTL } = useLanguage();

  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [visibility, setVisibility] = useState<string>('all');
  const [qrStatus, setQrStatus] = useState<string>('all');
  const [siteType, setSiteType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summaryQ = useQuery({
    queryKey: ['admin-client-sites-monitoring-summary'],
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data, error } = await supabase.rpc('admin_client_sites_monitoring_summary');
      if (error) throw error;
      return data as unknown as MonitoringSummary;
    },
  });

  const listQ = useQuery({
    queryKey: ['admin-client-sites-monitoring-list', status, visibility, qrStatus, siteType, search, city],
    queryFn: async (): Promise<MonitoringList> => {
      const { data, error } = await supabase.rpc('admin_list_client_sites_monitoring', {
        _status: status,
        _city: city || null,
        _visibility: visibility === 'all' ? null : visibility,
        _qr_status: qrStatus === 'all' ? null : qrStatus,
        _search: search || null,
        _site_type: siteType === 'all' ? null : siteType,
        _limit: 50,
        _offset: 0,
      });
      if (error) throw error;
      return data as unknown as MonitoringList;
    },
  });

  const detailQ = useQuery({
    queryKey: ['admin-client-site-detail', selectedId],
    enabled: !!selectedId,
    queryFn: async (): Promise<SiteDetail> => {
      const { data, error } = await supabase.rpc('admin_get_client_site_monitoring_detail', {
        _site_id: selectedId!,
      });
      if (error) throw error;
      return data as unknown as SiteDetail;
    },
  });

  const s = summaryQ.data;
  const rows = listQ.data?.rows ?? [];

  const activeFilters = useMemo(() => {
    const f: Array<{ key: string; label: string; clear: () => void }> = [];
    if (status !== 'active') f.push({ key: 'status', label: `${bi('الحالة', 'Status')}: ${status}`, clear: () => setStatus('active') });
    if (visibility !== 'all') f.push({ key: 'visibility', label: `${bi('الرؤية', 'Visibility')}: ${visibility}`, clear: () => setVisibility('all') });
    if (qrStatus !== 'all') f.push({ key: 'qr', label: `QR: ${qrStatus}`, clear: () => setQrStatus('all') });
    if (siteType !== 'all') f.push({ key: 'type', label: `${bi('النوع', 'Type')}: ${siteType}`, clear: () => setSiteType('all') });
    if (search) f.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') });
    if (city) f.push({ key: 'city', label: `${bi('مدينة', 'City')}: ${city}`, clear: () => setCity('') });
    return f;
  }, [status, visibility, qrStatus, siteType, search, city, bi]);

  const resetAll = () => {
    setStatus('active'); setVisibility('all'); setQrStatus('all');
    setSiteType('all'); setSearch(''); setCity('');
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const header = ['site_ref','site_name','site_type','city','visibility','qr_status','scans','pending_requests','interests','contracts','latest_activity'];
    const lines = rows.map(r => [
      r.site_ref, (r.site_name || r.label || '').replace(/[",\n]/g, ' '), r.site_type,
      r.city_name || '', r.visibility, qrStatusOf(r), r.scan_count,
      r.pending_requests_count, r.provider_interests_count, r.contracts_count, r.latest_activity_at,
    ].join(','));
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `client-sites-${new Date().toISOString().slice(0,10)}.csv`; a.click();
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
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
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
                    <QrCode className="h-3 w-3 me-1" /> {s.qr_enabled_sites} {bi('QR مفعّل', 'QR on')}
                  </Badge>
                  <Badge variant="secondary" className="tech-content">
                    <Activity className="h-3 w-3 me-1" /> {s.visits_last_7d} {bi('مسحة/٧ أيام', 'scans/7d')}
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
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
                <Download className="h-4 w-4 me-2" />
                {bi('تصدير CSV', 'Export CSV')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { summaryQ.refetch(); listQ.refetch(); }}>
                <RefreshCw className={`h-4 w-4 me-2 ${listQ.isFetching ? 'animate-spin' : ''}`} />
                {bi('تحديث', 'Refresh')}
              </Button>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p>
              {bi(
                'يُسجَّل كل كشف لبيانات حساسة (العنوان، الهاتف، الإحداثيات) في سجل التدقيق. رموز QR الخام لا يمكن استرجاعها بعد الإصدار — استخدم زر «تدوير» للحصول على رمز جديد.',
                'Every sensitive reveal (address, phone, coordinates) is recorded in the audit log. Raw QR tokens cannot be retrieved after issuance — use Rotate to obtain a new one.',
              )}
            </p>
          </CardContent>
        </Card>

        {/* KPIs in tabbed groups */}
        <Tabs defaultValue="sites" className="w-full">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="sites" className="gap-1.5"><MapPin className="h-4 w-4" />{bi('المواقع', 'Sites')}</TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5"><QrCode className="h-4 w-4" />QR</TabsTrigger>
            <TabsTrigger value="access" className="gap-1.5"><Eye className="h-4 w-4" />{bi('الوصول', 'Access')}</TabsTrigger>
            <TabsTrigger value="engagement" className="gap-1.5"><TrendingUp className="h-4 w-4" />{bi('التفاعل', 'Engagement')}</TabsTrigger>
          </TabsList>

          {summaryQ.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : s ? (
            <>
              <TabsContent value="sites" className="mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label={bi('إجمالي المواقع', 'Total sites')} value={s.total_sites} icon={<MapPin className="h-5 w-5" />} />
                  <StatCard label={bi('مواقع نشطة', 'Active')} value={s.active_sites} icon={<Activity className="h-5 w-5" />} tone="text-success" />
                  <StatCard label={bi('مؤرشفة', 'Archived')} value={s.archived_sites} icon={<MapPin className="h-5 w-5" />} tone="text-muted-foreground" />
                  <StatCard label={bi('مرتبطة بعقود', 'In contracts')} value={s.sites_linked_to_contracts} icon={<FileText className="h-5 w-5" />} tone="text-info" hint={`${s.total_contracts_with_site} ${bi('عقد', 'contracts')}`} />
                </div>
              </TabsContent>
              <TabsContent value="qr" className="mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label={bi('QR مفعّل', 'QR enabled')} value={s.qr_enabled_sites} icon={<QrCode className="h-5 w-5" />} tone="text-primary" />
                  <StatCard label={bi('ملغى/معطّل', 'Revoked/Off')} value={s.qr_revoked_sites + s.qr_disabled_sites} icon={<QrCode className="h-5 w-5" />} tone="text-destructive" />
                  <StatCard label={bi('مشاركة عبر QR', 'Shared by QR')} value={s.shared_by_qr_sites} icon={<QrCode className="h-5 w-5" />} />
                  <StatCard label={bi('عام محدود', 'Public limited')} value={s.public_limited_sites} icon={<Eye className="h-5 w-5" />} />
                </div>
              </TabsContent>
              <TabsContent value="access" className="mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label={bi('مواقع بطلبات', 'Sites w/ requests')} value={s.sites_with_access_requests} icon={<Eye className="h-5 w-5" />} />
                  <StatCard label={bi('معلّقة', 'Pending')} value={s.pending_access_requests} icon={<AlertTriangle className="h-5 w-5" />} tone="text-warning" />
                  <StatCard label={bi('موافق عليها', 'Approved')} value={s.approved_access_grants} icon={<ShieldCheck className="h-5 w-5" />} tone="text-success" />
                  <StatCard label={bi('مرفوضة/ملغاة', 'Rejected/Revoked')} value={s.rejected_access_grants + s.revoked_access_grants} icon={<X className="h-5 w-5" />} tone="text-destructive" />
                </div>
              </TabsContent>
              <TabsContent value="engagement" className="mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label={bi('إجمالي المسحات', 'Total scans')} value={s.total_scans} icon={<Activity className="h-5 w-5" />} />
                  <StatCard label={bi('مسحات ٧ أيام', 'Visits 7d')} value={s.visits_last_7d} icon={<TrendingUp className="h-5 w-5" />} tone="text-info" />
                  <StatCard label={bi('اهتمامات مزودين', 'Provider interests')} value={s.provider_interests} icon={<Users className="h-5 w-5" />} />
                  <StatCard label={bi('إجمالي العقود', 'Contracts total')} value={s.total_contracts_with_site} icon={<FileText className="h-5 w-5" />} />
                </div>
              </TabsContent>
            </>
          ) : null}
        </Tabs>

        {/* Filters */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {bi('عوامل التصفية', 'Filters')}
            </CardTitle>
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetAll} className="h-8">
                <X className="h-3.5 w-3.5 me-1" /> {bi('إعادة ضبط', 'Reset all')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                dir="auto"
                placeholder={bi('بحث (site_ref أو الاسم)', 'Search (site_ref or name)')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 h-11"
              />
            </div>
            <Input
              dir="auto"
              placeholder={bi('المدينة', 'City')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11"
            />
            <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'archived' | 'all')}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{bi('نشطة', 'Active')}</SelectItem>
                <SelectItem value="archived">{bi('مؤرشفة', 'Archived')}</SelectItem>
                <SelectItem value="all">{bi('الكل', 'All')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="h-11"><SelectValue placeholder={bi('الرؤية', 'Visibility')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل الرؤية', 'All visibility')}</SelectItem>
                <SelectItem value="private">{bi('خاص', 'Private')}</SelectItem>
                <SelectItem value="shared_by_qr">{bi('مشاركة عبر QR', 'Shared by QR')}</SelectItem>
                <SelectItem value="provider_invited">{bi('بدعوة مزود', 'Provider invited')}</SelectItem>
                <SelectItem value="public_limited">{bi('عام محدود', 'Public limited')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={qrStatus} onValueChange={setQrStatus}>
              <SelectTrigger className="h-11"><SelectValue placeholder={bi('حالة QR', 'QR status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل حالات QR', 'All QR')}</SelectItem>
                <SelectItem value="enabled">{bi('مفعّل', 'Enabled')}</SelectItem>
                <SelectItem value="disabled">{bi('معطّل', 'Disabled')}</SelectItem>
                <SelectItem value="revoked">{bi('ملغى', 'Revoked')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={siteType} onValueChange={setSiteType}>
              <SelectTrigger className="h-11"><SelectValue placeholder={bi('النوع', 'Type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل الأنواع', 'All types')}</SelectItem>
                {['apartment','villa','showroom','office','branch','warehouse','project','commercial','other'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          {activeFilters.length > 0 && (
            <>
              <Separator />
              <div className="p-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{bi('نشطة:', 'Active:')}</span>
                {activeFilters.map(f => (
                  <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer hover:bg-muted" onClick={f.clear}>
                    {f.label}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* List */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              {bi('المواقع', 'Sites')}
              {listQ.data && (
                <Badge variant="secondary" className="tech-content">{listQ.data.total}</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {bi('يعرض أول 50 نتيجة', 'Showing first 50 results')}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {listQ.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : listQ.error ? (
              <p className="p-6 text-sm text-destructive">{(listQ.error as Error).message}</p>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
                  <MapPin className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium">{bi('لا توجد نتائج', 'No results')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bi('لا توجد مواقع مطابقة لعوامل التصفية.', 'No sites match the current filters.')}
                </p>
                {activeFilters.length > 0 && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={resetAll}>
                    {bi('إعادة ضبط', 'Reset filters')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {rows.map((r) => {
                  const qr = qrStatusOf(r);
                  const isOpen = selectedId === r.id;
                  return (
                    <div key={r.id} className={isOpen ? 'bg-muted/30' : ''}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(isOpen ? null : r.id)}
                        aria-expanded={isOpen}
                        className="w-full text-start p-4 flex flex-wrap items-center gap-3 hover:bg-muted/40 transition-colors focus:outline-none focus-visible:bg-muted/60"
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${qr === 'enabled' ? 'bg-primary/10 text-primary' : qr === 'revoked' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          {iconForType(r.site_type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted tech-content">{r.site_ref}</span>
                            <span className="font-semibold truncate">{r.site_name || r.label}</span>
                            {r.archived_at && (
                              <Badge variant="outline" className="text-[10px]">{bi('مؤرشف', 'Archived')}</Badge>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                            <span className="capitalize">{r.site_type}</span>
                            {r.city_name && <span>· {r.city_name}</span>}
                            {(r.business_name_ar || r.business_name_en) && (
                              <span>· {isRTL ? (r.business_name_ar || r.business_name_en) : (r.business_name_en || r.business_name_ar)}</span>
                            )}
                            <span className="ms-auto tech-content hidden sm:inline">{fmtDate(r.latest_activity_at, isRTL)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{r.visibility}</Badge>
                          <Badge
                            variant={qr === 'enabled' ? 'default' : qr === 'revoked' ? 'destructive' : 'outline'}
                            className="text-[10px]"
                          >
                            QR · {qr === 'enabled' ? bi('مفعّل', 'on') : qr === 'revoked' ? bi('ملغى', 'revoked') : bi('معطّل', 'off')}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] tech-content gap-1">
                            <Activity className="h-3 w-3" /> {r.scan_count}
                          </Badge>
                          {r.pending_requests_count > 0 && (
                            <Badge className="text-[10px] tech-content gap-1 bg-warning text-warning-foreground">
                              <AlertTriangle className="h-3 w-3" /> {r.pending_requests_count}
                            </Badge>
                          )}
                          {r.provider_interests_count > 0 && (
                            <Badge variant="outline" className="text-[10px] tech-content gap-1">
                              <Users className="h-3 w-3" /> {r.provider_interests_count}
                            </Badge>
                          )}
                          {r.contracts_count > 0 && (
                            <Badge variant="outline" className="text-[10px] tech-content gap-1">
                              <FileText className="h-3 w-3" /> {r.contracts_count}
                            </Badge>
                          )}
                        </div>

                        <span onClick={(e) => e.stopPropagation()} className="hidden md:flex items-center">
                          <CopyButton value={r.site_ref} label={bi('معرّف الموقع', 'Site ref')} />
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-border/60 bg-background p-4 sm:p-5">
                          {detailQ.isLoading ? (
                            <div className="space-y-2">
                              <Skeleton className="h-24 rounded-lg" />
                              <Skeleton className="h-32 rounded-lg" />
                            </div>
                          ) : detailQ.error ? (
                            <p className="text-sm text-destructive">{(detailQ.error as Error).message}</p>
                          ) : detailQ.data?.site ? (
                            <SiteInlineDetail data={detailQ.data} bi={bi} isRTL={isRTL} onClose={() => setSelectedId(null)} />
                          ) : null}
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
};

/* ------------------------------------------------------------------ */
/* Inline detail (replaces drawer)                                    */
/* ------------------------------------------------------------------ */

const SiteInlineDetail: React.FC<{
  data: SiteDetail;
  bi: (ar: string, en: string) => string;
  isRTL: boolean;
  onClose: () => void;
}> = ({ data, bi, isRTL, onClose }) => {
  if (!data.site) return null;
  const site = data.site;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted tech-content">{site.site_ref}</span>
            <CopyButton value={site.site_ref} label={bi('معرّف', 'Ref')} />
          </div>
          <h3 className="text-base font-bold mt-1 truncate">{site.site_name || site.label}</h3>
          <p className="text-xs text-muted-foreground">
            <span className="capitalize">{site.site_type}</span>
            {site.city_name ? ` · ${site.city_name}` : ''}
            {site.district ? ` · ${site.district}` : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
          <X className="h-4 w-4 me-1" /> {bi('إغلاق', 'Close')}
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview" className="text-xs">{bi('نظرة', 'Overview')}</TabsTrigger>
          <TabsTrigger value="visits" className="text-xs gap-1">
            {bi('زيارات', 'Visits')}
            <span className="tech-content text-[10px] opacity-70">{data.recent_visits.length}</span>
          </TabsTrigger>
          <TabsTrigger value="grants" className="text-xs gap-1">
            {bi('وصول', 'Grants')}
            <span className="tech-content text-[10px] opacity-70">{data.recent_grants.length}</span>
          </TabsTrigger>
          <TabsTrigger value="interests" className="text-xs gap-1">
            {bi('اهتمام', 'Interests')}
            <span className="tech-content text-[10px] opacity-70">{data.recent_interests.length}</span>
          </TabsTrigger>
          <TabsTrigger value="qr" className="text-xs">QR</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{bi('عقود', 'Contracts')}</p>
              <p className="text-2xl font-bold tech-content">{data.related_contracts.total}</p>
              <p className="text-[10px] text-success">{data.related_contracts.active} {bi('نشطة', 'active')}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{bi('اهتمامات', 'Interests')}</p>
              <p className="text-2xl font-bold tech-content">{data.recent_interests.length}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{bi('وصول', 'Grants')}</p>
              <p className="text-2xl font-bold tech-content">{data.recent_grants.length}</p>
            </div>
          </div>
          {(site.business_name_ar || site.business_name_en) && (
            <div className="rounded-lg border p-3 text-xs">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">{bi('العميل', 'Owner')}</p>
              <p className="font-medium">{isRTL ? (site.business_name_ar || site.business_name_en) : (site.business_name_en || site.business_name_ar)}</p>
            </div>
          )}
          <AdminSiteSensitiveInline siteId={site.id} />
          <AdminSiteSensitivePanel siteId={site.id} />
        </TabsContent>

        <TabsContent value="visits" className="mt-3">
          {data.recent_visits.length === 0 ? (
            <p className="p-6 text-xs text-center text-muted-foreground">{bi('لا توجد زيارات', 'No visits')}</p>
          ) : (
            <ul className="space-y-1.5">
              {data.recent_visits.map((v, i) => (
                <li key={i} className="rounded-lg border p-2.5 text-xs flex flex-wrap gap-2 items-center hover:bg-muted/30 transition-colors">
                  <span className="tech-content text-muted-foreground">{fmtDate(v.created_at, isRTL)}</span>
                  <Badge variant="outline" className="text-[10px]">{v.visit_source}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{v.action}</Badge>
                  {v.attempted_section && <span className="text-muted-foreground">→ {v.attempted_section}</span>}
                  {(v.provider_name_ar || v.provider_name_en) && (
                    <span className="ms-auto font-medium">{isRTL ? (v.provider_name_ar || v.provider_name_en) : (v.provider_name_en || v.provider_name_ar)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="grants" className="mt-3">
          {data.recent_grants.length === 0 ? (
            <p className="p-6 text-xs text-center text-muted-foreground">{bi('لا توجد طلبات', 'No grants')}</p>
          ) : (
            <ul className="space-y-1.5">
              {data.recent_grants.map((g) => (
                <li key={g.id} className="rounded-lg border p-2.5 text-xs space-y-1 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge
                      variant={g.status === 'approved' ? 'default' : g.status === 'rejected' || g.status === 'revoked' ? 'destructive' : 'outline'}
                      className="text-[10px]"
                    >
                      {g.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">{g.access_level}</Badge>
                    <span className="ms-auto tech-content text-muted-foreground">{fmtDate(g.requested_at, isRTL)}</span>
                  </div>
                  {(g.provider_name_ar || g.provider_name_en) && (
                    <p className="font-medium">{isRTL ? (g.provider_name_ar || g.provider_name_en) : (g.provider_name_en || g.provider_name_ar)}</p>
                  )}
                  {g.reason && <p className="text-muted-foreground line-clamp-2">{g.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="interests" className="mt-3">
          {data.recent_interests.length === 0 ? (
            <p className="p-6 text-xs text-center text-muted-foreground">{bi('لا توجد', 'None')}</p>
          ) : (
            <ul className="space-y-1.5">
              {data.recent_interests.map((i) => (
                <li key={i.id} className="rounded-lg border p-2.5 text-xs space-y-1 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-wrap gap-2 items-center">
                    {i.lead_ref_id && <span className="font-mono tech-content text-[10px] px-1.5 py-0.5 rounded bg-muted">{i.lead_ref_id}</span>}
                    <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                    {i.converted && <Badge className="text-[10px] bg-success text-success-foreground">{bi('تحوّل لعقد', 'Converted')}</Badge>}
                    <span className="ms-auto tech-content text-muted-foreground">{fmtDate(i.created_at, isRTL)}</span>
                  </div>
                  {i.subject && <p className="text-muted-foreground line-clamp-2">{i.subject}</p>}
                  {(i.provider_name_ar || i.provider_name_en) && (
                    <p className="font-medium">{isRTL ? (i.provider_name_ar || i.provider_name_en) : (i.provider_name_en || i.provider_name_ar)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="qr" className="mt-3">
          <AdminSiteQrManager
            siteId={site.id}
            siteRef={site.site_ref}
            visibility={site.visibility}
            qrEnabled={site.qr_enabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClientSitesMonitoring;