import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Calendar, Eye, QrCode, X } from 'lucide-react';
import AdminSiteSensitiveInline from '@/components/admin/client-sites/AdminSiteSensitiveInline';
import AdminSiteSensitivePanel from '@/components/admin/client-sites/AdminSiteSensitivePanel';
import AdminSiteQrManager from '@/components/admin/client-sites/AdminSiteQrManager';
import AdminClientBusinessCard from '@/components/admin/client-sites/AdminClientBusinessCard';
import {
  formatDate, getQrStatus, type SiteDetail,
} from '@/lib/client-sites/admin-client-site-monitoring';

type Bi = (ar: string, en: string) => string;

interface Props {
  data: SiteDetail;
  bi: Bi;
  isRTL: boolean;
  onClose: () => void;
}

const AdminClientSiteInlineDetail: React.FC<Props> = ({ data, bi, isRTL, onClose }) => {
  if (!data.site) return null;
  const site = data.site;
  const qr = getQrStatus({ qr_enabled: site.qr_enabled, qr_revoked_at: site.qr_revoked_at });

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
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8" aria-label={bi('إغلاق', 'Close')}>
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
          <AdminClientBusinessCard
            businessId={site.business_id}
            fallbackNameAr={site.business_name_ar}
            fallbackNameEn={site.business_name_en}
            contractsTotal={data.related_contracts.total}
            contractsActive={data.related_contracts.active}
            bi={bi}
            isRTL={isRTL}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile
              icon={<Activity className="h-4 w-4" />}
              label={bi('المسحات', 'Scans')}
              value={site.scan_count}
              hint={site.last_scanned_at ? formatDate(site.last_scanned_at, isRTL) : bi('لا توجد', 'None')}
              tone="text-info"
            />
            <MetricTile
              icon={<Eye className="h-4 w-4" />}
              label={bi('طلبات وصول', 'Grants')}
              value={data.recent_grants.length}
              tone="text-primary"
            />
            <MetricTile
              icon={<QrCode className="h-4 w-4" />}
              label="QR"
              value={qr === 'enabled' ? bi('مفعّل', 'On') : qr === 'revoked' ? bi('ملغى', 'Revoked') : bi('معطّل', 'Off')}
              tone={qr === 'enabled' ? 'text-success' : qr === 'revoked' ? 'text-destructive' : 'text-muted-foreground'}
            />
            <MetricTile
              icon={<Calendar className="h-4 w-4" />}
              label={bi('أُنشئ', 'Created')}
              value={formatDate(site.created_at, isRTL)}
              tone="text-muted-foreground"
              valueClass="text-xs font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="secondary">{bi('الرؤية', 'Visibility')}: {site.visibility}</Badge>
            {site.archived_at && (
              <Badge variant="outline">{bi('مؤرشف منذ', 'Archived')}: {formatDate(site.archived_at, isRTL)}</Badge>
            )}
            {data.related_contracts.last_created_at && (
              <Badge variant="outline">{bi('آخر عقد', 'Last contract')}: {formatDate(data.related_contracts.last_created_at, isRTL)}</Badge>
            )}
          </div>

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
                  <span className="tech-content text-muted-foreground">{formatDate(v.created_at, isRTL)}</span>
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
                    <span className="ms-auto tech-content text-muted-foreground">{formatDate(g.requested_at, isRTL)}</span>
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
                    <span className="ms-auto tech-content text-muted-foreground">{formatDate(i.created_at, isRTL)}</span>
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

export default AdminClientSiteInlineDetail;