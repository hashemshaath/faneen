import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, AlertTriangle, Eye, FileText, MapPin, QrCode,
  ShieldCheck, TrendingUp, Users, X,
} from 'lucide-react';
import type { MonitoringSummary } from '@/lib/client-sites/admin-client-site-monitoring';

type Bi = (ar: string, en: string) => string;

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

interface Props {
  summary: MonitoringSummary | undefined;
  isLoading: boolean;
  bi: Bi;
}

const AdminClientSitesKpiGrid: React.FC<Props> = ({ summary: s, isLoading, bi }) => {
  return (
    <Tabs defaultValue="sites" className="w-full">
      <TabsList className="h-auto flex-wrap justify-start">
        <TabsTrigger value="sites" className="gap-1.5"><MapPin className="h-4 w-4" />{bi('المواقع', 'Sites')}</TabsTrigger>
        <TabsTrigger value="qr" className="gap-1.5" aria-label="QR"><QrCode className="h-4 w-4" />QR</TabsTrigger>
        <TabsTrigger value="access" className="gap-1.5"><Eye className="h-4 w-4" />{bi('الوصول', 'Access')}</TabsTrigger>
        <TabsTrigger value="engagement" className="gap-1.5"><TrendingUp className="h-4 w-4" />{bi('التفاعل', 'Engagement')}</TabsTrigger>
      </TabsList>

      {isLoading ? (
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
  );
};

export default AdminClientSitesKpiGrid;