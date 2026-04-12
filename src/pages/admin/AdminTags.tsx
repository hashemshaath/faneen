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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Tags, Plus, Pencil, Trash2, Loader2, Search, X, Eye, EyeOff,
  MoreHorizontal, Copy, GripVertical, Hash, Palette, Package,
  Wrench, Award, Star, Layers, Filter, LayoutGrid, List
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Tag {
  id: string; name_ar: string; name_en: string; slug: string;
  tag_group: string; icon: string | null; color: string | null;
  is_active: boolean; sort_order: number; created_at: string;
}

interface TagForm {
  name_ar: string; name_en: string; slug: string; tag_group: string;
  icon: string; color: string; is_active: boolean; sort_order: number;
}

const emptyForm: TagForm = {
  name_ar: '', name_en: '', slug: '', tag_group: 'general',
  icon: '', color: '#3b82f6', is_active: true, sort_order: 0,
};

const tagGroups = [
  { value: 'general', ar: 'عام', en: 'General', icon: Tags, color: 'bg-slate-500/10 text-slate-600' },
  { value: 'products', ar: 'منتجات', en: 'Products', icon: Package, color: 'bg-blue-500/10 text-blue-600' },
  { value: 'materials', ar: 'مواد', en: 'Materials', icon: Layers, color: 'bg-amber-500/10 text-amber-600' },
  { value: 'services', ar: 'خدمات', en: 'Services', icon: Wrench, color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'features', ar: 'مميزات', en: 'Features', icon: Star, color: 'bg-purple-500/10 text-purple-600' },
  { value: 'certifications', ar: 'شهادات', en: 'Certifications', icon: Award, color: 'bg-rose-500/10 text-rose-600' },
];

const getGroupInfo = (value: string) => tagGroups.find(g => g.value === value) || tagGroups[0];

// ── Sortable Tag Row ──
const SortableTagRow = React.memo(({
  tag, isRTL, onEdit, onDelete, onDuplicate, onToggleActive,
}: {
  tag: Tag; isRTL: boolean;
  onEdit: (t: Tag) => void; onDelete: (id: string) => void;
  onDuplicate: (t: Tag) => void; onToggleActive: (id: string, active: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const group = getGroupInfo(tag.tag_group);
  const GroupIcon = group.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 py-2.5 px-3 border-b border-border/40 hover:bg-accent/5 transition-colors ${
        !tag.is_active ? 'opacity-50' : ''
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent/10 text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none">
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Color dot */}
      <div className="w-3 h-3 rounded-full shrink-0 ring-2 ring-background shadow-sm" style={{ backgroundColor: tag.color || '#94a3b8' }} />

      {/* Icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50">
        {tag.icon ? <span className="text-base">{tag.icon}</span> : <Tags className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      {/* Name & meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{isRTL ? tag.name_ar : tag.name_en}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">{isRTL ? tag.name_en : tag.name_ar}</span>
          <span className="text-muted-foreground/30 text-[10px]">•</span>
          <span className="text-[11px] text-muted-foreground/60" dir="ltr">{tag.slug}</span>
        </div>
      </div>

      {/* Group badge */}
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 font-normal shrink-0 ${group.color}`}>
        <GroupIcon className="w-3 h-3" />
        {isRTL ? group.ar : group.en}
      </Badge>

      {/* Status */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleActive(tag.id, !tag.is_active)}
              className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                tag.is_active ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tag.is_active ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'معطّل' : 'Inactive')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Order */}
      <span className="text-[11px] text-muted-foreground/50 w-6 text-center tabular-nums">{tag.sort_order}</span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tag)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44">
            <DropdownMenuItem onClick={() => onEdit(tag)} className="gap-2 text-xs">
              <Pencil className="w-3.5 h-3.5" />{isRTL ? 'تعديل' : 'Edit'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(tag)} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5" />{isRTL ? 'تكرار' : 'Duplicate'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(tag.id, !tag.is_active)} className="gap-2 text-xs">
              {tag.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {tag.is_active ? (isRTL ? 'تعطيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(tag.id)} className="gap-2 text-xs text-destructive">
              <Trash2 className="w-3.5 h-3.5" />{isRTL ? 'حذف' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
SortableTagRow.displayName = 'SortableTagRow';

// ── Drag Overlay ──
const DragOverlayTag = ({ tag, isRTL }: { tag: Tag; isRTL: boolean }) => (
  <div className="flex items-center gap-3 py-2.5 px-4 bg-card border border-primary/30 rounded-xl shadow-xl">
    <GripVertical className="w-4 h-4 text-muted-foreground/50" />
    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#94a3b8' }} />
    {tag.icon && <span>{tag.icon}</span>}
    <span className="font-medium text-sm">{isRTL ? tag.name_ar : tag.name_en}</span>
  </div>
);

// ══════════════ Main Component ══════════════
const AdminTags = () => {
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TagForm>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('tag_group').order('sort_order');
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const active = tags.filter(t => t.is_active).length;
    const groupCounts = tags.reduce((acc, t) => { acc[t.tag_group] = (acc[t.tag_group] || 0) + 1; return acc; }, {} as Record<string, number>);
    return { total: tags.length, active, groups: Object.keys(groupCounts).length, groupCounts };
  }, [tags]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tags.filter(t =>
      (!search || t.name_ar.includes(search) || t.name_en.toLowerCase().includes(q) || t.slug.includes(q)) &&
      (filterGroup === 'all' || t.tag_group === filterGroup)
    );
  }, [tags, search, filterGroup]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar.trim(), name_en: form.name_en.trim(),
        slug: form.slug.trim() || form.name_en.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        tag_group: form.tag_group, icon: form.icon || null, color: form.color || null,
        is_active: form.is_active, sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from('tags').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tags').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tags'] }); closeForm(); toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'); },
    onError: () => toast.error(isRTL ? 'فشل الحفظ' : 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tags'] }); setDeletingId(null); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: () => toast.error(isRTL ? 'فشل الحذف' : 'Delete failed'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('tags').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tags'] }); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase.from('tags').update({ sort_order: u.sort_order }).eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tags'] }),
  });

  const closeForm = useCallback(() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }, []);

  const openEdit = useCallback((tag: Tag) => {
    setEditingId(tag.id);
    setForm({
      name_ar: tag.name_ar, name_en: tag.name_en, slug: tag.slug,
      tag_group: tag.tag_group, icon: tag.icon || '', color: tag.color || '#3b82f6',
      is_active: tag.is_active, sort_order: tag.sort_order,
    });
    setShowForm(true);
    setDeletingId(null);
  }, []);

  const handleDuplicate = useCallback((tag: Tag) => {
    setEditingId(null);
    setForm({
      name_ar: tag.name_ar + (isRTL ? ' (نسخة)' : ' (copy)'),
      name_en: tag.name_en + ' (copy)', slug: tag.slug + '-copy',
      tag_group: tag.tag_group, icon: tag.icon || '', color: tag.color || '#3b82f6',
      is_active: tag.is_active, sort_order: tag.sort_order + 1,
    });
    setShowForm(true);
    setDeletingId(null);
  }, [isRTL]);

  // DnD
  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), []);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = filtered.findIndex(t => t.id === active.id);
    const newIdx = filtered.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    // same group only
    if (filtered[oldIdx].tag_group !== filtered[newIdx].tag_group) {
      toast.info(isRTL ? 'يمكن الترتيب فقط داخل نفس المجموعة' : 'Can only reorder within the same group');
      return;
    }
    const siblings = filtered.filter(t => t.tag_group === filtered[oldIdx].tag_group);
    const updates = siblings.map((s, i) => ({ id: s.id, sort_order: s.id === active.id ? newIdx : i }));
    reorderMutation.mutate(updates);
  }, [filtered, isRTL, reorderMutation]);

  const activeTag = activeId ? filtered.find(t => t.id === activeId) : null;

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Tags className="w-5 h-5 text-primary" />
                </div>
                {isRTL ? 'إدارة الوسوم' : 'Tags Management'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isRTL ? 'تنظيم وإدارة الوسوم والتصنيفات الفرعية بالسحب والإفلات' : 'Organize and manage tags with drag & drop'}
              </p>
            </div>
            <Button onClick={() => { closeForm(); setShowForm(true); }} className="gap-2 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" />{isRTL ? 'وسم جديد' : 'New Tag'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'إجمالي الوسوم' : 'Total Tags', value: stats.total, icon: Tags, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'مفعّلة' : 'Active', value: stats.active, icon: Eye, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: isRTL ? 'معطّلة' : 'Inactive', value: stats.total - stats.active, icon: EyeOff, color: 'text-red-500 bg-red-500/10' },
              { label: isRTL ? 'المجموعات' : 'Groups', value: stats.groups, icon: Layers, color: 'text-blue-600 bg-blue-500/10' },
            ].map((s, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Group Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterGroup === 'all' ? 'default' : 'outline'}
              size="sm" className="h-8 rounded-lg text-xs gap-1.5"
              onClick={() => setFilterGroup('all')}
            >
              <Filter className="w-3 h-3" />
              {isRTL ? 'الكل' : 'All'} ({stats.total})
            </Button>
            {tagGroups.map(g => {
              const GroupIcon = g.icon;
              const count = stats.groupCounts[g.value] || 0;
              return (
                <Button
                  key={g.value}
                  variant={filterGroup === g.value ? 'default' : 'outline'}
                  size="sm" className="h-8 rounded-lg text-xs gap-1.5"
                  onClick={() => setFilterGroup(g.value)}
                >
                  <GroupIcon className="w-3 h-3" />
                  {isRTL ? g.ar : g.en} ({count})
                </Button>
              );
            })}
          </div>

          {/* Form */}
          {showForm && (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? (isRTL ? 'تعديل الوسم' : 'Edit Tag') : (isRTL ? 'وسم جديد' : 'New Tag')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</Label>
                    <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'الاسم (إنجليزي) *' : 'Name (English) *'}</Label>
                    <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Slug</Label>
                    <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto" className="h-9" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'المجموعة' : 'Group'}</Label>
                    <Select value={form.tag_group} onValueChange={v => setForm(f => ({ ...f, tag_group: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {tagGroups.map(g => (
                          <SelectItem key={g.value} value={g.value}>
                            <span className="flex items-center gap-2">
                              <g.icon className="w-3.5 h-3.5" />
                              {isRTL ? g.ar : g.en}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'الأيقونة' : 'Icon'}</Label>
                    <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏷️" className="h-9" />
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'اللون' : 'Color'}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={form.color || '#3b82f6'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 p-1 cursor-pointer" />
                      <Input value={form.color || '#3b82f6'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-24 font-mono text-xs" dir="ltr" />
                      {/* Preview */}
                      <Badge style={{ backgroundColor: form.color || '#3b82f6', color: '#fff' }} className="text-xs">
                        {form.icon || '🏷️'} {form.name_ar || (isRTL ? 'معاينة' : 'Preview')}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'الترتيب' : 'Order'}</Label>
                    <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-9 w-20" />
                  </div>
                  <div className="flex items-center gap-2 pb-0.5">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                    <Label className="text-xs">{isRTL ? 'مفعّل' : 'Active'}</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar.trim() || !form.name_en.trim() || saveMutation.isPending} className="gap-2 flex-1 rounded-lg">
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isRTL ? 'حفظ الوسم' : 'Save Tag'}
                  </Button>
                  <Button variant="outline" onClick={closeForm} className="rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card className="border-border/50">
            <CardContent className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث في الوسوم...' : 'Search tags...'}
                  className="ps-9 h-9"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute top-2.5 text-muted-foreground hover:text-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setViewMode('list')}>
                      <List className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRTL ? 'عرض قائمة' : 'List view'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setViewMode('grid')}>
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRTL ? 'عرض شبكي' : 'Grid view'}</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {isLoading ? (
            <Card>
              <CardContent className="p-12 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Tags className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">{isRTL ? 'لا توجد وسوم' : 'No tags found'}</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => { closeForm(); setShowForm(true); }}>
                  <Plus className="w-4 h-4" />{isRTL ? 'إضافة وسم' : 'Add Tag'}
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(tag => {
                const group = getGroupInfo(tag.tag_group);
                const GroupIcon = group.icon;
                return (
                  <Card key={tag.id} className={`group relative overflow-hidden hover:shadow-md transition-all border-border/50 ${!tag.is_active ? 'opacity-50' : ''}`}>
                    <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: tag.color || '#94a3b8' }} />
                    <CardContent className="p-4 pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: (tag.color || '#94a3b8') + '20' }}>
                          {tag.icon || '🏷️'}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(tag)} className="gap-2 text-xs"><Pencil className="w-3.5 h-3.5" />{isRTL ? 'تعديل' : 'Edit'}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(tag)} className="gap-2 text-xs"><Copy className="w-3.5 h-3.5" />{isRTL ? 'تكرار' : 'Duplicate'}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletingId(tag.id)} className="gap-2 text-xs text-destructive"><Trash2 className="w-3.5 h-3.5" />{isRTL ? 'حذف' : 'Delete'}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="font-medium text-sm truncate">{isRTL ? tag.name_ar : tag.name_en}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{isRTL ? tag.name_en : tag.name_ar}</p>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${group.color}`}>
                          <GroupIcon className="w-2.5 h-2.5" />{isRTL ? group.ar : group.en}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${tag.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ── List View with DnD ── */
            <Card className="overflow-hidden border-border/50">
              <div className="flex items-center gap-3 py-2 px-3 bg-muted/30 border-b border-border/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span className="w-[28px]" />
                <span className="w-3" />
                <span className="w-8" />
                <span className="flex-1">{isRTL ? 'الوسم' : 'Tag'}</span>
                <span className="w-24 text-center">{isRTL ? 'المجموعة' : 'Group'}</span>
                <span className="w-2" />
                <span className="w-6 text-center"><Hash className="w-3 h-3 inline" /></span>
                <span className="w-[64px]" />
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {filtered.map(tag => (
                      <SortableTagRow
                        key={tag.id}
                        tag={tag}
                        isRTL={isRTL}
                        onEdit={openEdit}
                        onDelete={setDeletingId}
                        onDuplicate={handleDuplicate}
                        onToggleActive={(id, active) => toggleActiveMutation.mutate({ id, active })}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeTag && <DragOverlayTag tag={activeTag} isRTL={isRTL} />}
                </DragOverlay>
              </DndContext>
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/40 text-[11px] text-muted-foreground">
                <span>{isRTL ? `${filtered.length} وسم من أصل ${stats.total}` : `${filtered.length} of ${stats.total} tags`}</span>
                <span className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3" />
                  {isRTL ? 'اسحب للترتيب' : 'Drag to reorder'}
                </span>
              </div>
            </Card>
          )}

          {/* Delete dialog */}
          <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
                <AlertDialogDescription>{isRTL ? 'هل أنت متأكد من حذف هذا الوسم؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure? This action cannot be undone.'}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                  className="bg-destructive text-destructive-foreground"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  {isRTL ? 'حذف' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminTags;
