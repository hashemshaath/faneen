/**
 * Classification tab for the business onboarding wizard.
 *
 * Wraps `MultiPrimaryTaxonomyPicker` with:
 *  - a single search box that filters entity-type/primary/secondary chips at once,
 *  - clear empty-state messaging,
 *  - bilingual labels.
 *
 * Presentation-only. State is owned by the parent.
 */
import React, { useState } from 'react';
import { Search, Lightbulb, X, Tag, Layers, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  MultiPrimaryTaxonomyPicker,
  EMPTY_MULTI_PRIMARY_TAXONOMY,
  type MultiPrimaryTaxonomyValue,
  type MultiPrimaryTaxonomyLoadStatus,
} from '@/modules/taxonomy/components/MultiPrimaryTaxonomyPicker';

interface Props {
  value: MultiPrimaryTaxonomyValue;
  onChange: (next: MultiPrimaryTaxonomyValue) => void;
  onLoadStatusChange?: (status: MultiPrimaryTaxonomyLoadStatus) => void;
}

const tt = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

export const ClassificationTab: React.FC<Props> = ({ value, onChange, onLoadStatusChange }) => {
  const { isRTL } = useLanguage();
  const [filter, setFilter] = useState('');

  const entityCount = value.entityTypeCategoryId ? 1 : 0;
  const primaryCount = value.primaryActivityCategoryIds.length;
  const secondaryCount = value.secondaryActivityCategoryIds.length;
  const selectedCount = entityCount + primaryCount + secondaryCount;

  const Stat = ({ icon: Icon, value: v, ar, en, tone }: {
    icon: typeof Tag; value: number; ar: string; en: string;
    tone: 'emerald' | 'primary' | 'gold';
  }) => {
    const toneCls = tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'primary'
        ? 'text-primary'
        : 'text-gold';
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${toneCls}`}>
        <Icon className="w-3 h-3" />
        <span className="tabular-nums font-semibold">{v}</span>
        <span className="opacity-80 text-muted-foreground font-normal">{tt(isRTL, ar, en)}</span>
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search + inline stats + reset — single compact row */}
      <div className="relative">
        <Search className="absolute top-3 w-4 h-4 text-muted-foreground pointer-events-none"
          style={{ insetInlineStart: '14px' }} />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={tt(isRTL,
            'ابحث في الأنشطة والتخصصات…',
            'Search activities and specialties…')}
          dir="auto"
          className="h-11 rounded-xl bg-background"
          style={{ paddingInlineStart: '42px', paddingInlineEnd: filter ? '42px' : '14px' }}
          aria-label={tt(isRTL, 'بحث في التصنيفات', 'Search classifications')}
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter('')}
            className="absolute top-2.5 p-1 rounded-md hover:bg-muted text-muted-foreground"
            style={{ insetInlineEnd: '8px' }}
            aria-label={tt(isRTL, 'مسح', 'Clear')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Live stats strip + reset + tip — flattened, no card */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-0.5">
        <div className="flex items-center gap-3 flex-wrap">
          <Stat icon={Tag} value={entityCount} ar="نوع جهة" en="entity" tone="emerald" />
          <span className="text-muted-foreground/30">·</span>
          <Stat icon={Layers} value={primaryCount} ar="نشاط" en="primary" tone="primary" />
          <span className="text-muted-foreground/30">·</span>
          <Stat icon={Tag} value={secondaryCount} ar="تخصص" en="specialties" tone="gold" />
        </div>
        {selectedCount > 0 && (
          <Button type="button" variant="ghost" size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
            onClick={() => onChange(EMPTY_MULTI_PRIMARY_TAXONOMY)}>
            <RotateCcw className="w-3 h-3 me-1" />
            {tt(isRTL, 'إعادة تعيين', 'Reset')}
          </Button>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground px-0.5">
        <Lightbulb className="w-3 h-3 text-gold mt-0.5 shrink-0" />
        <span>
          {tt(isRTL,
            'يمكنك اختيار أكثر من نشاط رئيسي إذا كانت منشأتك متعددة الخدمات (مثلاً: ألمنيوم + زجاج).',
            'Pick multiple primary activities if your business spans several services (e.g. aluminum + glass).')}
        </span>
      </p>

      <MultiPrimaryTaxonomyPicker
        value={value}
        onChange={onChange}
        onLoadStatusChange={onLoadStatusChange}
        compact
        filter={filter}
      />
    </div>
  );
};

export default ClassificationTab;