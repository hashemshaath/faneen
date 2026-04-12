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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Loader2, FolderTree, Search, X,
  ChevronDown, ChevronLeft, ChevronRight, GripVertical, Eye, EyeOff,
  Layers, FolderOpen, Folder, MoreHorizontal, Copy, ArrowUpDown,
  LayoutGrid, List, Hash, FileText
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Category {
  id: string; name_ar: string; name_en: string; slug: string;
  description_ar: string | null; description_en: string | null;
  icon: string | null; parent_id: string | null; is_active: boolean;
  sort_order: number; created_at: string;
}

interface CategoryForm {
  name_ar: string; name_en: string; slug: string; description_ar: string;
  description_en: string; icon: string; parent_id: string | null;
  is_active: boolean; sort_order: number;
}

const emptyForm: CategoryForm = {
  name_ar: '', name_en: '', slug: '', description_ar: '', description_en: '',
  icon: '', parent_id: null, is_active: true, sort_order: 0,
};

interface TreeNode extends Category {
  children: TreeNode[];
  depth: number;
}

// Build tree from flat list
function buildTree(categories: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  
  categories.forEach(c => map.set(c.id, { ...c, children: [], depth: 0 }));
  
  categories.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      const parent = map.get(c.parent_id)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

// Flatten tree for sortable list
function flattenTree(nodes: TreeNode[], collapsed: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  const traverse = (items: TreeNode[], depth: number) => {
    items.forEach(node => {
      const n = { ...node, depth };
      result.push(n);
      if (node.children.length > 0 && !collapsed.has(node.id)) {
        traverse(node.children, depth + 1);
      }
    });
  };
  traverse(nodes, 0);
  return result;
}

// ── Sortable Tree Item ──
const SortableTreeItem = React.memo(({
  node, isRTL, collapsed, onToggle, onEdit, onDelete, onDuplicate,
  onToggleActive, childCount, isDragging,
}: {
  node: TreeNode; isRTL: boolean; collapsed: Set<string>;
  onToggle: (id: string) => void; onEdit: (cat: Category) => void;
  onDelete: (id: string) => void; onDuplicate: (cat: Category) => void;
  onToggleActive: (id: string, active: boolean) => void;
  childCount: number; isDragging?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.3 : 1,
    paddingInlineStart: `${node.depth * 32 + 12}px`,
  };

  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 py-2.5 pe-3 border-b border-border/40 hover:bg-accent/5 transition-colors ${
        !node.is_active ? 'opacity-50' : ''
      } ${isDragging ? 'bg-accent/10 rounded-lg shadow-lg' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent/10 text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Expand/collapse */}
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
          hasChildren ? 'hover:bg-accent/10 text-muted-foreground cursor-pointer' : 'text-transparent cursor-default'
        }`}
      >
        {hasChildren && (
          isCollapsed ? <ChevronIcon className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        node.depth === 0
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground'
      }`}>
        {node.icon ? (
          <span className="text-base">{node.icon}</span>
        ) : (
          hasChildren && !isCollapsed
            ? <FolderOpen className="w-4 h-4" />
            : <Folder className="w-4 h-4" />
        )}
      </div>

      {/* Name & info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm truncate ${node.depth === 0 ? 'text-foreground' : 'text-foreground/80'}`}>
            {isRTL ? node.name_ar : node.name_en}
          </span>
          {node.depth === 0 && hasChildren && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {childCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          <span className="truncate max-w-[120px]">{isRTL ? node.name_en : node.name_ar}</span>
          <span className="text-muted-foreground/40">•</span>
          <span dir="ltr" className="text-muted-foreground/60">{node.slug}</span>
        </div>
      </div>

      {/* Status */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleActive(node.id, !node.is_active)}
              className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                node.is_active ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {node.is_active ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'معطّل' : 'Inactive')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sort order */}
      <span className="text-[11px] text-muted-foreground/50 w-6 text-center tabular-nums">
        {node.sort_order}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44">
            <DropdownMenuItem onClick={() => onEdit(node)} className="gap-2 text-xs">
              <Pencil className="w-3.5 h-3.5" />
              {isRTL ? 'تعديل' : 'Edit'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(node)} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5" />
              {isRTL ? 'تكرار' : 'Duplicate'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(node.id, !node.is_active)} className="gap-2 text-xs">
              {node.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {node.is_active ? (isRTL ? 'تعطيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(node.id)} className="gap-2 text-xs text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {isRTL ? 'حذف' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
SortableTreeItem.displayName = 'SortableTreeItem';

// ── Drag Overlay Item ──
const DragOverlayItem = ({ node, isRTL }: { node: TreeNode; isRTL: boolean }) => (
  <div className="flex items-center gap-3 py-2.5 px-4 bg-card border border-primary/30 rounded-xl shadow-xl">
    <GripVertical className="w-4 h-4 text-muted-foreground/50" />
    {node.icon && <span className="text-base">{node.icon}</span>}
    <span className="font-medium text-sm">{isRTL ? node.name_ar : node.name_en}</span>
  </div>
);

// ══════════════ Main Component ══════════════
const AdminCategories = () => {
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const roots = categories.filter(c => !c.parent_id);
    const subs = categories.filter(c => c.parent_id);
    const active = categories.filter(c => c.is_active);
    return { total: categories.length, roots: roots.length, subs: subs.length, active: active.length };
  }, [categories]);

  // Tree
  const tree = useMemo(() => buildTree(categories), [categories]);
  const flatList = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);
  
  const filteredList = useMemo(() => {
    if (!search.trim()) return flatList;
    const q = search.toLowerCase();
    return flatList.filter(n =>
      n.name_ar.includes(search) || n.name_en.toLowerCase().includes(q) || n.slug.includes(q)
    );
  }, [flatList, search]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach(c => {
      if (c.parent_id) {
        map.set(c.parent_id, (map.get(c.parent_id) || 0) + 1);
      }
    });
    return map;
  }, [categories]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar.trim(), name_en: form.name_en.trim(),
        slug: form.slug.trim() || form.name_en.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        icon: form.icon || null, parent_id: form.parent_id || null,
        is_active: form.is_active, sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); closeForm(); toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'); },
    onError: () => toast.error(isRTL ? 'فشل الحفظ' : 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); setDeletingId(null); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: () => toast.error(isRTL ? 'فشل الحذف' : 'Delete failed'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('categories').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase.from('categories').update({ sort_order: u.sort_order }).eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  const closeForm = useCallback(() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }, []);

  const openEdit = useCallback((cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name_ar: cat.name_ar, name_en: cat.name_en, slug: cat.slug,
      description_ar: cat.description_ar || '', description_en: cat.description_en || '',
      icon: cat.icon || '', parent_id: cat.parent_id, is_active: cat.is_active, sort_order: cat.sort_order,
    });
    setShowForm(true);
  }, []);

  const handleDuplicate = useCallback((cat: Category) => {
    setEditingId(null);
    setForm({
      name_ar: cat.name_ar + (isRTL ? ' (نسخة)' : ' (copy)'),
      name_en: cat.name_en + ' (copy)',
      slug: cat.slug + '-copy',
      description_ar: cat.description_ar || '',
      description_en: cat.description_en || '',
      icon: cat.icon || '',
      parent_id: cat.parent_id,
      is_active: cat.is_active,
      sort_order: cat.sort_order + 1,
    });
    setShowForm(true);
  }, [isRTL]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => {
    const roots = categories.filter(c => !c.parent_id).map(c => c.id);
    setCollapsed(new Set(roots));
  }, [categories]);

  const parentCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);

  // DnD
  const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(event.active.id as string), []);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredList.findIndex(n => n.id === active.id);
    const newIndex = filteredList.findIndex(n => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder siblings only (same parent)
    const movedNode = filteredList[oldIndex];
    const targetNode = filteredList[newIndex];
    if (movedNode.parent_id !== targetNode.parent_id) {
      toast.info(isRTL ? 'يمكن إعادة الترتيب فقط بين التصنيفات في نفس المستوى' : 'Can only reorder within the same level');
      return;
    }

    const siblings = filteredList.filter(n => n.parent_id === movedNode.parent_id);
    const updates = siblings.map((s, i) => {
      if (s.id === active.id) {
        return { id: s.id, sort_order: newIndex };
      }
      return { id: s.id, sort_order: i };
    });

    reorderMutation.mutate(updates);
  }, [filteredList, isRTL, reorderMutation]);

  const activeNode = activeId ? filteredList.find(n => n.id === activeId) : null;

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
                  <FolderTree className="w-5 h-5 text-primary" />
                </div>
                {isRTL ? 'إدارة التصنيفات' : 'Categories Management'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isRTL ? 'تنظيم وإدارة التصنيفات الهرمية بالسحب والإفلات' : 'Organize hierarchical categories with drag & drop'}
              </p>
            </div>
            <Button onClick={() => { closeForm(); setShowForm(true); }} className="gap-2 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" />{isRTL ? 'تصنيف جديد' : 'New Category'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'إجمالي' : 'Total', value: stats.total, icon: Layers, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'رئيسية' : 'Root', value: stats.roots, icon: FolderTree, color: 'text-blue-600 bg-blue-500/10' },
              { label: isRTL ? 'فرعية' : 'Sub', value: stats.subs, icon: FileText, color: 'text-amber-600 bg-amber-500/10' },
              { label: isRTL ? 'مفعّلة' : 'Active', value: stats.active, icon: Eye, color: 'text-emerald-600 bg-emerald-500/10' },
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

          {/* Form */}
          {showForm && (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? (isRTL ? 'تعديل التصنيف' : 'Edit Category') : (isRTL ? 'تصنيف جديد' : 'New Category')}
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
                    <Label className="text-xs">{isRTL ? 'الأيقونة' : 'Icon'}</Label>
                    <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏗️" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'التصنيف الأب' : 'Parent'}</Label>
                    <Select value={form.parent_id || 'none'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? null : v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isRTL ? 'بدون (رئيسي)' : 'None (Root)'}</SelectItem>
                        {parentCategories.filter(c => c.id !== editingId).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon && <span className="me-1">{c.icon}</span>}
                            {isRTL ? c.name_ar : c.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} className="text-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs">{isRTL ? 'الترتيب' : 'Order'}</Label>
                    <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-9 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                    <Label className="text-xs">{isRTL ? 'مفعّل' : 'Active'}</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar.trim() || !form.name_en.trim() || saveMutation.isPending} className="gap-2 flex-1 rounded-lg">
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isRTL ? 'حفظ التصنيف' : 'Save Category'}
                  </Button>
                  <Button variant="outline" onClick={closeForm} className="rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Toolbar */}
          <Card className="border-border/50">
            <CardContent className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث في التصنيفات...' : 'Search categories...'}
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
                    <Button variant="outline" size="sm" onClick={expandAll} className="h-9 px-3 text-xs gap-1.5">
                      <ChevronDown className="w-3.5 h-3.5" />
                      {isRTL ? 'توسيع' : 'Expand'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRTL ? 'توسيع الكل' : 'Expand all'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={collapseAll} className="h-9 px-3 text-xs gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5" />
                      {isRTL ? 'طي' : 'Collapse'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRTL ? 'طي الكل' : 'Collapse all'}</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Tree */}
          {isLoading ? (
            <Card>
              <CardContent className="p-12 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
              </CardContent>
            </Card>
          ) : filteredList.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderTree className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">{isRTL ? 'لا توجد تصنيفات' : 'No categories found'}</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => { closeForm(); setShowForm(true); }}>
                  <Plus className="w-4 h-4" />{isRTL ? 'إضافة تصنيف' : 'Add Category'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-border/50">
              {/* Table header */}
              <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 border-b border-border/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span className="w-[44px]" />
                <span className="w-6" />
                <span className="w-8" />
                <span className="flex-1">{isRTL ? 'التصنيف' : 'Category'}</span>
                <span className="w-2">{isRTL ? 'الحالة' : ''}</span>
                <span className="w-6 text-center"><Hash className="w-3 h-3 inline" /></span>
                <span className="w-[72px]" />
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={filteredList.map(n => n.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {filteredList.map(node => (
                      <SortableTreeItem
                        key={node.id}
                        node={node}
                        isRTL={isRTL}
                        collapsed={collapsed}
                        onToggle={toggleCollapse}
                        onEdit={openEdit}
                        onDelete={setDeletingId}
                        onDuplicate={handleDuplicate}
                        onToggleActive={(id, active) => toggleActiveMutation.mutate({ id, active })}
                        childCount={childCountMap.get(node.id) || 0}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeNode && <DragOverlayItem node={activeNode} isRTL={isRTL} />}
                </DragOverlay>
              </DndContext>
              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/40 text-[11px] text-muted-foreground">
                <span>
                  {isRTL
                    ? `${filteredList.length} تصنيف معروض من أصل ${stats.total}`
                    : `Showing ${filteredList.length} of ${stats.total} categories`}
                </span>
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3" />
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
                <AlertDialogDescription>
                  {isRTL ? 'هل أنت متأكد من حذف هذا التصنيف؟ سيتم حذف جميع التصنيفات الفرعية المرتبطة به.' : 'Are you sure? All sub-categories will also be deleted.'}
                </AlertDialogDescription>
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

export default AdminCategories;
