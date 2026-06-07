import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { Edit, Archive } from 'lucide-react';
import type { TaxonomyCategory, TaxonomyType } from '../types';
import { getTaxonomyIcon } from '../icon-map';

interface Props {
  rows: TaxonomyCategory[];
  types: TaxonomyType[];
  onEdit: (id: string) => void;
  onArchive: (id: string) => void;
}

export const TaxonomyCardView: React.FC<Props> = ({ rows, types, onEdit, onArchive }) => {
  const { isRTL } = useLanguage();
  const typeById = new Map(types.map((t) => [t.id, t]));
  if (rows.length === 0) {
    return <div className="text-center text-muted-foreground py-12">{isRTL ? 'لا توجد تصنيفات.' : 'No categories.'}</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((c) => {
        const t = typeById.get(c.taxonomy_type_id);
        const Icon = getTaxonomyIcon(c.icon);
        return (
          <Card key={c.id} className="p-4 rounded-xl hover-lift flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="font-heading font-bold text-base truncate" dir="auto">{c.name_ar}</div>
                  {c.name_en && <div className="text-xs text-muted-foreground truncate tech-content">{c.name_en}</div>}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] tech-content shrink-0">{c.slug}</Badge>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2 min-h-[2.25rem]" dir="auto">
              {c.short_description_ar || c.description_ar || (isRTL ? 'لا يوجد وصف' : 'No description')}
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px]">{t ? (isRTL ? t.name_ar : t.name_en ?? t.name_ar) : '—'}</Badge>
              {c.is_archived ? <Badge variant="secondary">{isRTL ? 'مؤرشف' : 'archived'}</Badge>
                : !c.is_active ? <Badge variant="secondary">{isRTL ? 'مخفي' : 'hidden'}</Badge>
                : <Badge variant="outline" className="border-emerald-500 text-emerald-700 text-[10px]">{isRTL ? 'نشط' : 'active'}</Badge>}
            </div>
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
              <Button size="sm" variant="ghost" className="h-8" onClick={() => onArchive(c.id)}><Archive className="w-3.5 h-3.5 me-1" />{isRTL ? 'أرشفة' : 'Archive'}</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => onEdit(c.id)}><Edit className="w-3.5 h-3.5 me-1" />{isRTL ? 'تعديل' : 'Edit'}</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};