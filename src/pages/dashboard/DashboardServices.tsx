import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, X, Check, AlertCircle, ExternalLink, Wrench, Sparkles, Inbox, Ticket, Clock, CheckCircle2, XCircle, Send, Trash2, ListPlus } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness, listBusinessesByIds } from '@/modules/businesses';
import { ONBOARDING_SECTORS, findSubServiceById, type SectorId } from '@/data/onboarding-sectors';
import { ServiceBrandsPicker } from '@/components/dashboard/ServiceBrandsPicker';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ServiceRow = {
  id: string;
  business_id: string;
  source_sub_service_id: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price_from: number | null;
  price_to: number | null;
  currency_code: string;
  is_active: boolean;
  sort_order: number;
  is_demo: boolean;
  created_at: string;
};

type SARequest = {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string;
  sector_id: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  ticket_ref_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const DashboardServices: React.FC = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL ? 'خدماتي — قِطاعات' : 'My Services — Qitaat',
    description: isRTL
      ? 'إدارة الخدمات المختارة في ملف المنشأة، مع إمكانية طلب إضافة خدمات جديدة.'
      : 'Manage the services chosen in your business profile and request new ones.',
    noindex: true,
  });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { active_entity_id, entities } = useActiveWorkspace();
  const activeOwnerEntityId = useMemo(() => {
    if (!active_entity_id) return null;
    const e = entities.find((x) => x.entity_id === active_entity_id);
    return e && e.source === 'owner' ? e.entity_id : null;
  }, [active_entity_id, entities]);

  const { data: business, isLoading: loadingBiz } = useQuery({
    queryKey: ['my-business-services-page', user?.id, activeOwnerEntityId],
    queryFn: async () => {
      if (!user) return null;
      if (activeOwnerEntityId) {
        const { data } = await listBusinessesByIds<{ id: string; username: string | null; sectors: string[]; sub_services: string[] }>(
          { ids: [activeOwnerEntityId], select: 'id, username, sectors, sub_services' },
        );
        return (data ?? [])[0] ?? null;
      }
      const { data } = await getOwnerBusiness<{ id: string; username: string | null; sectors: string[]; sub_services: string[] }>(
        { userId: user.id, select: 'id, username, sectors, sub_services' },
      );
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const businessId = business?.id ?? null;
  const subServiceIds: string[] = useMemo(() => business?.sub_services ?? [], [business]);
  const businessSectors: string[] = useMemo(() => (business as { sectors?: string[] } | null)?.sectors ?? [], [business]);

  const { data: services = [], isLoading: loadingSvc } = useQuery({
    queryKey: ['business-services-sync', businessId],
    queryFn: async () => {
      if (!businessId) return [] as ServiceRow[];
      const { data, error } = await supabase
        .from('business_services')
        .select('id, business_id, source_sub_service_id, name_ar, name_en, description_ar, description_en, price_from, price_to, currency_code, is_active, sort_order, is_demo, created_at')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
    enabled: !!businessId,
    staleTime: 60_000,
  });

  const { data: requests = [], isLoading: loadingReq } = useQuery({
    queryKey: ['service-addition-requests', businessId],
    queryFn: async () => {
      if (!businessId) return [] as SARequest[];
      const { data, error } = await supabase
        .from('service_addition_requests')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SARequest[];
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  // Index of business_services by source_sub_service_id
  const byCatalogId = useMemo(() => {
    const m = new Map<string, ServiceRow>();
    services.forEach((s) => { if (s.source_sub_service_id) m.set(s.source_sub_service_id, s); });
    return m;
  }, [services]);

  // Build display list aligned with sub_services chosen on the business
  const displayList = useMemo(() => {
    return subServiceIds.map((subId) => {
      const catalog = findSubServiceById(subId);
      const row = byCatalogId.get(subId);
      const isCustom = subId.startsWith('custom:');
      return {
        subId,
        isCustom,
        sectorId: catalog?.sector_id ?? null,
        sectorLabel: catalog ? (isRTL ? catalog.sector_name_ar : catalog.sector_name_en) : null,
        name_ar: row?.name_ar ?? catalog?.name_ar ?? (isRTL ? 'خدمة مخصّصة' : 'Custom service'),
        name_en: row?.name_en ?? catalog?.name_en ?? 'Custom service',
        row,
      };
    });
  }, [subServiceIds, byCatalogId, isRTL]);

  // Stats
  const stats = useMemo(() => {
    const total = displayList.length;
    const active = displayList.filter((d) => d.row?.is_active).length;
    const priced = displayList.filter((d) => d.row && (d.row.price_from || d.row.price_to)).length;
    return { total, active, priced };
  }, [displayList]);

  const stats2 = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  // Upsert (create-or-update) a row tied to a sub_service id
  const upsertMut = useMutation({
    mutationFn: async (input: {
      subId: string;
      payload: Partial<ServiceRow> & { name_ar: string };
    }) => {
      if (!businessId) throw new Error('No business');
      const existing = byCatalogId.get(input.subId);
      if (existing) {
        const { error } = await supabase
          .from('business_services')
          .update({
            description_ar: input.payload.description_ar ?? null,
            description_en: input.payload.description_en ?? null,
            price_from: input.payload.price_from ?? null,
            price_to: input.payload.price_to ?? null,
            currency_code: input.payload.currency_code ?? 'SAR',
            is_active: input.payload.is_active ?? true,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_services')
          .insert({
            business_id: businessId,
            source_sub_service_id: input.subId,
            name_ar: input.payload.name_ar,
            name_en: input.payload.name_en ?? input.payload.name_ar,
            description_ar: input.payload.description_ar ?? null,
            description_en: input.payload.description_en ?? null,
            price_from: input.payload.price_from ?? null,
            price_to: input.payload.price_to ?? null,
            currency_code: input.payload.currency_code ?? 'SAR',
            is_active: input.payload.is_active ?? true,
            sort_order: services.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-services-sync', businessId] });
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  // Quick active toggle
  const toggleMut = useMutation({
    mutationFn: async (input: { subId: string; name_ar: string; name_en: string; nextActive: boolean }) => {
      if (!businessId) throw new Error('No business');
      const existing = byCatalogId.get(input.subId);
      if (existing) {
        const { error } = await supabase
          .from('business_services')
          .update({ is_active: input.nextActive })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_services')
          .insert({
            business_id: businessId,
            source_sub_service_id: input.subId,
            name_ar: input.name_ar,
            name_en: input.name_en,
            is_active: input.nextActive,
            currency_code: 'SAR',
            sort_order: services.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-services-sync', businessId] }),
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  // Bidirectional sync — add a sub_service to the business catalog.
  const addSubMut = useMutation({
    mutationFn: async (subId: string) => {
      if (!businessId) throw new Error('No business');
      const { error } = await supabase.rpc('add_business_sub_service', {
        p_business_id: businessId,
        p_sub_service_id: subId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-business-services-page'] });
      toast.success(isRTL ? 'تمت الإضافة' : 'Added');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  // Bidirectional sync — remove a sub_service (and its business_services row).
  const removeSubMut = useMutation({
    mutationFn: async (subId: string) => {
      if (!businessId) throw new Error('No business');
      const { error } = await supabase.rpc('remove_business_sub_service', {
        p_business_id: businessId,
        p_sub_service_id: subId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-business-services-page'] });
      qc.invalidateQueries({ queryKey: ['business-services-sync', businessId] });
      toast.success(isRTL ? 'تم الحذف' : 'Removed');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  // Inline catalog picker
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Request new service form ──
  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ sector_id: '' as string, name_ar: '', name_en: '', description: '' });

  const requestMut = useMutation({
    mutationFn: async () => {
      if (!businessId || !user) throw new Error('No business');
      if (!reqForm.sector_id) throw new Error(isRTL ? 'اختر القطاع' : 'Pick a sector');
      if (!reqForm.name_ar.trim()) throw new Error(isRTL ? 'الاسم بالعربي مطلوب' : 'Arabic name required');

      // 1) Create the addition request
      const { data: inserted, error: e1 } = await supabase
        .from('service_addition_requests')
        .insert({
          business_id: businessId,
          user_id: user.id,
          sector_id: reqForm.sector_id,
          name_ar: reqForm.name_ar.trim(),
          name_en: reqForm.name_en.trim() || null,
          description: reqForm.description.trim() || null,
        })
        .select('*')
        .single();
      if (e1) throw e1;
      const req = inserted as SARequest;

      // 2) Create the linked help/support ticket (so the provider can track it)
      const ticketTitle = isRTL
        ? `طلب إضافة خدمة جديدة: ${req.name_ar}`
        : `New service request: ${req.name_en || req.name_ar}`;
      const ticketDesc = `${isRTL ? 'رقم الطلب' : 'Request ref'}: ${req.ref_id}\n${isRTL ? 'القطاع' : 'Sector'}: ${req.sector_id}\n${req.description ?? ''}`.trim();
      const { data: ticket, error: e2 } = await supabase
        .from('help_feature_requests')
        .insert({
          user_id: user.id,
          business_id: businessId,
          category: 'service_request',
          title: ticketTitle,
          description: ticketDesc,
        })
        .select('ref_id')
        .single();
      if (e2) throw e2;

      // 3) Link ticket back to the request
      if (ticket?.ref_id) {
        await supabase
          .from('service_addition_requests')
          .update({ ticket_ref_id: ticket.ref_id })
          .eq('id', req.id);
      }

      return req;
    },
    onSuccess: (req) => {
      qc.invalidateQueries({ queryKey: ['service-addition-requests', businessId] });
      setReqOpen(false);
      setReqForm({ sector_id: '', name_ar: '', name_en: '', description: '' });
      toast.success(
        isRTL
          ? `تم إرسال الطلب — رقم المرجع ${req.ref_id ?? ''}`
          : `Request submitted — ref ${req.ref_id ?? ''}`,
      );
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  const loading = loadingBiz || loadingSvc;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              {isRTL ? 'خدماتي' : 'My Services'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              {isRTL
                ? 'الخدمات هنا مرتبطة بما اخترته في صفحة بيانات المنشأة. لإضافة أو إزالة خدمة من الكتالوج عدّل القطاعات والخدمات الفرعية.'
                : 'These services mirror what you picked in your business profile. To add or remove catalog items edit your sectors & sub-services.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/dashboard/business-edit?tab=sectors">
                <Pencil className="h-4 w-4 me-2" />
                {isRTL ? 'تعديل القطاعات والخدمات' : 'Edit sectors & services'}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setPickerOpen((v) => !v)} className="rounded-xl">
              <ListPlus className="h-4 w-4 me-2" />
              {isRTL ? 'إضافة من الكتالوج' : 'Pick from catalog'}
            </Button>
            <Button onClick={() => setReqOpen((v) => !v)} className="rounded-xl">
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? 'طلب إضافة خدمة جديدة' : 'Request a new service'}
            </Button>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard icon={<Wrench className="h-4 w-4" />} label={isRTL ? 'إجمالي الخدمات' : 'Total services'} value={stats.total} />
          <StatCard icon={<Sparkles className="h-4 w-4 text-success" />} label={isRTL ? 'الخدمات النشطة' : 'Active'} value={stats.active} />
          <StatCard icon={<Inbox className="h-4 w-4 text-warning" />} label={isRTL ? 'طلبات قيد المراجعة' : 'Pending requests'} value={stats2.pending} />
        </section>

        {/* Inline catalog picker — bidirectional sync with business-edit */}
        {pickerOpen && businessId && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListPlus className="h-4 w-4 text-primary" />
                {isRTL ? 'اختر خدمات من الكتالوج' : 'Pick services from the catalog'}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? 'أي إضافة هنا تنعكس فوراً في صفحة بيانات المنشأة، وأي إزالة من هناك تنعكس هنا.'
                  : 'Adding here updates your business profile instantly. Removals propagate both ways.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[28rem] overflow-y-auto no-scrollbar">
              {ONBOARDING_SECTORS
                .filter((s) => businessSectors.length === 0 || businessSectors.includes(s.id))
                .map((sector) => (
                <div key={sector.id} className="rounded-lg border border-border/60 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-semibold">{isRTL ? sector.name_ar : sector.name_en}</h4>
                    <span className="text-[10px] text-muted-foreground">{sector.subServices.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sector.subServices.map((sub) => {
                      const selected = subServiceIds.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => selected ? removeSubMut.mutate(sub.id) : addSubMut.mutate(sub.id)}
                          disabled={addSubMut.isPending || removeSubMut.isPending}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            selected
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border/60 bg-card hover:bg-accent/5'
                          }`}
                        >
                          {selected ? <Check className="h-3 w-3 inline me-1" /> : <Plus className="h-3 w-3 inline me-1" />}
                          {isRTL ? sub.name_ar : sub.name_en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Request form (inline, no popup) */}
        {reqOpen && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4 text-primary" />
                {isRTL ? 'طلب إضافة خدمة جديدة' : 'Request a new service'}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? 'سيتم إرسال الطلب للإدارة للمراجعة، ويتم إنشاء تذكرة دعم برقم مرجعي لمتابعتها.'
                  : 'Your request will be reviewed by the admin team. A support ticket is created with a reference number you can track.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{isRTL ? 'القطاع' : 'Sector'} *</Label>
                  <Select value={reqForm.sector_id} onValueChange={(v) => setReqForm((f) => ({ ...f, sector_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر القطاع' : 'Pick a sector'} /></SelectTrigger>
                    <SelectContent>
                      {ONBOARDING_SECTORS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{isRTL ? s.name_ar : s.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{isRTL ? 'اسم الخدمة (عربي)' : 'Service name (Arabic)'} *</Label>
                  <Input dir="auto" value={reqForm.name_ar} onChange={(e) => setReqForm((f) => ({ ...f, name_ar: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
                  <Input dir="auto" value={reqForm.name_en} onChange={(e) => setReqForm((f) => ({ ...f, name_en: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? 'وصف الخدمة وسبب طلبها' : 'Service description & reason'}</Label>
                <Textarea
                  dir="auto"
                  rows={3}
                  value={reqForm.description}
                  onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={isRTL ? 'اشرح الخدمة المقترحة ولماذا تحتاج إضافتها...' : 'Describe the proposed service and why you need it...'}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setReqOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={() => requestMut.mutate()} disabled={requestMut.isPending}>
                  {requestMut.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
                  {isRTL ? 'إرسال الطلب' : 'Submit request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My addition requests */}
        {requests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-4 w-4 text-primary" />
                {isRTL ? 'طلباتي لإضافة خدمات' : 'My addition requests'}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? `لديك ${stats2.pending} قيد المراجعة، ${stats2.approved} مقبول، ${stats2.rejected} مرفوض.`
                  : `${stats2.pending} pending, ${stats2.approved} approved, ${stats2.rejected} rejected.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingReq && <Skeleton className="h-12 w-full" />}
              {requests.slice(0, 8).map((r) => {
                const sector = ONBOARDING_SECTORS.find((s) => s.id === r.sector_id);
                const statusIcon = r.status === 'pending' ? <Clock className="h-3.5 w-3.5" /> : r.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />;
                return (
                  <div key={r.id} className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card p-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`tech-content text-[10px] ${STATUS_STYLE[r.status]}`}>
                          {statusIcon}
                          <span className="ms-1">
                            {r.status === 'pending' ? (isRTL ? 'قيد المراجعة' : 'Pending') : r.status === 'approved' ? (isRTL ? 'مقبول' : 'Approved') : (isRTL ? 'مرفوض' : 'Rejected')}
                          </span>
                        </Badge>
                        {r.ref_id && <span className="tech-content text-[11px] text-muted-foreground">{r.ref_id}</span>}
                        {r.ticket_ref_id && (
                          <Link to="/help" className="tech-content text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                            {r.ticket_ref_id}<ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-medium truncate">
                        {isRTL ? r.name_ar : (r.name_en || r.name_ar)}
                        {sector && (
                          <span className="ms-2 text-xs text-muted-foreground">· {isRTL ? sector.name_ar : sector.name_en}</span>
                        )}
                      </div>
                      {r.status === 'rejected' && r.reject_reason && (
                        <p className="mt-1 text-xs text-destructive flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          {r.reject_reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Services list synced with business-edit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isRTL ? 'الخدمات المختارة في ملف المنشأة' : 'Services selected in your business profile'}</CardTitle>
            <CardDescription>
              {isRTL
                ? 'لكل خدمة يمكنك تفعيلها وتحديد سعرها ووصفها. لإزالة خدمة قم بإلغاء اختيارها من صفحة بيانات المنشأة.'
                : 'For each service you can toggle, price, and describe it. To remove a service unselect it in the business profile.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {!loading && displayList.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Wrench className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {isRTL
                    ? 'لم تختر أي خدمة بعد. ابدأ بإضافة قطاعاتك وخدماتك الفرعية من ملف المنشأة.'
                    : "You haven't selected any services yet. Pick sectors & sub-services in your business profile."}
                </p>
                <Button asChild className="mt-3 rounded-xl">
                  <Link to="/dashboard/business-edit?tab=sectors">{isRTL ? 'فتح ملف المنشأة' : 'Open business profile'}</Link>
                </Button>
              </div>
            )}
            {!loading && displayList.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {displayList.map((d) => (
                  <ServiceTile
                    key={d.subId}
                    businessId={businessId!}
                    userId={user?.id ?? ''}
                    sectorId={d.sectorId}
                    sectorLabel={d.sectorLabel}
                    isCustom={d.isCustom}
                    name={isRTL ? d.name_ar : d.name_en || d.name_ar}
                    nameAr={d.name_ar}
                    nameEn={d.name_en || d.name_ar}
                    row={d.row}
                    isRTL={isRTL}
                    saving={upsertMut.isPending}
                    onToggle={(next) => toggleMut.mutate({ subId: d.subId, name_ar: d.name_ar, name_en: d.name_en || d.name_ar, nextActive: next })}
                    onSave={(payload) => upsertMut.mutate({ subId: d.subId, payload: { ...payload, name_ar: d.name_ar, name_en: d.name_en || d.name_ar } })}
                    onRemove={() => removeSubMut.mutate(d.subId)}
                    removing={removeSubMut.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 tech-content text-2xl font-bold">{value}</div>
    </div>
  );
}

function ServiceTile({
  sectorLabel, isCustom, name, nameAr, nameEn, row, isRTL, saving, onToggle, onSave,
}: {
  sectorLabel: string | null;
  isCustom: boolean;
  name: string;
  nameAr: string;
  nameEn: string;
  row: ServiceRow | undefined;
  isRTL: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
  onSave: (payload: { description_ar: string | null; description_en: string | null; price_from: number | null; price_to: number | null; currency_code: string; is_active: boolean }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    description_ar: row?.description_ar ?? '',
    description_en: row?.description_en ?? '',
    price_from: row?.price_from?.toString() ?? '',
    price_to: row?.price_to?.toString() ?? '',
    currency_code: row?.currency_code ?? 'SAR',
  });
  const isActive = row?.is_active ?? false;
  const hasPrice = !!(row && (row.price_from || row.price_to));

  return (
    <div className={`rounded-xl border bg-card p-3 transition-all ${isActive ? 'border-border/60' : 'border-border/40 opacity-80'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{name}</h3>
            {isCustom && <Badge variant="outline" className="text-[10px]">{isRTL ? 'مخصّصة' : 'Custom'}</Badge>}
          </div>
          {sectorLabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sectorLabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={onToggle} aria-label="active" />
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setEditing((v) => !v)}>
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!editing && (
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {hasPrice ? (
            <span className="tech-content font-medium text-foreground">
              {row?.price_from ? Number(row.price_from).toLocaleString() : ''}
              {row?.price_from && row?.price_to ? ' – ' : ''}
              {row?.price_to ? Number(row.price_to).toLocaleString() : ''}
              <span className="ms-1 text-muted-foreground">{row?.currency_code}</span>
            </span>
          ) : (
            <span>{isRTL ? 'بدون تسعير' : 'No price'}</span>
          )}
          {(row?.description_ar || row?.description_en) && (
            <span className="truncate">· {isRTL ? row?.description_ar : (row?.description_en || row?.description_ar)}</span>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">{isRTL ? 'سعر من' : 'Price from'}</Label>
              <Input className="h-9 tech-content" type="number" min="0" value={draft.price_from} onChange={(e) => setDraft((d) => ({ ...d, price_from: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">{isRTL ? 'سعر إلى' : 'Price to'}</Label>
              <Input className="h-9 tech-content" type="number" min="0" value={draft.price_to} onChange={(e) => setDraft((d) => ({ ...d, price_to: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">{isRTL ? 'العملة' : 'Currency'}</Label>
              <Select value={draft.currency_code} onValueChange={(v) => setDraft((d) => ({ ...d, currency_code: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['SAR', 'AED', 'USD', 'EUR'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[10px]">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
            <Textarea rows={2} dir="auto" value={draft.description_ar} onChange={(e) => setDraft((d) => ({ ...d, description_ar: e.target.value }))} />
          </div>
          <div>
            <Label className="text-[10px]">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
            <Textarea rows={2} dir="auto" value={draft.description_en} onChange={(e) => setDraft((d) => ({ ...d, description_en: e.target.value }))} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button size="sm" disabled={saving} onClick={() => {
              onSave({
                description_ar: draft.description_ar.trim() || null,
                description_en: draft.description_en.trim() || null,
                price_from: draft.price_from ? Number(draft.price_from) : null,
                price_to: draft.price_to ? Number(draft.price_to) : null,
                currency_code: draft.currency_code,
                is_active: isActive,
              });
              setEditing(false);
            }}>
              <Check className="h-4 w-4 me-1" />{isRTL ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardServices;