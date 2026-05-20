import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, AlertTriangle, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
  Building2, FileText, MapPin, Rows2, Rows3, Users,
} from 'lucide-react';
import AdminClientSiteInlineDetail from './AdminClientSiteInlineDetail';
import {
  formatDate, getQrStatus, iconForSiteType, SORT_OPTIONS,
  type Density, type MonitoringList, type MonitoringRow, type SiteDetail, type SortKey,
} from '@/lib/client-sites/admin-client-site-monitoring';
import type { UseQueryResult } from '@tanstack/react-query';

type Bi = (ar: string, en: string) => string;

export interface BusinessLogoLite {
  logo_url: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
}

interface Props {
  bi: Bi;
  isRTL: boolean;
  rows: MonitoringRow[];
  listQ: UseQueryResult<MonitoringList, Error>;
  detailQ: UseQueryResult<SiteDetail, Error>;
  businessLogos: Map<string, BusinessLogoLite>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  sortBy: SortKey;
  setSortBy: (k: SortKey) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  density: Density;
  setDensity: (d: Density) => void;
  hasActiveFilters: boolean;
  onResetAll: () => void;
}

const AdminClientSitesTable: React.FC<Props> = ({
  bi, isRTL, rows, listQ, detailQ, businessLogos, selectedId, setSelectedId,
  sortBy, setSortBy, pageSize, setPageSize, page, setPage,
  density, setDensity, hasActiveFilters, onResetAll,
}) => {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 flex flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          {bi('المواقع', 'Sites')}
          {listQ.data && (
            <Badge variant="secondary" className="tech-content">{listQ.data.total}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[180px] text-xs" aria-label={bi('ترتيب', 'Sort')}>
              <ArrowUpDown className="h-3.5 w-3.5 me-1" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.key} value={o.key} className="text-xs">{bi(o.ar, o.en)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-9 w-[90px] text-xs" aria-label={bi('حجم الصفحة', 'Page size')}><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n} / {bi('صفحة', 'page')}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-md border overflow-hidden" role="group" aria-label={bi('كثافة العرض', 'Density')}>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`h-9 px-2 ${density === 'comfortable' ? 'bg-muted' : 'bg-background hover:bg-muted/50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              aria-pressed={density === 'comfortable'}
              aria-label={bi('عرض مريح', 'Comfortable')}
              title={bi('عرض مريح', 'Comfortable')}
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`h-9 px-2 border-s ${density === 'compact' ? 'bg-muted' : 'bg-background hover:bg-muted/50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              aria-pressed={density === 'compact'}
              aria-label={bi('عرض مدمج', 'Compact')}
              title={bi('عرض مدمج', 'Compact')}
            >
              <Rows2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {listQ.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : listQ.error ? (
          <p className="p-6 text-sm text-destructive" role="alert">{(listQ.error as Error).message}</p>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <MapPin className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">{bi('لا توجد نتائج', 'No results')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {bi('لا توجد مواقع مطابقة لعوامل التصفية.', 'No sites match the current filters.')}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onResetAll}>
                {bi('إعادة ضبط', 'Reset filters')}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((r) => {
              const qr = getQrStatus(r);
              const isOpen = selectedId === r.id;
              return (
                <div key={r.id} className={isOpen ? 'bg-muted/30' : ''}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(isOpen ? null : r.id)}
                    aria-expanded={isOpen}
                    aria-label={`${r.site_ref} ${r.site_name || r.label}`}
                    className={`w-full text-start ${density === 'compact' ? 'p-2.5' : 'p-4'} flex flex-wrap items-center gap-3 hover:bg-muted/40 transition-colors focus:outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${qr === 'enabled' ? 'bg-primary/10 text-primary' : qr === 'revoked' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                      {iconForSiteType(r.site_type)}
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
                        <span className="ms-auto tech-content hidden sm:inline">{formatDate(r.latest_activity_at, isRTL)}</span>
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
                      <Badge variant="outline" className="text-[10px] tech-content gap-1" title={bi('عدد المسحات', 'Scan count')}>
                        <Activity className="h-3 w-3" aria-hidden /> {r.scan_count}
                      </Badge>
                      {r.pending_requests_count > 0 && (
                        <Badge className="text-[10px] tech-content gap-1 bg-warning text-warning-foreground" title={bi('طلبات معلّقة', 'Pending requests')}>
                          <AlertTriangle className="h-3 w-3" aria-hidden /> {r.pending_requests_count}
                        </Badge>
                      )}
                      {r.provider_interests_count > 0 && (
                        <Badge variant="outline" className="text-[10px] tech-content gap-1" title={bi('اهتمامات المزودين', 'Provider interests')}>
                          <Users className="h-3 w-3" aria-hidden /> {r.provider_interests_count}
                        </Badge>
                      )}
                      {r.contracts_count > 0 && (
                        <Badge variant="outline" className="text-[10px] tech-content gap-1" title={bi('العقود', 'Contracts')}>
                          <FileText className="h-3 w-3" aria-hidden /> {r.contracts_count}
                        </Badge>
                      )}
                    </div>

                    <span onClick={(e) => e.stopPropagation()} className="hidden md:flex items-center">
                      <CopyButton value={r.site_ref} label={bi('معرّف الموقع', 'Site ref')} />
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/60 bg-background p-4 sm:p-5">
                      {detailQ.isLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-24 rounded-lg" />
                          <Skeleton className="h-32 rounded-lg" />
                        </div>
                      ) : detailQ.error ? (
                        <p className="text-sm text-destructive" role="alert">{(detailQ.error as Error).message}</p>
                      ) : detailQ.data?.site ? (
                        <AdminClientSiteInlineDetail
                          data={detailQ.data}
                          bi={bi}
                          isRTL={isRTL}
                          onClose={() => setSelectedId(null)}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      {listQ.data && listQ.data.total > pageSize && (
        <div className="flex items-center justify-between gap-2 p-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground tech-content">
            {bi('عرض', 'Showing')} {page * pageSize + 1}–{Math.min((page + 1) * pageSize, listQ.data.total)} {bi('من', 'of')} {listQ.data.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              disabled={page === 0 || listQ.isFetching}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              aria-label={bi('السابق', 'Previous')}
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className="ms-1">{bi('السابق', 'Prev')}</span>
            </Button>
            <span className="text-xs px-2 tech-content" aria-live="polite">
              {page + 1} / {Math.max(1, Math.ceil(listQ.data.total / pageSize))}
            </span>
            <Button
              variant="outline" size="sm"
              disabled={(page + 1) * pageSize >= listQ.data.total || listQ.isFetching}
              onClick={() => setPage(p => p + 1)}
              aria-label={bi('التالي', 'Next')}
            >
              <span className="me-1">{bi('التالي', 'Next')}</span>
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdminClientSitesTable;