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
import { Search, Tags, Lightbulb, X, Tag, Layers, RotateCcw } from 'lucide-react';
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
      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
      : tone === 'primary'
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-gold/10 text-gold border-gold/30';
    return (
      <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium ${toneCls}`}>
        <Icon className="w-3 h-3" />
        <span className="tabular-nums">{v}</span>
        <span className="opacity-75">{tt(isRTL, ar, en)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Compact header: title + live stats + reset */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-background to-gold/[0.04] p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">
                {tt(isRTL, 'صنّف منشأتك بدقة', 'Classify your business precisely')}
              </p>
              {selectedCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(EMPTY_MULTI_PRIMARY_TAXONOMY)}
                >
                  <RotateCcw className="w-3 h-3 me-1" />
                  {tt(isRTL, 'إعادة تعيين', 'Reset')}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              {tt(isRTL,
                'اختر نوع الجهة ← النشاط الرئيسي ← التخصصات. الدقة ترفع فرص الظهور.',
                'Pick entity type ← primary activity ← specialties. More precision = better visibility.')}
            </p>
            {/* Live stats */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Stat icon={Tag} value={entityCount} ar="نوع جهة" en="entity" tone="emerald" />
              <Stat icon={Layers} value={primaryCount} ar="نشاط رئيسي" en="primary" tone="primary" />
              <Stat icon={Tag} value={secondaryCount} ar="تخصص" en="specialties" tone="gold" />
            </div>
          </div>
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

      {/* Quick tip */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground rounded-lg bg-gold/5 border border-gold/20 px-3 py-2">
        <Lightbulb className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
        <p>
          {tt(isRTL,
            'يمكنك اختيار أكثر من نشاط رئيسي إذا كانت منشأتك متعددة الخدمات (مثلاً: ألمنيوم + زجاج).',
            'Pick multiple primary activities if your business spans several services (e.g. aluminum + glass).')}
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