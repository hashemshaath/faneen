import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { AlertTriangle } from 'lucide-react';
import type { TaxonomyQualityIssue } from '../types';

interface Props {
  issues: TaxonomyQualityIssue[];
  onOpen: (id: string) => void;
}

export const TaxonomyQualityPanel: React.FC<Props> = ({ issues, onOpen }) => {
  const { isRTL } = useLanguage();
  if (issues.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{isRTL ? 'لا توجد ملاحظات جودة.' : 'No quality issues.'}</div>;
  }
  const byCat = new Map<string, TaxonomyQualityIssue[]>();
  issues.forEach((i) => {
    const arr = byCat.get(i.category.id) ?? [];
    arr.push(i);
    byCat.set(i.category.id, arr);
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from(byCat.values()).map((group) => {
        const cat = group[0].category;
        return (
          <Card key={cat.id} className="p-4 rounded-xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="font-heading font-bold text-sm truncate" dir="auto">{cat.name_ar}</div>
                <div className="text-[10px] text-muted-foreground tech-content truncate">{cat.slug}</div>
              </div>
              <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => onOpen(cat.id)}>{isRTL ? 'فتح' : 'Open'}</Button>
            </div>
            <div className="space-y-1.5">
              {group.map((i, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <Badge variant="outline" className="text-[9px] me-1.5">{i.code}</Badge>
                    <span className="text-muted-foreground">{isRTL ? i.message_ar : i.message_en}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
};