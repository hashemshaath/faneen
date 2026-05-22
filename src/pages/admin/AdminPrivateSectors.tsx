import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { listBusinessesByIds } from '@/modules/businesses';
import { toast } from 'sonner';
import { ShieldCheck, Search, CheckCircle2, XCircle, Pause, RotateCcw, Pencil, FileClock, Layers, Trash2, Users } from 'lucide-react';
import {
  listAllSectors, reviewSector, listGlobalAudit, listAuditForSector,
  updateSector, deleteSector, setSectorReason,
} from '@/features/private-sectors/service';
import {
  PS_STATUS_META, PS_BRAND_TYPE_META, PrivateSector, PrivateSectorStatus,
} from '@/features/private-sectors/types';
import { PrivateSectorForm } from '@/features/private-sectors/PrivateSectorForm';
import { SectorDistributorsPanel } from '@/features/private-sectors/SectorDistributorsPanel';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';

const STATUS_TABS: Array<{ key: PrivateSectorStatus | 'all'; ar: string; en: string }> = [
  { key: 'pending',   ar: 'قيد المراجعة', en: 'Pending' },
  { key: 'approved',  ar: 'معتمد',        en: 'Approved' },
  { key: 'rejected',  ar: 'مرفوض',        en: 'Rejected' },
  { key: 'suspended', ar: 'موقوف',        en: 'Suspended' },
  { key: 'draft',     ar: 'مسودة',        en: 'Draft' },
  { key: 'all',       ar: 'الكل',         en: 'All' },
];

const AdminPrivateSectors: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<PrivateSectorStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<PrivateSector> | null>(null);
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [distributorsFor, setDistributorsFor] = useState<string | null>(null);
  const [reasonOf, setReasonOf] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['admin-private-sectors', tab],
    queryFn: () => listAllSectors({ status: tab }),
  });

  const { data: globalAudit = [] } = useQuery({
    queryKey: ['admin-private-sectors-audit-global'],
    queryFn: () => listGlobalAudit(50),
  });

  const { data: focusAudit = [] } = useQuery({
    queryKey: ['admin-private-sector-audit', auditFor],
    enabled: !!auditFor,
    queryFn: () => listAuditForSector(auditFor!, 50),
  });

  const businessIds = useMemo(() => Array.from(new Set(sectors.map((s) => s.business_id))), [sectors]);
  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-ps-businesses', businessIds.sort().join(',')],
    enabled: businessIds.length > 0,
    queryFn: async () => {
      const { data } = await listBusinessesByIds<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        ref_id: string | null;
      }>({
        ids: businessIds,
        select: 'id, name_ar, name_en, ref_id',
      });
      return data ?? [];
    },
  });
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-private-sectors'] });

  const reviewMut = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: PrivateSectorStatus; reason?: string }) =>
      reviewSector(id, decision, reason),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ['admin-private-sectors-audit-global'] });
      setReasonOf(null); setReason('');
      toast.success(isRTL ? 'تم تحديث الحالة' : 'Status updated');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const saveMut = useMutation({
    mutationFn: async ({ values, reason }: { values: Partial<PrivateSector>; reason?: string }) => {
      if (reason) await setSectorReason(reason);
      return updateSector(editing!.id!, values);
    },
    onSuccess: () => { refresh(); setEditing(null); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const delMut = useMutation({
    mutationFn: deleteSector,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter((s) => {
      const b = businessById.get(s.business_id);
      return [s.name_ar, s.name_en, s.ref_id, b?.name_ar, b?.name_en, b?.ref_id]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [sectors, search, businessById]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-bold">{isRTL ? 'إدارة القطاعات الخاصة' : 'Private Sectors Admin'}</h1>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'مراجعة واعتماد وإدارة كل القطاعات والعلامات الخاصة بالمزودين.' : 'Review, approve and manage all provider-owned brands and sub-sectors.'}
              </p>
            </div>
          </div>
        </div>

        {editing && (
          <PrivateSectorForm
            initial={editing}
            busy={saveMut.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={async (v, reason) => { await saveMut.mutateAsync({ values: v, reason }); }}
          />
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as PrivateSectorStatus | 'all')}>
          <TabsList className="flex-wrap h-auto">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{isRTL ? t.ar : t.en}</TabsTrigger>
            ))}
          </TabsList>

          <div className="relative max-w-md mt-4">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input className="ps-10" placeholder={isRTL ? 'بحث بالاسم/المنشأة/المعرف…' : 'Search by name / business / ref…'}
                   value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{isRTL ? 'جاري التحميل…' : 'Loading…'}</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد قطاعات بهذه الحالة.' : 'No sectors in this state.'}</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((s) => {
                  const meta = PS_STATUS_META[s.status];
                  const parent = ONBOARDING_SECTORS.find((p) => p.id === s.parent_sector);
                  const biz = businessById.get(s.business_id);
                  return (
                    <Card key={s.id} className="hover-lift">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</span>
                              <span className="text-xs text-muted-foreground tech-content">{s.ref_id}</span>
                              <Badge variant="outline" className={meta.tone}>{isRTL ? meta.ar : meta.en}</Badge>
                              <Badge variant="outline">{isRTL ? PS_BRAND_TYPE_META[s.brand_type].ar : PS_BRAND_TYPE_META[s.brand_type].en}</Badge>
                              {parent && <Badge variant="secondary">{isRTL ? parent.name_ar : parent.name_en}</Badge>}
                            </div>
                            {biz && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {isRTL ? 'المنشأة:' : 'Business:'} <span className="font-medium">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                                <span className="ms-2 tech-content">{biz.ref_id}</span>
                              </p>
                            )}
                            {(s.short_description_ar || s.short_description_en) && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {isRTL ? (s.short_description_ar || s.short_description_en) : (s.short_description_en || s.short_description_ar)}
                              </p>
                            )}
                            {s.status === 'rejected' && s.rejection_reason && (
                              <p className="mt-2 text-xs text-destructive">{isRTL ? 'سبب الرفض: ' : 'Rejection reason: '}{s.rejection_reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {s.status !== 'approved' && (
                            <Button size="sm" onClick={() => reviewMut.mutate({ id: s.id, decision: 'approved' })}>
                              <CheckCircle2 className="h-4 w-4" /> {isRTL ? 'اعتماد' : 'Approve'}
                            </Button>
                          )}
                          {s.status !== 'rejected' && (
                            <Button size="sm" variant="destructive" onClick={() => { setReasonOf(s.id); setReason(''); }}>
                              <XCircle className="h-4 w-4" /> {isRTL ? 'رفض' : 'Reject'}
                            </Button>
                          )}
                          {s.status !== 'suspended' && (
                            <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ id: s.id, decision: 'suspended' })}>
                              <Pause className="h-4 w-4" /> {isRTL ? 'إيقاف' : 'Suspend'}
                            </Button>
                          )}
                          {s.status !== 'draft' && (
                            <Button size="sm" variant="ghost" onClick={() => reviewMut.mutate({ id: s.id, decision: 'draft' })}>
                              <RotateCcw className="h-4 w-4" /> {isRTL ? 'إعادة للمسودة' : 'Reset to draft'}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                            <Pencil className="h-4 w-4" /> {isRTL ? 'تعديل' : 'Edit'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAuditFor(auditFor === s.id ? null : s.id)}>
                            <FileClock className="h-4 w-4" /> {isRTL ? 'السجل' : 'Audit'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDistributorsFor(distributorsFor === s.id ? null : s.id)}>
                            <Users className="h-4 w-4" /> {isRTL ? 'الموزعون' : 'Distributors'}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delMut.mutate(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {reasonOf === s.id && (
                          <div className="border rounded-lg p-3 bg-muted/40 space-y-2">
                            <Textarea dir="auto" rows={2} placeholder={isRTL ? 'سبب الرفض…' : 'Rejection reason…'}
                                      value={reason} onChange={(e) => setReason(e.target.value)} />
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="destructive" disabled={!reason.trim() || reviewMut.isPending}
                                      onClick={() => reviewMut.mutate({ id: s.id, decision: 'rejected', reason })}>
                                {isRTL ? 'تأكيد الرفض' : 'Confirm reject'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setReasonOf(null)}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {auditFor === s.id && (
                          <div className="border-t pt-3 space-y-1.5">
                            {focusAudit.length === 0 ? (
                              <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد إدخالات بعد.' : 'No entries yet.'}</p>
                            ) : focusAudit.map((a) => (
                              <div key={a.id} className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                                <span className="text-muted-foreground">{a.entity_type}</span>
                                {a.notes && <span className="text-muted-foreground italic truncate">"{a.notes}"</span>}
                                <span className="text-muted-foreground tech-content ms-auto">{new Date(a.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {distributorsFor === s.id && (
                          <div className="border-t pt-3">
                            <SectorDistributorsPanel sectorId={s.id} canManage={true} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileClock className="h-4 w-4" /> {isRTL ? 'آخر نشاط على القطاعات الخاصة' : 'Recent global activity'}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {globalAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد نشاط بعد.' : 'No activity yet.'}</p>
            ) : globalAudit.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                <span className="text-muted-foreground">{a.entity_type}</span>
                <span className="text-muted-foreground tech-content ms-auto">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminPrivateSectors;