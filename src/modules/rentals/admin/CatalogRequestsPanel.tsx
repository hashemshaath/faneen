import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Loader2, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { toast } from 'sonner';

interface RequestRow {
  id: string;
  requester_user_id: string;
  requester_business_id: string | null;
  category_id: string | null;
  proposed_category_name_ar: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  brand: string | null;
  model: string | null;
  suggested_unit: string | null;
  suggested_price: number | null;
  currency: string | null;
  notes: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
}

export const CatalogRequestsPanel: React.FC = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from('rental_catalog_addition_requests').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setRows((data ?? []) as RequestRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [filter]);

  const approve = async (r: RequestRow) => {
    // Insert into catalog using requested fields
    const { data: created, error } = await supabase
      .from('rental_equipment_catalog')
      .insert({
        name_ar: r.name_ar,
        name_en: r.name_en,
        description_ar: r.description_ar,
        brand: r.brand,
        model: r.model,
        category_id: r.category_id,
        estimated_daily_price: r.suggested_price ?? 0,
        currency: r.currency ?? 'SAR',
        is_active: true,
        slug: (r.name_en || r.name_ar).toLowerCase().replace(/\s+/g, '-').slice(0, 60) + '-' + r.id.slice(0, 6),
      })
      .select('id')
      .single();
    if (error) { toast.error(error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('rental_catalog_addition_requests').update({
      status: 'approved',
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNote[r.id] ?? null,
      created_catalog_id: created?.id ?? null,
    }).eq('id', r.id);
    toast.success(bi('تمت الموافقة وإضافة المعدة للكتالوج','Approved & added to catalog'));
    await load();
  };

  const reject = async (r: RequestRow) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('rental_catalog_addition_requests').update({
      status: 'rejected',
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNote[r.id] ?? null,
    }).eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم رفض الطلب','Request rejected'));
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['pending','approved','rejected','all'] as const).map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s === 'pending' && bi('بانتظار المراجعة','Pending')}
            {s === 'approved' && bi('تمت الموافقة','Approved')}
            {s === 'rejected' && bi('مرفوض','Rejected')}
            {s === 'all' && bi('الكل','All')}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground space-y-2">
          <Inbox className="size-8 mx-auto" />
          <Bi ar="لا توجد طلبات في هذه الفئة." en="No requests in this bucket." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rows.map(r => (
            <Card key={r.id} className="p-4 space-y-2 hover-lift">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{isRTL ? r.name_ar : (r.name_en || r.name_ar)}</div>
                  <div className="text-xs text-muted-foreground tech-content">
                    {[r.brand, r.model].filter(Boolean).join(' · ') || '—'} · ~ {r.suggested_price ?? 0} {r.currency ?? 'SAR'}/{r.suggested_unit ?? 'day'}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.status}</span>
              </div>
              {r.proposed_category_name_ar && (
                <div className="text-xs"><Bi ar="تصنيف مقترح: " en="Proposed category: " />{r.proposed_category_name_ar}</div>
              )}
              {r.description_ar && <div className="text-sm text-muted-foreground">{r.description_ar}</div>}
              {r.notes && <div className="text-xs italic text-muted-foreground"><Bi ar="ملاحظات المزود: " en="Provider notes: " />{r.notes}</div>}
              {r.status === 'pending' && (
                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    rows={2}
                    dir="auto"
                    placeholder={bi('ملاحظات المراجعة (اختياري)','Review notes (optional)')}
                    value={reviewNote[r.id] ?? ''}
                    onChange={e => setReviewNote({ ...reviewNote, [r.id]: e.target.value })}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => reject(r)}>
                      <XCircle className="size-4 me-1" /><Bi ar="رفض" en="Reject" />
                    </Button>
                    <Button size="sm" onClick={() => approve(r)}>
                      <CheckCircle2 className="size-4 me-1" /><Bi ar="موافقة وإضافة للكتالوج" en="Approve & add to catalog" />
                    </Button>
                  </div>
                </div>
              )}
              {r.review_notes && (
                <div className="text-xs text-muted-foreground"><Bi ar="ملاحظات الإدارة: " en="Admin notes: " />{r.review_notes}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogRequestsPanel;