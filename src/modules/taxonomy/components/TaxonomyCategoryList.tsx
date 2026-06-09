import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TaxonomyCategory, TaxonomyType } from '../types';
import { isLegacyPrimarySlug } from '../canonical-primaries';

interface Props {
  rows: TaxonomyCategory[];
  types: TaxonomyType[];
  childrenCount: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Right column: compact category cards. Click → opens details on the left.
 * Designed for fast daily scanning — no per-row action clutter.
 */
export const TaxonomyCategoryList: React.FC<Props> = ({
  rows, types, childrenCount, selectedId, onSelect,
}) => {
  const { isRTL } = useLanguage();
  const typeById = new Map(types.map((t) => [t.id, t]));

  if (rows.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 text-sm">
        {isRTL ? 'لا توجد تصنيفات مطابقة.' : 'No matching categories.'}
      </div>
    );
  }

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <ul className="space-y-2">
      {rows.map((c) => {
        const t = typeById.get(c.taxonomy_type_id);
        const kids = childrenCount.get(c.id) ?? 0;
        const selected = c.id === selectedId;
        const statusBadge = c.is_archived ? (
          <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50">
            {isRTL ? 'مؤرشف' : 'archived'}
          </Badge>
        ) : !c.is_active ? (
          <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
            {isRTL ? 'مخفي' : 'hidden'}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
            {isRTL ? 'نشط' : 'active'}
          </Badge>
        );
        const legacyBadge = isLegacyPrimarySlug(c.slug) ? (
          <Badge
            variant="outline"
            className="text-[10px] border-amber-400 text-amber-700 bg-amber-50"
            title={isRTL ? 'مخفي من الواجهات العامة' : 'Hidden from public UI'}
          >
            {isRTL ? 'قديم' : 'Legacy'}
          </Badge>
        ) : null;
        return (
          <li key={c.id}>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.id); } }}
              className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors border ${
                selected
                  ? 'border-primary/60 bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate" dir="auto">{c.name_ar}</span>
                    {kids > 0 && (
                      <span className="text-[10px] tech-content text-muted-foreground">
                        ({kids})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{t ? (isRTL ? t.name_ar : t.name_en ?? t.name_ar) : '—'}</span>
                    {statusBadge}
                    {legacyBadge}
                  </div>
                </div>
                <Chevron className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
};