import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { X, Save, Archive, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { TaxonomyAlias, TaxonomyCategory, TaxonomyCategoryInput, TaxonomyRelation, TaxonomyType } from '../types';
import {
  archiveTaxonomyCategory,
  createTaxonomyCategory,
  deleteTaxonomyCategory,
  updateTaxonomyCategory,
} from '../services';
import { generateSlugFallback, generateSlugFromEnglishName, isDescendantCategory, validateTaxonomySlug } from '../utils';
import { TaxonomyAliasesEditor } from './TaxonomyAliasesEditor';
import { TaxonomyRelationsEditor } from './TaxonomyRelationsEditor';

const emptyInput = (): TaxonomyCategoryInput => ({
  taxonomy_type_id: '',
  parent_id: null,
  slug: '',
  name_ar: '',
  name_en: null,
  description_ar: null,
  description_en: null,
  short_description_ar: null,
  short_description_en: null,
  seo_title_ar: null,
  seo_title_en: null,
  seo_description_ar: null,
  seo_description_en: null,
  keywords_ar: [],
  keywords_en: [],
  icon: null,
  color: null,
  sort_order: 0,
  is_active: true,
  is_public: true,
  is_searchable: true,
  is_featured: false,
  is_archived: false,
  show_in_registration: false,
  show_in_search: true,
  show_in_seo: false,
  show_in_showcase: false,
  show_in_products: false,
  show_in_contracts: false,
  show_in_quotes: false,
  show_in_admin_only: false,
  metadata: {},
});

interface Props {
  open: boolean;
  category: TaxonomyCategory | null;
  presetParentId?: string | null;
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
  aliases: TaxonomyAlias[];
  relations: TaxonomyRelation[];
  onClose: () => void;
  onSaved: () => void;
}

export const TaxonomyEditorPanel: React.FC<Props> = ({
  open, category, presetParentId, types, categories, aliases, relations, onClose, onSaved,
}) => {
  const { isRTL } = useLanguage();
  const [form, setForm] = useState<TaxonomyCategoryInput>(emptyInput());
  const [kwAr, setKwAr] = useState('');
  const [kwEn, setKwEn] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'basics' | 'visibility' | 'seo' | 'aliases' | 'relations' | 'advanced'>('basics');
  const [initialSlug, setInitialSlug] = useState<string>('');

  useEffect(() => {
    if (category) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = category;
      setForm({
        ...rest,
        keywords_ar: category.keywords_ar ?? [],
        keywords_en: category.keywords_en ?? [],
        metadata: (category.metadata as Record<string, unknown>) ?? {},
      });
      setInitialSlug(category.slug);
    } else {
      const def = emptyInput();
      def.taxonomy_type_id = types[0]?.id ?? '';
      if (presetParentId) {
        const parent = categories.find((c) => c.id === presetParentId);
        if (parent) {
          def.taxonomy_type_id = parent.taxonomy_type_id;
          def.parent_id = parent.id;
        }
      }
      setForm(def);
      setInitialSlug('');
    }
    setKwAr(''); setKwEn('');
    setTab('basics');
  }, [category, types, open, presetParentId, categories]);

  const slugValidation = useMemo(() => validateTaxonomySlug(form.slug), [form.slug]);

  const set = <K extends keyof TaxonomyCategoryInput>(k: K, v: TaxonomyCategoryInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAutoSlug = () => {
    if (form.name_en) set('slug', generateSlugFromEnglishName(form.name_en));
    else set('slug', generateSlugFallback(form.name_ar));
  };

  const handleSave = async () => {
    if (!form.taxonomy_type_id) { toast.error(isRTL ? 'اختر نوع التصنيف' : 'Pick a type'); return; }
    if (!form.name_ar.trim()) { toast.error(isRTL ? 'الاسم العربي مطلوب' : 'Arabic name required'); return; }
    if (!slugValidation.valid) { toast.error(isRTL ? 'slug غير صالح' : 'Invalid slug'); return; }
    if (form.parent_id && category && isDescendantCategory(form.parent_id, category.id, categories)) {
      toast.error(isRTL ? 'لا يمكن جعل الأب أحد الأبناء.' : 'Parent cannot be a descendant.');
      return;
    }
    setBusy(true);
    try {
      if (category) await updateTaxonomyCategory(category.id, form);
      else await createTaxonomyCategory(form);
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const handleArchive = async () => {
    if (!category) return;
    setBusy(true);
    try { await archiveTaxonomyCategory(category.id); toast.success(isRTL ? 'تمت الأرشفة' : 'Archived'); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!category) return;
    const hasChildren = categories.some((c) => c.parent_id === category.id);
    if (hasChildren) { toast.error(isRTL ? 'لا يمكن حذف تصنيف له أبناء — استخدم الأرشفة.' : 'Cannot delete category with children — archive instead.'); return; }
    if (!window.confirm(isRTL ? 'تأكيد حذف هذا التصنيف؟ هذا الإجراء نهائي.' : 'Permanently delete this category?')) return;
    setBusy(true);
    try { await deleteTaxonomyCategory(category.id); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const parentOptions = useMemo(() => {
    return categories
      .filter((c) => c.taxonomy_type_id === form.taxonomy_type_id && (!category || c.id !== category.id))
      .filter((c) => !category || !isDescendantCategory(c.id, category.id, categories));
  }, [categories, form.taxonomy_type_id, category]);

  const addKw = (lang: 'ar' | 'en') => {
    const val = lang === 'ar' ? kwAr.trim() : kwEn.trim();
    if (!val) return;
    const key = lang === 'ar' ? 'keywords_ar' : 'keywords_en';
    if (form[key].includes(val)) return;
    set(key, [...form[key], val]);
    if (lang === 'ar') setKwAr(''); else setKwEn('');
  };
  const removeKw = (lang: 'ar' | 'en', v: string) => {
    const key = lang === 'ar' ? 'keywords_ar' : 'keywords_en';
    set(key, form[key].filter((x) => x !== v));
  };

  if (!open) return null;

  const slugChanged = Boolean(category && initialSlug && form.slug !== initialSlug);

  const FlagRow = ({ k, label }: { k: keyof TaxonomyCategoryInput; label: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <Label className="text-xs">{label}</Label>
      <Switch checked={Boolean(form[k])} onCheckedChange={(v) => set(k, v as TaxonomyCategoryInput[typeof k])} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <button className="flex-1 bg-foreground/30 backdrop-blur-sm" onClick={onClose} aria-label="close" />
      <Card className="w-full max-w-2xl h-full overflow-y-auto rounded-none border-s border-border shadow-2xl">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between">
          <div>
            <div className="font-heading font-bold">{category ? (isRTL ? 'تعديل تصنيف' : 'Edit category') : (isRTL ? 'تصنيف جديد' : 'New category')}</div>
            {category && <div className="text-[10px] text-muted-foreground tech-content">{category.id}</div>}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-5 space-y-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="rounded-xl flex-wrap h-auto">
              <TabsTrigger value="basics" className="rounded-lg text-xs">{isRTL ? 'البيانات الأساسية' : 'Basics'}</TabsTrigger>
              <TabsTrigger value="visibility" className="rounded-lg text-xs">{isRTL ? 'الظهور والحالة' : 'Visibility'}</TabsTrigger>
              <TabsTrigger value="seo" className="rounded-lg text-xs">{isRTL ? 'SEO والكلمات' : 'SEO'}</TabsTrigger>
              {category && (
                <>
                  <TabsTrigger value="aliases" className="rounded-lg text-xs">{isRTL ? 'المرادفات' : 'Aliases'}</TabsTrigger>
                  <TabsTrigger value="relations" className="rounded-lg text-xs">{isRTL ? 'العلاقات' : 'Relations'}</TabsTrigger>
                </>
              )}
              <TabsTrigger value="advanced" className="rounded-lg text-xs">{isRTL ? 'إعدادات متقدمة' : 'Advanced'}</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'النوع' : 'Type'}</Label>
                <Select value={form.taxonomy_type_id} onValueChange={(v) => set('taxonomy_type_id', v)}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{isRTL ? t.name_ar : t.name_en ?? t.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'التصنيف الأب' : 'Parent category'}</Label>
                <Select value={form.parent_id ?? 'none'} onValueChange={(v) => set('parent_id', v === 'none' ? null : v)}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? 'بدون أب' : 'No parent'}</SelectItem>
                    {parentOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name_ar} <span className="text-muted-foreground tech-content">· {p.slug}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'الاسم العربي' : 'Arabic name'} *</Label>
                <Input dir="auto" value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'الاسم الإنجليزي' : 'English name'}</Label>
                <Input dir="ltr" value={form.name_en ?? ''} onChange={(e) => set('name_en', e.target.value || null)} className="h-10 rounded-xl tech-content" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs flex items-center justify-between">
                  <span>{isRTL ? 'الرابط المختصر' : 'Short link'} <span className="text-muted-foreground tech-content">(slug) *</span></span>
                  <button type="button" onClick={handleAutoSlug} className="text-primary hover:underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {isRTL ? 'توليد' : 'auto'}</button>
                </Label>
                <Input dir="ltr" value={form.slug} onChange={(e) => set('slug', e.target.value)} className="h-10 rounded-xl tech-content" />
                {!slugValidation.valid && form.slug && <div className="text-xs text-destructive">{isRTL ? 'slug غير صالح — استخدم أحرف صغيرة وأرقام وشرطات فقط.' : 'Invalid slug — lowercase, digits, hyphens only.'}</div>}
                {slugChanged && slugValidation.valid && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{isRTL
                      ? 'تغيير الرابط المختصر قد يؤثر على الروابط أو صفحات SEO المرتبطة بهذا التصنيف.'
                      : 'Changing the short link may affect URLs or SEO pages linked to this category.'}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">{isRTL ? 'الوصف المختصر (عربي)' : 'Short description (AR)'}</Label>
                <Textarea dir="auto" value={form.short_description_ar ?? ''} onChange={(e) => set('short_description_ar', e.target.value || null)} className="rounded-xl" rows={2} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">{isRTL ? 'الوصف الكامل (عربي)' : 'Full description (AR)'}</Label>
                <Textarea dir="auto" value={form.description_ar ?? ''} onChange={(e) => set('description_ar', e.target.value || null)} className="rounded-xl" rows={3} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'الوصف المختصر (EN)' : 'Short description (EN)'}</Label>
                <Textarea dir="ltr" value={form.short_description_en ?? ''} onChange={(e) => set('short_description_en', e.target.value || null)} className="rounded-xl tech-content" rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'الوصف الكامل (EN)' : 'Full description (EN)'}</Label>
                <Textarea dir="ltr" value={form.description_en ?? ''} onChange={(e) => set('description_en', e.target.value || null)} className="rounded-xl tech-content" rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'الأيقونة' : 'Icon'}</Label>
                <Input value={form.icon ?? ''} onChange={(e) => set('icon', e.target.value || null)} placeholder="lucide name" className="h-10 rounded-xl tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'اللون' : 'Color'}</Label>
                <Input value={form.color ?? ''} onChange={(e) => set('color', e.target.value || null)} placeholder="#0ea5a4" className="h-10 rounded-xl tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'الترتيب' : 'Sort order'}</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} className="h-10 rounded-xl tech-content" />
              </div>
            </div>
            </TabsContent>

            <TabsContent value="visibility" className="space-y-3 mt-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">{isRTL ? 'الحالة' : 'Status'}</h3>
                <div className="grid grid-cols-2 gap-x-6 rounded-xl border border-border bg-muted/20 p-3">
                  <FlagRow k="is_active" label={isRTL ? 'نشط' : 'Active'} />
                  <FlagRow k="is_public" label={isRTL ? 'عام' : 'Public'} />
                  <FlagRow k="is_searchable" label={isRTL ? 'قابل للبحث' : 'Searchable'} />
                  <FlagRow k="is_featured" label={isRTL ? 'مميز' : 'Featured'} />
                  <FlagRow k="is_archived" label={isRTL ? 'مؤرشف' : 'Archived'} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">{isRTL ? 'أماكن الظهور' : 'Visibility'}</h3>
            <div className="grid grid-cols-2 gap-x-6 rounded-xl border border-border bg-muted/20 p-3">
              <FlagRow k="show_in_registration" label={isRTL ? 'في التسجيل' : 'In registration'} />
              <FlagRow k="show_in_search" label={isRTL ? 'في البحث' : 'In search'} />
              <FlagRow k="show_in_seo" label={isRTL ? 'في SEO' : 'In SEO'} />
              <FlagRow k="show_in_showcase" label={isRTL ? 'في Showcase' : 'In showcase'} />
              <FlagRow k="show_in_products" label={isRTL ? 'في المنتجات' : 'In products'} />
              <FlagRow k="show_in_contracts" label={isRTL ? 'في العقود' : 'In contracts'} />
              <FlagRow k="show_in_quotes" label={isRTL ? 'في عروض الأسعار' : 'In quotes'} />
              <FlagRow k="show_in_admin_only" label={isRTL ? 'في الأدمن فقط' : 'Admin only'} />
            </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 gap-3">
              <Input dir="auto" placeholder={isRTL ? 'عنوان SEO عربي' : 'SEO title AR'} value={form.seo_title_ar ?? ''} onChange={(e) => set('seo_title_ar', e.target.value || null)} className="h-10 rounded-xl" />
              <Textarea dir="auto" placeholder={isRTL ? 'وصف SEO عربي' : 'SEO description AR'} value={form.seo_description_ar ?? ''} onChange={(e) => set('seo_description_ar', e.target.value || null)} className="rounded-xl" rows={2} />
              <Input dir="ltr" placeholder="SEO title EN" value={form.seo_title_en ?? ''} onChange={(e) => set('seo_title_en', e.target.value || null)} className="h-10 rounded-xl tech-content" />
              <Textarea dir="ltr" placeholder="SEO description EN" value={form.seo_description_en ?? ''} onChange={(e) => set('seo_description_en', e.target.value || null)} className="rounded-xl tech-content" rows={2} />

              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'كلمات بحثية عربية' : 'Keywords AR'}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {form.keywords_ar.map((k) => (
                    <Badge key={k} variant="secondary" className="gap-1 pe-1">{k}<button onClick={() => removeKw('ar', k)} className="ms-1"><X className="w-3 h-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input dir="auto" value={kwAr} onChange={(e) => setKwAr(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKw('ar'); } }} className="h-9 rounded-xl" placeholder={isRTL ? 'كلمة + Enter' : 'word + Enter'} />
                  <Button onClick={() => addKw('ar')} variant="outline" className="h-9 rounded-xl">{isRTL ? 'إضافة' : 'Add'}</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'كلمات بحثية إنجليزية' : 'Keywords EN'}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {form.keywords_en.map((k) => (
                    <Badge key={k} variant="secondary" className="gap-1 pe-1 tech-content">{k}<button onClick={() => removeKw('en', k)} className="ms-1"><X className="w-3 h-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input dir="ltr" value={kwEn} onChange={(e) => setKwEn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKw('en'); } }} className="h-9 rounded-xl tech-content" placeholder="word + Enter" />
                  <Button onClick={() => addKw('en')} variant="outline" className="h-9 rounded-xl">{isRTL ? 'إضافة' : 'Add'}</Button>
                </div>
              </div>
            </div>
            </TabsContent>

            {category && (
              <TabsContent value="aliases" className="mt-4">
                <TaxonomyAliasesEditor categoryId={category.id} aliases={aliases} onChanged={onSaved} />
              </TabsContent>
            )}
            {category && (
              <TabsContent value="relations" className="mt-4">
                <TaxonomyRelationsEditor categoryId={category.id} categories={categories} relations={relations} onChanged={onSaved} />
              </TabsContent>
            )}

            <TabsContent value="advanced" className="space-y-2 mt-4">
              <Label className="text-xs">{isRTL ? 'إعدادات متقدمة (JSON)' : 'Advanced (JSON metadata)'}</Label>
            <Textarea
              dir="ltr"
              className="rounded-xl tech-content text-xs"
              rows={4}
              value={JSON.stringify(form.metadata, null, 2)}
              onChange={(e) => {
                try { set('metadata', JSON.parse(e.target.value || '{}')); }
                catch { /* keep typing — validation on save */ }
              }}
            />
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-5 py-3 flex items-center gap-2">
          <Button onClick={handleSave} disabled={busy} className="h-10 rounded-xl"><Save className="w-4 h-4 me-1" />{isRTL ? 'حفظ' : 'Save'}</Button>
          <Button variant="outline" onClick={onClose} className="h-10 rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          {category && (
            <>
              <Button variant="outline" onClick={handleArchive} disabled={busy} className="h-10 rounded-xl ms-auto"><Archive className="w-4 h-4 me-1" />{isRTL ? 'أرشفة' : 'Archive'}</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={busy} className="h-10 rounded-xl"><Trash2 className="w-4 h-4 me-1" />{isRTL ? 'حذف' : 'Delete'}</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};