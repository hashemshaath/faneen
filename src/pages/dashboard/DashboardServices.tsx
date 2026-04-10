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
  Plus, Trash2, Pencil, X, Search, CheckCircle2, Wrench,
  DollarSign, ChevronDown, ChevronRight, Package,
  Star, Globe, MapPin, Sparkles, Copy, GripVertical,
  ArrowUpDown, LayoutGrid, List, Eye, EyeOff, Loader2,
  AlertCircle, Clock, Zap, Download, BarChart3,
  Layers, ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import type { Tables } from '@/integrations/supabase/types';
import { serviceCatalog, type ServiceItem } from '@/components/dashboard/services-catalog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type FilterMode = 'all' | 'active' | 'inactive' | 'no-price';
type SortMode = 'custom' | 'name' | 'price' | 'date';
type ViewMode = 'list' | 'grid';

/* ─── Sortable Service Card ─── */
const SortableServiceCard = React.memo(({
  s, rtl, viewMode, isSelected, onEdit, onToggle, onDuplicate, onDelete, onSelect,
}: {
  s: Tables<'business_services'>; rtl: boolean; viewMode: ViewMode; isSelected: boolean;
  onEdit: (s: Tables<'business_services'>) => void; onToggle: (s: Tables<'business_services'>) => void;
  onDuplicate: (s: Tables<'business_services'>) => void; onDelete: (id: string) => void; onSelect: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined };
  const name = rtl ? s.name_ar : (s.name_en || s.name_ar);
  const desc = rtl ? s.description_ar : (s.description_en || s.description_ar);
  const hasPrice = s.price_from || s.price_to;
  const isNew = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000) < 7;
  const isIncomplete = !s.description_ar || (!s.price_from && !s.price_to);

  if (viewMode === 'grid') {
    return (
      <div ref={setNodeRef} style={style} className="h-full">
        <div className={`relative rounded-2xl border bg-card h-full flex flex-col group transition-all duration-200 hover:shadow-md hover:border-primary/20 ${!s.is_active ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-primary border-primary/30' : 'border-border/40'}`}>
          {/* Color strip */}
          <div className={`h-1 rounded-t-2xl ${s.is_active ? 'bg-gradient-to-r from-primary/50 to-primary/20' : 'bg-muted'}`} />
          
          <div className="p-4 flex-1 flex flex-col gap-3">
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => onSelect(s.id)} className={`w-[18px] h-[18px] rounded border-[1.5px] transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/20 hover:border-primary/60'}`}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                </button>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Wrench className={`w-5 h-5 ${s.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isNew && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">{rtl ? 'جديد' : 'NEW'}</span>}
                {isIncomplete && (
                  <TooltipProvider><Tooltip><TooltipTrigger><AlertCircle className="w-3.5 h-3.5 text-destructive/50" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs">{rtl ? 'بيانات ناقصة' : 'Incomplete'}</p></TooltipContent></Tooltip></TooltipProvider>
                )}
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none">
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Name + desc */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[13px] leading-snug line-clamp-2">{name}</h3>
              {desc && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">{desc}</p>}
            </div>

            {/* Price + Status */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              {hasPrice ? (
                <div>
                  <span className="text-sm font-bold text-foreground">
                    {s.price_from ? Number(s.price_from).toLocaleString() : ''}{s.price_from && s.price_to ? ' – ' : ''}{s.price_to ? Number(s.price_to).toLocaleString() : ''}
                  </span>
                  <span className="text-[10px] text-muted-foreground ms-1">{s.currency_code}</span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 italic flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />{rtl ? 'بدون تسعير' : 'No price'}
                </span>
              )}
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {s.is_active ? (rtl ? 'نشط' : 'Active') : (rtl ? 'معطل' : 'Off')}
              </span>
            </div>
          </div>

          {/* Hover actions */}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-card via-card to-transparent pt-8 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-all duration-200">
            <div className="flex items-center gap-1 justify-center">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/80 hover:bg-muted" onClick={() => onEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/80 hover:bg-muted" onClick={() => onToggle(s)}>
                {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/80 hover:bg-muted" onClick={() => onDuplicate(s)}><Copy className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive" onClick={() => onDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div ref={setNodeRef} style={style}>
      <div className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-200 group hover:shadow-sm hover:border-primary/15 ${!s.is_active ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-primary border-primary/30' : 'border-border/40'}`}>
        <button onClick={() => onSelect(s.id)} className={`w-[18px] h-[18px] rounded border-[1.5px] transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/20 hover:border-primary/60'}`}>
          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
        </button>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/25 hover:text-muted-foreground shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.is_active ? 'bg-primary/8' : 'bg-muted'}`}>
          <Wrench className={`w-4 h-4 ${s.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{name}</h3>
            {isNew && <span className="text-[8px] font-bold px-1 py-px rounded bg-accent text-accent-foreground">{rtl ? 'جديد' : 'NEW'}</span>}
            {isIncomplete && (
              <TooltipProvider><Tooltip><TooltipTrigger><AlertCircle className="w-3 h-3 text-destructive/50" /></TooltipTrigger>
              <TooltipContent><p className="text-xs">{rtl ? 'بيانات ناقصة' : 'Incomplete'}</p></TooltipContent></Tooltip></TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {desc && <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{desc}</p>}
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {new Date(s.created_at).toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasPrice && (
            <span className="text-xs font-bold text-foreground whitespace-nowrap">
              {s.price_from ? Number(s.price_from).toLocaleString() : ''}{s.price_from && s.price_to ? ' – ' : ''}{s.price_to ? Number(s.price_to).toLocaleString() : ''}
              <span className="text-[10px] font-normal text-muted-foreground ms-0.5">{s.currency_code}</span>
            </span>
          )}
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {s.is_active ? (rtl ? 'نشط' : 'Active') : (rtl ? 'معطل' : 'Off')}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onToggle(s)}>
            {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onDuplicate(s)}><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
});
SortableServiceCard.displayName = 'SortableServiceCard';

/* ═════════════════════════════════════════════ */
/*                 MAIN COMPONENT                */
/* ═════════════════════════════════════════════ */
const DashboardServices = () => {
  const { isRTL: rtl, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tables<'business_services'> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showBrands, setShowBrands] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCatalog, setShowCatalog] = useState(false);

  const emptyForm = { name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true, currency_code: 'SAR' };
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
      const { data } = await supabase.from('businesses').select('id, category_id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
  const businessId = business?.id;

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['dashboard-services', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase.from('business_services').select('*').eq('business_id', businessId).order('sort_order');
      return data ?? [];
    },
    enabled: !!businessId,
    staleTime: 3 * 60 * 1000,
  });

  /* ─── Derived ─── */
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter(s => s.is_active).length;
    const noPrice = services.filter(s => !s.price_from && !s.price_to).length;
    const complete = services.filter(s => s.name_ar && s.description_ar && (s.price_from || s.price_to)).length;
    const completeness = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, active, inactive: total - active, noPrice, completeness };
  }, [services]);

  const filteredServices = useMemo(() => {
    let result = [...services];
    if (filterMode === 'active') result = result.filter(s => s.is_active);
    else if (filterMode === 'inactive') result = result.filter(s => !s.is_active);
    else if (filterMode === 'no-price') result = result.filter(s => !s.price_from && !s.price_to);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name_ar.toLowerCase().includes(q) || (s.name_en || '').toLowerCase().includes(q) || (s.description_ar || '').toLowerCase().includes(q));
    }
    if (sortMode === 'name') result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
    else if (sortMode === 'price') result.sort((a, b) => (Number(a.price_from) || 0) - (Number(b.price_from) || 0));
    else if (sortMode === 'date') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [services, filterMode, searchQuery, sortMode]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return serviceCatalog;
    const q = catalogSearch.toLowerCase();
    return serviceCatalog.map(group => ({
      ...group,
      services: group.services.filter(s => s.name_ar.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q)),
    })).filter(g => g.services.length > 0);
  }, [catalogSearch]);

  const totalCatalogServices = serviceCatalog.reduce((a, g) => a + g.services.length, 0);

  /* ─── Mutations ─── */
  const reorderMut = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(items.map(item => supabase.from('business_services').update({ sort_order: item.sort_order }).eq('id', item.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      const payload = {
        business_id: businessId, name_ar: form.name_ar.trim(), name_en: form.name_en.trim() || null,
        description_ar: form.description_ar.trim() || null, description_en: form.description_en.trim() || null,
        price_from: form.price_from ? Number(form.price_from) : null, price_to: form.price_to ? Number(form.price_to) : null,
        is_active: form.is_active, currency_code: form.currency_code,
      };
      if (editing) {
        const { error } = await supabase.from('business_services').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_services').insert({ ...payload, sort_order: services.length });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }); closeForm(); toast.success(editing ? (rtl ? 'تم التحديث' : 'Updated') : (rtl ? 'تمت الإضافة' : 'Added')); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('business_services').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }); setDeleteConfirm(null); toast.success(rtl ? 'تم الحذف' : 'Deleted'); },
  });

  const toggleMut = useMutation({
    mutationFn: async (s: Tables<'business_services'>) => { const { error } = await supabase.from('business_services').update({ is_active: !s.is_active }).eq('id', s.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }); toast.success(rtl ? 'تم التحديث' : 'Updated'); },
  });

  const bulkToggleMut = useMutation({
    mutationFn: async (activate: boolean) => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('business_services').update({ is_active: activate }).eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }); setSelectedIds(new Set()); toast.success(rtl ? 'تم التحديث' : 'Updated'); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async () => { await Promise.all(Array.from(selectedIds).map(id => supabase.from('business_services').delete().eq('id', id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }); setSelectedIds(new Set()); toast.success(rtl ? 'تم الحذف' : 'Deleted'); },
  });

  /* ─── Callbacks ─── */
  const closeForm = useCallback(() => { setShowForm(false); setEditing(null); setForm(emptyForm); }, []);
  const scrollToForm = useCallback(() => { requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }, []);

  const openEdit = useCallback((s: Tables<'business_services'>) => {
    setEditing(s);
    setForm({ name_ar: s.name_ar, name_en: s.name_en || '', description_ar: s.description_ar || '', description_en: s.description_en || '', price_from: s.price_from?.toString() || '', price_to: s.price_to?.toString() || '', is_active: s.is_active, currency_code: s.currency_code || 'SAR' });
    setShowForm(true); setShowCatalog(false); scrollToForm();
  }, [scrollToForm]);

  const duplicateService = useCallback((s: Tables<'business_services'>) => {
    setEditing(null);
    setForm({ name_ar: s.name_ar + (rtl ? ' (نسخة)' : ' (copy)'), name_en: s.name_en ? s.name_en + ' (copy)' : '', description_ar: s.description_ar || '', description_en: s.description_en || '', price_from: s.price_from?.toString() || '', price_to: s.price_to?.toString() || '', is_active: s.is_active, currency_code: s.currency_code || 'SAR' });
    setShowForm(true); setShowCatalog(false); scrollToForm();
  }, [rtl, scrollToForm]);

  const quickAddFromCatalog = useCallback((item: ServiceItem) => {
    setForm({ ...emptyForm, name_ar: item.name_ar, name_en: item.name_en, description_ar: item.description_ar, description_en: item.description_en });
    setShowForm(true); scrollToForm();
  }, [scrollToForm]);

  const toggleGroup = useCallback((id: string) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]), []);
  const isServiceAdded = useCallback((name_ar: string) => services.some(s => s.name_ar === name_ar), [services]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filteredServices.findIndex(s => s.id === active.id);
    const newIdx = filteredServices.findIndex(s => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    reorderMut.mutate(arrayMove(filteredServices, oldIdx, newIdx).map((s, i) => ({ id: s.id, sort_order: i })));
  }, [filteredServices, reorderMut]);

  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredServices.length ? new Set() : new Set(filteredServices.map(s => s.id)));
  }, [filteredServices]);

  const exportCSV = useCallback(() => {
    const rows = [['Name AR', 'Name EN', 'Description AR', 'Price From', 'Price To', 'Currency', 'Active', 'Created'].join(','),
      ...services.map(s => [`"${s.name_ar}"`, `"${s.name_en || ''}"`, `"${(s.description_ar || '').replace(/"/g, '""')}"`, s.price_from || '', s.price_to || '', s.currency_code, s.is_active, s.created_at.slice(0, 10)].join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `services_${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
    toast.success(rtl ? 'تم التصدير' : 'Exported');
  }, [services, rtl]);

  const filterOptions = useMemo(() => [
    { key: 'all' as const, label: rtl ? 'الكل' : 'All', count: stats.total, icon: Layers },
    { key: 'active' as const, label: rtl ? 'نشطة' : 'Active', count: stats.active, icon: CheckCircle2 },
    { key: 'inactive' as const, label: rtl ? 'معطلة' : 'Off', count: stats.inactive, icon: EyeOff },
    { key: 'no-price' as const, label: rtl ? 'بدون سعر' : 'No Price', count: stats.noPrice, icon: DollarSign },
  ], [rtl, stats]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ═══ Page Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">{rtl ? 'الخدمات والتخصصات' : 'Services & Specializations'}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{rtl ? `${stats.total} خدمة مسجلة · ${stats.active} نشطة` : `${stats.total} services · ${stats.active} active`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {services.length > 0 && (
              <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 me-1.5" />{rtl ? 'تصدير' : 'Export'}
              </Button>
            )}
            <Button variant="hero" size="sm" className="h-9 text-xs rounded-xl" onClick={() => { closeForm(); setShowForm(true); setShowCatalog(false); scrollToForm(); }}>
              <Plus className="w-3.5 h-3.5 me-1.5" />{rtl ? 'إضافة خدمة' : 'Add Service'}
            </Button>
          </div>
        </div>

        {/* ═══ Stats Grid ═══ */}
        {services.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { l: rtl ? 'إجمالي' : 'Total', v: stats.total, icon: Package, cls: 'text-primary bg-primary/10' },
              { l: rtl ? 'نشطة' : 'Active', v: stats.active, icon: CheckCircle2, cls: 'text-primary bg-primary/10' },
              { l: rtl ? 'معطلة' : 'Inactive', v: stats.inactive, icon: EyeOff, cls: 'text-muted-foreground bg-muted' },
              { l: rtl ? 'بدون سعر' : 'No Price', v: stats.noPrice, icon: AlertCircle, cls: 'text-destructive/70 bg-destructive/10' },
              { l: rtl ? 'الاكتمال' : 'Complete', v: stats.completeness, icon: BarChart3, cls: 'text-primary bg-primary/10', suffix: '%' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/30 bg-card/50 hover:bg-card transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{s.v}{s.suffix || ''}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completeness bar */}
        {stats.completeness < 100 && stats.total > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/30 border border-accent/50">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium">{rtl ? 'اكتمال بيانات الخدمات' : 'Data completeness'}</span>
                <span className="text-[11px] font-bold text-primary">{stats.completeness}%</span>
              </div>
              <Progress value={stats.completeness} className="h-1.5" />
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] shrink-0 rounded-lg" onClick={() => setFilterMode('no-price')}>
              {rtl ? 'أكمل البيانات ←' : 'Complete →'}
            </Button>
          </div>
        )}

        {/* ═══ Inline Add/Edit Form ═══ */}
        {showForm && (
          <div ref={formRef}>
            <Card className="border-primary/20 shadow-md animate-in fade-in-0 slide-in-from-top-2 duration-200 overflow-hidden rounded-2xl">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editing ? (rtl ? 'تعديل الخدمة' : 'Edit Service') : (rtl ? 'إضافة خدمة جديدة' : 'New Service')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'الاسم (عربي)' : 'Name (Arabic)'} <span className="text-destructive">*</span></Label>
                      <FieldAiActions value={form.name_ar} lang="ar" compact fieldType="title" isRTL={rtl}
                        onTranslated={v => setForm(p => ({ ...p, name_en: v }))}
                        onImproved={v => setForm(p => ({ ...p, name_ar: v }))} />
                    </div>
                    <Input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} placeholder={rtl ? 'مثال: تركيب نوافذ ألمنيوم' : 'e.g. Aluminum windows'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                      <FieldAiActions value={form.name_en} lang="en" compact fieldType="title" isRTL={rtl}
                        onTranslated={v => setForm(p => ({ ...p, name_ar: v }))}
                        onImproved={v => setForm(p => ({ ...p, name_en: v }))} />
                    </div>
                    <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} dir="ltr" placeholder="e.g. Aluminum windows" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                      <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={rtl}
                        onTranslated={v => setForm(p => ({ ...p, description_en: v }))}
                        onImproved={v => setForm(p => ({ ...p, description_ar: v }))} />
                    </div>
                    <Textarea value={form.description_ar} onChange={e => setForm(p => ({ ...p, description_ar: e.target.value }))} rows={2} placeholder={rtl ? 'وصف الخدمة...' : 'Service description...'} className="resize-none text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{rtl ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                      <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={rtl}
                        onTranslated={v => setForm(p => ({ ...p, description_ar: v }))}
                        onImproved={v => setForm(p => ({ ...p, description_en: v }))} />
                    </div>
                    <Textarea value={form.description_en} onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))} rows={2} dir="ltr" placeholder="Service description..." className="resize-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{rtl ? 'السعر من' : 'Price From'}</Label>
                    <Input type="number" value={form.price_from} onChange={e => setForm(p => ({ ...p, price_from: e.target.value }))} dir="ltr" placeholder="0" min="0" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{rtl ? 'السعر إلى' : 'Price To'}</Label>
                    <Input type="number" value={form.price_to} onChange={e => setForm(p => ({ ...p, price_to: e.target.value }))} dir="ltr" placeholder="0" min="0" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{rtl ? 'العملة' : 'Currency'}</Label>
                    <Select value={form.currency_code} onValueChange={v => setForm(p => ({ ...p, currency_code: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'USD', 'EUR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/30 w-full">
                      <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                      <span className="text-xs">{form.is_active ? (rtl ? 'مفعّلة' : 'Active') : (rtl ? 'معطلة' : 'Off')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMut.mutate()} disabled={!form.name_ar.trim() || saveMut.isPending} variant="hero" className="flex-1 h-9 rounded-xl">
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <CheckCircle2 className="w-4 h-4 me-1.5" />}
                    {saveMut.isPending ? (rtl ? 'جاري الحفظ...' : 'Saving...') : editing ? (rtl ? 'تحديث' : 'Update') : (rtl ? 'إضافة' : 'Add')}
                  </Button>
                  <Button variant="outline" className="h-9 rounded-xl" onClick={closeForm}>{rtl ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ MY SERVICES ═══ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              {rtl ? 'خدماتي' : 'My Services'}
              <Badge variant="outline" className="text-[10px] font-normal ms-1">{stats.total}</Badge>
            </h2>
          </div>

          {/* Toolbar */}
          {services.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={rtl ? 'ابحث في خدماتك...' : 'Search your services...'} value={searchQuery}
                    onChange={e => startTransition(() => setSearchQuery(e.target.value))}
                    className="ps-8 h-8 text-xs rounded-xl" />
                </div>
                <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
                  <SelectTrigger className="w-auto h-8 gap-1 text-[11px] border-border/30 rounded-xl">
                    <ArrowUpDown className="w-3 h-3" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">{rtl ? 'يدوي' : 'Custom'}</SelectItem>
                    <SelectItem value="name">{rtl ? 'الاسم' : 'Name'}</SelectItem>
                    <SelectItem value="price">{rtl ? 'السعر' : 'Price'}</SelectItem>
                    <SelectItem value="date">{rtl ? 'الأحدث' : 'Newest'}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border border-border/30 rounded-xl overflow-hidden ms-auto">
                  <button className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}><LayoutGrid className="w-3.5 h-3.5" /></button>
                  <button className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={toggleSelectAll} className="p-1.5 rounded-xl border border-border/30 hover:bg-muted/50 transition-colors" title={rtl ? 'تحديد الكل' : 'Select All'}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${selectedIds.size === filteredServices.length && filteredServices.length > 0 ? 'text-primary' : 'text-muted-foreground/30'}`} />
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
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg" onClick={() => bulkToggleMut.mutate(true)} disabled={bulkToggleMut.isPending}><Eye className="w-3 h-3 me-0.5" />{rtl ? 'تفعيل' : 'Activate'}</Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg" onClick={() => bulkToggleMut.mutate(false)} disabled={bulkToggleMut.isPending}><EyeOff className="w-3 h-3 me-0.5" />{rtl ? 'تعطيل' : 'Deactivate'}</Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg text-destructive hover:text-destructive" onClick={() => bulkDeleteMut.mutate()} disabled={bulkDeleteMut.isPending}><Trash2 className="w-3 h-3 me-0.5" />{rtl ? 'حذف' : 'Delete'}</Button>
              <button className="ms-auto text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelectedIds(new Set())}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Delete Confirmation */}
          {deleteConfirm && (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-destructive/30 bg-destructive/5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{rtl ? 'تأكيد الحذف' : 'Confirm Delete'}</p>
                <p className="text-[11px] text-muted-foreground">{rtl ? 'لا يمكن التراجع' : 'Cannot be undone'}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setDeleteConfirm(null)}>{rtl ? 'إلغاء' : 'Cancel'}</Button>
              <Button variant="destructive" size="sm" className="h-7 text-xs rounded-lg" onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending}>
                {deleteMut.isPending && <Loader2 className="w-3 h-3 animate-spin me-1" />}{rtl ? 'حذف' : 'Delete'}
              </Button>
            </div>
          )}

          {/* Services Grid/List */}
          {isLoading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className={viewMode === 'grid' ? 'h-52 rounded-2xl' : 'h-16 rounded-xl'} />)}
            </div>
          ) : services.length === 0 && !showForm ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-5 border border-primary/10">
                <Wrench className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-base font-semibold mb-1.5">{rtl ? 'لا توجد خدمات بعد' : 'No services yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">{rtl ? 'أضف خدماتك يدوياً أو اختر من الكتالوج الجاهز' : 'Add services manually or pick from the ready catalog'}</p>
              <div className="flex gap-2">
                <Button variant="hero" size="sm" className="rounded-xl" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 me-1" />{rtl ? 'إضافة خدمة' : 'Add Service'}</Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowCatalog(true)}><Sparkles className="w-4 h-4 me-1" />{rtl ? 'تصفح الكتالوج' : 'Browse Catalog'}</Button>
              </div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-7 h-7 mb-2 opacity-40" />
              <p className="text-sm font-medium">{rtl ? 'لا توجد نتائج' : 'No results'}</p>
              <button className="text-xs text-primary mt-1 hover:underline" onClick={() => { setSearchQuery(''); setFilterMode('all'); }}>{rtl ? 'إعادة تعيين' : 'Reset filters'}</button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredServices.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
                  {filteredServices.map(s => (
                    <SortableServiceCard key={s.id} s={s} rtl={rtl} viewMode={viewMode} isSelected={selectedIds.has(s.id)}
                      onEdit={openEdit} onToggle={srv => toggleMut.mutate(srv)} onDuplicate={duplicateService}
                      onDelete={id => setDeleteConfirm(id)} onSelect={toggleSelect} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* ═══ CATALOG SECTION ═══ */}
        <div className="space-y-3">
          <button onClick={() => setShowCatalog(!showCatalog)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-gradient-to-r from-accent/20 via-card to-card hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center shrink-0 border border-accent/30">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-start min-w-0">
              <h2 className="font-heading font-bold text-sm flex items-center gap-2">
                {rtl ? 'كتالوج الخدمات الجاهز' : 'Service Catalog'}
                <Badge variant="outline" className="text-[10px] font-normal">{totalCatalogServices} {rtl ? 'خدمة' : 'services'}</Badge>
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{rtl ? 'اختر من مكتبة الخدمات الجاهزة وأضفها بنقرة واحدة' : 'Pick from ready services and add with one click'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {services.length > 0 && (
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {services.length}/{totalCatalogServices} {rtl ? 'مضافة' : 'added'}
                </span>
              )}
              {showCatalog ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className={`w-4 h-4 text-muted-foreground ${rtl ? 'rotate-180' : ''}`} />}
            </div>
          </button>

          {showCatalog && (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {/* Catalog Search */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={rtl ? 'ابحث في الكتالوج...' : 'Search catalog...'} value={catalogSearch}
                    onChange={e => startTransition(() => setCatalogSearch(e.target.value))}
                    className="ps-8 h-9 text-xs rounded-xl" />
                </div>
              </div>

              {/* Catalog Groups */}
              <div className="grid grid-cols-1 gap-2.5">
                {filteredCatalog.map((group) => {
                  const isExpanded = expandedGroups.includes(group.id) || !!catalogSearch.trim();
                  const addedCount = group.services.filter(s => isServiceAdded(s.name_ar)).length;
                  const progress = group.services.length > 0 ? Math.round((addedCount / group.services.length) * 100) : 0;

                  return (
                    <div key={group.id} className="rounded-2xl border border-border/40 overflow-hidden bg-card hover:shadow-sm transition-shadow">
                      <button className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/20 transition-colors text-start" onClick={() => toggleGroup(group.id)}>
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${group.color}`}>{group.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{rtl ? group.name_ar : group.name_en}</h3>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-px rounded-full">{group.services.length}</span>
                            {addedCount > 0 && (
                              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-px rounded-full flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />{addedCount}/{group.services.length}
                              </span>
                            )}
                          </div>
                          {addedCount > 0 && addedCount < group.services.length && (
                            <Progress value={progress} className="h-0.5 mt-2 max-w-[120px]" />
                          )}
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 ${rtl ? 'rotate-180' : ''}`} />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/30 animate-in fade-in-0 duration-150">
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {group.services.map((item, idx) => {
                              const added = isServiceAdded(item.name_ar);
                              return (
                                <button key={idx} disabled={added} onClick={() => quickAddFromCatalog(item)}
                                  className={`p-3 rounded-xl border text-start transition-all group/item ${added ? 'bg-primary/5 border-primary/15 cursor-default' : 'border-border/30 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm cursor-pointer active:scale-[0.98]'}`}>
                                  <div className="flex items-center gap-2">
                                    {added ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-primary/60 group-hover/item:text-primary shrink-0 transition-colors" />}
                                    <span className="font-medium text-xs truncate">{rtl ? item.name_ar : item.name_en}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 ps-6 leading-relaxed">{rtl ? item.description_ar : item.description_en}</p>
                                </button>
                              );
                            })}
                          </div>
                          {group.brands && group.brands.length > 0 && (
                            <div className="border-t border-border/30 p-3">
                              <button className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
                                onClick={() => setShowBrands(showBrands === group.id ? null : group.id)}>
                                <Star className="w-3.5 h-3.5" />
                                {rtl ? 'الماركات المعتمدة' : 'Supported Brands'} ({group.brands.length})
                                {showBrands === group.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className={`w-3.5 h-3.5 ${rtl ? 'rotate-180' : ''}`} />}
                              </button>
                              {showBrands === group.id && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 animate-in fade-in-0 duration-150">
                                  {group.brands.map((brand, bi) => (
                                    <div key={bi} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/20">
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${brand.type === 'international' ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                                        {brand.type === 'international' ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-medium truncate">{brand.name}</p>
                                        <p className="text-[9px] text-muted-foreground">{rtl ? brand.origin_ar : brand.origin_en}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardServices;
