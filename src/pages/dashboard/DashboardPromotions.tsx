import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, Plus, Trash2, Edit, Eye, Video, Tag, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type PromotionType = 'ad' | 'offer' | 'video';

interface PromotionForm {
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  promotion_type: PromotionType;
  discount_percentage: string;
  original_price: string;
  offer_price: string;
  image_url: string;
  video_url: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const emptyForm: PromotionForm = {
  title_ar: '', title_en: '', description_ar: '', description_en: '',
  promotion_type: 'offer', discount_percentage: '', original_price: '',
  offer_price: '', image_url: '', video_url: '', start_date: new Date().toISOString().split('T')[0],
  end_date: '', is_active: true,
};

const DashboardPromotions = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);

  const { data: businessId } = useQuery({
    queryKey: ['my-business-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['my-promotions', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      const payload: any = {
        business_id: businessId,
        title_ar: form.title_ar,
        title_en: form.title_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        promotion_type: form.promotion_type,
        discount_percentage: form.discount_percentage ? Number(form.discount_percentage) : null,
        original_price: form.original_price ? Number(form.original_price) : null,
        offer_price: form.offer_price ? Number(form.offer_price) : null,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('promotions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', promotion_type: p.promotion_type,
      discount_percentage: p.discount_percentage?.toString() || '', original_price: p.original_price?.toString() || '',
      offer_price: p.offer_price?.toString() || '', image_url: p.image_url || '', video_url: p.video_url || '',
      start_date: p.start_date, end_date: p.end_date || '', is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const typeLabels: Record<string, { ar: string; en: string; icon: React.ReactNode }> = {
    ad: { ar: 'إعلان', en: 'Ad', icon: <Megaphone className="w-4 h-4" /> },
    offer: { ar: 'عرض خاص', en: 'Offer', icon: <Tag className="w-4 h-4" /> },
    video: { ar: 'فيديو', en: 'Video', icon: <Video className="w-4 h-4" /> },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl">{isRTL ? 'الإعلانات والعروض' : 'Promotions & Offers'}</h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'أنشئ إعلانات وعروض خاصة وفيديوهات ترويجية' : 'Create ads, special offers, and promotional videos'}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة' : 'Add'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? (isRTL ? 'تعديل' : 'Edit') : (isRTL ? 'إضافة جديد' : 'Add New')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>{isRTL ? 'النوع' : 'Type'}</Label>
                  <Select value={form.promotion_type} onValueChange={(v: PromotionType) => setForm({ ...form, promotion_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer">{isRTL ? 'عرض خاص' : 'Special Offer'}</SelectItem>
                      <SelectItem value="ad">{isRTL ? 'إعلان' : 'Advertisement'}</SelectItem>
                      <SelectItem value="video">{isRTL ? 'فيديو ترويجي' : 'Promotional Video'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} *</Label>
                    <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={2} dir="ltr" />
                  </div>
                </div>

                {form.promotion_type === 'offer' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>{isRTL ? 'نسبة الخصم %' : 'Discount %'}</Label>
                      <Input type="number" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} dir="ltr" />
                    </div>
                    <div className="space-y-1">
                      <Label>{isRTL ? 'السعر الأصلي' : 'Original Price'}</Label>
                      <Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} dir="ltr" />
                    </div>
                    <div className="space-y-1">
                      <Label>{isRTL ? 'سعر العرض' : 'Offer Price'}</Label>
                      <Input type="number" value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })} dir="ltr" />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label>{isRTL ? 'رابط الصورة' : 'Image URL'}</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} dir="ltr" placeholder="https://..." />
                </div>

                {(form.promotion_type === 'video' || form.promotion_type === 'ad') && (
                  <div className="space-y-1">
                    <Label>{isRTL ? 'رابط الفيديو (YouTube/Vimeo)' : 'Video URL (YouTube/Vimeo)'}</Label>
                    <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} dir="ltr" placeholder="https://youtube.com/..." />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'تاريخ البداية' : 'Start Date'}</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} dir="ltr" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>{isRTL ? 'نشط' : 'Active'}</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>

                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} className="w-full" variant="hero">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1,2].map(i => <Card key={i}><CardContent className="p-6"><div className="h-32 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
        ) : promotions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Megaphone className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">{isRTL ? 'لا توجد إعلانات أو عروض' : 'No promotions yet'}</p>
              <p className="text-sm">{isRTL ? 'أنشئ أول عرض أو إعلان لجذب المزيد من العملاء' : 'Create your first promotion to attract more clients'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {promotions.map((p: any) => {
              const t = typeLabels[p.promotion_type];
              const isExpired = p.end_date && new Date(p.end_date) < new Date();
              return (
                <Card key={p.id} className={`border-border/50 ${isExpired ? 'opacity-60' : ''}`}>
                  {p.image_url && (
                    <div className="h-40 overflow-hidden rounded-t-lg">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {t?.icon} {t?.[isRTL ? 'ar' : 'en']}
                          </Badge>
                          {isExpired && <Badge variant="destructive" className="text-xs">{isRTL ? 'منتهي' : 'Expired'}</Badge>}
                          {!p.is_active && <Badge variant="outline" className="text-xs">{isRTL ? 'غير نشط' : 'Inactive'}</Badge>}
                        </div>
                        <h3 className="font-medium">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    {p.promotion_type === 'offer' && p.original_price && (
                      <div className="flex items-center gap-3">
                        <span className="line-through text-muted-foreground text-sm">{Number(p.original_price).toLocaleString()} {p.currency_code}</span>
                        <span className="text-lg font-bold text-green-600">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>
                        {p.discount_percentage && <Badge className="bg-red-500 text-white">-{p.discount_percentage}%</Badge>}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                      {p.end_date && <span>→ {new Date(p.end_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views_count}</span>
                    </div>
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

export default DashboardPromotions;
