import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import {
  Plus, Trash2, Pencil, X, Search, CheckCircle2, Wrench,
  DollarSign, ChevronDown, ChevronRight, Send, Package,
  Star, Globe, MapPin, Sparkles, Copy, GripVertical,
  ArrowUpDown, LayoutGrid, List, Eye, EyeOff, Loader2,
  TrendingUp, AlertCircle, Clock, Zap, Filter, BarChart3,
  Download, Upload, RefreshCw,
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

type FilterMode = 'all' | 'active' | 'inactive';
type SortMode = 'custom' | 'name' | 'price' | 'date';
type ViewMode = 'list' | 'grid';

/* ─── Stat Card ─── */
const StatCard = React.memo(({ label, value, icon: Icon, color, trend }: {
  label: string; value: number; icon: any; color: string; trend?: string;
}) => (
  <Card className="border-border/40 bg-card/50 hover:shadow-md transition-all duration-200">
    <CardContent className="p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      </div>
      {trend && (
        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <TrendingUp className="w-3 h-3" />{trend}
        </span>
      )}
    </CardContent>
  </Card>
));
StatCard.displayName = 'StatCard';

/* ─── Sortable Service Card ─── */
const SortableServiceCard = React.memo(({
  s, isRTL, viewMode, isSelected, onEdit, onToggle, onDuplicate, onDelete, onSelect,
}: {
  s: Tables<'business_services'>;
  isRTL: boolean;
  viewMode: ViewMode;
  isSelected: boolean;
  onEdit: (s: Tables<'business_services'>) => void;
  onToggle: (s: Tables<'business_services'>) => void;
  onDuplicate: (s: Tables<'business_services'>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  const name = isRTL ? s.name_ar : (s.name_en || s.name_ar);
  const desc = isRTL ? s.description_ar : (s.description_en || s.description_ar);
  const hasPrice = s.price_from || s.price_to;
  const createdDate = new Date(s.created_at);
  const isNew = (Date.now() - createdDate.getTime()) < 7 * 24 * 60 * 60 * 1000;

  if (viewMode === 'grid') {
    return (
      <div ref={setNodeRef} style={style}>
        <Card className={`border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-200 h-full group ${!s.is_active ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-primary/50 border-primary/40' : ''}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => onSelect(s.id)} className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary/50'}`}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                </button>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Wrench className={`w-5 h-5 ${s.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isNew && <Badge className="text-[8px] px-1 py-0 h-3.5 bg-blue-500/10 text-blue-600 border-blue-500/20">{isRTL ? 'جديد' : 'New'}</Badge>}
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm line-clamp-1">{name}</h3>
              {desc && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{desc}</p>}
            </div>
            <div className="flex items-center justify-between gap-2">
              {hasPrice ? (
                <span className="text-xs text-primary font-semibold">
                  {s.price_from ? Number(s.price_from).toLocaleString() : ''}{s.price_from && s.price_to ? ' - ' : ''}{s.price_to ? Number(s.price_to).toLocaleString() : ''} {s.currency_code}
                </span>
              ) : <span className="text-[10px] text-muted-foreground">{isRTL ? 'بدون تسعير' : 'No pricing'}</span>}
              <Badge variant={s.is_active ? 'default' : 'secondary'} className={`text-[9px] px-1.5 py-0 h-4 ${s.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}`}>
                {s.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Off')}
              </Badge>
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggle(s)} title={s.is_active ? 'Deactivate' : 'Activate'}>
                {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(s)}><Copy className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-border/40 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group ${!s.is_active ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-primary/50 border-primary/40' : ''}`}>
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <button onClick={() => onSelect(s.id)} className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary/50'}`}>
            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
          </button>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4" />
          </button>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
            <Wrench className={`w-5 h-5 ${s.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium truncate text-sm">{name}</h3>
              {isNew && <Badge className="text-[8px] px-1 py-0 h-3.5 bg-blue-500/10 text-blue-600 border-blue-500/20">{isRTL ? 'جديد' : 'New'}</Badge>}
              <Badge variant={s.is_active ? 'default' : 'secondary'} className={`text-[9px] px-1.5 py-0 h-4 ${s.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}`}>
                {s.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Off')}
              </Badge>
            </div>
            {desc && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{desc}</p>}
            <div className="flex items-center gap-3 mt-1">
              {hasPrice && (
                <p className="text-xs text-primary font-semibold">
                  {s.price_from ? Number(s.price_from).toLocaleString() : ''}{s.price_from && s.price_to ? ' - ' : ''}{s.price_to ? Number(s.price_to).toLocaleString() : ''} {s.currency_code}
                </p>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {createdDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggle(s)}>
              {s.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(s)}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(s)}><Copy className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
SortableServiceCard.displayName = 'SortableServiceCard';

/* ─── Inline Delete Confirmation ─── */
const InlineDeleteConfirm = React.memo(({ isRTL, onConfirm, onCancel, isPending }: {
  isRTL: boolean; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) => (
  <Card className="border-destructive/30 bg-destructive/5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5 text-destructive" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{isRTL ? 'حذف الخدمة' : 'Delete Service'}</p>
        <p className="text-xs text-muted-foreground">{isRTL ? 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure? This action cannot be undone.'}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : <Trash2 className="w-3.5 h-3.5 me-1" />}
          {isRTL ? 'حذف' : 'Delete'}
        </Button>
      </div>
    </CardContent>
  </Card>
));
InlineDeleteConfirm.displayName = 'InlineDeleteConfirm';

/* ─── Main Component ─── */
const DashboardServices = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tables<'business_services'> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showBrands, setShowBrands] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const emptyForm = { name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true, currency_code: 'SAR' };
  const [form, setForm] = useState(emptyForm);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id, category_id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
  });

  const filteredServices = useMemo(() => {
    let result = [...services];
    if (filterMode === 'active') result = result.filter(s => s.is_active);
    if (filterMode === 'inactive') result = result.filter(s => !s.is_active);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name_ar.toLowerCase().includes(q) || (s.name_en || '').toLowerCase().includes(q) || (s.description_ar || '').toLowerCase().includes(q));
    }
    if (sortMode === 'name') result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
    else if (sortMode === 'price') result.sort((a, b) => (Number(a.price_from) || 0) - (Number(b.price_from) || 0));
    else if (sortMode === 'date') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [services, filterMode, searchQuery, sortMode]);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter(s => s.is_active).length;
    const inactive = total - active;
    const withPricing = services.filter(s => s.price_from || s.price_to).length;
    const completeness = total > 0 ? Math.round((services.filter(s => s.name_ar && s.description_ar && (s.price_from || s.price_to)).length / total) * 100) : 0;
    return { total, active, inactive, withPricing, completeness };
  }, [services]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return serviceCatalog;
    const q = catalogSearch.toLowerCase();
    return serviceCatalog.map(group => ({
      ...group,
      services: group.services.filter(s => s.name_ar.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q)),
    })).filter(g => g.services.length > 0);
  }, [catalogSearch]);

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(items.map(item =>
        supabase.from('business_services').update({ sort_order: item.sort_order }).eq('id', item.id)
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-services'] }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business found');
      const payload = {
        business_id: businessId,
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || null,
        description_ar: form.description_ar.trim() || null,
        description_en: form.description_en.trim() || null,
        price_from: form.price_from ? Number(form.price_from) : null,
        price_to: form.price_to ? Number(form.price_to) : null,
        is_active: form.is_active,
        currency_code: form.currency_code,
      };
      if (editing) {
        const { error } = await supabase.from('business_services').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_services').insert({ ...payload, sort_order: services.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      closeForm();
      toast.success(editing ? (isRTL ? 'تم تحديث الخدمة بنجاح' : 'Service updated successfully') : (isRTL ? 'تم إضافة الخدمة بنجاح' : 'Service added successfully'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم حذف الخدمة' : 'Service deleted');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (s: Tables<'business_services'>) => {
      const { error } = await supabase.from('business_services').update({ is_active: !s.is_active }).eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id =>
        supabase.from('business_services').update({ is_active: activate }).eq('id', id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      setSelectedIds(new Set());
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id =>
        supabase.from('business_services').delete().eq('id', id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      setSelectedIds(new Set());
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const closeForm = useCallback(() => { setShowForm(false); setEditing(null); setForm(emptyForm); }, []);

  const scrollToForm = useCallback(() => {
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const openEdit = useCallback((s: Tables<'business_services'>) => {
    setEditing(s);
    setForm({
      name_ar: s.name_ar, name_en: s.name_en || '', description_ar: s.description_ar || '',
      description_en: s.description_en || '', price_from: s.price_from?.toString() || '',
      price_to: s.price_to?.toString() || '', is_active: s.is_active, currency_code: s.currency_code || 'SAR',
    });
    setShowForm(true);
    scrollToForm();
  }, [scrollToForm]);

  const duplicateService = useCallback((s: Tables<'business_services'>) => {
    setEditing(null);
    setForm({
      name_ar: s.name_ar + (isRTL ? ' (نسخة)' : ' (copy)'),
      name_en: s.name_en ? s.name_en + ' (copy)' : '',
      description_ar: s.description_ar || '', description_en: s.description_en || '',
      price_from: s.price_from?.toString() || '', price_to: s.price_to?.toString() || '',
      is_active: s.is_active, currency_code: s.currency_code || 'SAR',
    });
    setShowForm(true);
    scrollToForm();
  }, [isRTL, scrollToForm]);

  const quickAddFromCatalog = useCallback((item: ServiceItem) => {
    setForm({ ...emptyForm, name_ar: item.name_ar, name_en: item.name_en, description_ar: item.description_ar, description_en: item.description_en });
    setShowForm(true);
    scrollToForm();
  }, [scrollToForm]);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }, []);

  const isServiceAdded = useCallback((name_ar: string) => services.some(s => s.name_ar === name_ar), [services]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredServices.findIndex(s => s.id === active.id);
    const newIndex = filteredServices.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(filteredServices, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((s, i) => ({ id: s.id, sort_order: i })));
  }, [filteredServices, reorderMutation]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredServices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredServices.map(s => s.id)));
  }, [selectedIds.size, filteredServices]);

  const exportServices = useCallback(() => {
    const csv = [
      ['Name (AR)', 'Name (EN)', 'Price From', 'Price To', 'Currency', 'Active'].join(','),
      ...services.map(s => [s.name_ar, s.name_en || '', s.price_from || '', s.price_to || '', s.currency_code, s.is_active].join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'services.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير الخدمات' : 'Services exported');
  }, [services, isRTL]);

  const filterTabs = useMemo(() => [
    { key: 'all' as const, label: isRTL ? 'الكل' : 'All', count: stats.total },
    { key: 'active' as const, label: isRTL ? 'نشطة' : 'Active', count: stats.active },
    { key: 'inactive' as const, label: isRTL ? 'معطلة' : 'Off', count: stats.inactive },
  ], [isRTL, stats]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              {isRTL ? 'إدارة الخدمات والتخصصات' : 'Services & Specializations'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isRTL ? 'اختر من الكتالوج أو أضف خدمات مخصصة مع السحب والإفلات' : 'Pick from catalog or add custom services with drag & drop'}
            </p>
          </div>
          {!showForm && (
            <div className="flex gap-2 flex-wrap">
              {services.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportServices}>
                  <Download className="w-4 h-4 me-1" />{isRTL ? 'تصدير' : 'Export'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowRequestForm(!showRequestForm)}>
                <Send className="w-4 h-4 me-1" />{isRTL ? 'طلب إضافة' : 'Request'}
              </Button>
              <Button variant="hero" size="sm" onClick={() => { closeForm(); setShowForm(true); scrollToForm(); }}>
                <Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة خدمة' : 'Add Service'}
              </Button>
            </div>
          )}
        </div>

        {/* Stats + Completeness */}
        {services.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <StatCard label={isRTL ? 'إجمالي الخدمات' : 'Total Services'} value={stats.total} icon={Package} color="text-primary bg-primary/10" />
              <StatCard label={isRTL ? 'نشطة' : 'Active'} value={stats.active} icon={CheckCircle2} color="text-emerald-600 bg-emerald-500/10" />
              <StatCard label={isRTL ? 'معطلة' : 'Inactive'} value={stats.inactive} icon={EyeOff} color="text-muted-foreground bg-muted" />
              <StatCard label={isRTL ? 'مسعّرة' : 'Priced'} value={stats.withPricing} icon={DollarSign} color="text-amber-600 bg-amber-500/10" />
            </div>
            {stats.completeness < 100 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-3 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{isRTL ? 'اكتمال البيانات' : 'Data Completeness'}</span>
                      <span className="text-xs font-bold text-amber-600">{stats.completeness}%</span>
                    </div>
                    <Progress value={stats.completeness} className="h-1.5" />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 max-w-[140px]">
                    {isRTL ? 'أضف وصف وأسعار لجميع خدماتك' : 'Add descriptions & pricing to all services'}
                  </span>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Request form */}
        {showRequestForm && (
          <Card className="border-amber-500/30 bg-amber-500/5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4 text-amber-500" />{isRTL ? 'طلب إضافة خدمة جديدة' : 'Request a new service'}</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowRequestForm(false)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={requestText} onChange={(e) => setRequestText(e.target.value)} rows={3}
                placeholder={isRTL ? 'اكتب اسم الخدمة والتخصص المطلوب...' : 'Describe the service you want added...'} />
              <Button size="sm" variant="hero" disabled={!requestText.trim()} onClick={() => {
                toast.success(isRTL ? 'تم إرسال الطلب بنجاح' : 'Request submitted successfully');
                setRequestText(''); setShowRequestForm(false);
              }}><Send className="w-4 h-4 me-1" />{isRTL ? 'إرسال' : 'Submit'}</Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div ref={formRef}>
            <Card className="border-primary/20 bg-primary/[0.02] shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editing ? (isRTL ? 'تعديل الخدمة' : 'Edit Service') : (isRTL ? 'إضافة خدمة جديدة' : 'Add New Service')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <Label className="text-xs sm:text-sm">{isRTL ? 'اسم الخدمة (عربي)' : 'Service Name (Arabic)'} <span className="text-destructive">*</span></Label>
                      <FieldAiActions value={form.name_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                        onTranslated={(v) => setForm(prev => ({ ...prev, name_en: v }))}
                        onImproved={(v) => setForm(prev => ({ ...prev, name_ar: v }))} />
                    </div>
                    <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder={isRTL ? 'مثال: تركيب نوافذ ألمنيوم' : 'e.g. Aluminum window installation'} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <Label className="text-xs sm:text-sm">{isRTL ? 'اسم الخدمة (إنجليزي)' : 'Service Name (English)'}</Label>
                      <FieldAiActions value={form.name_en} lang="en" compact fieldType="title" isRTL={isRTL}
                        onTranslated={(v) => setForm(prev => ({ ...prev, name_ar: v }))}
                        onImproved={(v) => setForm(prev => ({ ...prev, name_en: v }))} />
                    </div>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" placeholder="e.g. Aluminum window installation" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <Label className="text-xs sm:text-sm">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                      <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                        onTranslated={(v) => setForm(prev => ({ ...prev, description_en: v }))}
                        onImproved={(v) => setForm(prev => ({ ...prev, description_ar: v }))} />
                    </div>
                    <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} placeholder={isRTL ? 'وصف مختصر...' : 'Brief description...'} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <Label className="text-xs sm:text-sm">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                      <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                        onTranslated={(v) => setForm(prev => ({ ...prev, description_ar: v }))}
                        onImproved={(v) => setForm(prev => ({ ...prev, description_en: v }))} />
                    </div>
                    <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" placeholder="Brief description..." />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'السعر من' : 'Price From'}</Label>
                    <Input type="number" value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} dir="ltr" placeholder="0" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'السعر إلى' : 'Price To'}</Label>
                    <Input type="number" value={form.price_to} onChange={(e) => setForm({ ...form, price_to: e.target.value })} dir="ltr" placeholder="0" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">{isRTL ? 'العملة' : 'Currency'}</Label>
                    <Select value={form.currency_code} onValueChange={(v) => setForm({ ...form, currency_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'USD', 'EUR'].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <div>
                    <Label className="cursor-pointer text-xs sm:text-sm">{isRTL ? 'خدمة مفعلة' : 'Active Service'}</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'الخدمات المفعلة تظهر في ملفك التجاري' : 'Active services appear on your profile'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar.trim() || saveMutation.isPending} variant="hero" className="flex-1">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                    {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editing ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                  </Button>
                  <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Toolbar */}
        {services.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث في الخدمات...' : 'Search services...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9 h-9" />
              </div>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="w-auto h-9 gap-1 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{isRTL ? 'ترتيب يدوي' : 'Custom'}</SelectItem>
                  <SelectItem value="name">{isRTL ? 'الاسم' : 'Name'}</SelectItem>
                  <SelectItem value="price">{isRTL ? 'السعر' : 'Price'}</SelectItem>
                  <SelectItem value="date">{isRTL ? 'الأحدث' : 'Newest'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 bg-muted rounded-lg p-0.5">
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterMode(tab.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${filterMode === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              <div className="flex border border-border/40 rounded-lg overflow-hidden">
                <button className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}>
                  <List className="w-4 h-4" />
                </button>
                <button className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSelectAll} title={isRTL ? 'تحديد الكل' : 'Select All'}>
                <CheckCircle2 className={`w-4 h-4 ${selectedIds.size === filteredServices.length && filteredServices.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <Badge className="bg-primary/10 text-primary text-xs">{selectedIds.size} {isRTL ? 'محددة' : 'selected'}</Badge>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bulkToggleMutation.mutate(true)} disabled={bulkToggleMutation.isPending}>
              <Eye className="w-3 h-3 me-1" />{isRTL ? 'تفعيل' : 'Activate'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bulkToggleMutation.mutate(false)} disabled={bulkToggleMutation.isPending}>
              <EyeOff className="w-3 h-3 me-1" />{isRTL ? 'تعطيل' : 'Deactivate'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => bulkDeleteMutation.mutate()} disabled={bulkDeleteMutation.isPending}>
              <Trash2 className="w-3 h-3 me-1" />{isRTL ? 'حذف' : 'Delete'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs ms-auto" onClick={() => setSelectedIds(new Set())}>
              <X className="w-3 h-3 me-1" />{isRTL ? 'إلغاء' : 'Clear'}
            </Button>
          </div>
        )}

        {/* Inline Delete Confirmation */}
        {deleteConfirm && (
          <InlineDeleteConfirm
            isRTL={isRTL}
            onConfirm={() => deleteMutation.mutate(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
            isPending={deleteMutation.isPending}
          />
        )}

        {/* Services List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : services.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Wrench className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">{isRTL ? 'لا توجد خدمات بعد' : 'No services yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">
                {isRTL ? 'اختر من الكتالوج أدناه أو أضف خدمات مخصصة لتظهر في ملفك التجاري' : 'Pick from catalog below or add custom services to show on your profile'}
              </p>
              <Button variant="hero" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول خدمة' : 'Add First Service'}
              </Button>
            </CardContent>
          </Card>
        ) : filteredServices.length === 0 && services.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" />
              <p className="font-medium">{isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p>
              <p className="text-xs mt-1">{isRTL ? 'جرّب تغيير كلمات البحث أو الفلتر' : 'Try different search terms or filter'}</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredServices.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
                {filteredServices.map(s => (
                  <SortableServiceCard
                    key={s.id}
                    s={s}
                    isRTL={isRTL}
                    viewMode={viewMode}
                    isSelected={selectedIds.has(s.id)}
                    onEdit={openEdit}
                    onToggle={(s) => toggleActiveMutation.mutate(s)}
                    onDuplicate={duplicateService}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Service Catalog */}
        {!showForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-base sm:text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {isRTL ? 'كتالوج الخدمات والتخصصات' : 'Service Catalog'}
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  {isRTL ? 'اضغط على أي خدمة لإضافتها مباشرة' : 'Click any service to add it directly'}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {serviceCatalog.reduce((acc, g) => acc + g.services.length, 0)} {isRTL ? 'خدمة' : 'services'}
              </Badge>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isRTL ? 'ابحث في الكتالوج...' : 'Search catalog...'} value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} className="ps-9 h-9" />
            </div>

            {filteredCatalog.map((group) => {
              const isExpanded = expandedGroups.includes(group.id) || !!catalogSearch.trim();
              const addedCount = group.services.filter(s => isServiceAdded(s.name_ar)).length;
              const progress = group.services.length > 0 ? Math.round((addedCount / group.services.length) * 100) : 0;

              return (
                <Card key={group.id} className="border-border/40 overflow-hidden hover:shadow-sm transition-shadow">
                  <button className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors text-start" onClick={() => toggleGroup(group.id)}>
                    <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg ${group.color}`}>{group.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-bold text-sm sm:text-base">{isRTL ? group.name_ar : group.name_en}</h3>
                        <Badge variant="outline" className="text-[10px]">{group.services.length}</Badge>
                        {addedCount > 0 && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 me-0.5" />{addedCount}/{group.services.length}
                          </Badge>
                        )}
                      </div>
                      {addedCount > 0 && addedCount < group.services.length && (
                        <Progress value={progress} className="h-1 mt-1.5 max-w-[120px]" />
                      )}
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" /> : (isRTL ? <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 rotate-180" /> : <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />)}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/40 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {group.services.map((item, idx) => {
                          const added = isServiceAdded(item.name_ar);
                          return (
                            <button key={idx} disabled={added} onClick={() => quickAddFromCatalog(item)}
                              className={`p-2.5 sm:p-3 rounded-xl border text-start transition-all ${added ? 'bg-emerald-500/5 border-emerald-500/20 cursor-default' : 'border-border/40 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm cursor-pointer'}`}>
                              <div className="flex items-center gap-2">
                                {added ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Plus className="w-4 h-4 text-primary shrink-0" />}
                                <span className="font-medium text-xs sm:text-sm truncate">{isRTL ? item.name_ar : item.name_en}</span>
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 line-clamp-2">{isRTL ? item.description_ar : item.description_en}</p>
                            </button>
                          );
                        })}
                      </div>
                      {group.brands && group.brands.length > 0 && (
                        <div className="border-t border-border/40 p-3 sm:p-4">
                          <button className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
                            onClick={() => setShowBrands(showBrands === group.id ? null : group.id)}>
                            <Star className="w-4 h-4" />
                            {isRTL ? 'أشهر الماركات' : 'Popular Brands'}
                            {showBrands === group.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                          </button>
                          {showBrands === group.id && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 animate-in fade-in-0 duration-150">
                              {group.brands.map((brand, bi) => (
                                <div key={bi} className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-xs font-bold ${brand.type === 'international' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                    {brand.type === 'international' ? <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] sm:text-xs font-medium truncate">{brand.name}</p>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{isRTL ? brand.origin_ar : brand.origin_en}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardServices;
