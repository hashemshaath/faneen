import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { FolderTree, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import type { TaxonomyCategory } from '../types';

/**
 * Calm 4-card summary. Detailed counts (hidden, archived, duplicates…)
 * live inside the Quality tab so the home view stays uncluttered.
 */
export const TaxonomySummaryCards: React.FC<{
  categories: TaxonomyCategory[];
  issuesCount: number;
}> = ({ categories, issuesCount }) => {
  const { isRTL } = useLanguage();

  const active = categories.filter((c) => c.is_active && !c.is_archived).length;
  const missingSeo = categories.filter(
    (c) => c.show_in_seo && (!c.seo_title_ar || !c.seo_description_ar),
  ).length;

  const items = [
    { label: isRTL ? 'إجمالي التصنيفات' : 'Total categories', value: categories.length, icon: FolderTree, tone: 'text-primary' },
    { label: isRTL ? 'التصنيفات النشطة' : 'Active categories', value: active, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: isRTL ? 'تحتاج مراجعة' : 'Needs review', value: issuesCount, icon: AlertTriangle, tone: 'text-amber-600' },
    { label: isRTL ? 'بدون SEO' : 'Missing SEO', value: missingSeo, icon: Search, tone: 'text-sky-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="px-4 py-3 rounded-2xl border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <it.icon className={`w-4 h-4 ${it.tone}`} />
            <span className="truncate">{it.label}</span>
          </div>
          <div className="text-2xl font-bold tech-content">{it.value}</div>
        </Card>
      ))}
    </div>
  );
};
