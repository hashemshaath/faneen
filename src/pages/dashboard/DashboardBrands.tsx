import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Send, ShieldCheck, Clock, XCircle } from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  listApprovedBrands, listMyBrandRequests, createBrandRequest,
  requestTypeLabel, requestStatusLabel, brandStatusLabel, pick,
} from '@/modules/brands';

const DashboardBrands: React.FC = () => {
  const { isRTL } = useLanguage();
  const locale = isRTL ? 'ar' : 'en';
  usePageMeta({ title: isRTL ? 'العلامات التجارية' : 'Brands' });
  const { user } = useAuth();
  const { activeBusiness } = useActiveBusiness();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [notes, setNotes] = useState('');

  const { data: catalog = [], isLoading: loadingCatalog } = useQuery({
    queryKey: ['provider-brands-catalog', q],
    queryFn: () => listApprovedBrands({ q: q || undefined, limit: 40 }),
    staleTime: 30_000,
  });

  const { data: myRequests = [], isLoading: loadingReq } = useQuery({
    queryKey: ['provider-brand-requests', user?.id],
    queryFn: () => user ? listMyBrandRequests(user.id) : Promise.resolve([]),
    enabled: !!user,
    staleTime: 20_000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      return createBrandRequest({
        request_type: 'create_brand',
        business_id: activeBusiness?.id ?? null,
        user_id: user.id,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || null,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال الطلب للمراجعة' : 'Request submitted for review');
      setNameAr(''); setNameEn(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['provider-brand-requests', user?.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{isRTL ? 'العلامات التجارية' : 'Brands'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? 'تصفح العلامات المعتمدة واطلب إضافة علامات جديدة' : 'Browse approved brands and request additions'}
          </p>
        </div>

        {/* Request form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isRTL ? 'طلب إضافة علامة جديدة' : 'Request a new brand'}</CardTitle>
            <CardDescription>{isRTL ? 'سيتم مراجعة الطلب من قبل الإدارة قبل النشر' : 'Admin review required before publication'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={isRTL ? 'الاسم بالعربية *' : 'Arabic name *'} className="h-11" dir="auto" />
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={isRTL ? 'الاسم بالإنجليزية' : 'English name'} className="h-11" dir="auto" />
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'} rows={2} dir="auto" />
            <div className="flex justify-end">
              <Button onClick={() => submit.mutate()} disabled={!nameAr.trim() || submit.isPending}>
                <Send className="w-4 h-4 me-2" />
                {isRTL ? 'إرسال الطلب' : 'Submit request'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isRTL ? 'طلباتي' : 'My requests'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReq ? (
              <Skeleton className="h-16 w-full" />
            ) : myRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'لا توجد طلبات بعد' : 'No requests yet'}</p>
            ) : (
              <div className="space-y-2">
                {myRequests.map((r) => {
                  const Icon = r.status === 'approved' ? ShieldCheck : r.status === 'rejected' ? XCircle : Clock;
                  const color = r.status === 'approved' ? 'text-success' : r.status === 'rejected' ? 'text-destructive' : 'text-warning';
                  return (
                    <div key={r.id} className="flex items-start gap-3 p-3 border rounded-xl">
                      <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.name_ar}</span>
                          {r.ref_id && <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{r.ref_id}</code>}
                          <Badge variant="outline" className="text-xs">{pick(requestTypeLabel[r.request_type], locale)}</Badge>
                          <Badge variant="secondary" className="text-xs">{pick(requestStatusLabel[(r.status ?? 'pending') as keyof typeof requestStatusLabel], locale)}</Badge>
                        </div>
                        {r.reject_reason && <p className="text-xs text-destructive mt-1">{r.reject_reason}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Catalog */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? 'سجل العلامات المعتمدة' : 'Approved brand catalog'}</CardTitle>
            <div className="relative max-w-md mt-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isRTL ? 'بحث…' : 'Search…'} className="ps-9 h-10" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingCatalog ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'لا توجد علامات مطابقة' : 'No matching brands'}</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {catalog.map((b) => (
                  <div key={b.id} className="border rounded-xl p-3 flex items-center gap-3 hover-lift">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name_ar} className="w-10 h-10 rounded object-cover border" loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{locale === 'ar' ? b.name_ar : (b.name_en ?? b.name_ar)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {b.country_of_origin_code ?? ''} {b.is_verified ? '· ✓' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBrands;
