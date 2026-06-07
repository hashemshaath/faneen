import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Edit, Archive, Eye, EyeOff, Plus, ArrowUp, ArrowDown,
  Building2, Image, Tag, Link2, Layers, FolderTree,
} from 'lucide-react';
import type { TaxonomyCategory, TaxonomyType } from '../types';
import type { TaxonomyUsageCounts } from '../usage-services';

interface Props {
  category: TaxonomyCategory | null;
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
  usage?: TaxonomyUsageCounts;
  onEdit: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onArchive: (id: string) => void;
  onToggleActive: (id: string, next: boolean) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onSelect: (id: string) => void;
}

/**
 * Left column: full details of the selected category.
 * Surfaces children, aliases/relations counts, visibility chips, usage stats.
 */
export const TaxonomyCategoryDetails: React.FC<Props> = ({
  category, types, categories, usage,
  onEdit, onAddChild, onArchive, onToggleActive, onMove, onSelect,
}) => {
  const { isRTL } = useLanguage();

  if (!category) {
    return (
      <Card className="rounded-2xl border-dashed border-border bg-muted/10 p-12 text-center">
        <FolderTree className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <div className="text-sm text-muted-foreground">
          {isRTL ? 'اختر تصنيفًا من القائمة لعرض تفاصيله.' : 'Pick a category from the list to see its details.'}
        </div>
      </Card>
    );
  }

  const type = types.find((t) => t.id === category.taxonomy_type_id);
  const parent = category.parent_id ? categories.find((c) => c.id === category.parent_id) : null;
  const children = categories
    .filter((c) => c.parent_id === category.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const bizN = usage?.businesses.get(category.id) ?? 0;
  const showN = usage?.showcase.get(category.id) ?? 0;
  const aliasN = usage?.aliases.get(category.id) ?? 0;
  const relN = usage?.relations.get(category.id) ?? 0;

  const VIS: Array<{ k: keyof TaxonomyCategory; ar: string; en: string }> = [
    { k: 'show_in_registration', ar: 'التسجيل', en: 'Registration' },
    { k: 'show_in_search', ar: 'البحث', en: 'Search' },
    { k: 'show_in_seo', ar: 'SEO', en: 'SEO' },
    { k: 'show_in_showcase', ar: 'Showcase', en: 'Showcase' },
    { k: 'show_in_products', ar: 'المنتجات', en: 'Products' },
    { k: 'show_in_contracts', ar: 'العقود', en: 'Contracts' },
    { k: 'show_in_quotes', ar: 'العروض', en: 'Quotes' },
  ];
  const visActive = VIS.filter((v) => Boolean(category[v.k]));

  return (
    <Card className="rounded-2xl border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-muted/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            {parent && (
              <div className="text-[11px] text-muted-foreground mb-1 truncate" dir="auto">
                {parent.name_ar}
                <span className="mx-1">›</span>
              </div>
            )}
            <h2 className="font-heading font-bold text-xl truncate" dir="auto">{category.name_ar}</h2>
            {category.name_en && (
              <div className="text-xs text-muted-foreground tech-content truncate">{category.name_en}</div>
            )}
            {category.short_description_ar && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2" dir="auto">
                {category.short_description_ar}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" className="h-9 rounded-xl gap-1.5" onClick={() => onEdit(category.id)}>
              <Edit className="w-3.5 h-3.5" /> {isRTL ? 'تعديل' : 'Edit'}
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5"
              onClick={() => onAddChild(category.id)}>
              <Plus className="w-3.5 h-3.5" /> {isRTL ? 'إضافة ابن' : 'Add child'}
            </Button>
            <Button
              size="sm" variant="outline" className="h-9 rounded-xl gap-1.5"
              onClick={() => onToggleActive(category.id, !category.is_active)}
            >
              {category.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {category.is_active ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'تفعيل' : 'Show')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5"
              onClick={() => onArchive(category.id)}>
              <Archive className="w-3.5 h-3.5" /> {isRTL ? 'أرشفة' : 'Archive'}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {[
          { label: isRTL ? 'النوع' : 'Type', value: type ? (isRTL ? type.name_ar : type.name_en ?? type.name_ar) : '—' },
          { label: isRTL ? 'التصنيف الأب' : 'Parent', value: parent ? parent.name_ar : (isRTL ? 'بدون' : 'None') },
          { label: isRTL ? 'الرابط المختصر' : 'Short link', value: category.slug, mono: true },
          { label: isRTL ? 'آخر تحديث' : 'Updated', value: new Date(category.updated_at).toISOString().slice(0, 10), mono: true },
        ].map((it) => (
          <div key={it.label} className="bg-card px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{it.label}</div>
            <div className={`text-sm font-medium truncate ${it.mono ? 'tech-content' : ''}`} dir="auto">
              {it.value}
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {/* Visibility chips */}
        <section className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            {isRTL ? 'أماكن الظهور' : 'Shown in'}
          </div>
          {visActive.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              {isRTL ? 'لا يظهر في أي مكان عام.' : 'Not shown anywhere public.'}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visActive.map((v) => (
                <Badge key={String(v.k)} variant="secondary" className="text-[11px]">
                  {isRTL ? v.ar : v.en}
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Usage indicators */}
        {usage && (
          <section className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {isRTL ? 'الاستخدام' : 'Usage'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Building2, label: isRTL ? 'منشآت' : 'Businesses', value: bizN },
                { icon: Image, label: isRTL ? 'أعمال' : 'Showcase', value: showN },
                { icon: Tag, label: isRTL ? 'مرادفات' : 'Aliases', value: aliasN },
                { icon: Link2, label: isRTL ? 'علاقات' : 'Relations', value: relN },
              ].map((it) => (
                <div key={it.label} className="rounded-xl border border-border bg-muted/10 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                    <it.icon className="w-3 h-3" /> {it.label}
                  </div>
                  <div className="text-base font-bold tech-content">{it.value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Children */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {isRTL ? `الأبناء (${children.length})` : `Children (${children.length})`}
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onAddChild(category.id)}>
              <Plus className="w-3 h-3" /> {isRTL ? 'إضافة' : 'Add'}
            </Button>
          </div>
          {children.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              {isRTL ? 'لا يوجد أبناء.' : 'No children.'}
            </div>
          ) : (
            <ul className="rounded-xl border border-border divide-y divide-border/70 overflow-hidden">
              {children.map((ch) => (
                <li key={ch.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30">
                  <button
                    type="button"
                    className="flex-1 text-start min-w-0"
                    onClick={() => onSelect(ch.id)}
                  >
                    <div className="text-sm truncate" dir="auto">
                      {ch.name_ar}
                      <span className="text-[10px] text-muted-foreground tech-content ms-2">{ch.slug}</span>
                    </div>
                  </button>
                  {ch.is_archived ? (
                    <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50">{isRTL ? 'مؤرشف' : 'archived'}</Badge>
                  ) : !ch.is_active ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{isRTL ? 'مخفي' : 'hidden'}</Badge>
                  ) : null}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(ch.id, 'up')} aria-label="up">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(ch.id, 'down')} aria-label="down">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(ch.id)} aria-label="edit">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Keywords preview */}
        {(category.keywords_ar?.length || category.keywords_en?.length) ? (
          <section className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {isRTL ? 'الكلمات البحثية' : 'Search keywords'}
            </div>
            <div className="flex flex-wrap gap-1">
              {(category.keywords_ar ?? []).map((k) => (
                <Badge key={`ar-${k}`} variant="outline" className="text-[10px]" dir="auto">{k}</Badge>
              ))}
              {(category.keywords_en ?? []).map((k) => (
                <Badge key={`en-${k}`} variant="outline" className="text-[10px] tech-content">{k}</Badge>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Card>
  );
};