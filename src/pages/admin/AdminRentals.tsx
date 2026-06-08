import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Boxes, CheckCircle2, XCircle, Loader2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RentalCategories, RentalItems, ITEM_STATUS_LABELS } from '@/modules/rentals';
import type { RentalCategory, RentalItem } from '@/modules/rentals';
import { RentalOpsQueueCard } from '@/modules/rentals';
import { toast } from 'sonner';

interface CatalogRow {
  id: string;
  name_ar: string;
  name_en: string | null;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  estimated_daily_price: number | null;
  currency: string | null;
  is_active: boolean;
}

/** Admin rentals — moderation + ops snapshot. AdminRoute pattern: inside DashboardLayout. */
const AdminRentals: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<RentalItem[]>([]);
  const [allItems, setAllItems] = useState<RentalItem[]>([]);
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);

  const refresh = async () => {
    const [cats, pend, all, cat] = await Promise.all([
      RentalCategories.listCategories(),
      supabase.from('rental_items').select('*').eq('status', 'pending_review').order('created_at', { ascending: false }),
      supabase.from('rental_items').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('rental_equipment_catalog').select('id,name_ar,name_en,brand,model,category_id,estimated_daily_price,currency,is_active').order('name_ar', { ascending: true }),
    ]);
    setCategories(cats.data ?? []);
    setPending((pend.data as RentalItem[] | null) ?? []);
    setAllItems((all.data as RentalItem[] | null) ?? []);
    setCatalog(((cat.data as CatalogRow[] | null) ?? []));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const approve = async (id: string) => {
    const { error } = await RentalItems.setItemStatus(id, 'approved', { publish: true });
    if (error) toast.error(error.message);
    else { toast.success(bi('تم الاعتماد والنشر','Approved & published')); await refresh(); }
  };
  const reject = async (id: string) => {
    const { error } = await RentalItems.setItemStatus(id, 'rejected', { publish: false });
    if (error) toast.error(error.message);
    else { toast.success(bi('تم الرفض','Rejected')); await refresh(); }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16 md:pb-20">
        <PageHeader icon={Boxes} title={bi('مركز التأجير','Rental Center')} subtitle={bi('مراجعة العناصر، نظرة على العقود والتمديدات، تصنيفات وSEO.','Moderate items, review orders/extensions, manage categories & SEO.')} />

        {/* RENTAL-MICROSERVICE-2 — unified ops queue (replaces ad-hoc tiles). */}
        <RentalOpsQueueCard />

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending"><Bi ar="للمراجعة" en="Pending" /></TabsTrigger>
            <TabsTrigger value="all"><Bi ar="جميع العناصر" en="All items" /></TabsTrigger>
            <TabsTrigger value="categories"><Bi ar="التصنيفات" en="Categories" /></TabsTrigger>
            <TabsTrigger value="catalog"><Bi ar="الكتالوج الرئيسي" en="Master Catalog" /> ({catalog.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pending.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground"><Bi ar="لا توجد عناصر بانتظار المراجعة." en="No items pending review." /></Card>
            ) : (
              <div className="space-y-3">
                {pending.map(it => (
                  <Card key={it.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover-lift">
                    <div>
                      <div className="font-medium">{isRTL ? it.name_ar : (it.name_en || it.name_ar)}</div>
                      <div className="text-xs text-muted-foreground tech-content">{it.ref_id} · {it.base_price} {it.currency}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => reject(it.id)} className="text-red-600"><XCircle className="size-4 me-1" /><Bi ar="رفض" en="Reject" /></Button>
                      <Button size="sm" onClick={() => approve(it.id)} className="hover-lift"><CheckCircle2 className="size-4 me-1" /><Bi ar="اعتماد ونشر" en="Approve & publish" /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {allItems.map(it => (
                <Card key={it.id} className="p-4 hover-lift">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{isRTL ? it.name_ar : (it.name_en || it.name_ar)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{isRTL ? ITEM_STATUS_LABELS[it.status].ar : ITEM_STATUS_LABELS[it.status].en}</span>
                  </div>
                  <div className="text-xs text-muted-foreground tech-content mt-1">{it.ref_id}</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {categories.map(c => (
                <Card key={c.id} className="p-4 hover-lift">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{isRTL ? c.name_ar : c.name_en}</span>
                    <span className="text-xs tech-content text-muted-foreground">{c.ref_id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">/{c.slug}</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="mt-4">
            {catalog.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground"><Bi ar="لا توجد عناصر في الكتالوج." en="Catalog is empty." /></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {catalog.map(c => {
                  const cat = categories.find(x => x.id === c.category_id);
                  return (
                    <Card key={c.id} className="p-4 hover-lift">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</div>
                          {(c.brand || c.model) && (
                            <div className="text-xs text-muted-foreground tech-content truncate">{[c.brand, c.model].filter(Boolean).join(' · ')}</div>
                          )}
                          {cat && <div className="text-xs text-muted-foreground mt-0.5">{isRTL ? cat.name_ar : cat.name_en}</div>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'}`}>
                          {c.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                        </span>
                      </div>
                      {c.estimated_daily_price != null && (
                        <div className="text-xs tech-content text-muted-foreground mt-2">
                          {c.estimated_daily_price} {c.currency || 'SAR'} / {isRTL ? 'يوم' : 'day'}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminRentals;