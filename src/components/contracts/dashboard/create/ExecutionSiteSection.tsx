/**
 * Contracts Phase 5C.3 — Execution Site step (UI-only).
 *
 * Hard rules:
 *  - Only loads sites scoped to (business_id, client_user_id?).
 *  - Never lists sites globally.
 *  - When the contract is locked (active/completed/cancelled/disputed),
 *    only the frozen execution_address_snapshot is shown read-only.
 *  - Selecting / clearing / creating sites is delegated to the parent so
 *    the parent can route it through set_contract_execution_site or hold
 *    it in local state until the new draft is created.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Loader2, X, Check, Building2, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { listClientSitesForContract } from '@/modules/contracts/services/listClientSitesForContract';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import BarcodeWidget from '@/components/barcodes/BarcodeWidget';
import { useEntityBarcode } from '@/lib/barcodes/useEntityBarcode';
import ClientSiteQrCard from '@/components/client-sites/ClientSiteQrCard';
import ClientSiteVisibilitySettingsCard from '@/components/client-sites/ClientSiteVisibilitySettingsCard';
import ClientSiteAccessRequestsPanel from '@/components/client-sites/ClientSiteAccessRequestsPanel';
import ClientSiteNotificationPreferencesCard from '@/components/client-sites/ClientSiteNotificationPreferencesCard';

export interface ExecutionSiteRow {
  id: string;
  label: string;
  client_user_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  city_id: string | null;
  city_name: string | null;
  district: string | null;
  address_line1: string;
  address_line2: string | null;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  is_default: boolean;
  site_ref?: string | null;
  site_name?: string | null;
  site_type?: string | null;
  visibility?: string | null;
  qr_enabled?: boolean | null;
}

export interface ExecutionAddressSnapshot {
  site_id?: string | null;
  label?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  city_name?: string | null;
  district?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  map_url?: string | null;
  captured_at?: string | null;
}

interface Props {
  isRTL: boolean;
  businessId: string | null | undefined;
  clientUserId: string | null | undefined;
  selectedSiteId: string | null;
  snapshot: ExecutionAddressSnapshot | null;
  locked: boolean;
  /** True when the contract row exists. Setter RPC is only callable then. */
  hasContract: boolean;
  /** Fired after the local selection changes. Parent decides what to do. */
  onSelect: (siteId: string | null) => void;
  /** Setter call (only used when hasContract = true). */
  onPersistSelect?: (siteId: string | null) => Promise<void>;
}

const emptyForm = {
  label: '',
  contact_name: '',
  contact_phone: '',
  city_name: '',
  district: '',
  address_line1: '',
  address_line2: '',
  map_url: '',
  access_notes: '',
  is_default: false,
};

export const ExecutionSiteSection: React.FC<Props> = ({
  isRTL, businessId, clientUserId, selectedSiteId, snapshot, locked,
  hasContract, onSelect, onPersistSelect,
}) => {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [persisting, setPersisting] = useState(false);

  const enabled = !!businessId && !locked;

  const { data: sites = [], isLoading, refetch } = useQuery({
    queryKey: ['client-sites', businessId, clientUserId ?? null],
    queryFn: async () => {
      const { data, error } = await listClientSitesForContract({
        _business_id: businessId!,
        _client_user_id: clientUserId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as ExecutionSiteRow[];
    },
    enabled,
  });

  const createSite = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('NO_BUSINESS');
      const payload: Record<string, unknown> = {
        business_id: businessId,
        client_user_id: clientUserId ?? null,
        label: form.label.trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        city_name: form.city_name.trim() || null,
        district: form.district.trim() || null,
        map_url: form.map_url.trim() || null,
        access_notes: form.access_notes.trim() || null,
        is_default: form.is_default,
      };
      const { data, error } = await supabase.rpc('create_client_site', {
        _payload: payload as never,
      });
      if (error) throw error;
      const result = (data ?? {}) as { id?: string };
      if (!result.id) throw new Error('CREATE_FAILED');
      return result.id;
    },
    onSuccess: async (newId) => {
      setAdding(false);
      setForm(emptyForm);
      await refetch();
      qc.invalidateQueries({ queryKey: ['client-sites', businessId, clientUserId ?? null] });
      // Auto-select the new site
      onSelect(newId);
      if (hasContract && onPersistSelect) {
        try {
          setPersisting(true);
          await onPersistSelect(newId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(isRTL ? `تعذر ربط الموقع: ${msg}` : `Could not link site: ${msg}`);
        } finally {
          setPersisting(false);
        }
      }
      toast.success(isRTL ? 'تمت إضافة الموقع' : 'Site added');
    },
    onError: (err: Error) => {
      toast.error(isRTL ? `تعذر إضافة الموقع: ${err.message}` : `Failed to add site: ${err.message}`);
    },
  });

  const handleSelect = async (siteId: string | null) => {
    onSelect(siteId);
    if (hasContract && onPersistSelect) {
      try {
        setPersisting(true);
        await onPersistSelect(siteId);
        toast.success(siteId
          ? (isRTL ? 'تم ربط موقع التنفيذ' : 'Execution site linked')
          : (isRTL ? 'تمت إزالة موقع التنفيذ' : 'Execution site cleared'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(isRTL ? `تعذر التحديث: ${msg}` : `Update failed: ${msg}`);
      } finally {
        setPersisting(false);
      }
    }
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;
  const { data: selectedSiteBarcode } = useEntityBarcode('client_site', selectedSite?.id);
  const showLockedSnapshot = locked && !!snapshot;

  return (
    <section
      className="space-y-3 p-4 rounded-xl border border-border/40 bg-muted/20"
      aria-labelledby="execution-site-heading"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <h3 id="execution-site-heading" className="text-sm font-semibold">
            {isRTL ? 'موقع التنفيذ' : 'Execution site'}
          </h3>
          <Badge variant="outline" size="sm" className="text-[9px]">
            {isRTL ? 'موصى به' : 'Recommended'}
          </Badge>
        </div>
        {!locked && !adding && (
          <Button
            type="button" size="sm" variant="outline"
            className="h-8 text-[11px] gap-1"
            onClick={() => setAdding(true)}
            disabled={!businessId}
            aria-label={isRTL ? 'إضافة موقع جديد' : 'Add new site'}
          >
            <Plus className="w-3.5 h-3.5" />
            {isRTL ? 'إضافة موقع جديد' : 'Add new site'}
          </Button>
        )}
      </div>

      {!businessId && (
        <p className="text-[11px] text-muted-foreground">
          {isRTL ? 'حدد المنشأة أولاً.' : 'Select your business first.'}
        </p>
      )}

      {clientUserId == null && businessId && !locked && (
        <p className="text-[10px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
          {isRTL
            ? 'سيتم ربط الموقع بهذا العقد داخل نطاق المنشأة حتى يكتمل حساب العميل.'
            : 'Site will be linked within your business scope until the client account is finalized.'}
        </p>
      )}

      {showLockedSnapshot && snapshot && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            {isRTL ? 'العنوان محفوظ في العقد' : 'Address snapshot saved'}
          </div>
          <div className="text-xs space-y-0.5">
            {snapshot.label && <div className="font-medium">{snapshot.label}</div>}
            {snapshot.address_line1 && <div className="text-muted-foreground">{snapshot.address_line1}</div>}
            {snapshot.address_line2 && <div className="text-muted-foreground">{snapshot.address_line2}</div>}
            <div className="text-muted-foreground text-[11px]">
              {[snapshot.district, snapshot.city_name].filter(Boolean).join(' · ') || null}
            </div>
            {snapshot.contact_name && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <User className="w-3 h-3" /> {snapshot.contact_name}
                {snapshot.contact_phone && <span dir="ltr" className="tech-content">· {snapshot.contact_phone}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {!locked && enabled && (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {isRTL ? 'جارٍ تحميل المواقع…' : 'Loading sites…'}
            </div>
          ) : sites.length === 0 && !adding ? (
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? 'لا توجد مواقع محفوظة لهذا العميل بعد.' : 'No saved sites for this client yet.'}
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="listbox" aria-label={isRTL ? 'مواقع التنفيذ' : 'Execution sites'}>
              {sites.map((s) => {
                const isSel = s.id === selectedSiteId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => handleSelect(s.id)}
                      disabled={persisting}
                      className={`w-full text-start p-3 rounded-lg border transition-colors hover-lift ${
                        isSel
                          ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/30'
                          : 'border-border/40 hover:border-primary/40 bg-background/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                            {s.label}
                            {s.is_default && (
                              <Badge variant="secondary" size="sm" className="text-[9px]">
                                {isRTL ? 'افتراضي' : 'Default'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.address_line1}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {[s.district, s.city_name].filter(Boolean).join(' · ')}
                          </div>
                          {s.contact_phone && (
                            <div dir="ltr" className="text-[10px] tech-content text-muted-foreground mt-0.5 flex items-center gap-1 justify-start">
                              <Phone className="w-2.5 h-2.5" />{s.contact_phone}
                            </div>
                          )}
                        </div>
                        {isSel && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedSiteId && !adding && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[10px] text-muted-foreground" role="status">
                {snapshot
                  ? (isRTL ? 'العنوان محفوظ في العقد' : 'Address snapshot saved')
                  : (isRTL ? 'سيتم حفظ نسخة من العنوان عند تفعيل العقد' : 'Address will be captured when contract is activated')}
              </p>
              <Button
                type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1"
                onClick={() => handleSelect(null)}
                disabled={persisting}
              >
                <X className="w-3 h-3" />
                {isRTL ? 'إزالة' : 'Clear'}
              </Button>
            </div>
          )}

          {selectedSite && selectedSite.site_ref && !adding && (
            <div className="space-y-3">
              {selectedSiteBarcode && (
                <BarcodeWidget
                  barcodeCode={selectedSiteBarcode}
                  entityType="client_site"
                  title={isRTL ? 'كود المشروع' : 'Project Code'}
                  subtitle={selectedSite.site_name ?? selectedSite.label ?? selectedSite.site_ref}
                  size="sm"
                />
              )}
              <ClientSiteQrCard
                siteId={selectedSite.id}
                siteRef={selectedSite.site_ref}
                siteName={selectedSite.site_name ?? selectedSite.label}
                siteType={selectedSite.site_type ?? null}
                cityName={selectedSite.city_name}
                visibility={(selectedSite.visibility ?? 'private') as 'private' | 'shared_by_qr' | 'public_limited'}
                qrEnabled={!!selectedSite.qr_enabled}
                onChanged={() => refetch()}
              />
              <ClientSiteVisibilitySettingsCard
                isRTL={isRTL}
                siteId={selectedSite.id}
                siteRef={selectedSite.site_ref}
              />
              <ClientSiteAccessRequestsPanel isRTL={isRTL} siteId={selectedSite.id} />
              <ClientSiteNotificationPreferencesCard isRTL={isRTL} siteId={selectedSite.id} />
            </div>
          )}

          {adding && (
            <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{isRTL ? 'موقع جديد' : 'New site'}</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
                  onClick={() => { setAdding(false); setForm(emptyForm); }}>
                  <X className="w-3 h-3 me-1" />{isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="site-label" className="text-[10px]">
                    {isRTL ? 'اسم الموقع' : 'Label'} <span className="text-destructive">*</span>
                  </Label>
                  <Input id="site-label" dir="auto" className="h-9 text-xs"
                    value={form.label}
                    onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={isRTL ? 'فيلا الرياض' : 'Riyadh villa'} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="site-addr1" className="text-[10px]">
                    {isRTL ? 'عنوان الموقع' : 'Address line 1'} <span className="text-destructive">*</span>
                  </Label>
                  <Input id="site-addr1" dir="auto" className="h-9 text-xs"
                    value={form.address_line1}
                    onChange={(e) => setForm(f => ({ ...f, address_line1: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="site-addr2" className="text-[10px]">
                    {isRTL ? 'تفاصيل إضافية' : 'Address line 2'}
                  </Label>
                  <Input id="site-addr2" dir="auto" className="h-9 text-xs"
                    value={form.address_line2}
                    onChange={(e) => setForm(f => ({ ...f, address_line2: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="site-district" className="text-[10px]">{isRTL ? 'الحي' : 'District'}</Label>
                  <Input id="site-district" dir="auto" className="h-9 text-xs"
                    value={form.district}
                    onChange={(e) => setForm(f => ({ ...f, district: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="site-city" className="text-[10px]">{isRTL ? 'المدينة' : 'City'}</Label>
                  <Input id="site-city" dir="auto" className="h-9 text-xs"
                    value={form.city_name}
                    onChange={(e) => setForm(f => ({ ...f, city_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="site-cname" className="text-[10px]">{isRTL ? 'جهة التواصل في الموقع' : 'Site contact name'}</Label>
                  <Input id="site-cname" dir="auto" className="h-9 text-xs"
                    value={form.contact_name}
                    onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="site-cphone" className="text-[10px]">{isRTL ? 'رقم التواصل في الموقع' : 'Site contact phone'}</Label>
                  <Input id="site-cphone" dir="ltr" className="h-9 text-xs tech-content"
                    value={form.contact_phone}
                    onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="site-map" className="text-[10px]">{isRTL ? 'رابط الموقع (خرائط)' : 'Map URL'}</Label>
                  <Input id="site-map" dir="ltr" className="h-9 text-xs tech-content"
                    value={form.map_url}
                    onChange={(e) => setForm(f => ({ ...f, map_url: e.target.value }))}
                    placeholder="https://maps.google.com/…" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="site-notes" className="text-[10px]">{isRTL ? 'ملاحظات الوصول' : 'Access notes'}</Label>
                  <Textarea id="site-notes" dir="auto" rows={2} className="text-xs"
                    value={form.access_notes}
                    onChange={(e) => setForm(f => ({ ...f, access_notes: e.target.value }))} />
                </div>
              </div>
              <Button
                type="button" size="sm" variant="hero" className="h-9 gap-1.5 text-xs"
                disabled={!form.label.trim() || !form.address_line1.trim() || createSite.isPending}
                onClick={() => createSite.mutate()}
                aria-label={isRTL ? 'حفظ الموقع' : 'Save site'}
              >
                {createSite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {isRTL ? 'حفظ الموقع' : 'Save site'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ExecutionSiteSection;