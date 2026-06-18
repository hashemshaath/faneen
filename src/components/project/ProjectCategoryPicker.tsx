import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, Tag, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  getProjectTaxonomyPickerCategories,
} from '@/modules/taxonomy/project-services';
import type { TaxonomyCategory } from '@/modules/taxonomy/types';

export interface ProjectCategoryPickerValue {
  primaryId: string | null;
  secondaryIds: string[];
}

interface Props {
  value: ProjectCategoryPickerValue;
  onChange: (v: ProjectCategoryPickerValue) => void;
  /** Maximum number of secondary categories. Defaults to 4. */
  maxSecondaries?: number;
  className?: string;
}

/**
 * Inline category picker for the project create/edit form.
 *
 * - Searchable list of all taxonomy categories visible to projects.
 * - One primary category (required for sort/group consistency) plus
 *   multiple secondary categories so a project can appear under more
 *   than one tab on public pages.
 * - No popups / dialogs — fully inline per project UX policy.
 */
export const ProjectCategoryPicker = ({
  value, onChange, maxSecondaries = 4, className,
}: Props) => {
  const { isRTL, language } = useLanguage();
  const [query, setQuery] = useState('');

  const { data: categories = [], isLoading } = useQuery<TaxonomyCategory[]>({
    queryKey: ['project-category-picker'],
    queryFn: getProjectTaxonomyPickerCategories,
    staleTime: 10 * 60 * 1000,
  });

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      return (
        c.name_ar?.toLowerCase().includes(q) ||
        c.name_en?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q)
      );
    });
  }, [categories, query]);

  const labelOf = (c: TaxonomyCategory) =>
    language === 'ar' ? c.name_ar : (c.name_en || c.name_ar);

  const togglePrimary = (id: string) => {
    if (value.primaryId === id) {
      onChange({ primaryId: null, secondaryIds: value.secondaryIds });
      return;
    }
    // Promote → remove from secondaries if present.
    onChange({
      primaryId: id,
      secondaryIds: value.secondaryIds.filter((sid) => sid !== id),
    });
  };

  const toggleSecondary = (id: string) => {
    if (id === value.primaryId) return;
    const has = value.secondaryIds.includes(id);
    if (has) {
      onChange({ primaryId: value.primaryId, secondaryIds: value.secondaryIds.filter((s) => s !== id) });
      return;
    }
    if (value.secondaryIds.length >= maxSecondaries) return;
    onChange({ primaryId: value.primaryId, secondaryIds: [...value.secondaryIds, id] });
  };

  const clearAll = () => onChange({ primaryId: null, secondaryIds: [] });

  const selectedCount = (value.primaryId ? 1 : 0) + value.secondaryIds.length;

  return (
    <div className={cn('space-y-2 rounded-xl border border-border/50 bg-card/30 p-2.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Tag className="w-3.5 h-3.5" />
          {isRTL ? 'تصنيفات المشروع' : 'Project categories'}
          <span className="rounded-full bg-muted px-1.5 text-[10px]">{selectedCount}</span>
        </div>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> {isRTL ? 'إلغاء الكل' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Selected chips summary */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.primaryId && byId.get(value.primaryId) && (
            <Badge
              variant="default"
              className="gap-1 text-[10px] font-medium"
              dir="auto"
            >
              <Star className="w-2.5 h-2.5 fill-current" />
              {labelOf(byId.get(value.primaryId)!)}
              <button
                type="button"
                onClick={() => togglePrimary(value.primaryId!)}
                aria-label={isRTL ? 'إزالة' : 'Remove'}
                className="ms-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          {value.secondaryIds.map((id) => {
            const c = byId.get(id);
            if (!c) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1 text-[10px]" dir="auto">
                {labelOf(c)}
                <button
                  type="button"
                  onClick={() => toggleSecondary(id)}
                  aria-label={isRTL ? 'إزالة' : 'Remove'}
                  className="ms-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isRTL ? 'ابحث في التصنيفات...' : 'Search categories...'}
          className="ps-8 h-8 text-xs"
          aria-label={isRTL ? 'بحث' : 'Search'}
        />
      </div>

      {/* Options */}
      <div
        className="max-h-56 overflow-y-auto rounded-lg border border-border/40 bg-background/50 p-1"
        role="listbox"
        aria-label={isRTL ? 'قائمة التصنيفات' : 'Categories list'}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">
            {isRTL ? 'لا توجد تصنيفات مطابقة' : 'No matching categories'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const isPrimary = value.primaryId === c.id;
              const isSecondary = value.secondaryIds.includes(c.id);
              const isSelected = isPrimary || isSecondary;
              return (
                <li key={c.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSecondary(c.id)}
                    disabled={isPrimary || (!isSecondary && value.secondaryIds.length >= maxSecondaries)}
                    aria-pressed={isSecondary}
                    className={cn(
                      'flex-1 min-w-0 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-xs transition-colors',
                      'hover:bg-muted/60',
                      isSelected ? 'bg-primary/10 text-primary' : 'text-foreground',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <span className="truncate" dir="auto">
                      {c.parent_id ? <span className="text-muted-foreground/60 me-1">└</span> : null}
                      {labelOf(c)}
                    </span>
                    {isSecondary && !isPrimary && (
                      <span className="text-[9px] text-primary">{isRTL ? 'ثانوي' : 'Secondary'}</span>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant={isPrimary ? 'default' : 'ghost'}
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => togglePrimary(c.id)}
                    title={isRTL ? 'تعيين كأساسي' : 'Set as primary'}
                    aria-pressed={isPrimary}
                    aria-label={isRTL ? 'تعيين كأساسي' : 'Set as primary'}
                  >
                    <Star className={cn('w-3 h-3', isPrimary && 'fill-current')} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {isRTL
          ? `اضغط على النجمة لتعيين تصنيف أساسي، واختر حتى ${maxSecondaries} تصنيفات ثانوية.`
          : `Tap the star to set a primary category and pick up to ${maxSecondaries} secondaries.`}
      </p>
    </div>
  );
};

export default ProjectCategoryPicker;