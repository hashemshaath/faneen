/**
 * Unified DnD category manager for /admin/rentals & /admin/assets.
 * - Drag-reorder categories
 * - Click to expand → drag-reorder items in that category
 * - Inline edit, visibility toggle, image upload trigger
 * - All persistence is real DB (no dummy state)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Save, X, Plus,
  Image as ImageIcon, Loader2, Trash2, Package,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { IconPicker, RenderIcon } from '@/components/admin/IconPicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/* ------- types ------- */
type CategoryTable = 'rental_categories' | 'asset_categories';
type ItemTable = 'rental_equipment_catalog' | 'assets';

interface CategoryRow {
  id: string; ref_id?: string | null; slug: string;
  name_ar: string; name_en: string | null; icon: string | null;
  sort_order: number; is_active: boolean;
  default_image_url?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
}
interface ItemRow {
  id: string; name_ar: string; name_en: string | null;
  category_id: string | null; sort_order: number; is_active: boolean;
  image_url?: string | null; images?: string[] | null;
}

interface Props {
  categoryTable: CategoryTable;
  itemTable: ItemTable;
  itemImageField: 'image_url' | 'images';
  itemActiveField: 'is_active';
  titleAr: string;
  titleEn: string;
}

/* ------- sortable item row ------- */
const SortableItem: React.FC<{
  item: ItemRow; isRTL: boolean; imageField: 'image_url' | 'images';
  onToggle: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  onImageClick: (item: ItemRow) => void;
}> = ({ item, isRTL, imageField, onToggle, onDelete, onImageClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${item.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const img = imageField === 'image_url'
    ? item.image_url
    : (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null);
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-background rounded-lg border hover:border-primary/40 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none" aria-label="drag">
        <GripVertical className="size-4" />
      </button>
      <button onClick={() => onImageClick(item)} className="size-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary transition-all" aria-label="image">
        {img ? <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon className="size-4 text-muted-foreground" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{isRTL ? item.name_ar : (item.name_en || item.name_ar)}</div>
      </div>
      <Switch checked={item.is_active} onCheckedChange={(v) => onToggle(item.id, v)} aria-label="visibility" />
      <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="size-3.5" /></Button>
    </div>
  );
};

/* ------- sortable category row (with expandable items) ------- */
const SortableCategory: React.FC<{
  cat: CategoryRow;
  expanded: boolean;
  items: ItemRow[];
  itemsLoading: boolean;
  isRTL: boolean;
  imageField: 'image_url' | 'images';
  onToggleExpand: () => void;
  onSave: (id: string, patch: Partial<CategoryRow>) => Promise<void>;
  onToggleVisible: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  onItemsReorder: (catId: string, ordered: ItemRow[]) => Promise<void>;
  onItemToggle: (id: string, next: boolean) => Promise<void>;
  onItemDelete: (id: string) => Promise<void>;
  onItemImageClick: (item: ItemRow) => void;
}> = (p) => {
  const { cat } = p;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `cat-${cat.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : 'auto',
  };
  const [editing, setEditing] = useState(false);
  const [draftAr, setDraftAr] = useState(cat.name_ar);
  const [draftEn, setDraftEn] = useState(cat.name_en ?? '');
  const [draftIcon, setDraftIcon] = useState(cat.icon ?? '');
  const [saving, setSaving] = useState(false);
  const bi = useBi();

  useEffect(() => { setDraftAr(cat.name_ar); setDraftEn(cat.name_en ?? ''); setDraftIcon(cat.icon ?? ''); }, [cat.id, cat.name_ar, cat.name_en, cat.icon]);

  const itemSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleItemDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = p.items.findIndex(i => `item-${i.id}` === e.active.id);
    const newIdx = p.items.findIndex(i => `item-${i.id}` === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    await p.onItemsReorder(cat.id, arrayMove(p.items, oldIdx, newIdx));
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`p-3 hover-lift ${!cat.is_active ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}>
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-1" aria-label="drag category">
            <GripVertical className="size-5" />
          </button>
          <button onClick={p.onToggleExpand} className="flex items-center gap-2 flex-1 min-w-0 text-start hover:text-primary transition-colors">
            <span className="text-2xl shrink-0">{cat.icon || '📦'}</span>
            {!editing ? (
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.isRTL ? cat.name_ar : (cat.name_en || cat.name_ar)}</div>
                <div className="text-xs text-muted-foreground tech-content truncate">/{cat.slug}{cat.ref_id ? ` · ${cat.ref_id}` : ''}</div>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                <Input dir="auto" value={draftAr} onChange={e => setDraftAr(e.target.value)} placeholder="عربي" className="h-9 rounded-lg" />
                <Input dir="auto" value={draftEn} onChange={e => setDraftEn(e.target.value)} placeholder="English" className="h-9 rounded-lg" />
                <Input dir="auto" value={draftIcon} onChange={e => setDraftIcon(e.target.value)} placeholder="🔧" className="h-9 rounded-lg text-center" />
              </div>
            )}
          </button>
          <Badge variant="outline" className="tech-content shrink-0">{p.items.length}</Badge>
          <Switch checked={cat.is_active} onCheckedChange={(v) => p.onToggleVisible(cat.id, v)} aria-label="category visibility" />
          {!editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-8 w-8 p-0"><Pencil className="size-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={p.onToggleExpand} className="h-8 w-8 p-0">
                {p.expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={async () => { setSaving(true); await p.onSave(cat.id, { name_ar: draftAr, name_en: draftEn || null, icon: draftIcon || null }); setSaving(false); setEditing(false); }} disabled={saving} className="h-8">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-8 w-8 p-0"><X className="size-3.5" /></Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => p.onDelete(cat.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="size-3.5" /></Button>
        </div>

        {p.expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {p.itemsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin" /></div>
            ) : p.items.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">{bi('لا توجد أصناف في هذا التصنيف بعد.', 'No items in this category yet.')}</div>
            ) : (
              <DndContext sensors={itemSensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                <SortableContext items={p.items.map(i => `item-${i.id}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {p.items.map(i => (
                      <SortableItem
                        key={i.id}
                        item={i}
                        isRTL={p.isRTL}
                        imageField={p.imageField}
                        onToggle={p.onItemToggle}
                        onDelete={p.onItemDelete}
                        onImageClick={p.onItemImageClick}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------- main panel ------- */
export const CategoryAdminPanel: React.FC<Props> = ({ categoryTable, itemTable, itemImageField, titleAr, titleEn }) => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [itemsByCat, setItemsByCat] = useState<Record<string, ItemRow[]>>({});
  const [itemsLoading, setItemsLoading] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(categoryTable).select('id,ref_id,slug,name_ar,name_en,icon,sort_order,is_active').order('sort_order');
    setCats((data as unknown as CategoryRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [categoryTable]);

  const loadItems = async (catId: string) => {
    setItemsLoading(prev => new Set(prev).add(catId));
    const selectCols = itemImageField === 'image_url'
      ? 'id,name_ar,name_en,category_id,sort_order,is_active,image_url'
      : 'id,name_ar,name_en,category_id,sort_order,is_active,images';
    const { data } = await supabase.from(itemTable).select(selectCols).eq('category_id', catId).order('sort_order');
    setItemsByCat(prev => ({ ...prev, [catId]: (data as unknown as ItemRow[] | null) ?? [] }));
    setItemsLoading(prev => { const n = new Set(prev); n.delete(catId); return n; });
  };

  const toggleExpand = async (catId: string) => {
    const next = new Set(expanded);
    if (next.has(catId)) next.delete(catId);
    else { next.add(catId); if (!itemsByCat[catId]) await loadItems(catId); }
    setExpanded(next);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = cats.findIndex(c => `cat-${c.id}` === e.active.id);
    const newIdx = cats.findIndex(c => `cat-${c.id}` === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(cats, oldIdx, newIdx);
    setCats(reordered); // optimistic
    // persist new sort_order in steps of 10
    const updates = reordered.map((c, i) => ({ id: c.id, sort_order: (i + 1) * 10 }));
    const { error } = await supabase.rpc('admin_reorder_rows' as never, { _table: categoryTable, _items: updates } as never);
    if (error) {
      // fallback: per-row update
      for (const u of updates) await supabase.from(categoryTable).update({ sort_order: u.sort_order }).eq('id', u.id);
    }
    toast.success(bi('تم حفظ الترتيب', 'Order saved'));
  };

  const itemsReorder = async (catId: string, ordered: ItemRow[]) => {
    setItemsByCat(prev => ({ ...prev, [catId]: ordered }));
    for (let i = 0; i < ordered.length; i++) {
      await supabase.from(itemTable).update({ sort_order: (i + 1) * 10 }).eq('id', ordered[i].id);
    }
    toast.success(bi('تم حفظ ترتيب الأصناف', 'Items order saved'));
  };

  const saveCat = async (id: string, patch: Partial<CategoryRow>) => {
    const { error } = await supabase.from(categoryTable).update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الحفظ', 'Saved'));
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...patch } as CategoryRow : c));
  };

  const toggleCatVisible = async (id: string, next: boolean) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, is_active: next } : c));
    const { error } = await supabase.from(categoryTable).update({ is_active: next }).eq('id', id);
    if (error) { toast.error(error.message); load(); return; }
    toast.success(next ? bi('تم إظهار التصنيف', 'Category shown') : bi('تم إخفاء التصنيف', 'Category hidden'));
  };

  const deleteCat = async (id: string) => {
    if (!confirm(isRTL ? 'حذف هذا التصنيف نهائيًا؟ سيؤثر على الأصناف المرتبطة.' : 'Delete this category permanently?')) return;
    const { error } = await supabase.from(categoryTable).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الحذف', 'Deleted'));
    setCats(prev => prev.filter(c => c.id !== id));
  };

  const itemToggle = async (id: string, next: boolean) => {
    const { error } = await supabase.from(itemTable).update({ is_active: next }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItemsByCat(prev => {
      const out: Record<string, ItemRow[]> = {};
      for (const k of Object.keys(prev)) out[k] = prev[k].map(i => i.id === id ? { ...i, is_active: next } : i);
      return out;
    });
  };

  const itemDelete = async (id: string) => {
    if (!confirm(isRTL ? 'حذف هذا الصنف؟' : 'Delete this item?')) return;
    const { error } = await supabase.from(itemTable).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItemsByCat(prev => {
      const out: Record<string, ItemRow[]> = {};
      for (const k of Object.keys(prev)) out[k] = prev[k].filter(i => i.id !== id);
      return out;
    });
    toast.success(bi('تم الحذف', 'Deleted'));
  };

  const itemImageClick = (item: ItemRow) => {
    const path = itemTable === 'rental_equipment_catalog' ? `/admin/rentals?item=${item.id}` : `/admin/assets?item=${item.id}`;
    window.open(path, '_blank');
  };

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  const createCategory = async () => {
    if (!newCatName.trim()) { toast.error(bi('أدخل اسم التصنيف', 'Enter category name')); return; }
    setCreating(true);
    const slug = newCatSlug.trim() || slugify(newCatName);
    const max = cats.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const payload = { slug, name_ar: newCatName.trim(), name_en: newCatName.trim(), sort_order: max + 10, is_active: true } as Record<string, unknown>;
    const { error } = await supabase.from(categoryTable).insert([payload] as never);
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تمت الإضافة', 'Added'));
    setNewCatName(''); setNewCatSlug('');
    await load();
  };

  const totalItems = useMemo(() => Object.values(itemsByCat).reduce((s, arr) => s + arr.length, 0), [itemsByCat]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <div>
              <div className="font-semibold">{isRTL ? titleAr : titleEn}</div>
              <div className="text-xs text-muted-foreground"><Bi ar="اسحب لإعادة الترتيب · انقر للتوسيع · فعّل/عطّل الظهور" en="Drag to reorder · click to expand · toggle visibility" /></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="tech-content">{cats.length} {bi('تصنيف', 'cats')}</Badge>
            {totalItems > 0 && <Badge variant="outline" className="tech-content">{totalItems} {bi('صنف محمّل', 'loaded')}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input dir="auto" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder={bi('اسم تصنيف جديد…', 'New category name…')} className="h-10 rounded-lg flex-1 min-w-[200px]" />
          <Input dir="auto" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug (auto)" className="h-10 rounded-lg w-[160px] tech-content" />
          <Button onClick={createCategory} disabled={creating} className="h-10 rounded-lg">
            {creating ? <Loader2 className="size-4 me-1 animate-spin" /> : <Plus className="size-4 me-1" />}
            <Bi ar="إضافة تصنيف" en="Add category" />
          </Button>
        </div>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cats.map(c => `cat-${c.id}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cats.map(c => (
              <SortableCategory
                key={c.id}
                cat={c}
                expanded={expanded.has(c.id)}
                items={itemsByCat[c.id] ?? []}
                itemsLoading={itemsLoading.has(c.id)}
                isRTL={isRTL}
                imageField={itemImageField}
                onToggleExpand={() => toggleExpand(c.id)}
                onSave={saveCat}
                onToggleVisible={toggleCatVisible}
                onDelete={deleteCat}
                onItemsReorder={itemsReorder}
                onItemToggle={itemToggle}
                onItemDelete={itemDelete}
                onItemImageClick={itemImageClick}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Card className="p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Eye className="size-3.5" /><span><Bi ar="التصنيفات المعطّلة" en="Disabled categories" /></span>
        <EyeOff className="size-3.5 ms-2" /><span className="opacity-60">{cats.filter(c => !c.is_active).length}</span>
      </Card>
    </div>
  );
};

export default CategoryAdminPanel;