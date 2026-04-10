import React, { useState, useMemo, useCallback } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Star, GripVertical, X, Pencil, Image as ImageIcon,
  Eye, EyeOff, LayoutGrid, LayoutList, Search, StarOff, CheckCircle2,
  MapPin, Calendar, FolderOpen, Layers, Copy, Loader2, Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  item, isRTL, onDelete, onEdit, onToggleFeatured, onDuplicate, onPreview, viewMode,
}: {
  item: PortfolioItem; isRTL: boolean; viewMode: ViewMode;
  onDelete: (id: string) => void; onEdit: (item: PortfolioItem) => void;
  onToggleFeatured: (item: PortfolioItem) => void;
  onDuplicate: (item: PortfolioItem) => void;
  onPreview: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  const cat = portfolioCategories.find(c => c.value === item.category);
  const name = isRTL ? item.title_ar : (item.title_en || item.title_ar);
  const desc = isRTL ? item.description_ar : (item.description_en || item.description_ar);

  if (viewMode === 'list') {
    return (
      <div ref={setNodeRef} style={style}>
        <Card className={`overflow-hidden group border-border/40 hover:border-primary/30 transition-all ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}`}>
          <div className="flex items-center gap-3 p-2.5 sm:p-3">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"><GripVertical className="w-4 h-4" /></button>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer" onClick={() => onPreview(item.media_url)}>
              <img src={item.media_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-sm truncate">{name}</p>
                {item.is_featured && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] px-1.5 py-0 h-4 shrink-0"><Star className="w-2.5 h-2.5 me-0.5 fill-current" />{isRTL ? 'مميز' : 'Featured'}</Badge>}
                {cat && cat.value !== 'general' && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">{cat.icon} {isRTL ? cat.ar : cat.en}</Badge>}
              </div>
              {desc && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{desc}</p>}
              <div className="flex items-center gap-2 mt-0.5">
                {item.project_location && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{item.project_location}</span>}
                {item.completion_date && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(item.completion_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</span>}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleFeatured(item)}>
                {item.is_featured ? <StarOff className="w-3.5 h-3.5 text-amber-500" /> : <Star className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(item)}><Copy className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`overflow-hidden group border-border/40 hover:border-primary/30 hover:shadow-md transition-all ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}`}>
        {/* Smaller aspect ratio: 16/11 instead of 4/3 */}
        <div className="aspect-[16/11] bg-muted relative overflow-hidden">
          <img src={item.media_url} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          {item.is_featured && (
            <Badge className="absolute top-1.5 start-1.5 bg-amber-500/90 hover:bg-amber-500 text-white border-0 shadow-lg backdrop-blur-sm text-[9px] px-1.5 py-0 h-4">
              <Star className="w-2.5 h-2.5 me-0.5 fill-current" />{isRTL ? 'مميز' : 'Featured'}
            </Badge>
          )}
          {cat && cat.value !== 'general' && (
            <Badge variant="outline" className="absolute bottom-1.5 start-1.5 bg-background/80 backdrop-blur-sm text-[9px] border-0 shadow px-1.5 py-0 h-4">{cat.icon} {isRTL ? cat.ar : cat.en}</Badge>
          )}
          <button {...attributes} {...listeners} className="absolute top-1.5 end-1.5 bg-background/80 backdrop-blur-sm rounded-md p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm touch-none">
            <GripVertical className="w-3.5 h-3.5 text-foreground" />
          </button>
          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1.5 p-2">
            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onPreview(item.media_url)}>
              <Maximize2 className="w-3 h-3 me-1" />{isRTL ? 'عرض' : 'View'}
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onEdit(item)}>
              <Pencil className="w-3 h-3 me-1" />{isRTL ? 'تعديل' : 'Edit'}
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onDuplicate(item)}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg h-7 text-[11px] px-2" onClick={() => onToggleFeatured(item)}>
              {item.is_featured ? <StarOff className="w-3 h-3 text-amber-500" /> : <Star className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="destructive" className="shadow-lg h-7 text-[11px] px-2" onClick={() => onDelete(item.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <CardContent className="p-2.5">
          <p className="text-xs sm:text-sm font-semibold truncate">{name}</p>
          {desc && <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">{desc}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.project_location && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{item.project_location}</span>}
            {item.completion_date && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(item.completion_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
SortableCard.displayName = 'SortableCard';

/* ── Main Component ── */
const DashboardPortfolio = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
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
  });

  const filteredItems = useMemo(() => {
    let result = items;
    if (filterMode === 'featured') result = result.filter(i => i.is_featured);
    if (filterMode === 'regular') result = result.filter(i => !i.is_featured);
    if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.title_ar.toLowerCase().includes(q) || (i.title_en || '').toLowerCase().includes(q) || (i.description_ar || '').toLowerCase().includes(q));
    }
    return result;
  }, [items, filterMode, categoryFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: items.length,
    featured: items.filter(i => i.is_featured).length,
    regular: items.filter(i => !i.is_featured).length,
  }), [items]);

  const usedCategories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))];
    return portfolioCategories.filter(c => cats.includes(c.value));
  }, [items]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business found');
      const payload: any = {
        title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        media_url: form.media_url, media_type: form.media_type, is_featured: form.is_featured,
        category: form.category, project_location: form.project_location || null,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      closeForm();
      toast.success(editingItem ? (isRTL ? 'تم التحديث' : 'Updated') : (isRTL ? 'تم الإضافة' : 'Added'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (item: PortfolioItem) => {
      const { error } = await supabase.from('portfolio_items').update({ is_featured: !item.is_featured }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedItems: PortfolioItem[]) => {
      await Promise.all(reorderedItems.map((item, index) =>
        supabase.from('portfolio_items').update({ sort_order: index }).eq('id', item.id)
      ));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      toast.error(isRTL ? 'فشل حفظ الترتيب' : 'Failed to save order');
    },
  });

  const closeForm = useCallback(() => { setShowForm(false); setEditingItem(null); setForm(emptyForm); }, []);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isRTL]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    queryClient.setQueryData(['dashboard-portfolio', businessId], reordered);
    reorderMutation.mutate(reordered);
  }, [items, businessId, queryClient, reorderMutation]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {isRTL ? 'معرض الأعمال' : 'Portfolio Gallery'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isRTL ? 'اعرض أعمالك المنجزة — اسحب لإعادة الترتيب' : 'Showcase your work — drag to reorder'}
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" size="sm" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة عمل' : 'Add Work'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: isRTL ? 'إجمالي' : 'Total', value: stats.total, icon: ImageIcon, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'مميزة' : 'Featured', value: stats.featured, icon: Star, color: 'text-amber-500 bg-amber-500/10' },
              { label: isRTL ? 'تصنيفات' : 'Categories', value: usedCategories.length, icon: FolderOpen, color: 'text-violet-500 bg-violet-500/10' },
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
        {items.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9 h-9" />
              </div>
              {usedCategories.length > 1 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-auto h-9 text-xs gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                    {usedCategories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {isRTL ? c.ar : c.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-2.5">{isRTL ? 'الكل' : 'All'} ({stats.total})</TabsTrigger>
                  <TabsTrigger value="featured" className="text-xs px-2.5"><Star className="w-3 h-3 me-1" />{isRTL ? 'مميز' : 'Featured'}</TabsTrigger>
                  <TabsTrigger value="regular" className="text-xs px-2.5">{isRTL ? 'عادي' : 'Regular'}</TabsTrigger>
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
                  {editingItem ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editingItem ? (isRTL ? 'تعديل العمل' : 'Edit Work') : (isRTL ? 'إضافة عمل جديد' : 'Add New Work')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, title_en: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, title_ar: v }))} />
                  </div>
                  <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} placeholder={isRTL ? 'مثال: تركيب واجهات زجاجية' : 'e.g. Glass facade installation'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, title_ar: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, title_en: v }))} />
                  </div>
                  <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" placeholder="e.g. Glass facade installation" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />{isRTL ? 'التصنيف' : 'Category'}</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {portfolioCategories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.icon} {isRTL ? c.ar : c.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'الموقع' : 'Location'}</Label>
                  <Input value={form.project_location} onChange={(e) => setForm({ ...form, project_location: e.target.value })} placeholder={isRTL ? 'الرياض' : 'Riyadh'} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الإنجاز' : 'Date'}</Label>
                  <Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} dir="ltr" className="h-9" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">{isRTL ? 'صورة العمل' : 'Work Image'} <span className="text-destructive">*</span></Label>
                <ImageUpload bucket="portfolio-images" value={form.media_url} onChange={(url) => setForm({ ...form, media_url: url })} onRemove={() => setForm({ ...form, media_url: '' })} aspectRatio="video" placeholder={isRTL ? 'اضغط لرفع صورة (يُفضل 16:9)' : 'Click to upload (16:9 recommended)'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, description_en: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} placeholder={isRTL ? 'وصف العمل...' : 'Work description...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, description_ar: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" placeholder="Work description..." />
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <div>
                  <Label className="cursor-pointer text-xs sm:text-sm">{isRTL ? 'عمل مميز' : 'Featured Work'}</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'يظهر بشكل بارز في المعرض' : 'Displayed prominently'}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || !form.media_url || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editingItem ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
            {[1, 2, 3, 4, 5, 6].map(i => viewMode === 'grid' ? <Skeleton key={i} className="aspect-[16/11] rounded-xl" /> : <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : items.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><ImageIcon className="w-8 h-8 text-primary" /></div>
              <h3 className="text-base font-semibold mb-2">{isRTL ? 'لا توجد أعمال بعد' : 'No portfolio items yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">{isRTL ? 'أضف صور أعمالك المنجزة لعرضها للعملاء' : 'Add photos of your work to showcase to clients'}</p>
              <Button variant="hero" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول عمل' : 'Add First Work'}</Button>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 && items.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" /><p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
                {filteredItems.map((item) => (
                  <SortableCard key={item.id} item={item} isRTL={isRTL} viewMode={viewMode}
                    onDelete={(id) => setDeleteConfirm(id)} onEdit={openEdit}
                    onToggleFeatured={(item) => toggleFeaturedMutation.mutate(item)}
                    onDuplicate={duplicateItem}
                    onPreview={(url) => setPreviewUrl(url)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف العمل' : 'Delete Work'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
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

export default DashboardPortfolio;
