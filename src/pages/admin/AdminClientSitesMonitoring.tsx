import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Activity, MapPin, QrCode, RefreshCw, Search, AlertTriangle, ExternalLink, Eye } from 'lucide-react';
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

const StatCard: React.FC<{ label: string; value: number | string; icon?: React.ReactNode; tone?: string }> = ({
  label, value, icon, tone = 'text-primary',
}) => (
  <Card className="hover-lift">
    <CardContent className="p-4 flex items-center gap-3">
      {icon && <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${tone}`}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tech-content">{value}</p>
      </div>
    </CardContent>
  </Card>
);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              {bi('مراقبة المواقع', 'Site Monitoring')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bi(
                'لوحة مراقبة إدارية فقط للمواقع، رموز QR، الزيارات، طلبات الوصول، اهتمامات المزودين والعقود.',
                'Admin-only monitoring for sites, QR usage, visits, access requests, provider interests and contracts.',
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { summaryQ.refetch(); listQ.refetch(); }}>
            <RefreshCw className="h-4 w-4 me-2" />
            {bi('تحديث', 'Refresh')}
          </Button>
        </div>

        {/* Privacy note */}
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p>
              {bi(
                'تُعرض البيانات الحساسة (العنوان الكامل، الهاتف، الإحداثيات) داخل بطاقة كل موقع لأغراض المتابعة الإدارية، ويُسجَّل كل كشف في سجل التدقيق. رموز QR الخام لا يمكن استرجاعها بعد الإصدار — استخدم زر «تدوير» في لوحة المالك للحصول على رمز جديد.',
                'Sensitive data (full address, phone, coordinates) is shown inline per site for operational monitoring; every reveal is written to the audit log. Raw QR tokens cannot be retrieved after issuance — use Rotate in the owner panel to obtain a new one.',
              )}
            </p>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {summaryQ.isLoading ? (
            Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : s ? (
            <>
              <StatCard label={bi('إجمالي المواقع', 'Total sites')} value={s.total_sites} icon={<MapPin className="h-4 w-4" />} />
              <StatCard label={bi('مواقع نشطة', 'Active sites')} value={s.active_sites} icon={<Activity className="h-4 w-4" />} tone="text-success" />
              <StatCard label={bi('مواقع مؤرشفة', 'Archived')} value={s.archived_sites} icon={<MapPin className="h-4 w-4" />} tone="text-muted-foreground" />
              <StatCard label={bi('QR مفعّل', 'QR enabled')} value={s.qr_enabled_sites} icon={<QrCode className="h-4 w-4" />} tone="text-primary" />
              <StatCard label={bi('QR ملغى/معطّل', 'QR revoked/disabled')} value={s.qr_revoked_sites + s.qr_disabled_sites} icon={<QrCode className="h-4 w-4" />} tone="text-destructive" />
              <StatCard label={bi('مشاركة عبر QR', 'Shared by QR')} value={s.shared_by_qr_sites} icon={<QrCode className="h-4 w-4" />} />
              <StatCard label={bi('إجمالي المسحات', 'Total scans')} value={s.total_scans} icon={<Activity className="h-4 w-4" />} />
              <StatCard label={bi('مسحات 7 أيام', 'Visits 7d')} value={s.visits_last_7d} icon={<Activity className="h-4 w-4" />} />
              <StatCard label={bi('مواقع بطلبات وصول', 'Sites w/ requests')} value={s.sites_with_access_requests} icon={<Eye className="h-4 w-4" />} />
              <StatCard label={bi('طلبات معلّقة', 'Pending requests')} value={s.pending_access_requests} icon={<Eye className="h-4 w-4" />} tone="text-warning" />
              <StatCard label={bi('موافقات وصول', 'Approved grants')} value={s.approved_access_grants} icon={<Eye className="h-4 w-4" />} tone="text-success" />
              <StatCard label={bi('اهتمامات مزودين', 'Provider interests')} value={s.provider_interests} icon={<Activity className="h-4 w-4" />} />
              <StatCard label={bi('مواقع مرتبطة بعقود', 'Sites in contracts')} value={s.sites_linked_to_contracts} icon={<Activity className="h-4 w-4" />} />
            </>
          ) : null}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </Card>

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {bi('المواقع', 'Sites')} {listQ.data ? `(${listQ.data.total})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {listQ.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : listQ.error ? (
              <p className="p-6 text-sm text-destructive">{(listQ.error as Error).message}</p>
            ) : rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {bi('لا توجد مواقع مطابقة لعوامل التصفية.', 'No sites match the current filters.')}
              </p>
            ) : (
              <div className="divide-y">
                {rows.map((r) => {
                  const qr = qrStatusOf(r);
                  return (
                    <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted tech-content">{r.site_ref}</span>
                          <CopyButton value={r.site_ref} label={bi('معرّف الموقع', 'Site ref')} />
                          <span className="font-medium truncate">{r.site_name || r.label}</span>
                          {r.archived_at && (
                            <Badge variant="outline" className="text-xs">{bi('مؤرشف', 'Archived')}</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                          <span>{r.site_type}</span>
                          {r.city_name && <span>{r.city_name}</span>}
                          {(r.business_name_ar || r.business_name_en) && (
                            <span>· {isRTL ? (r.business_name_ar || r.business_name_en) : (r.business_name_en || r.business_name_ar)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">{r.visibility}</Badge>
                        <Badge
                          variant={qr === 'enabled' ? 'default' : qr === 'revoked' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          QR: {qr === 'enabled' ? bi('مفعّل', 'on') : qr === 'revoked' ? bi('ملغى', 'revoked') : bi('معطّل', 'off')}
                        </Badge>
                        <Badge variant="outline" className="text-xs tech-content">
                          {bi('مسحات', 'scans')}: {r.scan_count}
                        </Badge>
                        {r.pending_requests_count > 0 && (
                          <Badge variant="default" className="text-xs tech-content">
                            {bi('معلّقة', 'pending')}: {r.pending_requests_count}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs tech-content">
                          {bi('اهتمامات', 'interests')}: {r.provider_interests_count}
                        </Badge>
                        <Badge variant="outline" className="text-xs tech-content">
                          {bi('عقود', 'contracts')}: {r.contracts_count}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground tech-content min-w-[120px] text-end">
                        {fmtDate(r.latest_activity_at, isRTL)}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>
                          <Eye className="h-4 w-4 me-1" /> {bi('تفاصيل', 'Detail')}
                        </Button>
                        {qr === 'enabled' && r.visibility === 'public_limited' && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/s/scan-from-admin`} onClick={(e) => e.preventDefault()} title={bi('صفحة عامة تتطلب الرمز', 'Public page requires token')}>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail drawer */}
        <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{bi('تفاصيل الموقع', 'Site detail')}</SheetTitle>
            </SheetHeader>
            {detailQ.isLoading ? (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            ) : detailQ.data?.site ? (
              <div className="mt-4 space-y-5 text-sm">
                <div className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted tech-content">{detailQ.data.site.site_ref}</span>
                    <span className="font-semibold">{detailQ.data.site.site_name || detailQ.data.site.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {detailQ.data.site.site_type}
                    {detailQ.data.site.city_name ? ` · ${detailQ.data.site.city_name}` : ''}
                    {detailQ.data.site.district ? ` · ${detailQ.data.site.district}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-xs">{detailQ.data.site.visibility}</Badge>
                    <Badge
                      variant={detailQ.data.site.qr_revoked ? 'destructive' : detailQ.data.site.qr_enabled ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      QR: {detailQ.data.site.qr_revoked ? bi('ملغى', 'revoked') : detailQ.data.site.qr_enabled ? bi('مفعّل', 'on') : bi('معطّل', 'off')}
                    </Badge>
                    <Badge variant="outline" className="text-xs tech-content">{bi('مسحات', 'scans')}: {detailQ.data.site.scan_count}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground tech-content">
                    {bi('آخر مسح', 'Last scan')}: {fmtDate(detailQ.data.site.last_scanned_at, isRTL)}
                  </p>
                </div>

                <section>
                  <h3 className="text-sm font-semibold mb-2">{bi('سجل الزيارات', 'Recent visits')}</h3>
                  {detailQ.data.recent_visits.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{bi('لا توجد زيارات', 'No visits')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detailQ.data.recent_visits.map((v, i) => (
                        <li key={i} className="rounded border p-2 text-xs flex flex-wrap gap-2">
                          <span className="tech-content text-muted-foreground">{fmtDate(v.created_at, isRTL)}</span>
                          <Badge variant="outline" className="text-xs">{v.visit_source}</Badge>
                          <Badge variant="secondary" className="text-xs">{v.action}</Badge>
                          {v.attempted_section && <span className="text-muted-foreground">→ {v.attempted_section}</span>}
                          {(v.provider_name_ar || v.provider_name_en) && (
                            <span className="ms-auto">{isRTL ? (v.provider_name_ar || v.provider_name_en) : (v.provider_name_en || v.provider_name_ar)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2">{bi('طلبات الوصول', 'Access grants')}</h3>
                  {detailQ.data.recent_grants.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{bi('لا توجد طلبات', 'No grants')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detailQ.data.recent_grants.map((g) => (
                        <li key={g.id} className="rounded border p-2 text-xs space-y-1">
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="outline" className="text-xs">{g.status}</Badge>
                            <Badge variant="secondary" className="text-xs">{g.access_level}</Badge>
                            <span className="ms-auto tech-content text-muted-foreground">{fmtDate(g.requested_at, isRTL)}</span>
                          </div>
                          {(g.provider_name_ar || g.provider_name_en) && (
                            <p className="text-foreground">{isRTL ? (g.provider_name_ar || g.provider_name_en) : (g.provider_name_en || g.provider_name_ar)}</p>
                          )}
                          {g.reason && <p className="text-muted-foreground line-clamp-2">{g.reason}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2">{bi('اهتمامات المزودين', 'Provider interests')}</h3>
                  {detailQ.data.recent_interests.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{bi('لا توجد', 'None')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detailQ.data.recent_interests.map((i) => (
                        <li key={i.id} className="rounded border p-2 text-xs space-y-1">
                          <div className="flex flex-wrap gap-2 items-center">
                            {i.lead_ref_id && <span className="font-mono tech-content">{i.lead_ref_id}</span>}
                            <Badge variant="outline" className="text-xs">{i.status}</Badge>
                            {i.converted && <Badge variant="default" className="text-xs">{bi('تحوّل إلى عقد', 'Converted')}</Badge>}
                            <span className="ms-auto tech-content text-muted-foreground">{fmtDate(i.created_at, isRTL)}</span>
                          </div>
                          {i.subject && <p className="text-muted-foreground line-clamp-2">{i.subject}</p>}
                          {(i.provider_name_ar || i.provider_name_en) && (
                            <p className="text-foreground">{isRTL ? (i.provider_name_ar || i.provider_name_en) : (i.provider_name_en || i.provider_name_ar)}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2">{bi('العقود المرتبطة', 'Related contracts')}</h3>
                  <div className="rounded border p-3 text-xs space-y-1 tech-content">
                    <p>{bi('الإجمالي', 'Total')}: {detailQ.data.related_contracts.total}</p>
                    <p>{bi('نشطة', 'Active')}: {detailQ.data.related_contracts.active}</p>
                    <p>{bi('آخر إنشاء', 'Last created')}: {fmtDate(detailQ.data.related_contracts.last_created_at, isRTL)}</p>
                  </div>
                </section>

                <AdminSiteSensitiveInline siteId={detailQ.data.site.id} />

                <AdminSiteSensitivePanel siteId={detailQ.data.site.id} />
              </div>
            ) : detailQ.error ? (
              <p className="mt-4 text-sm text-destructive">{(detailQ.error as Error).message}</p>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default AdminClientSitesMonitoring;