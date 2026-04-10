import React, { useState, useMemo, useCallback } from 'react';
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
  Search, CheckCircle2, Percent, LayoutGrid, LayoutList,
  GripVertical, Power, PowerOff, DollarSign, Layers, Copy,
  Maximize2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type PromotionType = 'ad' | 'offer' | 'video';
type FilterMode = 'all' | 'active' | 'expired';
type TypeFilter = 'all' | 'offer' | 'ad' | 'video';
type ViewMode = 'grid' | 'list';

interface PromotionForm {
  title_ar: string; title_en: string; description_ar: string; description_en: string;
  promotion_type: PromotionType; discount_percentage: string; discount_amount: string;
  original_price: string; offer_price: string; image_url: string; video_url: string;
  start_date: string; end_date: string; is_active: boolean; currency_code: string;
}

const emptyForm: PromotionForm = {
  title_ar: '', title_en: '', description_ar: '', description_en: '',
  promotion_type: 'offer', discount_percentage: '', discount_amount: '',
  original_price: '', offer_price: '', image_url: '', video_url: '',
  start_date: new Date().toISOString().split('T')[0], end_date: '',
  is_active: true, currency_code: 'SAR',
};

const typeConfig: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
  ad: { ar: 'إعلان', en: 'Ad', icon: Megaphone, color: 'text-blue-600 bg-blue-500/10' },
  offer: { ar: 'عرض خاص', en: 'Offer', icon: Tag, color: 'text-emerald-600 bg-emerald-500/10' },
  video: { ar: 'فيديو', en: 'Video', icon: Video, color: 'text-violet-600 bg-violet-500/10' },
};

/* ── Sortable Grid Card ── */
const SortableGridCard = React.memo(({ promo: p, isRTL, onEdit, onDelete, onToggleActive, onDuplicate, onPreview }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  const t = typeConfig[p.promotion_type];
  const isExpired = p.end_date && new Date(p.end_date) < new Date();
  const Icon = t?.icon || Tag;
  const title = isRTL ? p.title_ar : (p.title_en || p.title_ar);
  const desc = isRTL ? p.description_ar : (p.description_en || p.description_ar);

  return (
    <Card ref={setNodeRef} style={style} className={`overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-md transition-all group ${isDragging ? 'ring-2 ring-primary shadow-xl' : ''} ${isExpired ? 'opacity-60' : ''}`}>
      <div className="aspect-[16/11] bg-muted relative overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Icon className="w-10 h-10 text-muted-foreground/20" /></div>
        )}
        <div className="absolute top-1.5 start-1.5 flex items-center gap-1 flex-wrap">
          <Badge className={`text-[9px] border-0 shadow backdrop-blur-sm px-1.5 py-0 h-4 ${t?.color || ''}`}><Icon className="w-2.5 h-2.5 me-0.5" />{t?.[isRTL ? 'ar' : 'en']}</Badge>
          {isExpired && <Badge variant="destructive" className="text-[9px] shadow backdrop-blur-sm px-1.5 py-0 h-4">{isRTL ? 'منتهي' : 'Expired'}</Badge>}
          {!p.is_active && !isExpired && <Badge variant="outline" className="text-[9px] bg-background/80 backdrop-blur-sm px-1.5 py-0 h-4">{isRTL ? 'غير نشط' : 'Inactive'}</Badge>}
        </div>
        <button {...attributes} {...listeners} className="absolute top-1.5 end-1.5 bg-background/80 backdrop-blur-sm rounded-md p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm touch-none">
          <GripVertical className="w-3.5 h-3.5 text-foreground" />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1.5 p-2">
          {p.image_url && (
            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onPreview(p.image_url)}>
              <Maximize2 className="w-3 h-3 me-1" />{isRTL ? 'عرض' : 'View'}
            </Button>
          )}
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onEdit(p)}>
            <Pencil className="w-3 h-3 me-1" />{isRTL ? 'تعديل' : 'Edit'}
          </Button>
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onToggleActive(p)}>
            {p.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onDuplicate(p)}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="destructive" className="shadow-lg h-7 text-[11px] px-2" onClick={() => onDelete(p.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <CardContent className="p-2.5">
        <h3 className="text-xs sm:text-sm font-semibold truncate">{title}</h3>
        {desc && <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{desc}</p>}
        {p.promotion_type === 'offer' && p.original_price && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="line-through text-muted-foreground text-[10px]">{Number(p.original_price).toLocaleString()} {p.currency_code}</span>
            {p.offer_price && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>}
            {p.discount_percentage && <Badge className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0 h-4">-{p.discount_percentage}%</Badge>}
          </div>
        )}
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-1">
          <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
          {p.end_date && <span>→ {new Date(p.end_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>}
          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{p.views_count || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
});
SortableGridCard.displayName = 'SortableGridCard';

/* ── Sortable List Row ── */
const SortableListRow = React.memo(({ promo: p, isRTL, onEdit, onDelete, onToggleActive, onDuplicate, onPreview }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  const t = typeConfig[p.promotion_type];
  const isExpired = p.end_date && new Date(p.end_date) < new Date();
  const Icon = t?.icon || Tag;
  const title = isRTL ? p.title_ar : (p.title_en || p.title_ar);

  return (
    <Card ref={setNodeRef} style={style} className={`border-border/40 hover:border-primary/30 transition-all group ${isDragging ? 'ring-2 ring-primary shadow-xl' : ''} ${isExpired ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 p-2.5 sm:p-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"><GripVertical className="w-4 h-4" /></button>
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer" onClick={() => p.image_url && onPreview(p.image_url)}>
          {p.image_url ? (
            <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Icon className="w-5 h-5 text-muted-foreground/30" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-sm truncate">{title}</p>
            <Badge className={`text-[9px] border-0 px-1.5 py-0 h-4 ${t?.color || ''}`}><Icon className="w-2.5 h-2.5 me-0.5" />{t?.[isRTL ? 'ar' : 'en']}</Badge>
            {isExpired && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">{isRTL ? 'منتهي' : 'Expired'}</Badge>}
            {!p.is_active && !isExpired && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{isRTL ? 'غير نشط' : 'Inactive'}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {p.promotion_type === 'offer' && p.offer_price && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>
            )}
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{p.views_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(p)}>
            {p.is_active ? <PowerOff className="w-3.5 h-3.5 text-amber-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(p)}><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </Card>
  );
});
SortableListRow.displayName = 'SortableListRow';

/* ── Main ── */
const DashboardPromotions = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      const { data } = await supabase.from('promotions').select('*').eq('business_id', businessId!).order('sort_order').order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const filteredPromotions = useMemo(() => {
    let result = promotions;
    if (filterMode === 'active') result = result.filter((p: any) => p.is_active && !(p.end_date && new Date(p.end_date) < new Date()));
    if (filterMode === 'expired') result = result.filter((p: any) => p.end_date && new Date(p.end_date) < new Date());
    if (typeFilter !== 'all') result = result.filter((p: any) => p.promotion_type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) => p.title_ar.toLowerCase().includes(q) || (p.title_en || '').toLowerCase().includes(q));
    }
    return result;
  }, [promotions, filterMode, typeFilter, searchQuery]);

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
        discount_amount: form.discount_amount ? Number(form.discount_amount) : null,
        original_price: form.original_price ? Number(form.original_price) : null,
        offer_price: form.offer_price ? Number(form.offer_price) : null,
        image_url: form.image_url || null, video_url: form.video_url || null,
        start_date: form.start_date, end_date: form.end_date || null,
        is_active: form.is_active, currency_code: form.currency_code,
      };
      if (editingId) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        payload.sort_order = promotions.length;
        const { error } = await supabase.from('promotions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
      closeForm();
      toast.success(editingId ? (isRTL ? 'تم التحديث' : 'Updated') : (isRTL ? 'تم الإضافة' : 'Added'));
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
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (p: any) => {
      if (!businessId) throw new Error('No business');
      const { id, ref_id, created_at, updated_at, views_count, ...rest } = p;
      const { error } = await supabase.from('promotions').insert({
        ...rest, business_id: businessId,
        title_ar: `${p.title_ar} (${isRTL ? 'نسخة' : 'copy'})`,
        sort_order: promotions.length, views_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
      toast.success(isRTL ? 'تم النسخ' : 'Duplicated');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: any[]) => {
      await Promise.all(reordered.map((item, idx) => supabase.from('promotions').update({ sort_order: idx }).eq('id', item.id)));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
      toast.error(isRTL ? 'فشل حفظ الترتيب' : 'Failed to save order');
    },
  });

  const closeForm = useCallback(() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }, []);

  const openEdit = useCallback((p: any) => {
    setEditingId(p.id);
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', promotion_type: p.promotion_type,
      discount_percentage: p.discount_percentage?.toString() || '',
      discount_amount: p.discount_amount?.toString() || '',
      original_price: p.original_price?.toString() || '',
      offer_price: p.offer_price?.toString() || '', image_url: p.image_url || '', video_url: p.video_url || '',
      start_date: p.start_date, end_date: p.end_date || '', is_active: p.is_active,
      currency_code: p.currency_code || 'SAR',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredPromotions.findIndex((i: any) => i.id === active.id);
    const newIndex = filteredPromotions.findIndex((i: any) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove([...filteredPromotions], oldIndex, newIndex);
    queryClient.setQueryData(['my-promotions', businessId], reordered);
    reorderMutation.mutate(reordered);
  }, [filteredPromotions, businessId, queryClient, reorderMutation]);

  const handleDiscountChange = useCallback((val: string) => {
    setForm(f => {
      const updated = { ...f, discount_percentage: val };
      if (val && f.original_price) {
        const disc = Number(val) / 100;
        updated.offer_price = Math.round(Number(f.original_price) * (1 - disc)).toString();
        updated.discount_amount = Math.round(Number(f.original_price) * disc).toString();
      }
      return updated;
    });
  }, []);

  const handleOriginalPriceChange = useCallback((val: string) => {
    setForm(f => {
      const updated = { ...f, original_price: val };
      if (val && f.discount_percentage) {
        const disc = Number(f.discount_percentage) / 100;
        updated.offer_price = Math.round(Number(val) * (1 - disc)).toString();
        updated.discount_amount = Math.round(Number(val) * disc).toString();
      }
      return updated;
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {isRTL ? 'الإعلانات والعروض' : 'Promotions & Offers'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isRTL ? 'أنشئ إعلانات وعروض — اسحب لإعادة الترتيب' : 'Create ads & offers — drag to reorder'}
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" size="sm" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة عرض' : 'Add Promotion'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {promotions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: isRTL ? 'إجمالي' : 'Total', value: stats.total, icon: Megaphone, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'نشطة' : 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: isRTL ? 'منتهية' : 'Expired', value: stats.expired, icon: Calendar, color: 'text-muted-foreground bg-muted' },
              { label: isRTL ? 'مشاهدات' : 'Views', value: stats.totalViews, icon: Eye, color: 'text-amber-600 bg-amber-500/10' },
            ].map((s, i) => (
              <Card key={i} className="border-border/40 bg-card/50">
                <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                  <div><p className="text-lg sm:text-xl font-bold">{s.value}</p><p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {promotions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9 h-9" />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-auto h-9 text-xs gap-1">
                  <Tag className="w-3.5 h-3.5" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="offer">{isRTL ? 'عروض' : 'Offers'}</SelectItem>
                  <SelectItem value="ad">{isRTL ? 'إعلانات' : 'Ads'}</SelectItem>
                  <SelectItem value="video">{isRTL ? 'فيديو' : 'Videos'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-2.5">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs px-2.5">{isRTL ? 'نشطة' : 'Active'}</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs px-2.5">{isRTL ? 'منتهية' : 'Expired'}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex border border-border/40 rounded-lg overflow-hidden">
                <button className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button className={`p-1.5 ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}>
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  {editingId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editingId ? (isRTL ? 'تعديل العرض' : 'Edit Promotion') : (isRTL ? 'إضافة عرض جديد' : 'Add New Promotion')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type selector */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">{isRTL ? 'نوع العرض' : 'Type'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['offer', 'ad', 'video'] as PromotionType[]).map(type => {
                    const cfg = typeConfig[type];
                    const TypeIcon = cfg.icon;
                    const isSelected = form.promotion_type === type;
                    return (
                      <button key={type} onClick={() => setForm(f => ({ ...f, promotion_type: type }))}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-start ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/40 hover:border-primary/30'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.color}`}><TypeIcon className="w-3.5 h-3.5" /></div>
                        <span className="text-xs font-medium">{isRTL ? cfg.ar : cfg.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_ar: v }))} />
                  </div>
                  <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} placeholder={isRTL ? 'مثال: خصم 30% على النوافذ' : 'e.g. 30% off windows'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_en: v }))} />
                  </div>
                  <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" placeholder="e.g. 30% off windows" />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} placeholder={isRTL ? 'تفاصيل العرض...' : 'Details...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" placeholder="Details..." />
                </div>
              </div>

              {/* Pricing */}
              {form.promotion_type === 'offer' && (
                <div className="p-3 rounded-xl border border-border/40 bg-muted/30 space-y-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" />{isRTL ? 'السعر والخصم' : 'Pricing'}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">{isRTL ? 'السعر الأصلي' : 'Original'}</Label>
                      <Input type="number" value={form.original_price} onChange={(e) => handleOriginalPriceChange(e.target.value)} dir="ltr" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] flex items-center gap-0.5"><Percent className="w-2.5 h-2.5" />{isRTL ? 'الخصم' : 'Discount'}</Label>
                      <Input type="number" value={form.discount_percentage} onChange={(e) => handleDiscountChange(e.target.value)} dir="ltr" max="100" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">{isRTL ? 'قيمة الخصم' : 'Amount'}</Label>
                      <Input type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} dir="ltr" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">{isRTL ? 'سعر العرض' : 'Offer Price'}</Label>
                      <Input type="number" value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })} dir="ltr" className="h-9 font-bold" />
                    </div>
                  </div>
                  <Select value={form.currency_code} onValueChange={(v) => setForm({ ...form, currency_code: v })}>
                    <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['SAR', 'USD', 'EUR', 'AED'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Image */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">{isRTL ? 'صورة العرض' : 'Image'}</Label>
                <ImageUpload bucket="business-assets" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} onRemove={() => setForm({ ...form, image_url: '' })} aspectRatio="video" placeholder={isRTL ? 'اضغط لرفع صورة (16:9)' : 'Upload (16:9)'} />
              </div>

              {/* Video */}
              {(form.promotion_type === 'video' || form.promotion_type === 'ad') && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-1"><Video className="w-3.5 h-3.5" />{isRTL ? 'رابط الفيديو' : 'Video URL'}</Label>
                  <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} dir="ltr" placeholder="https://youtube.com/watch?v=..." className="h-9" />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'البداية' : 'Start'}</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} dir="ltr" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'الانتهاء' : 'End'}</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} dir="ltr" className="h-9" />
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <div>
                  <Label className="cursor-pointer text-xs sm:text-sm">{isRTL ? 'عرض نشط' : 'Active'}</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'يظهر للعملاء' : 'Visible to clients'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editingId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
            {[1, 2, 3, 4, 5, 6].map(i => viewMode === 'grid' ? <Skeleton key={i} className="aspect-[16/11] rounded-xl" /> : <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : promotions.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Megaphone className="w-8 h-8 text-primary" /></div>
              <h3 className="text-base font-semibold mb-2">{isRTL ? 'لا توجد عروض بعد' : 'No promotions yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">{isRTL ? 'أنشئ أول عرض لجذب العملاء' : 'Create your first promotion'}</p>
              <Button variant="hero" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول عرض' : 'Add First'}</Button>
            </CardContent>
          </Card>
        ) : filteredPromotions.length === 0 && promotions.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" /><p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredPromotions.map((p: any) => p.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredPromotions.map((p: any) => (
                    <SortableGridCard key={p.id} promo={p} isRTL={isRTL}
                      onEdit={openEdit} onDelete={(id: string) => setDeleteConfirm(id)}
                      onToggleActive={(pr: any) => toggleActiveMutation.mutate(pr)}
                      onDuplicate={(pr: any) => duplicateMutation.mutate(pr)}
                      onPreview={(url: string) => setPreviewUrl(url)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPromotions.map((p: any) => (
                    <SortableListRow key={p.id} promo={p} isRTL={isRTL}
                      onEdit={openEdit} onDelete={(id: string) => setDeleteConfirm(id)}
                      onToggleActive={(pr: any) => toggleActiveMutation.mutate(pr)}
                      onDuplicate={(pr: any) => duplicateMutation.mutate(pr)}
                      onPreview={(url: string) => setPreviewUrl(url)} />
                  ))}
                </div>
              )}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف العرض' : 'Delete Promotion'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewUrl(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 end-4 text-white hover:bg-white/10 z-10" onClick={() => setPreviewUrl(null)}>
            <X className="w-6 h-6" />
          </Button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPromotions;
