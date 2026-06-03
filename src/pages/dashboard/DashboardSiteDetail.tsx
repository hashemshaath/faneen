import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, MapPin, FileText, MessageSquareQuote, Inbox, Image as ImageIcon,
  Settings, Pencil, Phone, User, ImageOff, ClipboardList, Building2,
  Milestone, Activity, CheckCircle2, Clock,
} from 'lucide-react';
import SiteCoverUploader from '@/components/sites/SiteCoverUploader';
import SiteGalleryManager, { type GalleryImage } from '@/components/sites/SiteGalleryManager';
import SiteContactsTab from '@/components/sites/SiteContactsTab';
import SiteReportsTab from '@/components/sites/SiteReportsTab';
import SiteSettingsTab from '@/components/sites/SiteSettingsTab';
import { Users, AlertTriangle } from 'lucide-react';

type Json = Record<string, unknown>;

interface SiteRow {
  id: string;
  site_ref: string | null;
  ref_id: string | null;
  label: string;
  site_name: string | null;
  site_type: string | null;
  visibility: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  city_name: string | null;
  district: string | null;
  address_line1: string | null;
  short_address: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  cover_image_url: string | null;
  gallery_images: GalleryImage[] | null;
  qr_enabled: boolean | null;
  owner_user_id: string | null;
  client_user_id: string | null;
  business_id: string | null;
  created_at: string;
}

const SITE_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  villa: { ar: 'فيلا', en: 'Villa' },
  apartment: { ar: 'شقة', en: 'Apartment' },
  office: { ar: 'مكتب', en: 'Office' },
  showroom: { ar: 'صالة عرض', en: 'Showroom' },
  branch: { ar: 'فرع', en: 'Branch' },
  warehouse: { ar: 'مستودع', en: 'Warehouse' },
  project: { ar: 'مشروع', en: 'Project' },
  commercial: { ar: 'تجاري', en: 'Commercial' },
  other: { ar: 'أخرى', en: 'Other' },
};

const DashboardSiteDetail: React.FC = () => {
  useNoIndex();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [localGallery, setLocalGallery] = useState<GalleryImage[] | null>(null);
  const [localCover, setLocalCover] = useState<string | null | undefined>(undefined);

  const { data: site, isLoading, error, refetch } = useQuery({
    queryKey: ['client-site', id],
    enabled: !!id && !!user,
    queryFn: async (): Promise<SiteRow | null> => {
      const { data, error } = await supabase
        .from('client_sites')
        .select(`id, site_ref, ref_id, label, site_name, site_type, visibility,
                 contact_name, contact_phone, city_name, district, address_line1,
                 short_address, latitude, longitude, access_notes,
                 cover_image_url, gallery_images, qr_enabled,
                 owner_user_id, client_user_id, business_id, created_at`)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SiteRow | null;
    },
  });

  const cover = localCover === undefined ? site?.cover_image_url ?? null : localCover;
  const gallery: GalleryImage[] = useMemo(() => {
    const src = localGallery ?? site?.gallery_images ?? [];
    return Array.isArray(src) ? (src as GalleryImage[]) : [];
  }, [localGallery, site?.gallery_images]);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['site-contracts', id],
    enabled: !!id && !!site,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at, provider_id')
        .eq('execution_site_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['site-leads', id],
    enabled: !!id && !!site,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_requests')
        .select('id, ref_id, status, created_at, business_id')
        .eq('source_site_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ['site-rfqs', id],
    enabled: !!id && !!site,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_requests')
        .select('id, ref_id, status, created_at')
        .eq('site_id', id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['site-milestones', id, contracts.length],
    enabled: !!id && !!site && contracts.length > 0,
    queryFn: async () => {
      const ids = contracts.map((c) => c.id);
      const { data, error } = await supabase
        .from('contract_milestones')
        .select('id, contract_id, title_ar, title_en, amount, status, due_date, completed_at, sort_order')
        .in('contract_id', ids)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery({
    queryKey: ['site-timeline', id],
    enabled: !!id && !!site,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_site_timeline', { _site_id: id, _limit: 100 });
      if (error) throw error;
      return (data ?? []) as Array<{
        event_type: string; event_id: string; ref_id: string | null;
        title: string | null; status: string | null; amount: number | null;
        currency: string | null; occurred_at: string;
      }>;
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !site) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="mb-4 text-muted-foreground">{isRTL ? 'الموقع غير موجود أو ليس لديك صلاحية الوصول.' : 'Site not found or access denied.'}</p>
          <Button variant="secondary" onClick={() => navigate('/dashboard/sites')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="mx-2">{isRTL ? 'العودة للمواقع' : 'Back to sites'}</span>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const typeLabel = SITE_TYPE_LABELS[site.site_type ?? 'other'];
  const displayName = site.site_name || site.label || (isRTL ? 'موقع بدون اسم' : 'Unnamed site');
  const canManage = user?.id === site.owner_user_id || user?.id === site.client_user_id;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Back nav */}
        <Link to="/dashboard/sites" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="mx-1">{isRTL ? 'كل المواقع' : 'All sites'}</span>
        </Link>

        {/* Cover hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
          <div className="relative aspect-[16/7] w-full bg-gradient-to-br from-muted via-muted/60 to-muted/30">
            {cover ? (
              <img src={cover} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="h-10 w-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            {canManage && (
              <div className="absolute end-4 top-4">
                <SiteCoverUploader siteId={site.id} currentUrl={cover} onUploaded={(u) => setLocalCover(u)} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 text-white">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs opacity-90">
                    {site.site_ref && <span className="tech-content rounded-md bg-white/20 px-2 py-0.5 font-mono">{site.site_ref}</span>}
                    {typeLabel && <Badge variant="secondary" className="bg-white/20 text-white border-0">{isRTL ? typeLabel.ar : typeLabel.en}</Badge>}
                  </div>
                  <h1 className="mt-2 text-2xl md:text-3xl font-bold">{displayName}</h1>
                  {(site.city_name || site.district) && (
                    <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
                      <MapPin className="h-3.5 w-3.5" />
                      {[site.district, site.city_name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/dashboard/sites?edit=${site.id}`)} className="hover-lift">
                    <Pencil className="h-4 w-4" />
                    <span className="mx-2">{isRTL ? 'تعديل' : 'Edit'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={FileText} label={isRTL ? 'العقود' : 'Contracts'} value={contracts.length} loading={contractsLoading} />
          <KpiCard icon={MessageSquareQuote} label={isRTL ? 'عروض الأسعار' : 'Quotes'} value={leads.length} loading={leadsLoading} />
          <KpiCard icon={Inbox} label={isRTL ? 'طلبات RFQ' : 'RFQs'} value={rfqs.length} loading={rfqsLoading} />
          <KpiCard icon={ImageIcon} label={isRTL ? 'صور المعرض' : 'Gallery'} value={gallery.length} loading={false} />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full overflow-x-auto no-scrollbar justify-start">
            <TabsTrigger value="overview"><ClipboardList className="h-4 w-4" /><span className="mx-2">{isRTL ? 'نظرة عامة' : 'Overview'}</span></TabsTrigger>
            <TabsTrigger value="contracts"><FileText className="h-4 w-4" /><span className="mx-2">{isRTL ? 'العقود' : 'Contracts'}</span></TabsTrigger>
            <TabsTrigger value="quotes"><MessageSquareQuote className="h-4 w-4" /><span className="mx-2">{isRTL ? 'العروض' : 'Quotes'}</span></TabsTrigger>
            <TabsTrigger value="rfq"><Inbox className="h-4 w-4" /><span className="mx-2">RFQ</span></TabsTrigger>
            <TabsTrigger value="milestones"><Milestone className="h-4 w-4" /><span className="mx-2">{isRTL ? 'المراحل' : 'Milestones'}</span></TabsTrigger>
            <TabsTrigger value="timeline"><Activity className="h-4 w-4" /><span className="mx-2">{isRTL ? 'السجل' : 'Timeline'}</span></TabsTrigger>
            <TabsTrigger value="gallery"><ImageIcon className="h-4 w-4" /><span className="mx-2">{isRTL ? 'المعرض' : 'Gallery'}</span></TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4" /><span className="mx-2">{isRTL ? 'الإعدادات' : 'Settings'}</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card><CardContent className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" />{isRTL ? 'جهة الاتصال' : 'Contact'}</h3>
                <InfoRow label={isRTL ? 'الاسم' : 'Name'} value={site.contact_name} />
                <InfoRow label={isRTL ? 'الهاتف' : 'Phone'} value={site.contact_phone} mono />
              </CardContent></Card>
              <Card><CardContent className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{isRTL ? 'العنوان' : 'Address'}</h3>
                <InfoRow label={isRTL ? 'المدينة' : 'City'} value={site.city_name} />
                <InfoRow label={isRTL ? 'الحي' : 'District'} value={site.district} />
                <InfoRow label={isRTL ? 'السطر' : 'Line'} value={site.address_line1} />
                {site.short_address && <InfoRow label={isRTL ? 'العنوان الوطني' : 'NAF'} value={site.short_address} mono />}
              </CardContent></Card>
              {site.access_notes && (
                <Card className="md:col-span-2"><CardContent className="p-5">
                  <h3 className="font-semibold mb-2">{isRTL ? 'ملاحظات الوصول' : 'Access notes'}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{site.access_notes}</p>
                </CardContent></Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <ListSection
              loading={contractsLoading}
              empty={isRTL ? 'لا توجد عقود مرتبطة بهذا الموقع.' : 'No contracts linked to this site yet.'}
              items={contracts.map((c) => ({
                key: c.id,
                href: `/dashboard/contracts/${c.id}`,
                title: (isRTL ? c.title_ar : c.title_en) || c.contract_number || c.id,
                ref: c.contract_number,
                status: c.status,
                meta: c.total_amount ? `${c.total_amount} ${c.currency_code ?? ''}` : null,
                date: c.created_at,
              }))}
              isRTL={isRTL}
              cta={canManage ? {
                label: isRTL ? 'إنشاء عقد لهذا الموقع' : 'Create contract for this site',
                onClick: () => navigate(`/dashboard/contracts/new?site_id=${site.id}`),
              } : undefined}
            />
          </TabsContent>

          <TabsContent value="quotes" className="mt-4">
            <ListSection
              loading={leadsLoading}
              empty={isRTL ? 'لا توجد عروض أسعار مرتبطة بالموقع.' : 'No quote requests for this site.'}
              items={leads.map((l) => ({
                key: l.id,
                href: `/dashboard/leads/${l.id}`,
                title: l.ref_id || l.id,
                ref: l.ref_id,
                status: l.status,
                meta: null,
                date: l.created_at,
              }))}
              isRTL={isRTL}
            />
          </TabsContent>

          <TabsContent value="rfq" className="mt-4">
            <ListSection
              loading={rfqsLoading}
              empty={isRTL ? 'لا توجد طلبات RFQ لهذا الموقع.' : 'No RFQs for this site.'}
              items={rfqs.map((r) => ({
                key: r.id,
                href: `/dashboard/rfq/${r.id}`,
                title: r.ref_id || r.id,
                ref: r.ref_id,
                status: r.status,
                meta: null,
                date: r.created_at,
              }))}
              isRTL={isRTL}
            />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            {/* gallery */}
            <Card><CardContent className="p-5">
              {canManage ? (
                <SiteGalleryManager siteId={site.id} images={gallery} onChange={(imgs) => { setLocalGallery(imgs); refetch(); }} />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {gallery.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">{isRTL ? 'لا توجد صور' : 'No images'}</p>}
                  {gallery.map((img) => (
                    <div key={img.url} className="aspect-square overflow-hidden rounded-xl border bg-muted">
                      <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="milestones" className="mt-4">
            <Card><CardContent className="p-5">
              {milestonesLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : milestones.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد مراحل تنفيذية لعقود هذا الموقع.' : 'No milestones across this site\u2019s contracts.'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {milestones.map((m) => {
                    const done = m.status === 'completed' || !!m.completed_at;
                    return (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 hover-lift">
                        {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <Clock className="h-5 w-5 text-muted-foreground shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{(isRTL ? m.title_ar : m.title_en) || m.title_ar}</div>
                          <div className="text-xs text-muted-foreground tech-content">
                            {m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}
                            {m.amount ? ` · ${Number(m.amount).toLocaleString()}` : ''}
                          </div>
                        </div>
                        <Badge variant={done ? 'default' : 'secondary'} className="shrink-0">{m.status}</Badge>
                        <Link to={`/dashboard/contracts/${m.contract_id}`} className="text-xs text-primary hover:underline shrink-0">
                          {isRTL ? 'العقد' : 'Contract'}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card><CardContent className="p-5">
              {timelineLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : timeline.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد أحداث بعد.' : 'No events yet.'}
                </div>
              ) : (
                <ol className="relative space-y-3 ps-4 border-s border-border/40">
                  {timeline.map((e) => (
                    <li key={`${e.event_type}-${e.event_id}`} className="relative">
                      <span className="absolute -start-[21px] top-2 h-3 w-3 rounded-full bg-primary" />
                      <div className="rounded-xl border border-border/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px] uppercase">{e.event_type}</Badge>
                          <span className="text-xs text-muted-foreground tech-content">
                            {new Date(e.occurred_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-medium truncate">{e.title || e.ref_id || e.event_id}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.status}{e.amount ? ` · ${Number(e.amount).toLocaleString()} ${e.currency ?? ''}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card><CardContent className="p-5 text-sm text-muted-foreground">
              {isRTL ? 'إعدادات الظهور و QR متاحة من قائمة المواقع. سيتم نقلها هنا قريباً.' : 'Visibility & QR settings live in the sites list. Will move here soon.'}
              <div className="mt-3"><Button size="sm" variant="secondary" onClick={() => navigate('/dashboard/sites')}>{isRTL ? 'فتح القائمة' : 'Open list'}</Button></div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

/* ----- helpers ----- */

const InfoRow: React.FC<{ label: string; value: string | null | undefined; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={mono ? 'tech-content font-medium' : 'font-medium'}>{value || '—'}</span>
  </div>
);

const KpiCard: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: number; loading: boolean }> = ({ icon: Icon, label, value, loading }) => (
  <Card className="hover-lift"><CardContent className="p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="mt-2 text-2xl font-bold tech-content">{loading ? '—' : value}</div>
  </CardContent></Card>
);

interface ListItem { key: string; href: string; title: string; ref: string | null; status: string | null; meta: string | null; date: string }
const ListSection: React.FC<{
  loading: boolean; empty: string; items: ListItem[]; isRTL: boolean;
  cta?: { label: string; onClick: () => void };
}> = ({ loading, empty, items, isRTL, cta }) => (
  <Card><CardContent className="p-5 space-y-3">
    {cta && (
      <div className="flex justify-end">
        <Button size="sm" onClick={cta.onClick} className="hover-lift">{cta.label}</Button>
      </div>
    )}
    {loading ? (
      <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
    ) : items.length === 0 ? (
      <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>
    ) : (
      <ul className="divide-y divide-border/40">
        {items.map((it) => (
          <li key={it.key}>
            <Link to={it.href} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 rounded-lg px-2 -mx-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {it.ref && <span className="tech-content text-xs font-mono text-muted-foreground">{it.ref}</span>}
                  {it.status && <Badge variant="outline" className="text-xs">{it.status}</Badge>}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{it.title}</p>
              </div>
              <div className="text-end text-xs text-muted-foreground">
                {it.meta && <div className="tech-content font-medium">{it.meta}</div>}
                <div>{new Date(it.date).toLocaleDateString(isRTL ? 'ar' : 'en')}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </CardContent></Card>
);

export default DashboardSiteDetail;