import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Layers, Plus, Pencil, Trash2, Send, Search, FileClock, Building2 } from 'lucide-react';
import {
  listSectorsForBusiness, createSector, updateSector, deleteSector,
  submitSector, listAuditForSector,
} from '@/features/private-sectors/service';
import {
  PS_STATUS_META, PS_BRAND_TYPE_META, PrivateSector,
} from '@/features/private-sectors/types';
import { PrivateSectorForm } from '@/features/private-sectors/PrivateSectorForm';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';

const DashboardPrivateSectors: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<PrivateSector> | null>(null);
  const [auditFor, setAuditFor] = useState<string | null>(null);

  // Resolve current user's business
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id, name_ar, name_en').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['my-private-sectors', business?.id],
    enabled: !!business?.id,
    queryFn: () => listSectorsForBusiness(business!.id),
  });

  const { data: audit = [] } = useQuery({
    queryKey: ['private-sector-audit', auditFor],
    enabled: !!auditFor,
    queryFn: () => listAuditForSector(auditFor!, 30),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? sectors.filter((s) => [s.name_ar, s.name_en, s.ref_id].filter(Boolean).some((v) => v!.toLowerCase().includes(q)))
      : sectors;
  }, [sectors, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-private-sectors', business?.id] });

  const saveMut = useMutation({
    mutationFn: async (values: Partial<PrivateSector>) => {
      if (editing?.id) return updateSector(editing.id, values);
      return createSector({ ...values, business_id: business!.id, name_ar: values.name_ar!, parent_sector: values.parent_sector ?? 'aluminum' });
    },
    onSuccess: () => { refresh(); setEditing(null); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const submitMut = useMutation({
    mutationFn: submitSector,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الإرسال للمراجعة' : 'Submitted for review'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const delMut = useMutation({
    mutationFn: deleteSector,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  if (!business) {
    return (
      <DashboardLayout>
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          {isRTL ? 'يجب إنشاء بيانات المنشأة أولاً.' : 'Please create your business profile first.'}
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Layers className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-bold">{isRTL ? 'القطاعات الخاصة' : 'Private Sectors'}</h1>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'علاماتك التجارية والوكالات وتخصصاتها — تخضع لموافقة الإدارة قبل النشر.' : 'Your brands, agencies and specializations — require admin approval before publishing.'}
              </p>
            </div>
          </div>
          {!editing && (
            <Button size="app" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> {isRTL ? 'قطاع خاص جديد' : 'New private sector'}
            </Button>
          )}
        </div>

        {editing && (
          <PrivateSectorForm
            initial={editing}
            busy={saveMut.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => { await saveMut.mutateAsync(v); }}
          />
        )}

        <div className="relative max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input className="ps-10" placeholder={isRTL ? 'بحث بالاسم أو المعرف…' : 'Search by name or ref id…'}
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{isRTL ? 'جاري التحميل…' : 'Loading…'}</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <div className="font-semibold">{isRTL ? 'لا توجد قطاعات خاصة بعد' : 'No private sectors yet'}</div>
            <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'أضف أول قطاع خاص بعلامتك التجارية.' : 'Add your first private sector.'}</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => {
              const meta = PS_STATUS_META[s.status];
              const parent = ONBOARDING_SECTORS.find((p) => p.id === s.parent_sector);
              return (
                <Card key={s.id} className="hover-lift">
                  <CardContent className="p-4 flex flex-wrap items-start gap-4">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover border" loading="lazy" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted grid place-items-center"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</span>
                        <span className="text-xs text-muted-foreground tech-content">{s.ref_id}</span>
                        <Badge variant="outline" className={meta.tone}>{isRTL ? meta.ar : meta.en}</Badge>
                        <Badge variant="outline">{isRTL ? PS_BRAND_TYPE_META[s.brand_type].ar : PS_BRAND_TYPE_META[s.brand_type].en}</Badge>
                        {parent && <Badge variant="secondary">{isRTL ? parent.name_ar : parent.name_en}</Badge>}
                      </div>
                      {(s.short_description_ar || s.short_description_en) && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {isRTL ? (s.short_description_ar || s.short_description_en) : (s.short_description_en || s.short_description_ar)}
                        </p>
                      )}
                      {s.status === 'rejected' && s.rejection_reason && (
                        <p className="mt-2 text-xs text-destructive">{isRTL ? 'سبب الرفض: ' : 'Rejection reason: '}{s.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(s.status === 'draft' || s.status === 'rejected') && (
                        <Button size="sm" onClick={() => submitMut.mutate(s.id)} disabled={submitMut.isPending}>
                          <Send className="h-4 w-4" /> {isRTL ? 'إرسال للمراجعة' : 'Submit'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                        <Pencil className="h-4 w-4" /> {isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAuditFor(auditFor === s.id ? null : s.id)}>
                        <FileClock className="h-4 w-4" /> {isRTL ? 'السجل' : 'Audit'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delMut.mutate(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {auditFor === s.id && (
                      <div className="w-full mt-2 border-t pt-3 space-y-1.5">
                        {audit.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد إدخالات بعد.' : 'No entries yet.'}</p>
                        ) : audit.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                            <span className="text-muted-foreground tech-content">{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPrivateSectors;