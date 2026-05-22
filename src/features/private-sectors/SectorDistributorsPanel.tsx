/**
 * Inline distributors/agents manager for a private sector.
 * Used by both the provider screen and the admin screen.
 * Provider can add new distributors (status defaults to 'pending'),
 * sector owner & admins can review (approve / reject / revoke).
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { listBusinessesByIds, getBusinessByRefId } from '@/modules/businesses';
import { toast } from 'sonner';
import { Building2, Plus, CheckCircle2, XCircle, Trash2, Ban, Search } from 'lucide-react';
import {
  listDistributors, addDistributor, reviewDistributor, removeDistributor,
} from './service';
import {
  PS_DIST_ROLE_META, PS_LINK_STATUS_META,
  PrivateSectorDistributor, PrivateSectorDistributorRole, PrivateSectorLinkStatus,
} from './types';

interface Props {
  sectorId: string;
  /** True = current user can manage (owner of sector or admin). */
  canManage: boolean;
}

export const SectorDistributorsPanel: React.FC<Props> = ({ sectorId, canManage }) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [businessRef, setBusinessRef] = useState('');
  const [role, setRole] = useState<PrivateSectorDistributorRole>('authorized_dealer');
  const [territory, setTerritory] = useState('');

  const { data: distributors = [], isLoading } = useQuery({
    queryKey: ['ps-distributors', sectorId],
    queryFn: () => listDistributors(sectorId),
  });

  const businessIds = useMemo(() => Array.from(new Set(distributors.map((d) => d.business_id))), [distributors]);
  const { data: businesses = [] } = useQuery({
    queryKey: ['ps-distributors-bizs', sectorId, businessIds.join(',')],
    enabled: businessIds.length > 0,
    queryFn: async () => {
      const { data } = await listBusinessesByIds<{
        id: string;
        ref_id: string | null;
        name_ar: string | null;
        name_en: string | null;
        username: string | null;
        city_id: string | null;
      }>({
        ids: businessIds,
        select: 'id, ref_id, name_ar, name_en, username, city_id',
      });
      return data ?? [];
    },
  });
  const bizMap = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['ps-distributors', sectorId] });

  const addMut = useMutation({
    mutationFn: async () => {
      const ref = businessRef.trim();
      if (!ref) throw new Error(isRTL ? 'أدخل معرف المنشأة (BIZ-…)' : 'Enter business ref (BIZ-…)');
      const { data: biz, error: e1 } = await getBusinessByRefId<{ id: string }>({
        refId: ref,
        select: 'id',
      });
      if (e1) throw e1;
      if (!biz) throw new Error(isRTL ? 'لم يتم العثور على المنشأة' : 'Business not found');
      return addDistributor({
        sector_id: sectorId, business_id: biz.id, role,
        territory_ar: isRTL ? territory : null,
        territory_en: isRTL ? null : territory,
      });
    },
    onSuccess: () => {
      refresh(); setAdding(false); setBusinessRef(''); setTerritory('');
      toast.success(isRTL ? 'تمت إضافة الموزع' : 'Distributor added');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: PrivateSectorLinkStatus }) => reviewDistributor(id, decision),
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم تحديث الحالة' : 'Status updated'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const delMut = useMutation({
    mutationFn: removeDistributor,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الحذف' : 'Removed'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return distributors;
    return distributors.filter((d: PrivateSectorDistributor) => {
      const b = bizMap.get(d.business_id);
      return [d.ref_id, d.territory_ar, d.territory_en, b?.name_ar, b?.name_en, b?.username]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [distributors, search, bizMap]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {isRTL ? 'الموزعون والوكلاء' : 'Distributors & Agents'}
          <Badge variant="outline" className="tech-content">{distributors.length}</Badge>
        </CardTitle>
        {canManage && (
          <Button size="sm" variant={adding ? 'outline' : 'default'} onClick={() => setAdding((v) => !v)}>
            {adding ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {adding ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة موزع' : 'Add distributor')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && canManage && (
          <div className="rounded-lg border bg-muted/30 p-3 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>{isRTL ? 'معرف المنشأة (BIZ-XXXXXXX)' : 'Business ref (BIZ-XXXXXXX)'}</Label>
              <Input dir="ltr" className="tech-content" value={businessRef} onChange={(e) => setBusinessRef(e.target.value)} placeholder="BIZ-1000023" />
            </div>
            <div>
              <Label>{isRTL ? 'الدور' : 'Role'}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as PrivateSectorDistributorRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PS_DIST_ROLE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{isRTL ? m.ar : m.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isRTL ? 'النطاق/المدينة' : 'Territory'}</Label>
              <Input dir="auto" value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder={isRTL ? 'الرياض' : 'Riyadh'} />
            </div>
            <div className="md:col-span-4">
              <Button size="sm" disabled={addMut.isPending} onClick={() => addMut.mutate()}>
                <Plus className="h-4 w-4" /> {isRTL ? 'حفظ كـ«قيد المراجعة»' : 'Save as pending'}
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input className="ps-10 h-10" placeholder={isRTL ? 'بحث عن موزع…' : 'Search distributors…'} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{isRTL ? 'جاري التحميل…' : 'Loading…'}</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد موزعون بعد.' : 'No distributors yet.'}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((d) => {
              const b = bizMap.get(d.business_id);
              const meta = PS_LINK_STATUS_META[d.status];
              const roleMeta = PS_DIST_ROLE_META[d.role];
              return (
                <div key={d.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{b ? (isRTL ? b.name_ar : (b.name_en || b.name_ar)) : (isRTL ? 'منشأة' : 'Business')}</span>
                      {b?.ref_id && <span className="text-[11px] text-muted-foreground tech-content">{b.ref_id}</span>}
                      <Badge variant="outline" className={meta.tone}>{isRTL ? meta.ar : meta.en}</Badge>
                      <Badge variant="secondary">{isRTL ? roleMeta.ar : roleMeta.en}</Badge>
                      {(d.territory_ar || d.territory_en) && (
                        <span className="text-xs text-muted-foreground">· {isRTL ? (d.territory_ar || d.territory_en) : (d.territory_en || d.territory_ar)}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground tech-content mt-0.5">{d.ref_id}</p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      {d.status !== 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ id: d.id, decision: 'approved' })}>
                          <CheckCircle2 className="h-4 w-4" /> {isRTL ? 'اعتماد' : 'Approve'}
                        </Button>
                      )}
                      {d.status !== 'rejected' && (
                        <Button size="sm" variant="ghost" onClick={() => reviewMut.mutate({ id: d.id, decision: 'rejected' })}>
                          <XCircle className="h-4 w-4" /> {isRTL ? 'رفض' : 'Reject'}
                        </Button>
                      )}
                      {d.status === 'approved' && (
                        <Button size="sm" variant="ghost" onClick={() => reviewMut.mutate({ id: d.id, decision: 'revoked' })}>
                          <Ban className="h-4 w-4" /> {isRTL ? 'إلغاء' : 'Revoke'}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delMut.mutate(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};