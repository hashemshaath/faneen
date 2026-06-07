import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Database,
  FolderTree,
  CheckCircle2,
  EyeOff,
  Archive,
  FileText,
  SearchIcon,
  Copy,
} from 'lucide-react';
import type { TaxonomyCategory, TaxonomyType } from '../types';
import { detectTaxonomyDuplicates } from '../utils';

interface Props {
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
  aliases: { alias_ar: string }[] & { length: number };
}

export const TaxonomySummaryCards: React.FC<{
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
  aliases: Parameters<typeof detectTaxonomyDuplicates>[1];
}> = ({ types, categories, aliases }) => {
  const { isRTL } = useLanguage();

  const active = categories.filter((c) => c.is_active && !c.is_archived).length;
  const hidden = categories.filter((c) => !c.is_active && !c.is_archived).length;
  const archived = categories.filter((c) => c.is_archived).length;
  const missingDesc = categories.filter((c) => !c.description_ar && !c.description_en).length;
  const missingSeo = categories.filter(
    (c) => c.show_in_seo && (!c.seo_title_ar || !c.seo_description_ar),
  ).length;
  const dups = detectTaxonomyDuplicates(categories, aliases);
  const dupCount = dups.duplicateNames.length + dups.duplicateSlugs.length;

  const items = [
    { label: isRTL ? 'أنواع التصنيفات' : 'Taxonomy types', value: types.length, icon: Database, tone: 'text-primary' },
    { label: isRTL ? 'إجمالي التصنيفات' : 'Total categories', value: categories.length, icon: FolderTree, tone: 'text-primary' },
    { label: isRTL ? 'النشطة' : 'Active', value: active, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: isRTL ? 'المخفية' : 'Hidden', value: hidden, icon: EyeOff, tone: 'text-amber-600' },
    { label: isRTL ? 'المؤرشفة' : 'Archived', value: archived, icon: Archive, tone: 'text-muted-foreground' },
    { label: isRTL ? 'بدون وصف' : 'Missing description', value: missingDesc, icon: FileText, tone: 'text-amber-600' },
    { label: isRTL ? 'بدون SEO' : 'Missing SEO', value: missingSeo, icon: SearchIcon, tone: 'text-amber-600' },
    { label: isRTL ? 'احتمالات تكرار' : 'Possible duplicates', value: dupCount, icon: Copy, tone: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="p-3 rounded-xl hover-lift">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <it.icon className={`w-3.5 h-3.5 ${it.tone}`} />
            <span className="truncate">{it.label}</span>
          </div>
          <div className="text-xl font-bold tech-content">{it.value}</div>
        </Card>
      ))}
    </div>
  );
};

// Unused props alias kept for clarity (lint quiet).
export type TaxonomySummaryCardsProps = Props;