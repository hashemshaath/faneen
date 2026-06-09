/**
 * Onboarding taxonomy step — multi-primary edition (Safe Batch 2).
 *
 * Thin adapter around `MultiPrimaryTaxonomyPicker` that keeps the public
 * `OnboardingTaxonomyValue` shape (`primaryActivityCategoryIds: string[]`)
 * and stays back-compatible with old drafts that stored a single
 * `primaryActivityCategoryId: string | null`.
 *
 * Hard rules:
 * - Does not require a `businessId`.
 * - Never writes to legacy `sectors` / `sub_services` / `category_id`.
 * - If taxonomy fails to load, render a soft notice and let the user continue.
 */
import React from 'react';
import { Layers } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

import {
  MultiPrimaryTaxonomyPicker,
  type MultiPrimaryTaxonomyValue,
  type MultiPrimaryTaxonomyLoadStatus,
} from './MultiPrimaryTaxonomyPicker';

/** Multi-primary onboarding taxonomy value. */
export interface OnboardingTaxonomyValue {
  entityTypeCategoryId: string | null;
  primaryActivityCategoryIds: string[];
  secondaryActivityCategoryIds: string[];
}

export const EMPTY_ONBOARDING_TAXONOMY: OnboardingTaxonomyValue = {
  entityTypeCategoryId: null,
  primaryActivityCategoryIds: [],
  secondaryActivityCategoryIds: [],
};

export type OnboardingTaxonomyLoadStatus = MultiPrimaryTaxonomyLoadStatus;

/**
 * Draft compatibility shim — converts legacy/partial onboarding taxonomy
 * shapes (with single `primaryActivityCategoryId`) into the new array form.
 * Pure function: safe to call from anywhere (no React hooks).
 */
export interface LegacyOnboardingTaxonomyShape {
  entityTypeCategoryId?: string | null;
  primaryActivityCategoryId?: string | null;
  primaryActivityCategoryIds?: string[] | null;
  secondaryActivityCategoryIds?: string[] | null;
}
export function normalizeOnboardingTaxonomyDraft(
  input: LegacyOnboardingTaxonomyShape | null | undefined,
): OnboardingTaxonomyValue {
  if (!input || typeof input !== 'object') return EMPTY_ONBOARDING_TAXONOMY;
  const arr = Array.isArray(input.primaryActivityCategoryIds)
    ? input.primaryActivityCategoryIds.filter((x): x is string => typeof x === 'string' && !!x)
    : [];
  const legacy =
    typeof input.primaryActivityCategoryId === 'string' && input.primaryActivityCategoryId
      ? [input.primaryActivityCategoryId]
      : [];
  const merged = Array.from(new Set([...arr, ...legacy]));
  const secondary = Array.isArray(input.secondaryActivityCategoryIds)
    ? input.secondaryActivityCategoryIds.filter((x): x is string => typeof x === 'string' && !!x)
    : [];
  return {
    entityTypeCategoryId:
      typeof input.entityTypeCategoryId === 'string' && input.entityTypeCategoryId
        ? input.entityTypeCategoryId
        : null,
    primaryActivityCategoryIds: merged,
    secondaryActivityCategoryIds: secondary,
  };
}

interface Props {
  value: OnboardingTaxonomyValue;
  onChange: (next: OnboardingTaxonomyValue) => void;
  /**
   * Optional: notify parent of taxonomy load lifecycle so it can switch
   * the legacy SectorPicker between primary and fallback presentation.
   */
  onLoadStatusChange?: (status: OnboardingTaxonomyLoadStatus) => void;
}

const tt = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

export const OnboardingTaxonomyStep: React.FC<Props> = ({ value, onChange, onLoadStatusChange }) => {
  const { isRTL } = useLanguage();
  // Cast through MultiPrimaryTaxonomyValue (same shape) so the picker is reused.
  const picker: MultiPrimaryTaxonomyValue = {
    entityTypeCategoryId: value.entityTypeCategoryId,
    primaryActivityCategoryIds: value.primaryActivityCategoryIds,
    secondaryActivityCategoryIds: value.secondaryActivityCategoryIds,
  };
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {tt(isRTL, 'تصنيف المنشأة', 'Business classification')}
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {tt(isRTL, 'جديد', 'New')}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        {tt(isRTL,
          'اختر نوع الجهة والأنشطة الرئيسية الأقرب لمنشأتك، ثم حدد التخصصات الدقيقة لكل نشاط. يمكنك اختيار أكثر من نشاط رئيسي.',
          'Pick the entity type, then the primary activities closest to your business, and the detailed specialties for each. You can pick more than one primary activity.',
        )}
      </p>
      <MultiPrimaryTaxonomyPicker
        value={picker}
        onChange={(next) => onChange({
          entityTypeCategoryId: next.entityTypeCategoryId,
          primaryActivityCategoryIds: next.primaryActivityCategoryIds,
          secondaryActivityCategoryIds: next.secondaryActivityCategoryIds,
        })}
        onLoadStatusChange={onLoadStatusChange}
        compact
      />
    </div>
  );
};

export default OnboardingTaxonomyStep;