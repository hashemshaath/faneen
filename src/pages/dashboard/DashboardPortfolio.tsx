import React, { useState, useMemo } from 'react';
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
  Eye, LayoutGrid, LayoutList, Search, StarOff, CheckCircle2,
  MapPin, Calendar, FolderOpen, Layers,
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
const SortableCard = ({
  item, isRTL, onDelete, onEdit, onToggleFeatured, viewMode,
}: {
  item: PortfolioItem; isRTL: boolean; viewMode: ViewMode;
  onDelete: (id: string) => void; onEdit: (item: PortfolioItem) => void;
  onToggleFeatured: (item: PortfolioItem) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  const cat = portfolioCategories.find(c => c.value === item.category);

  if (viewMode === 'list') {
    return (
      <Card ref={setNodeRef} style={style} className={`overflow-hidden group relative border-border/40 hover:border-primary/30 transition-all ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}`}>
        <div className="flex items-center gap-4 p-3">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"><GripVertical className="w-4 h-4" /></button>
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <img src={item.media_url} alt={isRTL ? item.title_ar : (item.title_en || item.title_ar)} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{isRTL ? item.title_ar : (item.title_en || item.title_ar)}</p>
              {item.is_featured && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0"><Star className="w-3 h-3 me-1" />{isRTL ? 'مميز' : 'Featured'}</Badge>}
              {cat && cat.value !== 'general' && <Badge variant="outline" className="text-[10px] shrink-0">{cat.icon} {isRTL ? cat.ar : cat.en}</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {(isRTL ? item.description_ar : (item.description_en || item.description_ar)) && (
                <p className="text-xs text-muted-foreground truncate">{isRTL ? item.description_ar : (item.description_en || item.description_ar)}</p>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {item.project_location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.project_location}</span>}
              {item.completion_date && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-3 h-3" />{new Date(item.completion_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFeatured(item)}>
              {item.is_featured ? <StarOff className="w-4 h-4 text-amber-500" /> : <Star className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card ref={setNodeRef} style={style} className={`overflow-hidden group relative border-border/40 hover:border-primary/30 hover:shadow-md transition-all ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}`}>
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <img src={item.media_url} alt={isRTL ? item.title_ar : (item.title_en || item.title_ar)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {item.is_featured && <Badge className="absolute top-2 start-2 bg-amber-500/90 hover:bg-amber-500 text-white border-0 shadow-lg backdrop-blur-sm"><Star className="w-3 h-3 me-1 fill-current" />{isRTL ? 'مميز' : 'Featured'}</Badge>}
        {cat && cat.value !== 'general' && <Badge variant="outline" className="absolute bottom-2 start-2 bg-background/80 backdrop-blur-sm text-[10px] border-0 shadow">{cat.icon} {isRTL ? cat.ar : cat.en}</Badge>}
        <button {...attributes} {...listeners} className="absolute top-2 end-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><GripVertical className="w-4 h-4 text-foreground" /></button>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3">
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg" onClick={() => onEdit(item)}><Pencil className="w-3.5 h-3.5 me-1" />{isRTL ? 'تعديل' : 'Edit'}</Button>
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg" onClick={() => onToggleFeatured(item)}>{item.is_featured ? <StarOff className="w-3.5 h-3.5 me-1" /> : <Star className="w-3.5 h-3.5 me-1" />}{item.is_featured ? (isRTL ? 'إلغاء' : 'Unfeature') : (isRTL ? 'تمييز' : 'Feature')}</Button>
          <Button size="sm" variant="destructive" className="shadow-lg" onClick={() => onDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-semibold truncate">{isRTL ? item.title_ar : (item.title_en || item.title_ar)}</p>
        {(isRTL ? item.description_ar : (item.description_en || item.description_ar)) && (
          <p className="text-xs text-muted-foreground truncate mt-1">{isRTL ? item.description_ar : (item.description_en || item.description_ar)}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.project_location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.project_location}</span>}
          {item.completion_date && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-3 h-3" />{new Date(item.completion_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

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

  // Unique categories from items
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
        category: form.category,
        project_location: form.project_location || null,
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
      toast.success(editingItem ? (isRTL ? 'تم تحديث العمل بنجاح' : 'Updated') : (isRTL ? 'تم إضافة العمل بنجاح' : 'Added'));
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
      const updates = reorderedItems.map((item, index) => supabase.from('portfolio_items').update({ sort_order: index }).eq('id', item.id));
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      toast.error(isRTL ? 'فشل حفظ الترتيب' : 'Failed to save order');
    },
  });

  const closeForm = () => { setShowForm(false); setEditingItem(null); setForm(emptyForm); };

  const openEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setForm({
      title_ar: item.title_ar, title_en: item.title_en || '',
      description_ar: item.description_ar || '', description_en: item.description_en || '',
      media_url: item.media_url, media_type: item.media_type as 'image', is_featured: item.is_featured,
      category: item.category || 'general',
      project_location: item.project_location || '',
      completion_date: item.completion_date || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    queryClient.setQueryData(['dashboard-portfolio', businessId], reordered);
    reorderMutation.mutate(reordered);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              {isRTL ? 'معرض الأعمال' : 'Portfolio Gallery'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'اعرض أعمالك ومشاريعك المنجزة — اسحب لإعادة الترتيب' : 'Showcase your completed projects — drag to reorder'}
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-2" />{isRTL ? 'إضافة عمل جديد' : 'Add New Work'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: isRTL ? 'إجمالي الأعمال' : 'Total Works', value: stats.total, icon: ImageIcon, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'أعمال مميزة' : 'Featured', value: stats.featured, icon: Star, color: 'text-amber-500 bg-amber-500/10' },
              { label: isRTL ? 'تصنيفات' : 'Categories', value: usedCategories.length, icon: FolderOpen, color: 'text-violet-500 bg-violet-500/10' },
            ].map((s, i) => (
              <Card key={i} className="border-border/40 bg-card/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
                  <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {items.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-72">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث في الأعمال...' : 'Search works...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
              </div>
              {usedCategories.length > 1 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <FolderOpen className="w-3.5 h-3.5 me-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'كل التصنيفات' : 'All Categories'}</SelectItem>
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
                  <TabsTrigger value="all" className="text-xs px-3">{isRTL ? 'الكل' : 'All'} ({stats.total})</TabsTrigger>
                  <TabsTrigger value="featured" className="text-xs px-3"><Star className="w-3 h-3 me-1" />{isRTL ? 'مميز' : 'Featured'}</TabsTrigger>
                  <TabsTrigger value="regular" className="text-xs px-3">{isRTL ? 'عادي' : 'Regular'}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('list')}><LayoutList className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {editingItem ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editingItem ? (isRTL ? 'تعديل العمل' : 'Edit Work') : (isRTL ? 'إضافة عمل جديد' : 'Add New Work')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, title_en: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, title_ar: v }))} />
                  </div>
                  <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} placeholder={isRTL ? 'مثال: تركيب واجهات زجاجية - فيلا الرياض' : 'e.g. Glass facade installation'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, title_ar: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, title_en: v }))} />
                  </div>
                  <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" placeholder="e.g. Glass facade installation" />
                </div>
              </div>

              {/* Category, Location, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />{isRTL ? 'التصنيف' : 'Category'}</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {portfolioCategories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.icon} {isRTL ? c.ar : c.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'موقع المشروع' : 'Project Location'}</Label>
                  <Input value={form.project_location} onChange={(e) => setForm({ ...form, project_location: e.target.value })} placeholder={isRTL ? 'مثال: الرياض، حي النخيل' : 'e.g. Riyadh, Al Nakheel'} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الإنجاز' : 'Completion Date'}</Label>
                  <Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} dir="ltr" />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>{isRTL ? 'صورة العمل' : 'Work Image'} <span className="text-destructive">*</span></Label>
                <ImageUpload bucket="portfolio-images" value={form.media_url} onChange={(url) => setForm({ ...form, media_url: url })} onRemove={() => setForm({ ...form, media_url: '' })} aspectRatio="video" placeholder={isRTL ? 'اضغط لرفع صورة العمل (يُفضل 4:3)' : 'Click to upload work image (4:3 recommended)'} />
              </div>

              {/* Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, description_en: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} placeholder={isRTL ? 'وصف تفصيلي للعمل المنجز...' : 'Detailed description...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, description_ar: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" placeholder="Detailed description..." />
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <div>
                  <Label className="cursor-pointer">{isRTL ? 'عمل مميز' : 'Featured Work'}</Label>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'يظهر بشكل بارز في أعلى المعرض' : 'Displayed prominently at the top'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || !form.media_url || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editingItem ? (isRTL ? 'تحديث العمل' : 'Update') : (isRTL ? 'إضافة العمل' : 'Add Work')}
                  {!saveMutation.isPending && <CheckCircle2 className="w-4 h-4 ms-2" />}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
            {[1,2,3,4,5,6].map(i => viewMode === 'grid' ? <Skeleton key={i} className="aspect-[4/3] rounded-xl" /> : <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : items.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><ImageIcon className="w-10 h-10 text-primary" /></div>
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد أعمال بعد' : 'No portfolio items yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">{isRTL ? 'أضف صور أعمالك ومشاريعك المنجزة لعرضها للعملاء المحتملين' : 'Add photos of your completed projects to showcase to potential clients'}</p>
              <Button variant="hero" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول عمل' : 'Add First Work'}</Button>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 && items.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" /><p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
              <p className="text-sm">{isRTL ? 'جرّب تغيير الفلتر أو كلمة البحث' : 'Try changing filters'}</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
                {filteredItems.map((item) => (
                  <SortableCard key={item.id} item={item} isRTL={isRTL} viewMode={viewMode}
                    onDelete={(id) => setDeleteConfirm(id)} onEdit={openEdit}
                    onToggleFeatured={(item) => toggleFeaturedMutation.mutate(item)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

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
    </DashboardLayout>
  );
};

export default DashboardPortfolio;
