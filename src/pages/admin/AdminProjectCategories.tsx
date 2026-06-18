import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Save,
  Search, Trash2, X, Eye, EyeOff, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Admin → Project Categories
 *
 * Lightweight management surface for taxonomy categories that are
 * exposed to projects. Reuses the existing `taxonomy_categories` table
 * (no schema changes). Mutations require admin RLS — UI surfaces clear
 * errors when the request is rejected.
 *
 * Scope: shows taxonomy types relevant to projects only:
 *   project_type, primary_activity, secondary_activity, sector,
 *   showcase_category.
 */

// Codes to filter the taxonomy_types table by.
const PROJECT_TAXONOMY_TYPE_CODES = [
  'project_type',
  'primary_activity',
  'secondary_activity',
  'sector',
  'showcase_category',
] as const;

interface TaxonomyTypeRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
}

interface TaxonomyCategoryRow {
  id: string;
  taxonomy_type_id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
  is_active: boolean;
  is_archived: boolean;
  show_in_search: boolean;
  parent_id: string | null;
}

const AdminProjectCategories = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const qc = useQueryClient();

  const [query, setQuery] = useState('');
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyDraft = { name_ar: '', name_en: '', slug: '', sort_order: 0 };
  const [draft, setDraft] = useState(emptyDraft);

  // Types
  const { data: types = [] } = useQuery<TaxonomyTypeRow[]>({
    queryKey: ['admin-pcat-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_types')
        .select('id, code, name_ar, name_en')
        .in('code', PROJECT_TAXONOMY_TYPE_CODES as unknown as string[])
        .order('code');
      if (error) throw error;
      return (data ?? []) as TaxonomyTypeRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const typeIds = useMemo(() => types.map((t) => t.id), [types]);

  const { data: categories = [], isLoading } = useQuery<TaxonomyCategoryRow[]>({
    queryKey: ['admin-pcat-categories', typeIds.join(',')],
    queryFn: async () => {
      if (typeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('taxonomy_categories')
        .select('id, taxonomy_type_id, slug, name_ar, name_en, sort_order, is_active, is_archived, show_in_search, parent_id')
        .in('taxonomy_type_id', typeIds)
        .order('sort_order')
        .order('name_ar');
      if (error) throw error;
      return (data ?? []) as TaxonomyCategoryRow[];
    },
    enabled: typeIds.length > 0,
    staleTime: 60 * 1000,
  });

  const typesById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      if (activeTypeId && c.taxonomy_type_id !== activeTypeId) return false;
      if (!q) return true;
      return (
        c.name_ar.toLowerCase().includes(q) ||
        (c.name_en ?? '').toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    });
  }, [categories, query, activeTypeId]);

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TaxonomyCategoryRow> }) => {
      const { error } = await supabase.from('taxonomy_categories').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pcat-categories'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!activeTypeId) throw new Error(isRTL ? 'اختر نوعاً أولاً' : 'Pick a type first');
      if (!draft.name_ar.trim()) throw new Error(isRTL ? 'اسم عربي مطلوب' : 'Arabic name is required');
      const slug = (draft.slug.trim() || draft.name_ar.trim())
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const { error } = await supabase.from('taxonomy_categories').insert({
        taxonomy_type_id: activeTypeId,
        name_ar: draft.name_ar.trim(),
        name_en: draft.name_en.trim() || null,
        slug,
        sort_order: Number(draft.sort_order) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowCreate(false);
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ['admin-pcat-categories'] });
      toast.success(isRTL ? 'تم الإنشاء' : 'Created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      // Soft archive (preserves links). RLS may reject for non-admins.
      const { error } = await supabase
        .from('taxonomy_categories')
        .update({ is_archived: true, is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin-pcat-categories'] });
      toast.success(isRTL ? 'تم الأرشفة' : 'Archived');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveOrder = (cat: TaxonomyCategoryRow, dir: -1 | 1) => {
    const next = Number(cat.sort_order ?? 0) + dir;
    if (next < 0) return;
    updateMut.mutate({ id: cat.id, patch: { sort_order: next } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          icon={FolderTree}
          tone="primary"
          eyebrow={isRTL ? 'إدارة' : 'Admin'}
          title={isRTL ? 'تصنيفات المشاريع' : 'Project Categories'}
          subtitle={isRTL
            ? 'أنشئ تصنيفات المشاريع، تحكّم بالظهور والترتيب، وأرشِف القديم.'
            : 'Create project categories, control visibility & order, and archive old ones.'}
          actions={
            <Button
              variant="hero" size="sm" className="h-8 text-xs"
              onClick={() => { setShowCreate((s) => !s); setDraft(emptyDraft); }}
            >
              <Plus className="w-3.5 h-3.5 me-1" />
              {isRTL ? 'تصنيف جديد' : 'New category'}
            </Button>
          }
        />

        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTypeId(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap ${activeTypeId === null ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
          >
            {isRTL ? 'كل الأنواع' : 'All types'}
            <span className="ms-1 text-[9px] opacity-70">({categories.length})</span>
          </button>
          {types.map((t) => {
            const count = categories.filter((c) => c.taxonomy_type_id === t.id).length;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTypeId(t.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap ${activeTypeId === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
              >
                {language === 'ar' ? t.name_ar : (t.name_en || t.code)}
                <span className="ms-1 text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث بالاسم أو الـ slug...' : 'Search by name or slug...'}
            className="ps-8 h-9 text-sm"
          />
        </div>

        {/* Create inline form */}
        {showCreate && (
          <Card className="border-primary/20 animate-in fade-in-0 slide-in-from-top-2 duration-150">
            <CardContent className="p-3 space-y-3">
              {!activeTypeId && (
                <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-500/10 rounded-md px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {isRTL ? 'اختر نوعاً من الأعلى قبل الإنشاء.' : 'Pick a type above before creating.'}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  value={draft.name_ar}
                  onChange={(e) => setDraft((d) => ({ ...d, name_ar: e.target.value }))}
                  placeholder={isRTL ? 'الاسم (عربي) *' : 'Name (Arabic) *'}
                  className="h-9 text-sm" dir="auto"
                />
                <Input
                  value={draft.name_en}
                  onChange={(e) => setDraft((d) => ({ ...d, name_en: e.target.value }))}
                  placeholder="Name (English)"
                  className="h-9 text-sm" dir="ltr"
                />
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  placeholder="slug (auto)"
                  className="h-9 text-sm" dir="ltr"
                />
                <Input
                  type="number" value={draft.sort_order}
                  onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))}
                  placeholder={isRTL ? 'الترتيب' : 'Order'}
                  className="h-9 text-sm" dir="ltr"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm" className="h-8 text-xs" disabled={createMut.isPending || !activeTypeId}
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : <Save className="w-3 h-3 me-1" />}
                  {isRTL ? 'حفظ' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowCreate(false); setDraft(emptyDraft); }}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {isRTL ? 'لا توجد تصنيفات.' : 'No categories.'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((c) => {
              const t = typesById.get(c.taxonomy_type_id);
              const isEditing = editingId === c.id;
              return (
                <Card key={c.id} className={`overflow-hidden ${c.is_archived ? 'opacity-60' : ''}`}>
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveOrder(c, -1)} className="text-muted-foreground hover:text-foreground" aria-label="Up"><ArrowUp className="w-3 h-3" /></button>
                        <span className="text-[9px] text-center text-muted-foreground">{c.sort_order}</span>
                        <button onClick={() => moveOrder(c, 1)} className="text-muted-foreground hover:text-foreground" aria-label="Down"><ArrowDown className="w-3 h-3" /></button>
                      </div>

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                            <Input
                              defaultValue={c.name_ar}
                              onBlur={(e) => e.target.value !== c.name_ar && updateMut.mutate({ id: c.id, patch: { name_ar: e.target.value } })}
                              className="h-8 text-xs" dir="auto"
                            />
                            <Input
                              defaultValue={c.name_en ?? ''}
                              onBlur={(e) => (e.target.value || null) !== c.name_en && updateMut.mutate({ id: c.id, patch: { name_en: e.target.value || null } })}
                              className="h-8 text-xs" dir="ltr" placeholder="English"
                            />
                            <Input
                              defaultValue={c.slug}
                              onBlur={(e) => e.target.value !== c.slug && updateMut.mutate({ id: c.id, patch: { slug: e.target.value } })}
                              className="h-8 text-xs" dir="ltr"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate" dir="auto">{language === 'ar' ? c.name_ar : (c.name_en || c.name_ar)}</span>
                            <Badge variant="outline" className="text-[9px]" dir="ltr">{c.slug}</Badge>
                            {t && (
                              <Badge variant="secondary" className="text-[9px]">
                                {language === 'ar' ? t.name_ar : (t.name_en || t.code)}
                              </Badge>
                            )}
                            {c.is_archived && (
                              <Badge variant="destructive" className="text-[9px]">{isRTL ? 'مؤرشف' : 'Archived'}</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Toggles */}
                      <div className="flex items-center gap-3 shrink-0">
                        <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Switch
                            checked={c.is_active}
                            onCheckedChange={(v) => updateMut.mutate({ id: c.id, patch: { is_active: v } })}
                          />
                          {isRTL ? 'نشط' : 'Active'}
                        </label>
                        <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Switch
                            checked={c.show_in_search}
                            onCheckedChange={(v) => updateMut.mutate({ id: c.id, patch: { show_in_search: v } })}
                          />
                          {c.show_in_search ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </label>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setEditingId(isEditing ? null : c.id)}
                          aria-label="Edit"
                        >
                          {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        </Button>
                        {!c.is_archived && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteConfirm(c.id)}
                            aria-label="Archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {deleteConfirm === c.id && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        <p className="text-xs flex-1">
                          {isRTL
                            ? 'سيُؤرشف التصنيف ولن يظهر في الواجهات. لن يحذف الروابط المرتبطة.'
                            : 'The category will be archived and hidden from UI. Links remain intact.'}
                        </p>
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setDeleteConfirm(null)}>
                          {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => deleteMut.mutate(c.id)} disabled={deleteMut.isPending}>
                          {deleteMut.isPending && <Loader2 className="w-3 h-3 animate-spin me-1" />}
                          {isRTL ? 'أرشفة' : 'Archive'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProjectCategories;