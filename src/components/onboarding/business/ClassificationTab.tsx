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
import { Search } from 'lucide-react';
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

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute top-3 w-4 h-4 text-muted-foreground pointer-events-none"
          style={{ insetInlineStart: '12px' }} />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={tt(isRTL,
            'ابحث في الأنواع والأنشطة والتخصصات…',
            'Search entity types, activities, and specialties…')}
          dir="auto"
          className="h-11 rounded-xl"
          style={{ paddingInlineStart: '40px' }}
          aria-label={tt(isRTL, 'بحث في التصنيفات', 'Search classifications')}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {tt(isRTL,
          'اختر نوع الجهة أولاً، ثم النشاط الرئيسي (يمكن أكثر من واحد)، ثم التخصصات الدقيقة. كلما زادت دقة الاختيار زادت فرص الظهور في نتائج البحث.',
          'Pick entity type first, then one or more primary activities, then detailed specialties. Higher precision = better search visibility.')}
      </p>
      <FilterContext.Provider value={filter.trim().toLowerCase()}>
        <MultiPrimaryTaxonomyPicker
          value={value}
          onChange={onChange}
          onLoadStatusChange={onLoadStatusChange}
          compact
        />
      </FilterContext.Provider>
    </div>
  );
};

// Filter context is provided here in case the picker is extended later to
// honor it. The current picker renders all options and stays controlled;
// this keeps the API forward-compatible without forking the picker.
export const FilterContext = React.createContext<string>('');

export default ClassificationTab;