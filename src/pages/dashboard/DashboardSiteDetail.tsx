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
  Milestone, Activity, CheckCircle2, Clock, Plus, Search as SearchIcon,
  Send, Copy, Check, TrendingUp, CircleDollarSign,
} from 'lucide-react';
import SiteCoverUploader from '@/components/sites/SiteCoverUploader';
import SiteGalleryManager, { type GalleryImage } from '@/components/sites/SiteGalleryManager';
import SiteContactsTab from '@/components/sites/SiteContactsTab';
import SiteReportsTab from '@/components/sites/SiteReportsTab';
import SiteSettingsTab from '@/components/sites/SiteSettingsTab';
import SiteField from '@/components/sites/SiteField';
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
  const [refCopied, setRefCopied] = useState(false);

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

  const { data: contactsRaw = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['site-contacts-min', id],
    enabled: !!id && !!site,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_contacts')
        .select('id, full_name, role_code')
        .eq('site_id', id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reportsCount = 0 } = useQuery({
    queryKey: ['site-reports-count', id],
    enabled: !!id && !!site,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('site_reports').select('id', { count: 'exact', head: true })
        .eq('site_id', id).in('status', ['open', 'in_progress']);
      if (error) return 0;
      return count ?? 0;
    },
  });

  const contractsForRef = useMemo(
    () => contracts.map((c) => ({ id: c.id, label: c.contract_number || (isRTL ? c.title_ar : c.title_en) || c.id.slice(0, 8) })),
    [contracts, isRTL]
  );
  const milestonesForGallery = useMemo(
    () => milestones.map((m) => ({ id: m.id, title: (isRTL ? m.title_ar : m.title_en) || m.title_ar || m.id.slice(0, 8) })),
    [milestones, isRTL]
  );

  // Derived analytics for Overview
  const stats = useMemo(() => {
    const activeStatuses = new Set(['active', 'in_progress', 'pending', 'open', 'draft']);
    const activeContracts = contracts.filter((c) => activeStatuses.has(String(c.status))).length;
    const completedContracts = contracts.filter((c) => String(c.status) === 'completed').length;
    const activeLeads = leads.filter((l) => activeStatuses.has(String(l.status))).length;
    const activeRfqs = rfqs.filter((r) => activeStatuses.has(String(r.status))).length;
    const totalValue = contracts.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);
    const currency = contracts.find((c) => c.currency_code)?.currency_code || 'SAR';
    const providerIds = new Set<string>();
    contracts.forEach((c) => { if (c.provider_id) providerIds.add(c.provider_id); });
    leads.forEach((l) => { if (l.business_id) providerIds.add(l.business_id); });
    const upcoming = milestones
      .filter((m) => m.due_date && !(m.status === 'completed' || m.completed_at))
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 3);
    return { activeContracts, completedContracts, activeLeads, activeRfqs, totalValue, currency, providers: providerIds.size, upcoming };
  }, [contracts, leads, rfqs, milestones]);

  const copyRef = async () => {
    if (!site?.site_ref) return;
    try { await navigator.clipboard.writeText(site.site_ref); setRefCopied(true); setTimeout(() => setRefCopied(false), 1500); } catch { /* noop */ }
  };

  const goCreateContract = () => navigate(`/dashboard/contracts?new=1&site_id=${id}&site_ref=${encodeURIComponent(site?.site_ref || '')}`);
  const goRequestQuote = () => navigate(`/quote?site_id=${id}&site_ref=${encodeURIComponent(site?.site_ref || '')}`);
  const goRequestRfq = () => navigate(`/dashboard/rfq?new=1&site_id=${id}&site_ref=${encodeURIComponent(site?.site_ref || '')}`);
  const goFindProvider = () => navigate(`/search?site_id=${id}&site_ref=${encodeURIComponent(site?.site_ref || '')}`);

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
      <div className="space-y-6 p-4 md:p-6 pb-16 md:pb-20">
        {/* Back nav */}
        <Link to="/dashboard/sites" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="mx-1">{isRTL ? 'كل المواقع' : 'All sites'}</span>
        </Link>

        {/* Cover hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-elev-2">
          <div className="relative aspect-[21/8] sm:aspect-[21/7] md:aspect-[24/7] w-full bg-gradient-to-br from-muted via-muted/60 to-muted/30">
            {cover ? (
              <img src={cover} alt={displayName} className="h-full w-full object-cover" loading="lazy" decoding="async"/>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="h-10 w-10" />
              </div>
            )}
            {/* Layered gradients: deep dark base from bottom + subtle top vignette for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
            {/* Soft brand glow at bottom edge */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            {canManage && (
              <div className="absolute end-3 top-3">
                <SiteCoverUploader siteId={site.id} currentUrl={cover} onUploaded={(u) => setLocalCover(u)} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 text-white">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs opacity-90 flex-wrap">
                    {site.site_ref ? (
                      <span dir="ltr" className="tech-content rounded-md bg-white/15 backdrop-blur-sm ring-1 ring-white/25 px-2 py-0.5 font-mono">{site.site_ref}</span>
                    ) : null}
                    {typeLabel && <Badge variant="secondary" className="bg-white/15 backdrop-blur-sm ring-1 ring-white/25 text-white border-0">{isRTL ? typeLabel.ar : typeLabel.en}</Badge>}
                  </div>
                  <h1 dir="auto" className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">{displayName}</h1>
                  {(site.city_name || site.district) && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm opacity-95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]" dir="auto">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{[site.district, site.city_name].filter(Boolean).join(' · ')}</span>
                    </p>
                  )}
                </div>
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/dashboard/sites?edit=${site.id}`)} className="hover-lift bg-white/95 hover:bg-white text-foreground shadow-md">
                    <Pencil className="h-4 w-4" />
                    <span className="mx-2">{isRTL ? 'تعديل' : 'Edit'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={FileText} label={isRTL ? 'العقود' : 'Contracts'} value={contracts.length} loading={contractsLoading} />
          <KpiCard icon={MessageSquareQuote} label={isRTL ? 'عروض' : 'Quotes'} value={leads.length} loading={leadsLoading} />
          <KpiCard icon={Inbox} label="RFQ" value={rfqs.length} loading={rfqsLoading} />
          <KpiCard icon={Users} label={isRTL ? 'جهات' : 'Contacts'} value={contactsRaw.length} loading={contactsLoading} />
          <KpiCard icon={AlertTriangle} label={isRTL ? 'بلاغات' : 'Reports'} value={reportsCount} loading={false} tone={reportsCount > 0 ? 'destructive' : undefined} />
          <KpiCard icon={ImageIcon} label={isRTL ? 'الصور' : 'Gallery'} value={gallery.length} loading={false} />
        </div>

        {/* Quick Actions Bar — every action is linked to this site's ref */}
        {canManage && (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] via-card to-card">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{isRTL ? 'إجراءات سريعة لهذا الموقع' : 'Quick actions for this site'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {isRTL ? 'كل طلب جديد سيُربط تلقائيًا برقم الموقع' : 'Every new request is auto-linked to this site ref'}
                    </p>
                  </div>
                </div>
                {site.site_ref && (
                  <button
                    onClick={copyRef}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs hover:border-primary/40 hover:text-primary transition tech-content"
                    title={isRTL ? 'نسخ رقم الموقع' : 'Copy site ref'}
                  >
                    <span className="font-mono" dir="ltr">{site.site_ref}</span>
                    {refCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <QuickAction icon={FileText} label={isRTL ? 'إنشاء عقد' : 'Create contract'} onClick={goCreateContract} />
                <QuickAction icon={MessageSquareQuote} label={isRTL ? 'طلب عرض سعر' : 'Request quote'} onClick={goRequestQuote} />
                <QuickAction icon={Inbox} label={isRTL ? 'طلب RFQ' : 'New RFQ'} onClick={goRequestRfq} />
                <QuickAction icon={SearchIcon} label={isRTL ? 'بحث عن مزود' : 'Find provider'} onClick={goFindProvider} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full overflow-x-auto no-scrollbar justify-start">
            <TabsTrigger value="overview"><ClipboardList className="h-4 w-4" /><span className="mx-2">{isRTL ? 'نظرة عامة' : 'Overview'}</span></TabsTrigger>
            <TabsTrigger value="contacts"><Users className="h-4 w-4" /><span className="mx-2">{isRTL ? 'جهات الاتصال' : 'Contacts'}</span></TabsTrigger>
            <TabsTrigger value="contracts"><FileText className="h-4 w-4" /><span className="mx-2">{isRTL ? 'العقود' : 'Contracts'}</span></TabsTrigger>
            <TabsTrigger value="quotes"><MessageSquareQuote className="h-4 w-4" /><span className="mx-2">{isRTL ? 'العروض' : 'Quotes'}</span></TabsTrigger>
            <TabsTrigger value="rfq"><Inbox className="h-4 w-4" /><span className="mx-2">RFQ</span></TabsTrigger>
            <TabsTrigger value="milestones"><Milestone className="h-4 w-4" /><span className="mx-2">{isRTL ? 'المراحل' : 'Milestones'}</span></TabsTrigger>
            <TabsTrigger value="reports">
              <AlertTriangle className="h-4 w-4" />
              <span className="mx-2">{isRTL ? 'البلاغات' : 'Reports'}</span>
              {reportsCount > 0 && <Badge className="ms-1 h-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground">{reportsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="timeline"><Activity className="h-4 w-4" /><span className="mx-2">{isRTL ? 'السجل' : 'Timeline'}</span></TabsTrigger>
            <TabsTrigger value="gallery"><ImageIcon className="h-4 w-4" /><span className="mx-2">{isRTL ? 'المعرض' : 'Gallery'}</span></TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4" /><span className="mx-2">{isRTL ? 'الإعدادات' : 'Settings'}</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Activity summary spanning full width */}
              <Card className="md:col-span-2 overflow-hidden">
                <CardContent className="p-5">
                  <h3 className="font-semibold flex items-center gap-2 pb-3 mb-3 border-b border-border/40">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-4 w-4" /></span>
                    {isRTL ? 'ملخص النشاط' : 'Activity summary'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryStat label={isRTL ? 'عقود نشطة' : 'Active contracts'} value={stats.activeContracts} sub={stats.completedContracts > 0 ? (isRTL ? `${stats.completedContracts} مكتمل` : `${stats.completedContracts} done`) : null} tone="primary" onClick={() => setTab('contracts')} />
                    <SummaryStat label={isRTL ? 'عروض قيد المعالجة' : 'Open quotes'} value={stats.activeLeads} tone="amber" onClick={() => setTab('quotes')} />
                    <SummaryStat label={isRTL ? 'طلبات RFQ نشطة' : 'Active RFQs'} value={stats.activeRfqs} tone="blue" onClick={() => setTab('rfq')} />
                    <SummaryStat label={isRTL ? 'مزودون مرتبطون' : 'Linked providers'} value={stats.providers} tone="emerald" />
                  </div>
                  {stats.totalValue > 0 && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-sm">
                      <CircleDollarSign className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{isRTL ? 'إجمالي قيمة العقود:' : 'Total contracts value:'}</span>
                      <span className="tech-content font-semibold ms-auto" dir="ltr">{stats.totalValue.toLocaleString()} {stats.currency}</span>
                    </div>
                  )}
                  {stats.upcoming.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{isRTL ? 'مراحل قادمة' : 'Upcoming milestones'}</p>
                      <ul className="space-y-1.5">
                        {stats.upcoming.map((m) => (
                          <li key={m.id} className="flex items-center gap-2 text-sm rounded-lg border border-border/40 px-3 py-2">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1" dir="auto">{(isRTL ? m.title_ar : m.title_en) || m.title_ar}</span>
                            <span className="tech-content text-xs text-muted-foreground" dir="ltr">{m.due_date ? new Date(m.due_date).toLocaleDateString() : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 pb-2 border-b border-border/40">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><User className="h-4 w-4" /></span>
                    {isRTL ? 'جهة الاتصال' : 'Contact'}
                  </h3>
                  <SiteField label={isRTL ? 'الاسم' : 'Name'} value={site.contact_name} />
                  <SiteField
                    label={isRTL ? 'الهاتف' : 'Phone'}
                    value={site.contact_phone}
                    kind="phone"
                    action={site.contact_phone ? { href: `tel:${site.contact_phone}`, icon: Phone, ariaLabel: isRTL ? 'اتصال' : 'Call' } : undefined}
                  />
                  {!site.contact_name && !site.contact_phone && (
                    <p className="text-xs text-muted-foreground">{isRTL ? 'لم تُضَف جهة اتصال بعد.' : 'No contact added yet.'}</p>
                  )}
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 pb-2 border-b border-border/40">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
                    {isRTL ? 'العنوان' : 'Address'}
                  </h3>
                  <SiteField label={isRTL ? 'المدينة' : 'City'} value={site.city_name} />
                  <SiteField label={isRTL ? 'الحي' : 'District'} value={site.district} />
                  <SiteField label={isRTL ? 'العنوان' : 'Line'} value={site.address_line1} multiline />
                  <SiteField label={isRTL ? 'العنوان الوطني' : 'NAF'} value={site.short_address} kind="naf" />
                  {!site.city_name && !site.district && !site.address_line1 && !site.short_address && (
                    <p className="text-xs text-muted-foreground">{isRTL ? 'لم يُضَف عنوان بعد.' : 'No address added yet.'}</p>
                  )}
                </CardContent>
              </Card>
              {site.access_notes && (
                <Card className="md:col-span-2"><CardContent className="p-5">
                  <h3 className="font-semibold mb-2">{isRTL ? 'ملاحظات الوصول' : 'Access notes'}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" dir="auto">{site.access_notes}</p>
                </CardContent></Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <SiteContactsTab siteId={site.id} contracts={contractsForRef} canManage={canManage} />
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
              cta={canManage ? { label: isRTL ? 'طلب عرض سعر جديد' : 'Request a quote', onClick: goRequestQuote } : undefined}
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
              cta={canManage ? { label: isRTL ? 'إنشاء RFQ جديد' : 'New RFQ', onClick: goRequestRfq } : undefined}
            />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <SiteReportsTab siteId={site.id} contacts={contactsRaw} contracts={contractsForRef} canManage={canManage} />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            {/* gallery */}
            <Card><CardContent className="p-5">
              {canManage ? (
                <SiteGalleryManager siteId={site.id} images={gallery} milestones={milestonesForGallery}
                  onChange={(imgs) => { setLocalGallery(imgs); refetch(); }} />
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
            <SiteSettingsTab site={site} canManage={canManage} onSaved={() => refetch()} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

/* ----- helpers ----- */

const InfoRow: React.FC<{
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  multiline?: boolean;
  action?: { href: string; icon: React.ComponentType<{ className?: string }> };
}> = ({ label, value, mono, multiline, action }) => {
  const Icon = action?.icon;
  return (
    <div className="flex items-start gap-4 text-sm">
      <span className="shrink-0 w-20 text-xs uppercase tracking-wide text-muted-foreground pt-0.5">{label}</span>
      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <span
          dir="auto"
          className={[
            'font-medium leading-relaxed break-words',
            mono ? 'tech-content' : '',
            multiline ? '' : 'truncate',
          ].join(' ')}
        >
          {value || <span className="text-muted-foreground/60">—</span>}
        </span>
        {action && Icon && value && (
          <a
            href={action.href}
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition"
            aria-label={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: number; loading: boolean; tone?: 'destructive' }> = ({ icon: Icon, label, value, loading, tone }) => (
  <Card className={`hover-lift ${tone === 'destructive' ? 'border-destructive/40 bg-destructive/5' : ''}`}><CardContent className="p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className={`h-4 w-4 ${tone === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
    </div>
    <div className={`mt-2 text-2xl font-bold tech-content ${tone === 'destructive' && value > 0 ? 'text-destructive' : ''}`}>{loading ? '—' : value}</div>
  </CardContent></Card>
);

const QuickAction: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-start text-sm font-medium hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all hover-lift"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 truncate">{label}</span>
  </button>
);

const TONE_CLASSES: Record<string, string> = {
  primary: 'text-primary',
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
};

const SummaryStat: React.FC<{ label: string; value: number; sub?: string | null; tone?: keyof typeof TONE_CLASSES | string; onClick?: () => void }> = ({ label, value, sub, tone = 'primary', onClick }) => {
  const Tag: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-start rounded-xl border border-border/40 bg-card/60 p-3 ${onClick ? 'hover:border-primary/40 hover:bg-primary/5 transition cursor-pointer' : ''}`}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tech-content ${TONE_CLASSES[tone] || TONE_CLASSES.primary}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </Tag>
  );
};

interface ListItem { key: string; href: string; title: string; ref: string | null; status: string | null; meta: string | null; date: string }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  expired: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  closed: 'bg-muted text-muted-foreground',
};

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
            <Link to={it.href} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 rounded-lg px-2 -mx-2 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {it.ref && <span className="tech-content text-xs font-mono text-muted-foreground">{it.ref}</span>}
                  {it.status && (
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[it.status] || 'bg-muted text-muted-foreground'}`}>
                      {it.status}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{it.title}</p>
              </div>
              <div className="text-end text-xs text-muted-foreground shrink-0">
                {it.meta && <div className="tech-content font-semibold text-foreground">{it.meta}</div>}
                <div className="tech-content">{new Date(it.date).toLocaleDateString(isRTL ? 'ar' : 'en')}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </CardContent></Card>
);

export default DashboardSiteDetail;