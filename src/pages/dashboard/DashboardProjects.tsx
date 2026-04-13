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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Trash2, Pencil, FolderOpen, Calendar, DollarSign, Clock,
  Images, X, Search, CheckCircle2, Eye, LayoutGrid, List,
  Star, StarOff, MapPin, Tag, Building2, Layers, GripVertical,
  Copy, Maximize2, Loader2, Download, AlertCircle, BarChart3, Zap, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'published' | 'draft' | 'featured';

/* ── Sortable Project Card ── */
const SortableProjectCard = React.memo(({
  project: p, rtl, language, viewMode, isSelected,
  onEdit, onGallery, onDelete, onToggleFeatured, onDuplicate, onPreview, onSelect,
}: {
  project: any; rtl: boolean; language: string; viewMode: ViewMode; isSelected: boolean;
  onEdit: (p: any) => void; onGallery: (id: string) => void; onDelete: (id: string) => void;
  onToggleFeatured: (p: any) => void; onDuplicate: (p: any) => void;
  onPreview: (url: string) => void; onSelect: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined };
  const catName = p.categories ? (language === 'ar' ? p.categories.name_ar : p.categories.name_en) : null;
  const cityName = p.cities ? (language === 'ar' ? p.cities.name_ar : p.cities.name_en) : null;
  const title = language === 'ar' ? p.title_ar : (p.title_en || p.title_ar);
  const desc = language === 'ar' ? p.description_ar : (p.description_en || p.description_ar);
  const daysSince = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
  const isNew = daysSince < 7;
  const isIncomplete = !p.description_ar || !p.cover_image_url;

  if (viewMode === 'list') {
    return (
      <div ref={setNodeRef} style={style}>
        <div className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-200 group hover:shadow-sm hover:border-primary/20 ${isSelected ? 'ring-2 ring-primary border-primary/40' : 'border-border/50'}`}>
          <button onClick={() => onSelect(p.id)} className={`w-[18px] h-[18px] rounded border-[1.5px] transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/25 hover:border-primary/60'}`}>
            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
          </button>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer border border-border/30" onClick={() => p.cover_image_url && onPreview(p.cover_image_url)}>
            {p.cover_image_url ? (
              <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-5 h-5 text-muted-foreground/30" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              {p.is_featured && <span className="text-[8px] font-semibold px-1 py-px rounded bg-accent text-accent-foreground">⭐</span>}
              {isNew && <span className="text-[8px] font-semibold px-1 py-px rounded bg-accent text-accent-foreground">{rtl ? 'جديد' : 'NEW'}</span>}
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${p.status === 'published' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {p.status === 'published' ? (rtl ? 'منشور' : 'Published') : (rtl ? 'مسودة' : 'Draft')}
              </span>
              {isIncomplete && (
                <TooltipProvider><Tooltip><TooltipTrigger><AlertCircle className="w-3 h-3 text-destructive/60" /></TooltipTrigger>
                <TooltipContent><p className="text-xs">{rtl ? 'بيانات ناقصة' : 'Incomplete'}</p></TooltipContent></Tooltip></TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {catName && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{catName}</span>}
              {p.project_cost && <span className="text-[10px] font-bold text-primary">{Number(p.project_cost).toLocaleString()} <span className="font-normal text-muted-foreground">{p.currency_code}</span></span>}
              {p.duration_days && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{p.duration_days} {rtl ? 'يوم' : 'days'}</span>}
              {p.client_name && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{p.client_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onToggleFeatured(p)}>
              {p.is_featured ? <StarOff className="w-3.5 h-3.5 text-accent" /> : <Star className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onGallery(p.id)}><Images className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onDuplicate(p)}><Copy className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
          {p.cover_image_url ? (
            <img src={p.cover_image_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-10 h-10 text-muted-foreground/20" /></div>
          )}
          {/* Badges */}
          <div className="absolute top-1.5 start-1.5 flex flex-col gap-1">
            {p.is_featured && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground shadow-sm backdrop-blur-sm flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" />{rtl ? 'مميز' : 'Featured'}
              </span>
            )}
            {isNew && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">{rtl ? 'جديد' : 'New'}</span>}
          </div>
          <span className={`absolute top-1.5 end-8 text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-sm ${p.status === 'published' ? 'bg-primary/90 text-primary-foreground' : 'bg-muted/90 text-muted-foreground'}`}>
            {p.status === 'published' ? (rtl ? 'منشور' : 'Published') : (rtl ? 'مسودة' : 'Draft')}
          </span>
          {/* Select + Grip */}
          <div className="absolute top-1.5 end-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onSelect(p.id); }} className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center bg-background/80 backdrop-blur-sm shadow-sm ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
              {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
            </button>
          </div>
          <button {...attributes} {...listeners} className="absolute bottom-1.5 end-1.5 bg-background/80 backdrop-blur-sm rounded-md p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm touch-none">
            <GripVertical className="w-3.5 h-3.5 text-foreground" />
          </button>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1 p-2">
            {p.cover_image_url && <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onPreview(p.cover_image_url)}><Maximize2 className="w-3 h-3" /></Button>}
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onEdit(p)}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onGallery(p.id)}><Images className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onToggleFeatured(p)}>
              {p.is_featured ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onDuplicate(p)}><Copy className="w-3 h-3" /></Button>
            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-1.5 shadow-lg" onClick={() => onDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
        <div className="p-2.5">
          <h3 className="text-xs font-semibold truncate">{title}</h3>
          {desc && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{desc}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {catName && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{catName}</span>}
            {cityName && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{cityName}</span>}
            {p.project_cost && <span className="text-[9px] font-bold text-primary">{Number(p.project_cost).toLocaleString()}</span>}
            {p.duration_days && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{p.duration_days}{rtl ? 'ي' : 'd'}</span>}
          </div>
        </div>
      </div>
    </div>
  );
});
SortableProjectCard.displayName = 'SortableProjectCard';

/* ═══════════════════════════════════ */
/*           MAIN COMPONENT           */
/* ═══════════════════════════════════ */
const DashboardProjects = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [galleryProjectId, setGalleryProjectId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  /* ─── Data ─── */
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar, name_en, parent_id').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities-list'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
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
    staleTime: 3 * 60 * 1000,
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ['project-images', galleryProjectId],
    queryFn: async () => {
      const { data } = await supabase.from('project_images').select('*').eq('project_id', galleryProjectId!).order('sort_order');
      return data ?? [];
    },
    enabled: !!galleryProjectId,
  });

  /* ─── Derived ─── */
  const stats = useMemo(() => {
    const total = projects.length;
    const published = projects.filter((p: any) => p.status === 'published').length;
    const draft = total - published;
    const featured = projects.filter((p: any) => p.is_featured).length;
    const totalCost = projects.reduce((sum: number, p: any) => sum + (Number(p.project_cost) || 0), 0);
    const complete = projects.filter((p: any) => p.title_ar && p.description_ar && p.cover_image_url).length;
    const completeness = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, published, draft, featured, totalCost, completeness };
  }, [projects]);

  const usedCategoryIds = useMemo(() => [...new Set(projects.map((p: any) => p.category_id).filter(Boolean))], [projects]);
  const usedCategories = categories.filter((c: any) => usedCategoryIds.includes(c.id));

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    if (statusFilter === 'published') result = result.filter((p: any) => p.status === 'published');
    else if (statusFilter === 'draft') result = result.filter((p: any) => p.status === 'draft');
    else if (statusFilter === 'featured') result = result.filter((p: any) => p.is_featured);
    if (categoryFilter !== 'all') result = result.filter((p: any) => p.category_id === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) => p.title_ar.toLowerCase().includes(q) || (p.title_en || '').toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q));
    }
    return result;
  }, [projects, statusFilter, categoryFilter, searchQuery]);

  /* ─── Mutations ─── */
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        business_id: businessId!, title_ar: form.title_ar.trim(), title_en: form.title_en.trim() || null,
        description_ar: form.description_ar.trim() || null, description_en: form.description_en.trim() || null,
        cover_image_url: form.cover_image_url || null, client_name: form.client_name.trim() || null,
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }); closeForm(); toast.success(editId ? (isRTL ? 'تم التحديث' : 'Updated') : (isRTL ? 'تم الإضافة' : 'Added')); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('projects').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }); setDeleteConfirm(null); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
  });

  const toggleFeaturedMut = useMutation({
    mutationFn: async (p: any) => { const { error } = await supabase.from('projects').update({ is_featured: !p.is_featured }).eq('id', p.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  const reorderMut = useMutation({
    mutationFn: async (reordered: { id: string; sort_order: number }[]) => {
      await Promise.all(reordered.map(r => supabase.from('projects').update({ sort_order: r.sort_order }).eq('id', r.id)));
    },
    onError: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async () => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('projects').delete().eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }); setSelectedIds(new Set()); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
  });

  const bulkStatusMut = useMutation({
    mutationFn: async (status: string) => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('projects').update({ status }).eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }); setSelectedIds(new Set()); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  /* ─── Callbacks ─── */
  const closeForm = useCallback(() => { setShowForm(false); setEditId(null); setForm(emptyForm); }, []);
  const scrollToForm = useCallback(() => { requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }, []);

  const openEdit = useCallback((p: any) => {
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
    scrollToForm();
  }, [scrollToForm]);

  const duplicateProject = useCallback((p: any) => {
    setEditId(null);
    setForm({
      title_ar: p.title_ar + (isRTL ? ' (نسخة)' : ' (copy)'),
      title_en: p.title_en ? p.title_en + ' (copy)' : '',
      description_ar: p.description_ar || '', description_en: p.description_en || '',
      cover_image_url: p.cover_image_url || '', client_name: p.client_name || '',
      project_cost: p.project_cost?.toString() || '', duration_days: p.duration_days?.toString() || '',
      completion_date: p.completion_date || '', status: 'draft',
      category_id: p.category_id || '', city_id: p.city_id || '',
      is_featured: false, currency_code: p.currency_code || 'SAR',
    });
    setShowForm(true);
    scrollToForm();
  }, [isRTL, scrollToForm]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filteredProjects.findIndex((i: any) => i.id === active.id);
    const newIdx = filteredProjects.findIndex((i: any) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove([...filteredProjects], oldIdx, newIdx);
    queryClient.setQueryData(['dashboard-projects', businessId], reordered);
    reorderMut.mutate(reordered.map((item: any, i: number) => ({ id: item.id, sort_order: i })));
  }, [filteredProjects, businessId, queryClient, reorderMut]);

  const handleGalleryChange = useCallback(async (urls: string[]) => {
    if (!galleryProjectId) return;
    await supabase.from('project_images').delete().eq('project_id', galleryProjectId);
    if (urls.length > 0) {
      const rows = urls.map((url, i) => ({ project_id: galleryProjectId, image_url: url, sort_order: i }));
      const { error } = await supabase.from('project_images').insert(rows);
      if (error) { toast.error(error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ['project-images', galleryProjectId] });
  }, [galleryProjectId, queryClient]);

  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredProjects.length ? new Set() : new Set(filteredProjects.map((p: any) => p.id)));
  }, [filteredProjects]);

  const exportCSV = useCallback(() => {
    const rows = [['Title AR', 'Title EN', 'Client', 'Cost', 'Duration', 'Status', 'Featured', 'Date'].join(','),
      ...projects.map((p: any) => [`"${p.title_ar}"`, `"${p.title_en || ''}"`, `"${p.client_name || ''}"`, p.project_cost || '', p.duration_days || '', p.status, p.is_featured, p.completion_date || ''].join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `projects_${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم التصدير' : 'Exported');
  }, [projects, isRTL]);

  const filterOptions = useMemo(() => [
    { key: 'all' as const, label: isRTL ? 'الكل' : 'All', count: stats.total, icon: Layers },
    { key: 'published' as const, label: isRTL ? 'منشور' : 'Published', count: stats.published, icon: Eye },
    { key: 'draft' as const, label: isRTL ? 'مسودة' : 'Draft', count: stats.draft, icon: EyeOff },
    { key: 'featured' as const, label: isRTL ? 'مميز' : 'Featured', count: stats.featured, icon: Star },
  ], [isRTL, stats]);

  const galleryProject = projects.find((p: any) => p.id === galleryProjectId);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">{isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}</h1>
              <p className="text-xs text-muted-foreground">{isRTL ? `${stats.total} مشروع · ${stats.published} منشور` : `${stats.total} projects · ${stats.published} published`}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {projects.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 me-1" />{isRTL ? 'تصدير' : 'Export'}
              </Button>
            )}
            <Button variant="hero" size="sm" className="h-8 text-xs" onClick={() => { closeForm(); setShowForm(true); scrollToForm(); }}>
              <Plus className="w-3.5 h-3.5 me-1" />{isRTL ? 'إضافة مشروع' : 'Add Project'}
            </Button>
          </div>
        </div>

        {/* ═══ Stats ═══ */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              { l: isRTL ? 'إجمالي' : 'Total', v: stats.total, icon: FolderOpen, cls: 'text-primary bg-primary/10' },
              { l: isRTL ? 'منشور' : 'Published', v: stats.published, icon: Eye, cls: 'text-primary bg-primary/10' },
              { l: isRTL ? 'مسودة' : 'Draft', v: stats.draft, icon: EyeOff, cls: 'text-muted-foreground bg-muted' },
              { l: isRTL ? 'مميز' : 'Featured', v: stats.featured, icon: Star, cls: 'text-accent bg-accent/10' },
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
                <span className="text-[11px] font-medium">{isRTL ? 'اكتمال بيانات المشاريع' : 'Project completeness'}</span>
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
                    {editId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editId ? (isRTL ? 'تعديل المشروع' : 'Edit Project') : (isRTL ? 'إضافة مشروع جديد' : 'New Project')}
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
                        onTranslated={v => setForm(f => ({ ...f, title_en: v }))}
                        onImproved={v => setForm(f => ({ ...f, title_ar: v }))} />
                    </div>
                    <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} placeholder={isRTL ? 'مثال: تركيب واجهات زجاجية' : 'e.g. Glass facade installation'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                      <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                        onTranslated={v => setForm(f => ({ ...f, title_ar: v }))}
                        onImproved={v => setForm(f => ({ ...f, title_en: v }))} />
                    </div>
                    <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" placeholder="e.g. Glass facade installation" className="h-9" />
                  </div>
                </div>

                {/* Category, City, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{isRTL ? 'التصنيف' : 'Category'}</Label>
                    <Select value={form.category_id || 'none'} onValueChange={v => setForm(f => ({ ...f, category_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isRTL ? 'بدون' : 'None'}</SelectItem>
                        {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.parent_id ? '  └ ' : ''}{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'المدينة' : 'City'}</Label>
                    <Select value={form.city_id || 'none'} onValueChange={v => setForm(f => ({ ...f, city_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isRTL ? 'بدون' : 'None'}</SelectItem>
                        {cities.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الحالة' : 'Status'}</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                        <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                  <ImageUpload bucket="project-images" value={form.cover_image_url} onChange={url => setForm(f => ({ ...f, cover_image_url: url }))} onRemove={() => setForm(f => ({ ...f, cover_image_url: '' }))} compact placeholder={isRTL ? 'اضغط لرفع صورة (يُفضل 16:9)' : 'Click to upload (16:9 recommended)'} />
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                      <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                        onTranslated={v => setForm(f => ({ ...f, description_en: v }))}
                        onImproved={v => setForm(f => ({ ...f, description_ar: v }))} />
                    </div>
                    <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} placeholder={isRTL ? 'وصف المشروع...' : 'Project description...'} className="resize-none text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                      <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                        onTranslated={v => setForm(f => ({ ...f, description_ar: v }))}
                        onImproved={v => setForm(f => ({ ...f, description_en: v }))} />
                    </div>
                    <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} dir="ltr" placeholder="Project description..." className="resize-none text-sm" />
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{isRTL ? 'العميل' : 'Client'}</Label>
                    <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder={isRTL ? 'اسم العميل' : 'Client'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'التكلفة' : 'Cost'}</Label>
                    <div className="flex gap-1">
                      <Input type="number" value={form.project_cost} onChange={e => setForm(f => ({ ...f, project_cost: e.target.value }))} dir="ltr" className="flex-1 h-9" />
                      <Select value={form.currency_code} onValueChange={v => setForm(f => ({ ...f, currency_code: v }))}>
                        <SelectTrigger className="w-[65px] h-9 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{['SAR', 'USD', 'EUR', 'AED'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{isRTL ? 'المدة (أيام)' : 'Duration'}</Label>
                    <Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} dir="ltr" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الإنجاز' : 'Date'}</Label>
                    <Input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} dir="ltr" className="h-9" />
                  </div>
                </div>

                {/* Featured + Submit */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                  <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
                  <div>
                    <span className="text-xs font-medium">{isRTL ? 'مشروع مميز' : 'Featured Project'}</span>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'يظهر بشكل بارز' : 'Displayed prominently'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMut.mutate()} disabled={!form.title_ar.trim() || saveMut.isPending} variant="hero" className="flex-1 h-9">
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <CheckCircle2 className="w-4 h-4 me-1.5" />}
                    {saveMut.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                  </Button>
                  <Button variant="outline" className="h-9" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ Gallery Section ═══ */}
        {galleryProjectId && (
          <Card className="border-primary/20 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Images className="w-4 h-4 text-primary" />
                  {isRTL ? 'معرض الصور' : 'Image Gallery'}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGalleryProjectId(null)}><X className="w-4 h-4" /></Button>
              </div>
              {galleryProject && <p className="text-xs text-muted-foreground">{language === 'ar' ? (galleryProject as any).title_ar : ((galleryProject as any).title_en || (galleryProject as any).title_ar)}</p>}
            </CardHeader>
            <CardContent className="pb-5">
              <MultiImageUpload bucket="project-images" images={galleryImages.map((img: any) => img.image_url)} onChange={handleGalleryChange} folder="gallery" maxImages={20} maxSizeMB={5} />
              <p className="text-[10px] text-muted-foreground mt-2">{isRTL ? `${galleryImages.length} / 20 صورة` : `${galleryImages.length} / 20 images`}</p>
            </CardContent>
          </Card>
        )}

        {/* ═══ Toolbar ═══ */}
        {projects.length > 0 && (
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
                    <Tag className="w-3 h-3" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                    {usedCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="flex border border-border/40 rounded-lg overflow-hidden ms-auto">
                <button className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}><LayoutGrid className="w-3.5 h-3.5" /></button>
                <button className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={toggleSelectAll} className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors" title={isRTL ? 'تحديد الكل' : 'Select All'}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${selectedIds.size === filteredProjects.length && filteredProjects.length > 0 ? 'text-primary' : 'text-muted-foreground/40'}`} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {filterOptions.map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${statusFilter === f.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <f.icon className="w-3 h-3" />
                  {f.label}
                  <span className={`text-[9px] px-1 rounded-full ${statusFilter === f.key ? 'bg-primary-foreground/20' : 'bg-background/60'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/15 animate-in fade-in-0 duration-150">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{selectedIds.size} {isRTL ? 'محددة' : 'selected'}</Badge>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => bulkStatusMut.mutate('published')} disabled={bulkStatusMut.isPending}><Eye className="w-3 h-3 me-0.5" />{isRTL ? 'نشر' : 'Publish'}</Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => bulkStatusMut.mutate('draft')} disabled={bulkStatusMut.isPending}><EyeOff className="w-3 h-3 me-0.5" />{isRTL ? 'مسودة' : 'Draft'}</Button>
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
              <p className="text-[11px] text-muted-foreground">{isRTL ? 'سيتم حذف المشروع وجميع صوره' : 'Project and all images will be deleted'}</p>
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
        ) : projects.length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">{isRTL ? 'لا توجد مشاريع بعد' : 'No projects yet'}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">{isRTL ? 'أضف مشاريعك المنجزة لعرضها للعملاء' : 'Add your completed projects to showcase'}</p>
            <Button variant="hero" size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-1" />{isRTL ? 'أضف أول مشروع' : 'Add First Project'}</Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Search className="w-7 h-7 mb-2" />
            <p className="text-sm font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            <button className="text-xs text-primary mt-1 hover:underline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}>{isRTL ? 'إعادة تعيين' : 'Reset filters'}</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredProjects.map((p: any) => p.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5' : 'space-y-1.5'}>
                {filteredProjects.map((p: any) => (
                  <SortableProjectCard key={p.id} project={p} rtl={isRTL} language={language} viewMode={viewMode}
                    isSelected={selectedIds.has(p.id)}
                    onEdit={openEdit} onGallery={setGalleryProjectId}
                    onDelete={id => setDeleteConfirm(id)}
                    onToggleFeatured={proj => toggleFeaturedMut.mutate(proj)}
                    onDuplicate={duplicateProject}
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

export default DashboardProjects;
