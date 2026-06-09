import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Loader2, Plus, Trash2, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RentalCategories } from '@/modules/rentals';
import type { RentalCategory } from '@/modules/rentals';
import {
  listAllTermTemplates,
  upsertTermTemplate,
  deleteTermTemplate,
  type RentalTermTemplate,
  type TermPresetItem,
} from '@/modules/rentals/services/termTemplates';

type GroupKey = 'usage_terms' | 'late_terms' | 'penalty_terms';

const GROUP_LABELS: Record<GroupKey, { ar: string; en: string }> = {
  usage_terms: { ar: 'شروط الاستخدام', en: 'Usage terms' },
  late_terms: { ar: 'شروط التأخير', en: 'Late terms' },
  penalty_terms: { ar: 'الشروط الجزائية', en: 'Penalty terms' },
};

const emptyTemplate = (category_id: string): RentalTermTemplate => ({
  id: '',
  category_id,
  usage_terms: [],
  late_terms: [],
  penalty_terms: [],
  is_active: true,
  notes: null,
  created_at: '',
  updated_at: '',
});

/** Admin-only manager for per-category default term templates. */
export const TermTemplatesPanel: React.FC = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [templates, setTemplates] = useState<RentalTermTemplate[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [draft, setDraft] = useState<RentalTermTemplate | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [cats, tpl] = await Promise.all([
      RentalCategories.listCategories(),
      listAllTermTemplates(),
    ]);
    setCategories(cats.data ?? []);
    setTemplates(tpl.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Sync draft when category changes.
  useEffect(() => {
    if (!selectedCat) { setDraft(null); return; }
    const existing = templates.find(t => t.category_id === selectedCat);
    setDraft(existing ?? emptyTemplate(selectedCat));
  }, [selectedCat, templates]);

  const coveredCount = useMemo(() => templates.length, [templates]);
  const totalCats = categories.length;

  const updateItem = (group: GroupKey, idx: number, patch: Partial<TermPresetItem>) => {
    if (!draft) return;
    const next = [...draft[group]];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, [group]: next });
  };

  const addItem = (group: GroupKey) => {
    if (!draft) return;
    setDraft({ ...draft, [group]: [...draft[group], { ar: '', en: '' }] });
  };

  const removeItem = (group: GroupKey, idx: number) => {
    if (!draft) return;
    const next = draft[group].filter((_, i) => i !== idx);
    setDraft({ ...draft, [group]: next });
  };

  const save = async () => {
    if (!draft) return;
    // Clean — drop fully-empty lines.
    const clean = (arr: TermPresetItem[]) =>
      arr.map(x => ({ ar: x.ar.trim(), en: x.en.trim() })).filter(x => x.ar || x.en);
    const payload = {
      id: draft.id || undefined,
      category_id: draft.category_id,
      usage_terms: clean(draft.usage_terms),
      late_terms: clean(draft.late_terms),
      penalty_terms: clean(draft.penalty_terms),
      is_active: draft.is_active,
      notes: draft.notes,
    };
    if (!payload.usage_terms.length && !payload.late_terms.length && !payload.penalty_terms.length) {
      toast.error(bi('أضف بندًا واحدًا على الأقل قبل الحفظ', 'Add at least one clause before saving'));
      return;
    }
    setSaving(true);
    const { data, error } = await upsertTermTemplate(payload);
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? bi('تعذّر الحفظ', 'Save failed'));
      return;
    }
    toast.success(bi('تم حفظ القالب', 'Template saved'));
    await refresh();
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!confirm(bi('حذف القالب لهذا التصنيف؟', 'Delete template for this category?'))) return;
    const { error } = await deleteTermTemplate(draft.id);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الحذف', 'Deleted'));
    setSelectedCat('');
    await refresh();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <Card className="p-4 bg-primary/[0.04] border-primary/15">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">
              <Bi ar="قوالب الشروط الافتراضية" en="Default term templates" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              <Bi
                ar="حدّد بنود الاستخدام والتأخير والجزاءات الافتراضية لكل تصنيف. يستخدمها مزودو الخدمة كمقترحات عند إنشاء صنف جديد، ويتم التحقق من توافقها تلقائيًا قبل الحفظ."
                en="Define default usage, late and penalty clauses per category. Providers see them as suggestions when creating an item, and the system validates compliance automatically before saving."
              />
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-[10px]">
                <Bi ar={`${coveredCount} من ${totalCats} تصنيف مغطّى`} en={`${coveredCount} of ${totalCats} categories covered`} />
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Category picker */}
      <Card className="p-4 space-y-3">
        <Label className="text-xs"><Bi ar="اختر التصنيف" en="Select category" /></Label>
        <Select value={selectedCat} onValueChange={setSelectedCat}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder={bi('اختر تصنيفًا لإدارة قالبه', 'Pick a category to manage its template')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => {
              const exists = templates.some(t => t.category_id === c.id);
              return (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-2">
                    {isRTL ? c.name_ar : c.name_en}
                    {exists && <Badge variant="success" className="text-[10px]"><Bi ar="معرَّف" en="Defined" /></Badge>}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </Card>

      {/* Editor */}
      {draft && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold inline-flex items-center gap-2">
              <Bi ar="بنود القالب" en="Template clauses" />
              <Badge variant={draft.is_active ? 'success' : 'muted'} className="text-[10px]">
                {draft.is_active ? <Bi ar="مفعّل" en="Active" /> : <Bi ar="معطّل" en="Inactive" />}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button" size="sm" variant="outline"
                onClick={() => setDraft({ ...draft, is_active: !draft.is_active })}
              >
                {draft.is_active ? <Bi ar="تعطيل" en="Deactivate" /> : <Bi ar="تفعيل" en="Activate" />}
              </Button>
              {draft.id && (
                <Button type="button" size="sm" variant="outline" onClick={remove} className="text-destructive">
                  <Trash2 className="size-3.5 me-1" />
                  <Bi ar="حذف" en="Delete" />
                </Button>
              )}
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 me-1 animate-spin" /> : <Save className="size-3.5 me-1" />}
                <Bi ar="حفظ القالب" en="Save template" />
              </Button>
            </div>
          </div>

          {(['usage_terms', 'late_terms', 'penalty_terms'] as const).map(group => (
            <div key={group} className="rounded-xl border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Bi ar={GROUP_LABELS[group].ar} en={GROUP_LABELS[group].en} />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => addItem(group)} className="h-7">
                  <Plus className="size-3 me-1" />
                  <Bi ar="إضافة بند" en="Add clause" />
                </Button>
              </div>
              {!draft[group].length && (
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                  <AlertCircle className="size-3" />
                  <Bi ar="لا توجد بنود — أضف على الأقل بندًا واحدًا." en="No clauses — add at least one." />
                </p>
              )}
              <div className="space-y-2">
                {draft[group].map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      dir="auto" lang="ar"
                      placeholder={bi('النص بالعربية', 'Arabic text')}
                      value={item.ar}
                      onChange={e => updateItem(group, idx, { ar: e.target.value })}
                    />
                    <Input
                      dir="auto" lang="en"
                      placeholder={bi('النص بالإنجليزية', 'English text')}
                      value={item.en}
                      onChange={e => updateItem(group, idx, { en: e.target.value })}
                    />
                    <Button
                      type="button" size="icon" variant="ghost"
                      onClick={() => removeItem(group, idx)}
                      className="h-9 w-9 text-destructive"
                      aria-label={bi('حذف البند', 'Remove clause')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default TermTemplatesPanel;