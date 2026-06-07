import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/i18n/LanguageContext';
import { Edit, Archive } from 'lucide-react';
import type { TaxonomyCategory, TaxonomyType } from '../types';

interface Props {
  rows: TaxonomyCategory[];
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
  onEdit: (id: string) => void;
  onArchive: (id: string) => void;
}

export const TaxonomyTableView: React.FC<Props> = ({ rows, types, categories, onEdit, onArchive }) => {
  const { isRTL } = useLanguage();
  const typeById = new Map(types.map((t) => [t.id, t]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  const VIS_KEYS: Array<{ k: keyof TaxonomyCategory; ar: string; en: string }> = [
    { k: 'show_in_registration', ar: 'تسجيل', en: 'Reg' },
    { k: 'show_in_search', ar: 'بحث', en: 'Search' },
    { k: 'show_in_seo', ar: 'SEO', en: 'SEO' },
    { k: 'show_in_showcase', ar: 'Showcase', en: 'Showcase' },
    { k: 'show_in_products', ar: 'منتجات', en: 'Products' },
    { k: 'show_in_contracts', ar: 'عقود', en: 'Contracts' },
    { k: 'show_in_quotes', ar: 'عروض', en: 'Quotes' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isRTL ? 'الاسم' : 'Name'}</TableHead>
            <TableHead>{isRTL ? 'النوع' : 'Type'}</TableHead>
            <TableHead>{isRTL ? 'الأب' : 'Parent'}</TableHead>
            <TableHead className="tech-content">slug</TableHead>
            <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
            <TableHead>{isRTL ? 'الظهور' : 'Visibility'}</TableHead>
            <TableHead>{isRTL ? 'الترتيب' : 'Order'}</TableHead>
            <TableHead>{isRTL ? 'آخر تحديث' : 'Updated'}</TableHead>
            <TableHead className="text-end">{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => {
            const t = typeById.get(c.taxonomy_type_id);
            const parent = c.parent_id ? catById.get(c.parent_id) : null;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium" dir="auto">{c.name_ar}{c.name_en && <span className="text-muted-foreground text-xs ms-1 tech-content">/ {c.name_en}</span>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t ? (isRTL ? t.name_ar : t.name_en ?? t.name_ar) : '—'}</TableCell>
                <TableCell className="text-xs">{parent ? parent.name_ar : '—'}</TableCell>
                <TableCell className="tech-content text-xs">{c.slug}</TableCell>
                <TableCell>
                  {c.is_archived ? <Badge variant="secondary">{isRTL ? 'مؤرشف' : 'archived'}</Badge>
                    : !c.is_active ? <Badge variant="secondary">{isRTL ? 'مخفي' : 'hidden'}</Badge>
                    : <Badge variant="outline" className="border-emerald-500 text-emerald-700">{isRTL ? 'نشط' : 'active'}</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {VIS_KEYS.filter((v) => Boolean(c[v.k])).map((v) => (
                      <Badge key={String(v.k)} variant="outline" className="text-[9px]">{isRTL ? v.ar : v.en}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="tech-content text-xs">{c.sort_order}</TableCell>
                <TableCell className="text-xs text-muted-foreground tech-content">{new Date(c.updated_at).toISOString().slice(0, 10)}</TableCell>
                <TableCell className="text-end">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onArchive(c.id)} aria-label="archive"><Archive className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(c.id)} aria-label="edit"><Edit className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">{isRTL ? 'لا توجد تصنيفات.' : 'No categories.'}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};