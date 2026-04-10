import React, { useState, useMemo, useCallback, useRef, useTransition } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Megaphone, Plus, Trash2, Pencil, Eye, Video, Tag, Calendar, X,
  Search, CheckCircle2, Percent, LayoutGrid, List,
  GripVertical, Power, PowerOff, DollarSign, Layers, Copy,
  Maximize2, Loader2, Download, EyeOff, AlertCircle, Zap, BarChart3,
  Clock, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type PromotionType = 'ad' | 'offer' | 'video';
type FilterMode = 'all' | 'active' | 'expired' | 'inactive';
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
  offer: { ar: 'عرض خاص', en: 'Offer', icon: Tag, color: 'text-primary bg-primary/10' },
  video: { ar: 'فيديو', en: 'Video', icon: Video, color: 'text-violet-600 bg-violet-500/10' },
};

/* ── Sortable Promo Card ── */
const SortablePromoCard = React.memo(({ promo: p, rtl, viewMode, isSelected, onEdit, onDelete, onToggle, onDuplicate, onPreview, onSelect }: {
  promo: any; rtl: boolean; viewMode: ViewMode; isSelected: boolean;
  onEdit: (p: any) => void; onDelete: (id: string) => void; onToggle: (p: any) => void;
  onDuplicate: (p: any) => void; onPreview: (url: string) => void; onSelect: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined };
  const t = typeConfig[p.promotion_type];
  const isExpired = p.end_date && new Date(p.end_date) < new Date();
  const Icon = t?.icon || Tag;
  const title = rtl ? p.title_ar : (p.title_en || p.title_ar);
  const desc = rtl ? p.description_ar : (p.description_en || p.description_ar);
  const daysLeft = p.end_date ? Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000) : null;
  const isEndingSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  if (viewMode === 'grid') {
    return (
      <div ref={setNodeRef} style={style} className="h-full">
        <div className={`relative rounded-2xl border bg-card overflow-hidden h-full group transition-all duration-200 hover:shadow-lg hover:border-primary/20 ${isExpired ? 'opacity-50' : ''} ${isSelected ? 'ring-2 ring-primary border-primary/30' : 'border-border/40'}`}>
          {/* Image */}
          <div className="aspect-[16/10] bg-muted relative overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50"><Icon className="w-10 h-10 text-muted-foreground/20" /></div>
            )}
            {/* Badges */}
            <div className="absolute top-2 start-2 flex flex-col gap-1">
              <Badge className={`text-[9px] border-0 shadow-sm backdrop-blur-sm px-1.5 py-0.5 ${t?.color || ''}`}>
                <Icon className="w-2.5 h-2.5 me-0.5" />{t?.[rtl ? 'ar' : 'en']}
              </Badge>
              {isExpired && <Badge variant="destructive" className="text-[9px] shadow-sm px-1.5 py-0.5">{rtl ? 'منتهي' : 'Expired'}</Badge>}
              {isEndingSoon && !isExpired && <Badge className="text-[9px] bg-amber-500 text-white shadow-sm px-1.5 py-0.5">{rtl ? `${daysLeft} أيام` : `${daysLeft}d left`}</Badge>}
              {!p.is_active && !isExpired && <Badge variant="outline" className="text-[9px] bg-background/80 backdrop-blur-sm px-1.5 py-0.5">{rtl ? 'غير نشط' : 'Inactive'}</Badge>}
            </div>
            {/* Select + Grip */}
            <div className="absolute top-2 end-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}
                className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center bg-background/80 backdrop-blur-sm shadow-sm ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
              </button>
            </div>
            <button {...attributes} {...listeners} className="absolute bottom-2 end-2 bg-background/80 backdrop-blur-sm rounded-lg p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm touch-none">
              <GripVertical className="w-3.5 h-3.5 text-foreground" />
            </button>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1 p-2">
              {p.image_url && <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2 shadow-lg" onClick={() => onPreview(p.image_url)}><Maximize2 className="w-3 h-3" /></Button>}
              <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2 shadow-lg" onClick={() => onEdit(p)}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2 shadow-lg" onClick={() => onToggle(p)}>
                {p.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2 shadow-lg" onClick={() => onDuplicate(p)}><Copy className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2 shadow-lg" onClick={() => onDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
          <div className="p-3">
            <h3 className="text-xs font-semibold truncate">{title}</h3>
            {desc && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{desc}</p>}
            {p.promotion_type === 'offer' && p.original_price && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="line-through text-muted-foreground text-[10px]">{Number(p.original_price).toLocaleString()}</span>
                {p.offer_price && <span className="text-xs font-bold text-primary">{Number(p.offer_price).toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground">{p.currency_code}</span></span>}
                {p.discount_percentage && <Badge className="bg-destructive text-destructive-foreground text-[8px] px-1 py-0 h-3.5">-{p.discount_percentage}%</Badge>}
              </div>
            )}
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-1.5">
              <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(p.start_date).toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
              {p.end_date && <span>→ {new Date(p.end_date).toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>}
              <span className="flex items-center gap-0.5 ms-auto"><Eye className="w-2.5 h-2.5" />{p.views_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div ref={setNodeRef} style={style}>
      <div className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-200 group hover:shadow-sm hover:border-primary/15 ${isExpired ? 'opacity-50' : ''} ${isSelected ? 'ring-2 ring-primary border-primary/30' : 'border-border/40'}`}>
        <button onClick={() => onSelect(p.id)} className={`w-[18px] h-[18px] rounded border-[1.5px] transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/20 hover:border-primary/60'}`}>
          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
        </button>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/25 hover:text-muted-foreground shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 cursor-pointer border border-border/30" onClick={() => p.image_url && onPreview(p.image_url)}>
          {p.image_url ? (
            <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Icon className="w-5 h-5 text-muted-foreground/30" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <Badge className={`text-[8px] border-0 px-1 py-0 h-3.5 ${t?.color || ''}`}>{t?.[rtl ? 'ar' : 'en']}</Badge>
            {isExpired && <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">{rtl ? 'منتهي' : 'Expired'}</Badge>}
            {isEndingSoon && !isExpired && <Badge className="text-[8px] bg-amber-500 text-white px-1 py-0 h-3.5">{rtl ? `${daysLeft} أيام` : `${daysLeft}d`}</Badge>}
            {!p.is_active && !isExpired && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{rtl ? 'غير نشط' : 'Off'}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {p.promotion_type === 'offer' && p.offer_price && (
              <span className="text-[10px] font-bold text-primary">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>
            )}
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(p.start_date).toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{p.views_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onToggle(p)}>
            {p.is_active ? <PowerOff className="w-3.5 h-3.5 text-amber-500" /> : <Power className="w-3.5 h-3.5 text-primary" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onDuplicate(p)}><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
});
SortablePromoCard.displayName = 'SortablePromoCard';

/* ═══════════════════════════════════ */
const DashboardPromotions = () => {
  const { isRTL: rtl } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ─── Data ─── */
  const { data: businessId } = useQuery({
    queryKey: ['my-business-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['my-promotions', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('promotions').select('*').eq('business_id', businessId!).order('sort_order').order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!businessId,
    staleTime: 3 * 60 * 1000,
  });

  /* ─── Derived ─── */
  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p: any) => p.is_active && !(p.end_date && new Date(p.end_date) < new Date())).length;
    const expired = promotions.filter((p: any) => p.end_date && new Date(p.end_date) < new Date()).length;
    const inactive = promotions.filter((p: any) => !p.is_active && !(p.end_date && new Date(p.end_date) < new Date())).length;
    const totalViews = promotions.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
    const complete = promotions.filter((p: any) => p.title_ar && p.description_ar && p.image_url).length;
    const completeness = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, active, expired, inactive, totalViews, completeness };
  }, [promotions]);

  const filteredPromotions = useMemo(() => {
    let result = [...promotions];
    if (filterMode === 'active') result = result.filter((p: any) => p.is_active && !(p.end_date && new Date(p.end_date) < new Date()));
    else if (filterMode === 'expired') result = result.filter((p: any) => p.end_date && new Date(p.end_date) < new Date());
    else if (filterMode === 'inactive') result = result.filter((p: any) => !p.is_active && !(p.end_date && new Date(p.end_date) < new Date()));
    if (typeFilter !== 'all') result = result.filter((p: any) => p.promotion_type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) => p.title_ar.toLowerCase().includes(q) || (p.title_en || '').toLowerCase().includes(q));
    }
    return result;
  }, [promotions, filterMode, typeFilter, searchQuery]);

  /* ─── Mutations ─── */
  const saveMut = useMutation({
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); closeForm(); toast.success(editingId ? (rtl ? 'تم التحديث' : 'Updated') : (rtl ? 'تمت الإضافة' : 'Added')); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('promotions').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); setDeleteConfirm(null); toast.success(rtl ? 'تم الحذف' : 'Deleted'); },
  });

  const toggleMut = useMutation({
    mutationFn: async (p: any) => { const { error } = await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); toast.success(rtl ? 'تم التحديث' : 'Updated'); },
  });

  const duplicateMut = useMutation({
    mutationFn: async (p: any) => {
      if (!businessId) throw new Error('No business');
      const { id, ref_id, created_at, updated_at, views_count, ...rest } = p;
      const { error } = await supabase.from('promotions').insert({ ...rest, business_id: businessId, title_ar: `${p.title_ar} (${rtl ? 'نسخة' : 'copy'})`, sort_order: promotions.length, views_count: 0 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); toast.success(rtl ? 'تم النسخ' : 'Duplicated'); },
  });

  const reorderMut = useMutation({
    mutationFn: async (reordered: any[]) => { await Promise.all(reordered.map((item, idx) => supabase.from('promotions').update({ sort_order: idx }).eq('id', item.id))); },
    onError: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async () => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('promotions').delete().eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); setSelectedIds(new Set()); toast.success(rtl ? 'تم الحذف' : 'Deleted'); },
  });

  const bulkToggleMut = useMutation({
    mutationFn: async (activate: boolean) => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('promotions').update({ is_active: activate }).eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-promotions'] }); setSelectedIds(new Set()); toast.success(rtl ? 'تم التحديث' : 'Updated'); },
  });

  /* ─── Callbacks ─── */
  const closeForm = useCallback(() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }, []);
  const scrollToForm = useCallback(() => { requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }, []);

  const openEdit = useCallback((p: any) => {
    setEditingId(p.id);
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', promotion_type: p.promotion_type,
      discount_percentage: p.discount_percentage?.toString() || '', discount_amount: p.discount_amount?.toString() || '',
      original_price: p.original_price?.toString() || '', offer_price: p.offer_price?.toString() || '',
      image_url: p.image_url || '', video_url: p.video_url || '', start_date: p.start_date,
      end_date: p.end_date || '', is_active: p.is_active, currency_code: p.currency_code || 'SAR',
    });
    setShowForm(true); scrollToForm();
  }, [scrollToForm]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filteredPromotions.findIndex((i: any) => i.id === active.id);
    const newIdx = filteredPromotions.findIndex((i: any) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove([...filteredPromotions], oldIdx, newIdx);
    queryClient.setQueryData(['my-promotions', businessId], reordered);
    reorderMut.mutate(reordered);
  }, [filteredPromotions, businessId, queryClient, reorderMut]);

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

  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredPromotions.length ? new Set() : new Set(filteredPromotions.map((p: any) => p.id)));
  }, [filteredPromotions]);

  const exportCSV = useCallback(() => {
    const rows = [['Title AR', 'Title EN', 'Type', 'Original Price', 'Offer Price', 'Discount%', 'Start', 'End', 'Active', 'Views'].join(','),
      ...promotions.map((p: any) => [`"${p.title_ar}"`, `"${p.title_en || ''}"`, p.promotion_type, p.original_price || '', p.offer_price || '', p.discount_percentage || '', p.start_date, p.end_date || '', p.is_active, p.views_count || 0].join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `promotions_${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
    toast.success(rtl ? 'تم التصدير' : 'Exported');
  }, [promotions, rtl]);

  const filterOptions = useMemo(() => [
    { key: 'all' as const, label: rtl ? 'الكل' : 'All', count: stats.total, icon: Layers },
    { key: 'active' as const, label: rtl ? 'نشطة' : 'Active', count: stats.active, icon: CheckCircle2 },
    { key: 'inactive' as const, label: rtl ? 'غير نشطة' : 'Inactive', count: stats.inactive, icon: EyeOff },
    { key: 'expired' as const, label: rtl ? 'منتهية' : 'Expired', count: stats.expired, icon: Clock },
  ], [rtl, stats]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">{rtl ? 'الإعلانات والعروض' : 'Promotions & Offers'}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{rtl ? `${stats.total} عرض · ${stats.active} نشط · ${stats.totalViews} مشاهدة` : `${stats.total} promotions · ${stats.active} active · ${stats.totalViews} views`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {promotions.length > 0 && (
              <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 me-1.5" />{rtl ? 'تصدير' : 'Export'}
              </Button>
            )}
            <Button variant="hero" size="sm" className="h-9 text-xs rounded-xl" onClick={() => { closeForm(); setShowForm(true); scrollToForm(); }}>
              <Plus className="w-3.5 h-3.5 me-1.5" />{rtl ? 'إضافة عرض' : 'Add Promotion'}
            </Button>
          </div>
        </div>

        {/* ═══ Stats ═══ */}
        {promotions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { l: rtl ? 'إجمالي' : 'Total', v: stats.total, icon: Megaphone, cls: 'text-primary bg-primary/10' },
              { l: rtl ? 'نشطة' : 'Active', v: stats.active, icon: CheckCircle2, cls: 'text-primary bg-primary/10' },
              { l: rtl ? 'غير نشطة' : 'Inactive', v: stats.inactive, icon: EyeOff, cls: 'text-muted-foreground bg-muted' },
              { l: rtl ? 'منتهية' : 'Expired', v: stats.expired, icon: Clock, cls: 'text-amber-600 bg-amber-500/10' },
              { l: rtl ? 'مشاهدات' : 'Views', v: stats.totalViews, icon: TrendingUp, cls: 'text-primary bg-primary/10' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/30 bg-card/50 hover:bg-card transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{s.v}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completeness */}
        {stats.completeness < 100 && stats.total > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/30 border border-accent/50">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium">{rtl ? 'اكتمال بيانات العروض' : 'Data completeness'}</span>
                <span className="text-[11px] font-bold text-primary">{stats.completeness}%</span>
              </div>
              <Progress value={stats.completeness} className="h-1.5" />
            </div>
          </div>
        )}

        {/* ═══ Add/Edit Form ═══ */}
        {showForm && (
          <div ref={formRef}>
            <Card className="border-primary/20 shadow-md animate-in fade-in-0 slide-in-from-top-2 duration-200 overflow-hidden rounded-2xl">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editingId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editingId ? (rtl ? 'تعديل العرض' : 'Edit Promotion') : (rtl ? 'إضافة عرض جديد' : 'New Promotion')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  {(['offer', 'ad', 'video'] as PromotionType[]).map(type => {
                    const cfg = typeConfig[type];
                    const TypeIcon = cfg.icon;
                    const isSelected = form.promotion_type === type;
                    return (
                      <button key={type} onClick={() => setForm(f => ({ ...f, promotion_type: type }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/30 hover:border-primary/30'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}><TypeIcon className="w-4 h-4" /></div>
                        <span className="text-xs font-medium">{rtl ? cfg.ar : cfg.en}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'العنوان (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                      <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={rtl}
                        onTranslated={v => setForm(f => ({ ...f, title_en: v }))}
                        onImproved={v => setForm(f => ({ ...f, title_ar: v }))} />
                    </div>
                    <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} placeholder={rtl ? 'مثال: خصم 30% على النوافذ' : 'e.g. 30% off windows'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                      <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={rtl}
                        onTranslated={v => setForm(f => ({ ...f, title_ar: v }))}
                        onImproved={v => setForm(f => ({ ...f, title_en: v }))} />
                    </div>
                    <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" placeholder="e.g. 30% off windows" className="h-9" />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                      <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={rtl}
                        onTranslated={v => setForm(f => ({ ...f, description_en: v }))}
                        onImproved={v => setForm(f => ({ ...f, description_ar: v }))} />
                    </div>
                    <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} placeholder={rtl ? 'تفاصيل العرض...' : 'Details...'} className="resize-none text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                      <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={rtl}
                        onTranslated={v => setForm(f => ({ ...f, description_ar: v }))}
                        onImproved={v => setForm(f => ({ ...f, description_en: v }))} />
                    </div>
                    <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} dir="ltr" placeholder="Details..." className="resize-none text-sm" />
                  </div>
                </div>

                {/* Pricing */}
                {form.promotion_type === 'offer' && (
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/20 space-y-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" />{rtl ? 'السعر والخصم' : 'Pricing'}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">{rtl ? 'السعر الأصلي' : 'Original'}</Label>
                        <Input type="number" value={form.original_price} onChange={e => handleOriginalPriceChange(e.target.value)} dir="ltr" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] flex items-center gap-0.5"><Percent className="w-2.5 h-2.5" />{rtl ? 'الخصم' : 'Discount'}</Label>
                        <Input type="number" value={form.discount_percentage} onChange={e => handleDiscountChange(e.target.value)} dir="ltr" max="100" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">{rtl ? 'قيمة الخصم' : 'Amount'}</Label>
                        <Input type="number" value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} dir="ltr" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">{rtl ? 'سعر العرض' : 'Offer Price'}</Label>
                        <Input type="number" value={form.offer_price} onChange={e => setForm(f => ({ ...f, offer_price: e.target.value }))} dir="ltr" className="h-9 font-bold" />
                      </div>
                    </div>
                    <Select value={form.currency_code} onValueChange={v => setForm(f => ({ ...f, currency_code: v }))}>
                      <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['SAR', 'USD', 'EUR', 'AED'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {/* Image */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{rtl ? 'صورة العرض' : 'Image'}</Label>
                  <ImageUpload bucket="business-assets" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} onRemove={() => setForm(f => ({ ...f, image_url: '' }))} aspectRatio="video" placeholder={rtl ? 'اضغط لرفع صورة (16:9)' : 'Upload (16:9)'} />
                </div>

                {/* Video */}
                {(form.promotion_type === 'video' || form.promotion_type === 'ad') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Video className="w-3.5 h-3.5" />{rtl ? 'رابط الفيديو' : 'Video URL'}</Label>
                    <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} dir="ltr" placeholder="https://youtube.com/watch?v=..." className="h-9" />
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{rtl ? 'البداية' : 'Start'}</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} dir="ltr" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{rtl ? 'الانتهاء' : 'End'}</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} dir="ltr" className="h-9" />
                  </div>
                </div>

                {/* Active */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/30">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <div>
                    <span className="text-xs font-medium">{rtl ? 'عرض نشط' : 'Active'}</span>
                    <p className="text-[10px] text-muted-foreground">{rtl ? 'يظهر للعملاء' : 'Visible to clients'}</p>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMut.mutate()} disabled={!form.title_ar || saveMut.isPending} variant="hero" className="flex-1 h-9 rounded-xl">
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <CheckCircle2 className="w-4 h-4 me-1.5" />}
                    {saveMut.isPending ? (rtl ? 'جاري الحفظ...' : 'Saving...') : editingId ? (rtl ? 'تحديث' : 'Update') : (rtl ? 'إضافة' : 'Add')}
                  </Button>
                  <Button variant="outline" className="h-9 rounded-xl" onClick={closeForm}>{rtl ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ Toolbar ═══ */}
        {promotions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={rtl ? 'ابحث...' : 'Search...'} value={searchQuery}
                  onChange={e => startTransition(() => setSearchQuery(e.target.value))}
                  className="ps-8 h-8 text-xs rounded-xl" />
              </div>
              <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-auto h-8 gap-1 text-[11px] border-border/30 rounded-xl">
                  <Tag className="w-3 h-3" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{rtl ? 'كل الأنواع' : 'All Types'}</SelectItem>
                  <SelectItem value="offer">{rtl ? 'عروض' : 'Offers'}</SelectItem>
                  <SelectItem value="ad">{rtl ? 'إعلانات' : 'Ads'}</SelectItem>
                  <SelectItem value="video">{rtl ? 'فيديو' : 'Videos'}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border border-border/30 rounded-xl overflow-hidden ms-auto">
                <button className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}><LayoutGrid className="w-3.5 h-3.5" /></button>
                <button className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={toggleSelectAll} className="p-1.5 rounded-xl border border-border/30 hover:bg-muted/50 transition-colors" title={rtl ? 'تحديد الكل' : 'Select All'}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${selectedIds.size === filteredPromotions.length && filteredPromotions.length > 0 ? 'text-primary' : 'text-muted-foreground/30'}`} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {filterOptions.map(f => (
                <button key={f.key} onClick={() => setFilterMode(f.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all ${filterMode === f.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <f.icon className="w-3 h-3" />
                  {f.label}
                  <span className={`text-[9px] px-1.5 py-px rounded-full ${filterMode === f.key ? 'bg-primary-foreground/20' : 'bg-background/60'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-primary/5 border border-primary/15 animate-in fade-in-0 duration-150">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{selectedIds.size} {rtl ? 'محددة' : 'selected'}</Badge>
            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg" onClick={() => bulkToggleMut.mutate(true)} disabled={bulkToggleMut.isPending}><Power className="w-3 h-3 me-0.5" />{rtl ? 'تفعيل' : 'Activate'}</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg" onClick={() => bulkToggleMut.mutate(false)} disabled={bulkToggleMut.isPending}><PowerOff className="w-3 h-3 me-0.5" />{rtl ? 'تعطيل' : 'Deactivate'}</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg text-destructive hover:text-destructive" onClick={() => bulkDeleteMut.mutate()} disabled={bulkDeleteMut.isPending}><Trash2 className="w-3 h-3 me-0.5" />{rtl ? 'حذف' : 'Delete'}</Button>
            <button className="ms-auto text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelectedIds(new Set())}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Delete Confirmation (inline) */}
        {deleteConfirm && (
          <div className="flex items-center gap-3 p-3 rounded-2xl border border-destructive/30 bg-destructive/5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{rtl ? 'تأكيد الحذف' : 'Confirm Delete'}</p>
              <p className="text-[11px] text-muted-foreground">{rtl ? 'لا يمكن التراجع عن هذا الإجراء' : 'This cannot be undone'}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setDeleteConfirm(null)}>{rtl ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs rounded-lg" onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="w-3 h-3 animate-spin me-1" />}{rtl ? 'حذف' : 'Delete'}
            </Button>
          </div>
        )}

        {/* ═══ Content ═══ */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
            {[1, 2, 3, 4, 5, 6].map(i => viewMode === 'grid' ? <Skeleton key={i} className="aspect-[16/10] rounded-2xl" /> : <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : promotions.length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-5 border border-primary/10">
              <Megaphone className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">{rtl ? 'لا توجد عروض بعد' : 'No promotions yet'}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">{rtl ? 'أنشئ أول عرض لجذب العملاء وزيادة المبيعات' : 'Create your first promotion to attract customers'}</p>
            <Button variant="hero" size="sm" className="rounded-xl" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-1" />{rtl ? 'أضف أول عرض' : 'Add First Promotion'}</Button>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Search className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-sm font-medium">{rtl ? 'لا توجد نتائج' : 'No results'}</p>
            <button className="text-xs text-primary mt-1 hover:underline" onClick={() => { setSearchQuery(''); setFilterMode('all'); setTypeFilter('all'); }}>{rtl ? 'إعادة تعيين' : 'Reset filters'}</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredPromotions.map((p: any) => p.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
                {filteredPromotions.map((p: any) => (
                  <SortablePromoCard key={p.id} promo={p} rtl={rtl} viewMode={viewMode}
                    isSelected={selectedIds.has(p.id)}
                    onEdit={openEdit} onDelete={id => setDeleteConfirm(id)}
                    onToggle={pr => toggleMut.mutate(pr)}
                    onDuplicate={pr => duplicateMut.mutate(pr)}
                    onPreview={url => setPreviewUrl(url)}
                    onSelect={toggleSelect} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Image Preview Lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in-0 duration-200" onClick={() => setPreviewUrl(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 end-4 text-primary-foreground hover:bg-primary-foreground/10 z-10" onClick={() => setPreviewUrl(null)}>
            <X className="w-6 h-6" />
          </Button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPromotions;
