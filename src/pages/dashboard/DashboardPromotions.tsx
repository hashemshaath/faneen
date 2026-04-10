import React, { useState, useMemo } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Megaphone, Plus, Trash2, Pencil, Eye, Video, Tag, Calendar, X,
  Search, CheckCircle2, TrendingUp, Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PromotionType = 'ad' | 'offer' | 'video';
type FilterMode = 'all' | 'active' | 'expired';

interface PromotionForm {
  title_ar: string; title_en: string; description_ar: string; description_en: string;
  promotion_type: PromotionType; discount_percentage: string; original_price: string;
  offer_price: string; image_url: string; video_url: string; start_date: string;
  end_date: string; is_active: boolean;
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
      const { data } = await supabase.from('promotions').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const filteredPromotions = useMemo(() => {
    let result = promotions;
    if (filterMode === 'active') result = result.filter((p: any) => p.is_active && !(p.end_date && new Date(p.end_date) < new Date()));
    if (filterMode === 'expired') result = result.filter((p: any) => p.end_date && new Date(p.end_date) < new Date());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) => p.title_ar.toLowerCase().includes(q) || (p.title_en || '').toLowerCase().includes(q));
    }
    return result;
  }, [promotions, filterMode, searchQuery]);

  const stats = useMemo(() => ({
    total: promotions.length,
    active: promotions.filter((p: any) => p.is_active && !(p.end_date && new Date(p.end_date) < new Date())).length,
    expired: promotions.filter((p: any) => p.end_date && new Date(p.end_date) < new Date()).length,
    totalViews: promotions.reduce((s: number, p: any) => s + (p.views_count || 0), 0),
  }), [promotions]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      const payload: any = {
        business_id: businessId, title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        promotion_type: form.promotion_type,
        discount_percentage: form.discount_percentage ? Number(form.discount_percentage) : null,
        original_price: form.original_price ? Number(form.original_price) : null,
        offer_price: form.offer_price ? Number(form.offer_price) : null,
        image_url: form.image_url || null, video_url: form.video_url || null,
        start_date: form.start_date, end_date: form.end_date || null, is_active: form.is_active,
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
      closeForm();
      toast.success(editingId ? (isRTL ? 'تم التحديث بنجاح' : 'Updated successfully') : (isRTL ? 'تم الإضافة بنجاح' : 'Added successfully'));
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
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully');
    },
  });

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', promotion_type: p.promotion_type,
      discount_percentage: p.discount_percentage?.toString() || '', original_price: p.original_price?.toString() || '',
      offer_price: p.offer_price?.toString() || '', image_url: p.image_url || '', video_url: p.video_url || '',
      start_date: p.start_date, end_date: p.end_date || '', is_active: p.is_active,
    });
    setShowForm(true);
  };

  const typeLabels: Record<string, { ar: string; en: string; icon: React.ReactNode }> = {
    ad: { ar: 'إعلان', en: 'Ad', icon: <Megaphone className="w-4 h-4" /> },
    offer: { ar: 'عرض خاص', en: 'Offer', icon: <Tag className="w-4 h-4" /> },
    video: { ar: 'فيديو', en: 'Video', icon: <Video className="w-4 h-4" /> },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl">{isRTL ? 'الإعلانات والعروض' : 'Promotions & Offers'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'أنشئ إعلانات وعروض خاصة وفيديوهات ترويجية لجذب العملاء' : 'Create ads, special offers, and videos to attract clients'}
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-2" />{isRTL ? 'إضافة عرض' : 'Add Promotion'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {promotions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, icon: Megaphone, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'نشطة' : 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: isRTL ? 'منتهية' : 'Expired', value: stats.expired, icon: Calendar, color: 'text-muted-foreground bg-muted' },
              { label: isRTL ? 'المشاهدات' : 'Views', value: stats.totalViews, icon: Eye, color: 'text-amber-600 bg-amber-500/10' },
            ].map((stat, i) => (
              <Card key={i} className="border-border/40 bg-card/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {promotions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isRTL ? 'ابحث في العروض...' : 'Search promotions...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
            </div>
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">{isRTL ? 'نشطة' : 'Active'}</TabsTrigger>
                <TabsTrigger value="expired" className="text-xs px-3">{isRTL ? 'منتهية' : 'Expired'}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {editingId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editingId ? (isRTL ? 'تعديل العرض' : 'Edit Promotion') : (isRTL ? 'إضافة عرض جديد' : 'Add New Promotion')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Type selector */}
              <div className="space-y-2">
                <Label>{isRTL ? 'نوع العرض' : 'Promotion Type'}</Label>
                <Select value={form.promotion_type} onValueChange={(v: PromotionType) => setForm({ ...form, promotion_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offer">{isRTL ? 'عرض خاص' : 'Special Offer'}</SelectItem>
                    <SelectItem value="ad">{isRTL ? 'إعلان' : 'Advertisement'}</SelectItem>
                    <SelectItem value="video">{isRTL ? 'فيديو ترويجي' : 'Promotional Video'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Titles with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                  <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} placeholder={isRTL ? 'مثال: خصم 30% على جميع النوافذ' : 'e.g. 30% off all windows'} />
                  <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                    onTranslated={(v) => setForm(f => ({ ...f, title_en: v }))}
                    onImproved={(v) => setForm(f => ({ ...f, title_ar: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                  <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" placeholder="e.g. 30% off all windows" />
                  {form.title_en && (
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_en: v }))} />
                  )}
                </div>
              </div>

              {/* Descriptions with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} placeholder={isRTL ? 'تفاصيل العرض...' : 'Promotion details...'} />
                  {form.description_ar && (
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_ar: v }))} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" placeholder="Promotion details..." />
                  {form.description_en && (
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_en: v }))} />
                  )}
                </div>
              </div>

              {/* Pricing for offers */}
              {form.promotion_type === 'offer' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" />{isRTL ? 'نسبة الخصم %' : 'Discount %'}</Label>
                    <Input type="number" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'السعر الأصلي' : 'Original Price'}</Label>
                    <Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'سعر العرض' : 'Offer Price'}</Label>
                    <Input type="number" value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })} dir="ltr" />
                  </div>
                </div>
              )}

              {/* Image upload */}
              <div className="space-y-2">
                <Label>{isRTL ? 'صورة العرض' : 'Promotion Image'}</Label>
                <ImageUpload
                  bucket="business-assets"
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  onRemove={() => setForm({ ...form, image_url: '' })}
                  aspectRatio="video"
                  placeholder={isRTL ? 'اضغط لرفع صورة العرض' : 'Click to upload promotion image'}
                />
              </div>

              {/* Video URL */}
              {(form.promotion_type === 'video' || form.promotion_type === 'ad') && (
                <div className="space-y-2">
                  <Label>{isRTL ? 'رابط الفيديو' : 'Video URL'}</Label>
                  <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} dir="ltr" placeholder="https://youtube.com/..." />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ البداية' : 'Start Date'}</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} dir="ltr" />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <div>
                  <Label className="cursor-pointer">{isRTL ? 'عرض نشط' : 'Active Promotion'}</Label>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'العروض النشطة تظهر للعملاء في صفحة العروض' : 'Active promotions appear on the offers page'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editingId ? (isRTL ? 'تحديث العرض' : 'Update') : (isRTL ? 'إضافة العرض' : 'Add Promotion')}
                  {!saveMutation.isPending && <CheckCircle2 className="w-4 h-4 ms-2" />}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promotions List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1,2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : promotions.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Megaphone className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد إعلانات أو عروض' : 'No promotions yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {isRTL ? 'أنشئ أول عرض أو إعلان لجذب المزيد من العملاء' : 'Create your first promotion to attract more clients'}
              </p>
              <Button variant="hero" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول عرض' : 'Add First Promotion'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPromotions.map((p: any) => {
              const t = typeLabels[p.promotion_type];
              const isExpired = p.end_date && new Date(p.end_date) < new Date();
              return (
                <Card key={p.id} className={`overflow-hidden border-border/40 hover:border-primary/30 transition-all group ${isExpired ? 'opacity-60' : ''}`}>
                  {p.image_url && (
                    <div className="h-44 overflow-hidden relative">
                      <img src={p.image_url} alt={isRTL ? p.title_ar : (p.title_en || p.title_ar)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3 gap-2">
                        <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5 me-1" />{isRTL ? 'تعديل' : 'Edit'}
                        </Button>
                        <Button size="sm" variant="destructive" className="shadow-lg" onClick={() => setDeleteConfirm(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">{t?.icon} {t?.[isRTL ? 'ar' : 'en']}</Badge>
                          {isExpired && <Badge variant="destructive" className="text-xs">{isRTL ? 'منتهي' : 'Expired'}</Badge>}
                          {!p.is_active && <Badge variant="outline" className="text-xs">{isRTL ? 'غير نشط' : 'Inactive'}</Badge>}
                        </div>
                        <h3 className="font-semibold">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                      </div>
                      {!p.image_url && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(p.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                    {(isRTL ? p.description_ar : (p.description_en || p.description_ar)) && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{isRTL ? p.description_ar : (p.description_en || p.description_ar)}</p>
                    )}
                    {p.promotion_type === 'offer' && p.original_price && (
                      <div className="flex items-center gap-3">
                        <span className="line-through text-muted-foreground text-sm">{Number(p.original_price).toLocaleString()} {p.currency_code}</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>
                        {p.discount_percentage && <Badge className="bg-destructive text-destructive-foreground">-{p.discount_percentage}%</Badge>}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف العرض' : 'Delete Promotion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? 'هل أنت متأكد من حذف هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure? This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DashboardPromotions;
