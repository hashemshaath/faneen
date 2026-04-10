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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Pencil, FolderOpen, Calendar, DollarSign, Clock,
  Images, X, Search, CheckCircle2, Eye, LayoutGrid, LayoutList,
  Star, StarOff, MapPin, Tag, Building2, Layers, GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';
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

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'published' | 'draft';

/* ── Sortable Project Card (Grid) ── */
const SortableGridCard = ({ project: p, isRTL, language, onEdit, onGallery, onDelete, onToggleFeatured }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const catName = p.categories ? (language === 'ar' ? p.categories.name_ar : p.categories.name_en) : null;
  const cityName = p.cities ? (language === 'ar' ? p.cities.name_ar : p.cities.name_en) : null;

  return (
    <Card ref={setNodeRef} style={style} className={`overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-md transition-all group ${isDragging ? 'ring-2 ring-primary shadow-xl' : ''}`}>
      <div className="aspect-video bg-muted relative overflow-hidden">
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={isRTL ? p.title_ar : (p.title_en || p.title_ar)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-12 h-12 text-muted-foreground/30" /></div>
        )}
        {p.is_featured && <Badge className="absolute top-2 start-2 bg-amber-500/90 hover:bg-amber-500 border-0 shadow-lg backdrop-blur-sm"><Star className="w-3 h-3 me-1 fill-current" />{isRTL ? 'مميز' : 'Featured'}</Badge>}
        <Badge variant={p.status === 'published' ? 'default' : 'secondary'} className="absolute top-2 end-10 text-[10px] shadow backdrop-blur-sm">
          {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
        </Badge>
        <button {...attributes} {...listeners} className="absolute top-2 end-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <GripVertical className="w-4 h-4 text-foreground" />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white shadow-lg" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5 me-1" />{isRTL ? 'تعديل' : 'Edit'}</Button>
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white shadow-lg" onClick={() => onGallery(p.id)}><Images className="w-3.5 h-3.5 me-1" />{isRTL ? 'المعرض' : 'Gallery'}</Button>
          <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white shadow-lg" onClick={() => onToggleFeatured(p)}>
            {p.is_featured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="destructive" className="shadow-lg" onClick={() => onDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-heading font-semibold truncate">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
        {(language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)) && (
          <p className="text-sm text-muted-foreground line-clamp-2">{language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}</p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {catName && <Badge variant="outline" className="text-[10px]"><Tag className="w-3 h-3 me-0.5" />{catName}</Badge>}
          {cityName && <Badge variant="outline" className="text-[10px]"><MapPin className="w-3 h-3 me-0.5" />{cityName}</Badge>}
          {p.project_cost && <Badge variant="secondary" className="text-[10px]"><DollarSign className="w-3 h-3 me-0.5" />{Number(p.project_cost).toLocaleString()}</Badge>}
          {p.duration_days && <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 me-0.5" />{p.duration_days} {isRTL ? 'يوم' : 'days'}</Badge>}
          {p.completion_date && <Badge variant="secondary" className="text-[10px]"><Calendar className="w-3 h-3 me-0.5" />{new Date(p.completion_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short' })}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Sortable List Row ── */
const SortableListRow = ({ project: p, isRTL, language, onEdit, onGallery, onDelete, onToggleFeatured }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const catName = p.categories ? (language === 'ar' ? p.categories.name_ar : p.categories.name_en) : null;

  return (
    <Card ref={setNodeRef} style={style} className={`border-border/40 hover:border-primary/30 transition-all group ${isDragging ? 'ring-2 ring-primary shadow-xl' : ''}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"><GripVertical className="w-4 h-4" /></button>
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
          {p.cover_image_url ? (
            <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-6 h-6 text-muted-foreground/30" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</p>
            {p.is_featured && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0"><Star className="w-3 h-3 me-1" />{isRTL ? 'مميز' : 'Featured'}</Badge>}
            <Badge variant={p.status === 'published' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
              {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {catName && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Tag className="w-3 h-3" />{catName}</span>}
            {p.project_cost && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()}</span>}
            {p.duration_days && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}</span>}
            {p.client_name && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Building2 className="w-3 h-3" />{p.client_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFeatured(p)}>
            {p.is_featured ? <StarOff className="w-4 h-4 text-amber-500" /> : <Star className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onGallery(p.id)}><Images className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(p)}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Main Component ── */
const DashboardProjects = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [galleryProjectId, setGalleryProjectId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyForm = {
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    cover_image_url: '', client_name: '', project_cost: '',
    duration_days: '', completion_date: '', status: 'published',
    category_id: '', city_id: '', is_featured: false, currency_code: 'SAR',
  };
  const [form, setForm] = useState(emptyForm);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar, name_en, parent_id').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities-list'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      return data ?? [];
    },
  });

  const businessId = business?.id;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['dashboard-projects', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects')
        .select('*, categories(name_ar, name_en), cities(name_ar, name_en)')
        .eq('business_id', businessId!)
        .order('is_featured', { ascending: false })
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ['project-images', galleryProjectId],
    queryFn: async () => {
      const { data } = await supabase.from('project_images').select('*').eq('project_id', galleryProjectId!).order('sort_order');
      return data ?? [];
    },
    enabled: !!galleryProjectId,
  });

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (statusFilter !== 'all') result = result.filter((p: any) => p.status === statusFilter);
    if (categoryFilter !== 'all') result = result.filter((p: any) => p.category_id === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) =>
        p.title_ar.toLowerCase().includes(q) || (p.title_en || '').toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, statusFilter, categoryFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: projects.length,
    published: projects.filter((p: any) => p.status === 'published').length,
    draft: projects.filter((p: any) => p.status === 'draft').length,
    featured: projects.filter((p: any) => p.is_featured).length,
    totalCost: projects.reduce((sum: number, p: any) => sum + (Number(p.project_cost) || 0), 0),
  }), [projects]);

  // Unique categories used
  const usedCategoryIds = useMemo(() => [...new Set(projects.map((p: any) => p.category_id).filter(Boolean))], [projects]);
  const usedCategories = categories.filter((c: any) => usedCategoryIds.includes(c.id));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        business_id: businessId!, title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        cover_image_url: form.cover_image_url || null, client_name: form.client_name || null,
        project_cost: form.project_cost ? Number(form.project_cost) : null,
        duration_days: form.duration_days ? Number(form.duration_days) : null,
        completion_date: form.completion_date || null, status: form.status,
        category_id: form.category_id || null, city_id: form.city_id || null,
        is_featured: form.is_featured, currency_code: form.currency_code,
      };
      if (editId) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        payload.sort_order = projects.length;
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      toast.success(editId ? (isRTL ? 'تم تحديث المشروع بنجاح' : 'Project updated') : (isRTL ? 'تم إضافة المشروع بنجاح' : 'Project added'));
      closeForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم حذف المشروع' : 'Project deleted');
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from('projects').update({ is_featured: !p.is_featured }).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: any[]) => {
      const updates = reordered.map((item, idx) => supabase.from('projects').update({ sort_order: idx }).eq('id', item.id));
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      toast.error(isRTL ? 'فشل حفظ الترتيب' : 'Failed to save order');
    },
  });

  const handleGalleryChange = async (urls: string[]) => {
    if (!galleryProjectId) return;
    await supabase.from('project_images').delete().eq('project_id', galleryProjectId);
    if (urls.length > 0) {
      const rows = urls.map((url, i) => ({ project_id: galleryProjectId, image_url: url, sort_order: i }));
      const { error } = await supabase.from('project_images').insert(rows);
      if (error) { toast.error(error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ['project-images', galleryProjectId] });
  };

  const openEdit = (p: any) => {
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', cover_image_url: p.cover_image_url || '',
      client_name: p.client_name || '', project_cost: p.project_cost?.toString() || '',
      duration_days: p.duration_days?.toString() || '', completion_date: p.completion_date || '',
      status: p.status, category_id: p.category_id || '', city_id: p.city_id || '',
      is_featured: p.is_featured || false, currency_code: p.currency_code || 'SAR',
    });
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredProjects.findIndex((i: any) => i.id === active.id);
    const newIndex = filteredProjects.findIndex((i: any) => i.id === over.id);
    const reordered = arrayMove([...filteredProjects], oldIndex, newIndex);
    queryClient.setQueryData(['dashboard-projects', businessId], reordered);
    reorderMutation.mutate(reordered);
  };

  const galleryProject = projects.find((p: any) => p.id === galleryProjectId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              {isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'اعرض مشاريعك المنجزة — اسحب لإعادة الترتيب' : 'Showcase your projects — drag to reorder'}
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-2" />{isRTL ? 'إضافة مشروع' : 'Add Project'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'إجمالي المشاريع' : 'Total', value: stats.total, icon: FolderOpen, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'منشور' : 'Published', value: stats.published, icon: Eye, color: 'text-emerald-500 bg-emerald-500/10' },
              { label: isRTL ? 'مميز' : 'Featured', value: stats.featured, icon: Star, color: 'text-amber-500 bg-amber-500/10' },
              { label: isRTL ? 'إجمالي التكاليف' : 'Total Cost', value: stats.totalCost > 0 ? `${(stats.totalCost / 1000).toFixed(0)}K` : '—', icon: DollarSign, color: 'text-violet-500 bg-violet-500/10' },
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
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-72">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث في المشاريع...' : 'Search projects...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
              </div>
              {usedCategories.length > 1 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <Tag className="w-3.5 h-3.5 me-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'كل التصنيفات' : 'All Categories'}</SelectItem>
                    {usedCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">{isRTL ? 'الكل' : 'All'} ({stats.total})</TabsTrigger>
                  <TabsTrigger value="published" className="text-xs px-3">{isRTL ? 'منشور' : 'Published'}</TabsTrigger>
                  <TabsTrigger value="draft" className="text-xs px-3">{isRTL ? 'مسودة' : 'Draft'}</TabsTrigger>
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
                  {editId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editId ? (isRTL ? 'تعديل المشروع' : 'Edit Project') : (isRTL ? 'إضافة مشروع جديد' : 'Add New Project')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Titles with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'عنوان المشروع (عربي)' : 'Project Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_ar: v }))} />
                  </div>
                  <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} placeholder={isRTL ? 'مثال: تركيب واجهات زجاجية لمبنى تجاري' : 'e.g. Glass facade installation'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'عنوان المشروع (إنجليزي)' : 'Project Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_en: v }))} />
                  </div>
                  <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" placeholder="e.g. Commercial building glass facade" />
                </div>
              </div>

              {/* Category, City, Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{isRTL ? 'التصنيف' : 'Category'}</Label>
                  <Select value={form.category_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, category_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر التصنيف' : 'Select category'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isRTL ? 'بدون تصنيف' : 'No category'}</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.parent_id ? '  └ ' : ''}{language === 'ar' ? c.name_ar : c.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'المدينة' : 'City'}</Label>
                  <Select value={form.city_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, city_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر المدينة' : 'Select city'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isRTL ? 'بدون مدينة' : 'No city'}</SelectItem>
                      {cities.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                      <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label>{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                <ImageUpload bucket="project-images" value={form.cover_image_url} onChange={(url) => setForm(f => ({ ...f, cover_image_url: url }))} onRemove={() => setForm(f => ({ ...f, cover_image_url: '' }))} aspectRatio="video" placeholder={isRTL ? 'اضغط لرفع صورة الغلاف (يُفضل 16:9)' : 'Click to upload cover image (16:9 recommended)'} />
              </div>

              {/* Descriptions with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={4} placeholder={isRTL ? 'وصف تفصيلي للمشروع...' : 'Detailed project description...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={4} dir="ltr" placeholder="Detailed project description..." />
                </div>
              </div>

              {/* Project details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{isRTL ? 'اسم العميل' : 'Client Name'}</Label>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder={isRTL ? 'مثال: شركة البناء' : 'e.g. ABC Corp'} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'التكلفة' : 'Cost'}</Label>
                  <div className="flex gap-1">
                    <Input type="number" value={form.project_cost} onChange={e => setForm(f => ({ ...f, project_cost: e.target.value }))} dir="ltr" className="flex-1" />
                    <Select value={form.currency_code} onValueChange={(v) => setForm(f => ({ ...f, currency_code: v }))}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{isRTL ? 'المدة (أيام)' : 'Duration (days)'}</Label>
                  <Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الإنجاز' : 'Completion Date'}</Label>
                  <Input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} dir="ltr" />
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm(f => ({ ...f, is_featured: v }))} />
                <div>
                  <Label className="cursor-pointer">{isRTL ? 'مشروع مميز' : 'Featured Project'}</Label>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'يظهر بشكل بارز في ملفك التجاري وأعلى القائمة' : 'Displayed prominently on your profile and at the top'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editId ? (isRTL ? 'تحديث المشروع' : 'Update Project') : (isRTL ? 'إضافة المشروع' : 'Add Project')}
                  {!saveMutation.isPending && <CheckCircle2 className="w-4 h-4 ms-2" />}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gallery Section */}
        {galleryProjectId && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Images className="w-5 h-5 text-primary" />
                  {isRTL ? 'معرض صور المشروع' : 'Project Gallery'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setGalleryProjectId(null)}><X className="w-4 h-4" /></Button>
              </div>
              {galleryProject && <p className="text-sm text-muted-foreground">{language === 'ar' ? (galleryProject as any).title_ar : ((galleryProject as any).title_en || (galleryProject as any).title_ar)}</p>}
            </CardHeader>
            <CardContent>
              <MultiImageUpload bucket="project-images" images={galleryImages.map((img: any) => img.image_url)} onChange={handleGalleryChange} folder="gallery" maxImages={20} maxSizeMB={5} />
              <p className="text-xs text-muted-foreground mt-2">
                {isRTL ? `${galleryImages.length} / 20 صورة` : `${galleryImages.length} / 20 images`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className={viewMode === 'grid' ? 'h-72 rounded-xl' : 'h-20 rounded-xl'} />)}
          </div>
        ) : projects.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FolderOpen className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد مشاريع بعد' : 'No projects yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {isRTL ? 'أضف مشاريعك المنجزة لعرضها للعملاء المحتملين' : 'Add your completed projects to showcase to potential clients'}
              </p>
              <Button variant="hero" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول مشروع' : 'Add First Project'}
              </Button>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 && projects.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" /><p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
              <p className="text-sm">{isRTL ? 'جرّب تغيير الفلتر أو كلمة البحث' : 'Try changing filters'}</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredProjects.map((p: any) => p.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((p: any) => (
                    <SortableGridCard key={p.id} project={p} isRTL={isRTL} language={language}
                      onEdit={openEdit} onGallery={setGalleryProjectId}
                      onDelete={(id: string) => setDeleteConfirm(id)}
                      onToggleFeatured={(proj: any) => toggleFeaturedMutation.mutate(proj)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProjects.map((p: any) => (
                    <SortableListRow key={p.id} project={p} isRTL={isRTL} language={language}
                      onEdit={openEdit} onGallery={setGalleryProjectId}
                      onDelete={(id: string) => setDeleteConfirm(id)}
                      onToggleFeatured={(proj: any) => toggleFeaturedMutation.mutate(proj)} />
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
            <AlertDialogTitle>{isRTL ? 'حذف المشروع' : 'Delete Project'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? 'هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع الصور المرتبطة به.' : 'Are you sure? All associated images will also be deleted.'}
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

export default DashboardProjects;
