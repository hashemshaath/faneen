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
import { Search, Tags, Lightbulb, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  MultiPrimaryTaxonomyPicker,
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

  const selectedCount =
    (value.entityTypeCategoryId ? 1 : 0) +
    value.primaryActivityCategoryIds.length +
    value.secondaryActivityCategoryIds.length;

  return (
    <div className="space-y-4">
      {/* Intro card with selection counter */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-gold/5 p-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
          <Tags className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-foreground">
              {tt(isRTL, 'صنّف منشأتك بدقة', 'Classify your business precisely')}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              selectedCount > 0 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {tt(isRTL, `${selectedCount} اختيار`, `${selectedCount} selected`)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {tt(isRTL,
              'اختر نوع الجهة → النشاط الرئيسي → التخصصات. كلما زادت الدقة زادت فرص الظهور.',
              'Pick entity type → primary activity → specialties. More precision = better visibility.')}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute top-3 w-4 h-4 text-muted-foreground pointer-events-none"
          style={{ insetInlineStart: '14px' }} />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={tt(isRTL,
            'ابحث في الأنواع والأنشطة والتخصصات…',
            'Search entity types, activities, and specialties…')}
          dir="auto"
          className="h-11 rounded-xl"
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

      {/* Quick tips */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Lightbulb className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
        <p>
          {tt(isRTL,
            'يمكنك اختيار أكثر من نشاط رئيسي إذا كانت منشأتك تقدم خدمات متعددة (مثل: ألمنيوم + زجاج).',
            'You can pick multiple primary activities if your business spans several services (e.g., aluminum + glass).')}
        </p>
      </div>

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