import React, { useState, useMemo, useCallback, useRef, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Trash2, Star, GripVertical, X, Pencil, Image as ImageIcon,
  Eye, EyeOff, LayoutGrid, List, Search, StarOff, CheckCircle2,
  MapPin, Calendar, FolderOpen, Layers, Copy, Loader2, Maximize2,
  Download, AlertCircle, BarChart3, Zap, Filter,
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

interface PortfolioItem {
  id: string; business_id: string; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null; media_url: string;
  media_type: string; is_featured: boolean; sort_order: number; created_at: string;
  category: string; project_location: string | null; completion_date: string | null;
}

const portfolioCategories = [
  { value: 'general', ar: 'عام', en: 'General', icon: '📁' },
  { value: 'aluminum_windows', ar: 'نوافذ ألمنيوم', en: 'Aluminum Windows', icon: '🪟' },
  { value: 'aluminum_doors', ar: 'أبواب ألمنيوم', en: 'Aluminum Doors', icon: '🚪' },
  { value: 'aluminum_facades', ar: 'واجهات ألمنيوم', en: 'Aluminum Facades', icon: '🏢' },
  { value: 'aluminum_cladding', ar: 'كلادينج', en: 'Cladding', icon: '🏗️' },
  { value: 'iron_doors', ar: 'أبواب حديد', en: 'Iron Doors', icon: '⚙️' },
  { value: 'iron_gates', ar: 'بوابات حديد', en: 'Iron Gates', icon: '🏰' },
  { value: 'fire_doors', ar: 'أبواب ضد الحريق', en: 'Fire-Rated Doors', icon: '🔥' },
  { value: 'hangars', ar: 'هناجر ومستودعات', en: 'Hangars', icon: '🏭' },
  { value: 'iron_canopies', ar: 'مظلات حديد', en: 'Iron Canopies', icon: '⛱️' },
  { value: 'steel_structures', ar: 'هياكل معدنية', en: 'Steel Structures', icon: '🔩' },
  { value: 'decorative_iron', ar: 'حدادة فنية', en: 'Decorative Iron', icon: '🎨' },
  { value: 'glass', ar: 'زجاج', en: 'Glass', icon: '🪟' },
  { value: 'shower_enclosures', ar: 'شاور بوكس', en: 'Shower Enclosures', icon: '🚿' },
  { value: 'wood_doors', ar: 'أبواب خشب', en: 'Wood Doors', icon: '🪵' },
  { value: 'wood_windows', ar: 'شبابيك خشب', en: 'Wood Windows', icon: '🖼️' },
  { value: 'wood_wardrobes', ar: 'دواليب خشب', en: 'Wood Wardrobes', icon: '🗄️' },
  { value: 'wood_decor', ar: 'ديكورات خشبية', en: 'Wood Decorations', icon: '✨' },
  { value: 'wood_flooring', ar: 'أرضيات خشبية', en: 'Wood Flooring', icon: '🪵' },
  { value: 'kitchens', ar: 'مطابخ', en: 'Kitchens', icon: '🍳' },
  { value: 'closets', ar: 'خزائن ودواليب', en: 'Closets & Wardrobes', icon: '👔' },
  { value: 'upvc', ar: 'UPVC', en: 'UPVC', icon: '🪟' },
  { value: 'railings', ar: 'درابزين', en: 'Railings', icon: '🏗️' },
  { value: 'stairs', ar: 'سلالم', en: 'Stairs', icon: '🪜' },
  { value: 'maintenance', ar: 'صيانة', en: 'Maintenance', icon: '🔧' },
];

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'featured' | 'regular';

/* ── Sortable Card ── */
const SortableCard = React.memo(({
  item, rtl, onDelete, onEdit, onToggleFeatured, onDuplicate, onPreview, viewMode, isSelected, onSelect,
}: {
  item: PortfolioItem; rtl: boolean; viewMode: ViewMode; isSelected: boolean;
  onDelete: (id: string) => void; onEdit: (item: PortfolioItem) => void;
  onToggleFeatured: (item: PortfolioItem) => void;
  onDuplicate: (item: PortfolioItem) => void;
  onPreview: (url: string) => void;
  onSelect: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined };
  const cat = portfolioCategories.find(c => c.value === item.category);
  const name = rtl ? item.title_ar : (item.title_en || item.title_ar);
  const desc = rtl ? item.description_ar : (item.description_en || item.description_ar);
  const daysSince = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000);
  const isNew = daysSince < 7;
  const isIncomplete = !item.description_ar || !item.project_location;

  if (viewMode === 'list') {
    return (
      <div ref={setNodeRef} style={style}>
        <div className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-200 group hover:shadow-sm hover:border-primary/20 ${isSelected ? 'ring-2 ring-primary border-primary/40' : 'border-border/50'}`}>
          <button onClick={() => onSelect(item.id)} className={`w-[18px] h-[18px] rounded border-[1.5px] transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/25 hover:border-primary/60'}`}>
            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
          </button>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer border border-border/30" onClick={() => onPreview(item.media_url)}>
            <img src={item.media_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              {item.is_featured && <span className="text-[8px] font-semibold px-1 py-px rounded bg-accent text-accent-foreground">⭐</span>}
              {isNew && <span className="text-[8px] font-semibold px-1 py-px rounded bg-accent text-accent-foreground">{rtl ? 'جديد' : 'NEW'}</span>}
              {isIncomplete && (
                <TooltipProvider><Tooltip><TooltipTrigger><AlertCircle className="w-3 h-3 text-destructive/60" /></TooltipTrigger>
                <TooltipContent><p className="text-xs">{rtl ? 'بيانات ناقصة' : 'Incomplete'}</p></TooltipContent></Tooltip></TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {cat && cat.value !== 'general' && <span className="text-[10px] text-muted-foreground">{cat.icon} {rtl ? cat.ar : cat.en}</span>}
              {item.project_location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{item.project_location}</span>}
              {item.completion_date && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(item.completion_date).toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onToggleFeatured(item)}>
              {item.is_featured ? <StarOff className="w-3.5 h-3.5 text-accent" /> : <Star className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onDuplicate(item)}><Copy className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <div className={`relative rounded-xl border bg-card overflow-hidden h-full group transition-all duration-200 hover:shadow-lg hover:border-primary/30 ${isSelected ? 'ring-2 ring-primary border-primary/40' : 'border-border/50'}`}>
        <div className="aspect-[16/11] bg-muted relative overflow-hidden">
          <img src={item.media_url} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          {/* Badges */}
          <div className="absolute top-1.5 start-1.5 flex flex-col gap-1">
            {item.is_featured && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground shadow-sm backdrop-blur-sm flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" />{rtl ? 'مميز' : 'Featured'}
              </span>
            )}
            {isNew && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">{rtl ? 'جديد' : 'New'}</span>}
          </div>
          {cat && cat.value !== 'general' && (
            <span className="absolute bottom-1.5 start-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur-sm shadow-sm">{cat.icon} {rtl ? cat.ar : cat.en}</span>
          )}
          {/* Select + Grip */}
          <div className="absolute top-1.5 end-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onSelect(item.id); }} className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center bg-background/80 backdrop-blur-sm shadow-sm ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
              {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
            </button>
            <button {...attributes} {...listeners} className="bg-background/80 backdrop-blur-sm rounded-md p-0.5 cursor-grab active:cursor-grabbing shadow-sm touch-none">
              <GripVertical className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1 p-2">
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onPreview(item.media_url)}>
              <Maximize2 className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onEdit(item)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onToggleFeatured(item)}>
              {item.is_featured ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onDuplicate(item)}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onDelete(item.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="p-2.5">
          <h3 className="text-xs font-semibold truncate">{name}</h3>
          {desc && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{desc}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.project_location && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{item.project_location}</span>}
            {item.completion_date && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(item.completion_date).toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</span>}
          </div>
        </div>
      </div>
    </div>
  );
});
SortableCard.displayName = 'SortableCard';

/* ═══════════════════════════════════ */
/*          MAIN COMPONENT            */
/* ═══════════════════════════════════ */
const DashboardPortfolio = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const emptyForm = {
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    media_url: '', media_type: 'image' as const, is_featured: false,
    category: 'general', project_location: '', completion_date: '',
  };
  const [form, setForm] = useState(emptyForm);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ─── Data ─── */
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
  const businessId = business?.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['dashboard-portfolio', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase.from('portfolio_items').select('*').eq('business_id', businessId).order('sort_order');
      return (data ?? []) as PortfolioItem[];
    },
    enabled: !!businessId,
    staleTime: 3 * 60 * 1000,
  });

  /* ─── Derived ─── */
  const stats = useMemo(() => {
    const total = items.length;
    const featured = items.filter(i => i.is_featured).length;
    const usedCats = new Set(items.map(i => i.category)).size;
    const complete = items.filter(i => i.title_ar && i.description_ar && i.media_url && i.project_location).length;
    const completeness = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, featured, regular: total - featured, usedCats, completeness };
  }, [items]);

  const usedCategories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))];
    return portfolioCategories.filter(c => cats.includes(c.value));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (filterMode === 'featured') result = result.filter(i => i.is_featured);
    if (filterMode === 'regular') result = result.filter(i => !i.is_featured);
    if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.title_ar.toLowerCase().includes(q) || (i.title_en || '').toLowerCase().includes(q) || (i.description_ar || '').toLowerCase().includes(q));
    }
    return result;
  }, [items, filterMode, categoryFilter, searchQuery]);

  /* ─── Mutations ─── */
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      const payload = {
        title_ar: form.title_ar.trim(), title_en: form.title_en.trim() || null,
        description_ar: form.description_ar.trim() || null, description_en: form.description_en.trim() || null,
        media_url: form.media_url, media_type: form.media_type, is_featured: form.is_featured,
        category: form.category, project_location: form.project_location.trim() || null,
        completion_date: form.completion_date || null,
      };
      if (editingItem) {
        const { error } = await supabase.from('portfolio_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('portfolio_items').insert({ ...payload, business_id: businessId, sort_order: items.length });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] }); closeForm(); toast.success(editingItem ? (isRTL ? 'تم التحديث' : 'Updated') : (isRTL ? 'تم الإضافة' : 'Added')); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('portfolio_items').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] }); setDeleteConfirm(null); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
  });

  const toggleFeaturedMut = useMutation({
    mutationFn: async (item: PortfolioItem) => { const { error } = await supabase.from('portfolio_items').update({ is_featured: !item.is_featured }).eq('id', item.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] }); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  const reorderMut = useMutation({
    mutationFn: async (reordered: { id: string; sort_order: number }[]) => {
      await Promise.all(reordered.map(r => supabase.from('portfolio_items').update({ sort_order: r.sort_order }).eq('id', r.id)));
    },
    onError: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] }); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async () => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('portfolio_items').delete().eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] }); setSelectedIds(new Set()); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
  });

  const bulkFeatureMut = useMutation({
    mutationFn: async (featured: boolean) => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('portfolio_items').update({ is_featured: featured }).eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] }); setSelectedIds(new Set()); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  /* ─── Callbacks ─── */
  const closeForm = useCallback(() => { setShowForm(false); setEditingItem(null); setForm(emptyForm); }, [emptyForm]);
  const scrollToForm = useCallback(() => { requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }, []);

  const openEdit = useCallback((item: PortfolioItem) => {
    setEditingItem(item);
    setForm({
      title_ar: item.title_ar, title_en: item.title_en || '',
      description_ar: item.description_ar || '', description_en: item.description_en || '',
      media_url: item.media_url, media_type: item.media_type as 'image', is_featured: item.is_featured,
      category: item.category || 'general', project_location: item.project_location || '',
      completion_date: item.completion_date || '',
    });
    setShowForm(true);
    scrollToForm();
  }, [scrollToForm]);

  const duplicateItem = useCallback((item: PortfolioItem) => {
    setEditingItem(null);
    setForm({
      title_ar: item.title_ar + (isRTL ? ' (نسخة)' : ' (copy)'),
      title_en: item.title_en ? item.title_en + ' (copy)' : '',
      description_ar: item.description_ar || '', description_en: item.description_en || '',
      media_url: item.media_url, media_type: item.media_type as 'image', is_featured: false,
      category: item.category || 'general', project_location: item.project_location || '',
      completion_date: item.completion_date || '',
    });
    setShowForm(true);
    scrollToForm();
  }, [isRTL, scrollToForm]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filteredItems.findIndex(i => i.id === active.id);
    const newIdx = filteredItems.findIndex(i => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(filteredItems, oldIdx, newIdx);
    queryClient.setQueryData(['dashboard-portfolio', businessId], reordered);
    reorderMut.mutate(reordered.map((item, i) => ({ id: item.id, sort_order: i })));
  }, [filteredItems, businessId, queryClient, reorderMut]);

  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredItems.length ? new Set() : new Set(filteredItems.map(i => i.id)));
  }, [filteredItems]);

  const exportCSV = useCallback(() => {
    const rows = [['Title AR', 'Title EN', 'Category', 'Location', 'Date', 'Featured', 'Image URL'].join(','),
      ...items.map(i => [`"${i.title_ar}"`, `"${i.title_en || ''}"`, i.category, `"${i.project_location || ''}"`, i.completion_date || '', i.is_featured, `"${i.media_url}"`].join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `portfolio_${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم التصدير' : 'Exported');
  }, [items, isRTL]);

  const filterOptions = useMemo(() => [
    { key: 'all' as const, label: isRTL ? 'الكل' : 'All', count: stats.total, icon: Layers },
    { key: 'featured' as const, label: isRTL ? 'مميزة' : 'Featured', count: stats.featured, icon: Star },
    { key: 'regular' as const, label: isRTL ? 'عادية' : 'Regular', count: stats.regular, icon: ImageIcon },
  ], [isRTL, stats]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">{isRTL ? 'معرض الأعمال' : 'Portfolio Gallery'}</h1>
              <p className="text-xs text-muted-foreground">{isRTL ? `${stats.total} عمل · ${stats.featured} مميز` : `${stats.total} works · ${stats.featured} featured`}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 me-1" />{isRTL ? 'تصدير' : 'Export'}
              </Button>
            )}
            <Button variant="hero" size="sm" className="h-8 text-xs" onClick={() => { closeForm(); setShowForm(true); scrollToForm(); }}>
              <Plus className="w-3.5 h-3.5 me-1" />{isRTL ? 'إضافة عمل' : 'Add Work'}
            </Button>
          </div>
        </div>

        {/* ═══ Stats ═══ */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              { l: isRTL ? 'إجمالي' : 'Total', v: stats.total, icon: ImageIcon, cls: 'text-primary bg-primary/10' },
              { l: isRTL ? 'مميزة' : 'Featured', v: stats.featured, icon: Star, cls: 'text-accent bg-accent/10' },
              { l: isRTL ? 'عادية' : 'Regular', v: stats.regular, icon: Eye, cls: 'text-muted-foreground bg-muted' },
              { l: isRTL ? 'تصنيفات' : 'Categories', v: stats.usedCats, icon: FolderOpen, cls: 'text-primary bg-primary/10' },
              { l: isRTL ? 'الاكتمال' : 'Complete', v: stats.completeness, icon: BarChart3, cls: 'text-primary bg-primary/10', suffix: '%' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.cls}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-base font-bold leading-none">{s.v}{s.suffix || ''}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completeness Alert */}
        {stats.completeness < 100 && stats.total > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 border border-accent">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium">{isRTL ? 'اكتمال بيانات المعرض' : 'Portfolio completeness'}</span>
                <span className="text-[11px] font-bold text-primary">{stats.completeness}%</span>
              </div>
              <Progress value={stats.completeness} className="h-1" />
            </div>
          </div>
        )}

        {/* ═══ Add/Edit Form ═══ */}
        {showForm && (
          <div ref={formRef}>
            <Card className="border-primary/20 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editingItem ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editingItem ? (isRTL ? 'تعديل العمل' : 'Edit Work') : (isRTL ? 'إضافة عمل جديد' : 'New Work')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                {/* Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                      <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                        onTranslated={v => setForm(p => ({ ...p, title_en: v }))}
                        onImproved={v => setForm(p => ({ ...p, title_ar: v }))} />
                    </div>
                    <Input value={form.title_ar} onChange={e => setForm(p => ({ ...p, title_ar: e.target.value }))} placeholder={isRTL ? 'مثال: تركيب واجهات زجاجية' : 'e.g. Glass facade installation'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                      <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                        onTranslated={v => setForm(p => ({ ...p, title_ar: v }))}
                        onImproved={v => setForm(p => ({ ...p, title_en: v }))} />
                    </div>
                    <Input value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} dir="ltr" placeholder="e.g. Glass facade installation" className="h-9" />
                  </div>
                </div>

                {/* Category + Location + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />{isRTL ? 'التصنيف' : 'Category'}</Label>
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {portfolioCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {isRTL ? c.ar : c.en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'الموقع' : 'Location'}</Label>
                    <Input value={form.project_location} onChange={e => setForm(p => ({ ...p, project_location: e.target.value }))} placeholder={isRTL ? 'الرياض' : 'Riyadh'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الإنجاز' : 'Date'}</Label>
                    <Input type="date" value={form.completion_date} onChange={e => setForm(p => ({ ...p, completion_date: e.target.value }))} dir="ltr" className="h-9" />
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{isRTL ? 'صورة العمل' : 'Work Image'} <span className="text-destructive">*</span></Label>
                  <ImageUpload bucket="portfolio-images" value={form.media_url} onChange={url => setForm(p => ({ ...p, media_url: url }))} onRemove={() => setForm(p => ({ ...p, media_url: '' }))} compact placeholder={isRTL ? 'اضغط لرفع صورة (يُفضل 16:9)' : 'Click to upload (16:9 recommended)'} />
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                      <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                        onTranslated={v => setForm(p => ({ ...p, description_en: v }))}
                        onImproved={v => setForm(p => ({ ...p, description_ar: v }))} />
                    </div>
                    <Textarea value={form.description_ar} onChange={e => setForm(p => ({ ...p, description_ar: e.target.value }))} rows={2} placeholder={isRTL ? 'وصف العمل...' : 'Work description...'} className="resize-none text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                      <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                        onTranslated={v => setForm(p => ({ ...p, description_ar: v }))}
                        onImproved={v => setForm(p => ({ ...p, description_en: v }))} />
                    </div>
                    <Textarea value={form.description_en} onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))} rows={2} dir="ltr" placeholder="Work description..." className="resize-none text-sm" />
                  </div>
                </div>

                {/* Featured Toggle + Submit */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                  <Switch checked={form.is_featured} onCheckedChange={v => setForm(p => ({ ...p, is_featured: v }))} />
                  <div>
                    <span className="text-xs font-medium">{isRTL ? 'عمل مميز' : 'Featured Work'}</span>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'يظهر بشكل بارز في المعرض' : 'Displayed prominently'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMut.mutate()} disabled={!form.title_ar.trim() || !form.media_url || saveMut.isPending} variant="hero" className="flex-1 h-9">
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <CheckCircle2 className="w-4 h-4 me-1.5" />}
                    {saveMut.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editingItem ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                  </Button>
                  <Button variant="outline" className="h-9" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ Toolbar ═══ */}
        {items.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث...' : 'Search...'} value={searchQuery}
                  onChange={e => startTransition(() => setSearchQuery(e.target.value))}
                  className="ps-8 h-8 text-xs" />
              </div>
              {usedCategories.length > 1 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-auto h-8 gap-1 text-[11px] border-border/40">
                    <FolderOpen className="w-3 h-3" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                    {usedCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {isRTL ? c.ar : c.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="flex border border-border/40 rounded-lg overflow-hidden ms-auto">
                <button className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}><LayoutGrid className="w-3.5 h-3.5" /></button>
                <button className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={toggleSelectAll} className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors" title={isRTL ? 'تحديد الكل' : 'Select All'}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 'text-primary' : 'text-muted-foreground/40'}`} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {filterOptions.map(f => (
                <button key={f.key} onClick={() => setFilterMode(f.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${filterMode === f.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <f.icon className="w-3 h-3" />
                  {f.label}
                  <span className={`text-[9px] px-1 rounded-full ${filterMode === f.key ? 'bg-primary-foreground/20' : 'bg-background/60'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/15 animate-in fade-in-0 duration-150">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{selectedIds.size} {isRTL ? 'محددة' : 'selected'}</Badge>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => bulkFeatureMut.mutate(true)} disabled={bulkFeatureMut.isPending}><Star className="w-3 h-3 me-0.5" />{isRTL ? 'تمييز' : 'Feature'}</Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => bulkFeatureMut.mutate(false)} disabled={bulkFeatureMut.isPending}><StarOff className="w-3 h-3 me-0.5" />{isRTL ? 'إلغاء' : 'Unfeature'}</Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive" onClick={() => bulkDeleteMut.mutate()} disabled={bulkDeleteMut.isPending}><Trash2 className="w-3 h-3 me-0.5" />{isRTL ? 'حذف' : 'Del'}</Button>
            <button className="ms-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelectedIds(new Set())}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Delete Confirmation (inline) */}
        {deleteConfirm && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</p>
              <p className="text-[11px] text-muted-foreground">{isRTL ? 'لا يمكن التراجع عن هذا الإجراء' : 'This action cannot be undone'}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="w-3 h-3 animate-spin me-1" />}{isRTL ? 'حذف' : 'Delete'}
            </Button>
          </div>
        )}

        {/* ═══ Content ═══ */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5' : 'space-y-1.5'}>
            {[1, 2, 3, 4, 5, 6].map(i => viewMode === 'grid' ? <Skeleton key={i} className="aspect-[16/11] rounded-xl" /> : <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : items.length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">{isRTL ? 'لا توجد أعمال بعد' : 'No portfolio items yet'}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">{isRTL ? 'أضف صور أعمالك المنجزة لعرضها للعملاء' : 'Add photos of your work to showcase to clients'}</p>
            <Button variant="hero" size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-1" />{isRTL ? 'أضف أول عمل' : 'Add First Work'}</Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Search className="w-7 h-7 mb-2" />
            <p className="text-sm font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            <button className="text-xs text-primary mt-1 hover:underline" onClick={() => { setSearchQuery(''); setFilterMode('all'); setCategoryFilter('all'); }}>{isRTL ? 'إعادة تعيين' : 'Reset filters'}</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5' : 'space-y-1.5'}>
                {filteredItems.map(item => (
                  <SortableCard key={item.id} item={item} rtl={isRTL} viewMode={viewMode}
                    isSelected={selectedIds.has(item.id)}
                    onDelete={id => setDeleteConfirm(id)} onEdit={openEdit}
                    onToggleFeatured={item => toggleFeaturedMut.mutate(item)}
                    onDuplicate={duplicateItem}
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

export default DashboardPortfolio;
