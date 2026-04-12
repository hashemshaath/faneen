import React, { useState, useMemo, useCallback, useTransition } from 'react';
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
  Hash, FileText, Download, Building2, BarChart3, Filter,
  CheckCircle2, XCircle, Sparkles, TreePine, Network
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

function flattenTree(nodes: TreeNode[], collapsed: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  const traverse = (items: TreeNode[], depth: number) => {
    items.forEach(node => {
      result.push({ ...node, depth });
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
  onToggleActive, childCount, businessCount, isLast,
}: {
  node: TreeNode; isRTL: boolean; collapsed: Set<string>;
  onToggle: (id: string) => void; onEdit: (cat: Category) => void;
  onDelete: (id: string) => void; onDuplicate: (cat: Category) => void;
  onToggleActive: (id: string, active: boolean) => void;
  childCount: number; businessCount: number; isLast?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const depthColors = [
    'border-s-primary/60',
    'border-s-blue-400/50',
    'border-s-amber-400/50',
    'border-s-emerald-400/50',
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2.5 py-3 pe-3 border-b border-border/30 hover:bg-accent/5 transition-all duration-150 ${
        !node.is_active ? 'opacity-40' : ''
      } ${isDragging ? 'bg-accent/10 rounded-xl shadow-lg z-10' : ''} ${
        node.depth > 0 ? `border-s-[3px] ${depthColors[Math.min(node.depth - 1, 3)]}` : ''
      }`}
      {...(node.depth > 0 ? { style: { ...style, paddingInlineStart: `${node.depth * 28 + 8}px` } } : { style: { ...style, paddingInlineStart: '8px' } })}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-accent/10 text-muted-foreground/30 hover:text-muted-foreground transition-colors touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Expand/collapse */}
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
          hasChildren ? 'hover:bg-accent/15 text-muted-foreground cursor-pointer hover:text-foreground' : 'text-transparent cursor-default'
        }`}
      >
        {hasChildren && (
          <span className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-0' : (isRTL ? 'rotate-0' : 'rotate-0')}`}>
            {isCollapsed ? <ChevronIcon className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        node.depth === 0
          ? 'bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm'
          : 'bg-muted/50 text-muted-foreground'
      }`}>
        {node.icon ? (
          <span className="text-lg">{node.icon}</span>
        ) : (
          hasChildren && !isCollapsed
            ? <FolderOpen className="w-4 h-4" />
            : <Folder className="w-4 h-4" />
        )}
      </div>

      {/* Name & meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm truncate ${node.depth === 0 ? 'text-foreground' : 'text-foreground/80'}`}>
            {isRTL ? node.name_ar : node.name_en}
          </span>
          {node.depth === 0 && hasChildren && (
            <Badge className="text-[10px] px-1.5 py-0 h-[18px] font-medium bg-primary/10 text-primary border-0 rounded-full">
              {childCount}
            </Badge>
          )}
          {!node.is_active && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[16px] text-destructive/70 border-destructive/30">
              {isRTL ? 'معطّل' : 'Off'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 mt-0.5">
          <span className="truncate max-w-[100px]">{isRTL ? node.name_en : node.name_ar}</span>
          <span className="text-muted-foreground/30">·</span>
          <span dir="ltr" className="text-muted-foreground/50 font-mono text-[10px]">{node.slug}</span>
        </div>
      </div>

      {/* Business count */}
      {businessCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/8 text-emerald-600 text-[10px] font-medium shrink-0">
              <Building2 className="w-3 h-3" />
              {businessCount}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {isRTL ? `${businessCount} منشأة مرتبطة` : `${businessCount} linked businesses`}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Status dot */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleActive(node.id, !node.is_active)}
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ring-2 ring-offset-1 ring-offset-background ${
                node.is_active ? 'bg-emerald-500 ring-emerald-500/30' : 'bg-muted-foreground/30 ring-muted-foreground/10'
              }`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {node.is_active ? (isRTL ? 'مفعّل — انقر للتعطيل' : 'Active — click to deactivate') : (isRTL ? 'معطّل — انقر للتفعيل' : 'Inactive — click to activate')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sort order */}
      <span className="text-[11px] text-muted-foreground/40 w-7 text-center tabular-nums font-mono">
        {node.sort_order}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onEdit(node)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isRTL ? 'تعديل' : 'Edit'}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48 rounded-xl">
            <DropdownMenuItem onClick={() => onEdit(node)} className="gap-2.5 text-xs rounded-lg">
              <Pencil className="w-3.5 h-3.5" />{isRTL ? 'تعديل' : 'Edit'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(node)} className="gap-2.5 text-xs rounded-lg">
              <Copy className="w-3.5 h-3.5" />{isRTL ? 'تكرار' : 'Duplicate'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(node.id, !node.is_active)} className="gap-2.5 text-xs rounded-lg">
              {node.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {node.is_active ? (isRTL ? 'تعطيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(node.id)} className="gap-2.5 text-xs text-destructive rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />{isRTL ? 'حذف' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
SortableTreeItem.displayName = 'SortableTreeItem';

const DragOverlayItem = ({ node, isRTL }: { node: TreeNode; isRTL: boolean }) => (
  <div className="flex items-center gap-3 py-3 px-4 bg-card border-2 border-primary/30 rounded-xl shadow-2xl backdrop-blur-sm">
    <GripVertical className="w-4 h-4 text-primary/50" />
    {node.icon && <span className="text-lg">{node.icon}</span>}
    <span className="font-semibold text-sm">{isRTL ? node.name_ar : node.name_en}</span>
    <Badge className="text-[10px] bg-primary/10 text-primary border-0 ms-auto">{isRTL ? 'نقل' : 'Moving'}</Badge>
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
  const [deferredSearch, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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

  // Business counts per category
  const { data: businessCounts = [] } = useQuery({
    queryKey: ['admin-category-business-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('category_id');
      if (error) throw error;
      return data;
    },
  });

  const businessCountMap = useMemo(() => {
    const map = new Map<string, number>();
    businessCounts.forEach(b => {
      if (b.category_id) map.set(b.category_id, (map.get(b.category_id) || 0) + 1);
    });
    return map;
  }, [businessCounts]);

  const totalBusinesses = useMemo(() => {
    let total = 0;
    businessCountMap.forEach(v => total += v);
    return total;
  }, [businessCountMap]);

  const stats = useMemo(() => {
    const roots = categories.filter(c => !c.parent_id);
    const subs = categories.filter(c => c.parent_id);
    const active = categories.filter(c => c.is_active);
    const inactive = categories.filter(c => !c.is_active);
    const withDesc = categories.filter(c => c.description_ar || c.description_en);
    return { total: categories.length, roots: roots.length, subs: subs.length, active: active.length, inactive: inactive.length, withDesc: withDesc.length };
  }, [categories]);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const flatList = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);

  const filteredList = useMemo(() => {
    let list = flatList;
    if (statusFilter === 'active') list = list.filter(n => n.is_active);
    else if (statusFilter === 'inactive') list = list.filter(n => !n.is_active);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(n =>
      n.name_ar.includes(search) || n.name_en.toLowerCase().includes(q) || n.slug.includes(q)
    );
  }, [flatList, search, statusFilter]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach(c => { if (c.parent_id) map.set(c.parent_id, (map.get(c.parent_id) || 0) + 1); });
    return map;
  }, [categories]);

  // Distribution of root categories
  const rootDistribution = useMemo(() => {
    const roots = categories.filter(c => !c.parent_id);
    return roots.map(r => {
      const children = categories.filter(c => c.parent_id === r.id).length;
      const biz = businessCountMap.get(r.id) || 0;
      // Also count businesses in children
      const childBiz = categories.filter(c => c.parent_id === r.id).reduce((sum, child) => sum + (businessCountMap.get(child.id) || 0), 0);
      return { id: r.id, name: isRTL ? r.name_ar : r.name_en, icon: r.icon, children, businesses: biz + childBiz };
    });
  }, [categories, businessCountMap, isRTL]);

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
      description_ar: cat.description_ar || '', description_en: cat.description_en || '',
      icon: cat.icon || '', parent_id: cat.parent_id,
      is_active: cat.is_active, sort_order: cat.sort_order + 1,
    });
    setShowForm(true);
  }, [isRTL]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => {
    setCollapsed(new Set(categories.filter(c => !c.parent_id).map(c => c.id)));
  }, [categories]);

  const parentCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);

  // Auto-generate slug from English name
  const handleNameEnChange = useCallback((value: string) => {
    setForm(f => ({
      ...f,
      name_en: value,
      slug: !editingId || !f.slug ? value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : f.slug,
    }));
  }, [editingId]);

  // CSV export
  const exportCSV = useCallback(() => {
    const headers = ['Name (AR)', 'Name (EN)', 'Slug', 'Parent', 'Status', 'Order', 'Businesses'];
    const rows = categories.map(c => {
      const parent = c.parent_id ? categories.find(p => p.id === c.parent_id)?.name_en || '' : '';
      return [c.name_ar, c.name_en, c.slug, parent, c.is_active ? 'Active' : 'Inactive', c.sort_order, businessCountMap.get(c.id) || 0];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `categories_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم التصدير' : 'Exported');
  }, [categories, businessCountMap, isRTL]);

  // DnD
  const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(event.active.id as string), []);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredList.findIndex(n => n.id === active.id);
    const newIndex = filteredList.findIndex(n => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const movedNode = filteredList[oldIndex];
    const targetNode = filteredList[newIndex];
    if (movedNode.parent_id !== targetNode.parent_id) {
      toast.info(isRTL ? 'يمكن إعادة الترتيب فقط بين التصنيفات في نفس المستوى' : 'Can only reorder within the same level');
      return;
    }
    const siblings = filteredList.filter(n => n.parent_id === movedNode.parent_id);
    const updates = siblings.map((s, i) => ({ id: s.id, sort_order: s.id === active.id ? newIndex : i }));
    reorderMutation.mutate(updates);
  }, [filteredList, isRTL, reorderMutation]);

  const activeNode = activeId ? filteredList.find(n => n.id === activeId) : null;

  if (!isAdmin) return null;

  const statCards = [
    { label: isRTL ? 'إجمالي التصنيفات' : 'Total Categories', value: stats.total, icon: Layers, gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary' },
    { label: isRTL ? 'تصنيفات رئيسية' : 'Root Categories', value: stats.roots, icon: TreePine, gradient: 'from-blue-500/15 to-blue-500/5', iconColor: 'text-blue-600' },
    { label: isRTL ? 'تصنيفات فرعية' : 'Sub-Categories', value: stats.subs, icon: Network, gradient: 'from-amber-500/15 to-amber-500/5', iconColor: 'text-amber-600' },
    { label: isRTL ? 'منشآت مرتبطة' : 'Linked Businesses', value: totalBusinesses, icon: Building2, gradient: 'from-emerald-500/15 to-emerald-500/5', iconColor: 'text-emerald-600' },
  ];

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-sm">
                  <FolderTree className="w-5 h-5 text-primary" />
                </div>
                {isRTL ? 'إدارة التصنيفات' : 'Categories Management'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 max-w-md">
                {isRTL ? 'تنظيم وإدارة التصنيفات الهرمية للقطاعات الصناعية بالسحب والإفلات' : 'Organize industrial sector categories with drag & drop hierarchy'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 rounded-xl h-9">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? 'تصدير CSV' : 'Export CSV'}</TooltipContent>
              </Tooltip>
              <Button onClick={() => { closeForm(); setShowForm(true); }} className="gap-2 rounded-xl h-9 shadow-sm">
                <Plus className="w-4 h-4" />{isRTL ? 'تصنيف جديد' : 'New Category'}
              </Button>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((s, i) => (
              <Card key={i} className="border-border/40 overflow-hidden hover-lift transition-all duration-200">
                <CardContent className="p-4 flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Distribution Bar ── */}
          {rootDistribution.length > 0 && (
            <Card className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {isRTL ? 'توزيع المنشآت على التصنيفات' : 'Business Distribution by Category'}
                  </div>
                  <span className="text-xs text-muted-foreground">{totalBusinesses} {isRTL ? 'منشأة' : 'businesses'}</span>
                </div>
                {/* Bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-muted/40 mb-3">
                  {rootDistribution.filter(r => r.businesses > 0).map((r, i) => {
                    const percent = totalBusinesses > 0 ? (r.businesses / totalBusinesses) * 100 : 0;
                    const colors = ['bg-primary', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500'];
                    return (
                      <Tooltip key={r.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`${colors[i % colors.length]} transition-all duration-300 first:rounded-s-full last:rounded-e-full`}
                            style={{ width: `${Math.max(percent, 2)}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{r.name}: {r.businesses} ({percent.toFixed(0)}%)</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {rootDistribution.map((r, i) => {
                    const colors = ['bg-primary', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500'];
                    return (
                      <div key={r.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                        <span>{r.icon} {r.name}</span>
                        <span className="font-medium text-foreground/70">{r.businesses}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{r.children} {isRTL ? 'فرعي' : 'sub'}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Inline Form ── */}
          {showForm && (
            <Card className="border-primary/20 shadow-sm bg-gradient-to-b from-primary/[0.02] to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {editingId ? <Pencil className="w-4 h-4 text-primary" /> : <Sparkles className="w-4 h-4 text-primary" />}
                    </div>
                    {editingId ? (isRTL ? 'تعديل التصنيف' : 'Edit Category') : (isRTL ? 'تصنيف جديد' : 'New Category')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</Label>
                    <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الاسم (إنجليزي) *' : 'Name (English) *'}</Label>
                    <Input value={form.name_en} onChange={e => handleNameEnChange(e.target.value)} className="h-9 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Slug</Label>
                    <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" className="h-9 rounded-lg font-mono text-xs" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الأيقونة' : 'Icon'}</Label>
                    <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏗️" className="h-9 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'التصنيف الأب' : 'Parent Category'}</Label>
                    <Select value={form.parent_id || 'none'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? null : v }))}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">{isRTL ? 'بدون (رئيسي)' : 'None (Root)'}</SelectItem>
                        {parentCategories.filter(c => c.id !== editingId).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon && <span className="me-1.5">{c.icon}</span>}
                            {isRTL ? c.name_ar : c.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-sm rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} className="text-sm rounded-lg" />
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الترتيب' : 'Order'}</Label>
                    <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-9 w-20 rounded-lg tabular-nums" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                    <Label className="text-xs font-medium">{form.is_active ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'معطّل' : 'Inactive')}</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar.trim() || !form.name_en.trim() || saveMutation.isPending} className="gap-2 flex-1 rounded-xl h-10">
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? (isRTL ? 'تحديث التصنيف' : 'Update Category') : (isRTL ? 'إضافة التصنيف' : 'Add Category')}
                  </Button>
                  <Button variant="outline" onClick={closeForm} className="rounded-xl h-10">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Toolbar ── */}
          <Card className="border-border/40">
            <CardContent className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground/50 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث بالاسم أو المعرّف...' : 'Search by name or slug...'}
                  className="ps-9 h-9 rounded-lg"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute top-2.5 text-muted-foreground hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Status filter */}
                <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
                  {(['all', 'active', 'inactive'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        statusFilter === f
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent/10'
                      }`}
                    >
                      {f === 'all' ? (isRTL ? 'الكل' : 'All')
                        : f === 'active' ? (isRTL ? 'مفعّل' : 'Active')
                        : (isRTL ? 'معطّل' : 'Inactive')}
                      {f === 'active' && <span className="ms-1 text-[10px]">({stats.active})</span>}
                      {f === 'inactive' && stats.inactive > 0 && <span className="ms-1 text-[10px]">({stats.inactive})</span>}
                    </button>
                  ))}
                </div>
                <div className="w-px h-6 bg-border/40 hidden sm:block" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={expandAll} className="h-8 px-2.5 text-xs gap-1 rounded-lg">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRTL ? 'توسيع الكل' : 'Expand all'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 px-2.5 text-xs gap-1 rounded-lg">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRTL ? 'طي الكل' : 'Collapse all'}</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* ── Tree ── */}
          {isLoading ? (
            <Card>
              <CardContent className="p-16 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'جاري تحميل التصنيفات...' : 'Loading categories...'}</p>
              </CardContent>
            </Card>
          ) : filteredList.length === 0 ? (
            <Card className="border-dashed border-2 border-border/40">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                  <FolderTree className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-base font-semibold text-foreground/70 mb-1">{isRTL ? 'لا توجد تصنيفات' : 'No categories found'}</h3>
                <p className="text-sm text-muted-foreground mb-4">{isRTL ? 'ابدأ بإضافة التصنيف الأول لتنظيم منشآتك' : 'Start by adding the first category to organize your businesses'}</p>
                <Button className="gap-2 rounded-xl" onClick={() => { closeForm(); setShowForm(true); }}>
                  <Plus className="w-4 h-4" />{isRTL ? 'إضافة تصنيف' : 'Add Category'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-border/40 rounded-xl">
              {/* Table header */}
              <div className="flex items-center gap-2.5 py-2.5 px-3 bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                <span className="w-[44px]" />
                <span className="w-6" />
                <span className="w-9" />
                <span className="flex-1">{isRTL ? 'التصنيف' : 'Category'}</span>
                <span className="w-14 text-center">{isRTL ? 'منشآت' : 'Biz'}</span>
                <span className="w-3" />
                <span className="w-7 text-center">#</span>
                <span className="w-[72px]" />
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredList.map(n => n.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {filteredList.map((node, idx) => (
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
                        businessCount={businessCountMap.get(node.id) || 0}
                        isLast={idx === filteredList.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeNode && <DragOverlayItem node={activeNode} isRTL={isRTL} />}
                </DragOverlay>
              </DndContext>
              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/30 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>
                    {isRTL
                      ? `${filteredList.length} تصنيف معروض`
                      : `${filteredList.length} categories shown`}
                    {filteredList.length !== stats.total && (
                      <span className="text-muted-foreground/50"> {isRTL ? `من ${stats.total}` : `of ${stats.total}`}</span>
                    )}
                  </span>
                  {statusFilter !== 'all' && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full">
                      <Filter className="w-2.5 h-2.5 me-0.5" />
                      {statusFilter === 'active' ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'معطّل' : 'Inactive')}
                    </Badge>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-muted-foreground/60">
                  <ArrowUpDown className="w-3 h-3" />
                  {isRTL ? 'اسحب للترتيب' : 'Drag to reorder'}
                </span>
              </div>
            </Card>
          )}

          {/* ── Delete dialog ── */}
          <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </div>
                  {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-2">
                  {isRTL ? 'هل أنت متأكد من حذف هذا التصنيف؟ سيتم حذف جميع التصنيفات الفرعية المرتبطة به ولا يمكن التراجع.' : 'Are you sure? All sub-categories will also be deleted. This cannot be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                  className="bg-destructive text-destructive-foreground rounded-xl gap-2"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isRTL ? 'حذف نهائي' : 'Delete'}
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
