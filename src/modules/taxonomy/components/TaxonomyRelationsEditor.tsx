import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTaxonomyRelation, deleteTaxonomyRelation } from '../services';
import type { TaxonomyCategory, TaxonomyRelation, TaxonomyRelationType } from '../types';

const TYPES: { value: TaxonomyRelationType; ar: string; en: string }[] = [
  { value: 'related', ar: 'مرتبط', en: 'Related' },
  { value: 'equivalent', ar: 'مكافئ', en: 'Equivalent' },
  { value: 'parent_alternative', ar: 'أب بديل', en: 'Parent alt' },
  { value: 'seo_related', ar: 'SEO مرتبط', en: 'SEO related' },
  { value: 'search_related', ar: 'بحث مرتبط', en: 'Search related' },
  { value: 'product_service_link', ar: 'منتج↔خدمة', en: 'Product↔Service' },
  { value: 'material_product_link', ar: 'مادة↔منتج', en: 'Material↔Product' },
  { value: 'service_activity_link', ar: 'خدمة↔نشاط', en: 'Service↔Activity' },
];

interface Props {
  categoryId: string;
  categories: TaxonomyCategory[];
  relations: TaxonomyRelation[];
  onChanged: () => void;
}

export const TaxonomyRelationsEditor: React.FC<Props> = ({ categoryId, categories, relations, onChanged }) => {
  const { isRTL } = useLanguage();
  const [relType, setRelType] = useState<TaxonomyRelationType>('related');
  const [target, setTarget] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const list = relations.filter((r) => r.category_id === categoryId);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const options = categories.filter((c) => c.id !== categoryId && !c.is_archived);

  const add = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await createTaxonomyRelation({ category_id: categoryId, related_category_id: target, relation_type: relType });
      setTarget('');
      onChanged();
      toast.success(isRTL ? 'تمت إضافة العلاقة' : 'Relation added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    try { await deleteTaxonomyRelation(id); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {list.map((r) => {
          const rel = byId.get(r.related_category_id);
          const t = TYPES.find((x) => x.value === r.relation_type);
          return (
            <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <Badge variant="outline" className="text-[10px]">{t ? (isRTL ? t.ar : t.en) : r.relation_type}</Badge>
              <span className="text-sm flex-1 truncate" dir="auto">{rel ? rel.name_ar : '—'}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)} aria-label="remove"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          );
        })}
        {list.length === 0 && <div className="text-xs text-muted-foreground">{isRTL ? 'لا توجد علاقات.' : 'No relations yet.'}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={relType} onValueChange={(v) => setRelType(v as TaxonomyRelationType)}>
          <SelectTrigger className="h-10 rounded-xl w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="h-10 rounded-xl flex-1 min-w-[200px]"><SelectValue placeholder={isRTL ? 'اختر تصنيفًا مرتبطًا' : 'Select related'} /></SelectTrigger>
          <SelectContent className="max-h-[300px]">{options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar} <span className="text-muted-foreground tech-content">· {c.slug}</span></SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add} disabled={busy || !target} className="h-10 rounded-xl"><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة' : 'Add'}</Button>
      </div>
    </div>
  );
};