/**
 * Phase 11 — Lightweight taxonomy picker for the Onboarding flow.
 *
 * Unlike `BusinessTaxonomySection` (which writes through an RPC against an
 * existing business), this component is a controlled value/onChange picker.
 * It is rendered BEFORE the business exists, so we collect selections into
 * draft state and persist them only after the business is created.
 *
 * Hard rules:
 * - Does not require a `businessId`.
 * - Only shows registration-visible categories (is_active + is_public +
 *   show_in_registration + not archived).
 * - If taxonomy fails to load, render a soft notice and let the user continue;
 *   the rest of onboarding (legacy sectors) still works.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Tag, Loader2, Search, Info } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';

import {
  getRegistrationEntityTypes,
  getRegistrationPrimaryActivities,
  getChildCategories,
} from '../business-services';
import type { TaxonomyCategory } from '../types';

export interface OnboardingTaxonomyValue {
  entityTypeCategoryId: string | null;
  primaryActivityCategoryId: string | null;
  secondaryActivityCategoryIds: string[];
}

export const EMPTY_ONBOARDING_TAXONOMY: OnboardingTaxonomyValue = {
  entityTypeCategoryId: null,
  primaryActivityCategoryId: null,
  secondaryActivityCategoryIds: [],
};

export type OnboardingTaxonomyLoadStatus = 'loading' | 'ok' | 'error';

interface Props {
  value: OnboardingTaxonomyValue;
  onChange: (next: OnboardingTaxonomyValue) => void;
  /**
   * Optional: notify parent of taxonomy load lifecycle so it can switch
   * the legacy SectorPicker between primary and fallback presentation.
   */
  onLoadStatusChange?: (status: OnboardingTaxonomyLoadStatus) => void;
}

const t = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

function name(cat: TaxonomyCategory, isRTL: boolean): string {
  if (isRTL) return cat.name_ar || cat.name_en || cat.slug;
  return cat.name_en || cat.name_ar || cat.slug;
}

export const OnboardingTaxonomyStep: React.FC<Props> = ({
  value, onChange, onLoadStatusChange,
}) => {
  const { isRTL } = useLanguage();

  const entityTypesQ = useQuery({
    queryKey: ['tx:entity-types'],
    queryFn: getRegistrationEntityTypes,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const primariesQ = useQuery({
    queryKey: ['tx:primary-activities'],
    queryFn: getRegistrationPrimaryActivities,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const childrenQ = useQuery({
    queryKey: ['tx:children', value.primaryActivityCategoryId],
    queryFn: () => (value.primaryActivityCategoryId
      ? getChildCategories(value.primaryActivityCategoryId)
      : Promise.resolve([])),
    enabled: !!value.primaryActivityCategoryId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [search, setSearch] = useState('');

  // Drop secondary selections that no longer belong to the new primary.
  useEffect(() => {
    if (!value.primaryActivityCategoryId || !childrenQ.data) return;
    const allowed = new Set(childrenQ.data.map(c => c.id));
    const filtered = value.secondaryActivityCategoryIds.filter(id => allowed.has(id));
    if (filtered.length !== value.secondaryActivityCategoryIds.length) {
      onChange({ ...value, secondaryActivityCategoryIds: filtered });
    }
  }, [value, childrenQ.data, onChange]);

  const filteredChildren = useMemo(() => {
    const list = childrenQ.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(c =>
      (c.name_ar || '').toLowerCase().includes(q) ||
      (c.name_en || '').toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q),
    );
  }, [childrenQ.data, search]);

  const loadError = entityTypesQ.isError || primariesQ.isError;
  const isLoading = entityTypesQ.isLoading || primariesQ.isLoading;

  useEffect(() => {
    if (!onLoadStatusChange) return;
    if (loadError) onLoadStatusChange('error');
    else if (isLoading) onLoadStatusChange('loading');
    else onLoadStatusChange('ok');
  }, [loadError, isLoading, onLoadStatusChange]);

  const toggleSecondary = (id: string) => {
    const exists = value.secondaryActivityCategoryIds.includes(id);
    onChange({
      ...value,
      secondaryActivityCategoryIds: exists
        ? value.secondaryActivityCategoryIds.filter(x => x !== id)
        : [...value.secondaryActivityCategoryIds, id],
    });
  };

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2 items-start">
        <Info className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
        <p className="text-xs text-muted-foreground">
          {t(isRTL,
            'تعذر تحميل التصنيفات المركزية حاليًا. يمكنك إكمال التسجيل وتحديث التصنيف لاحقًا من لوحة التحكم.',
            'Could not load central taxonomy right now. You can finish registration and update the classification later from the dashboard.',
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t(isRTL, 'تصنيف المنشأة', 'Business classification')}
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {t(isRTL, 'جديد', 'New')}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        {t(isRTL,
          'اختر نوع الجهة والنشاط الأقرب لمنشأتك حتى تظهر في البحث والطلبات المناسبة.',
          'Pick the entity type and closest activity so your business appears in relevant searches and requests.',
        )}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t(isRTL, 'جارٍ تحميل التصنيفات…', 'Loading taxonomy…')}
        </div>
      ) : (
        <>
          {/* Entity type */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {t(isRTL, 'نوع الجهة', 'Entity type')}
            </Label>
            <Select
              value={value.entityTypeCategoryId ?? ''}
              onValueChange={(v) => onChange({ ...value, entityTypeCategoryId: v || null })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t(isRTL, 'اختر نوع الجهة', 'Choose entity type')} />
              </SelectTrigger>
              <SelectContent>
                {(entityTypesQ.data ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{name(c, isRTL)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary activity */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {t(isRTL, 'النشاط الرئيسي', 'Primary activity')}
            </Label>
            <Select
              value={value.primaryActivityCategoryId ?? ''}
              onValueChange={(v) => onChange({
                ...value,
                primaryActivityCategoryId: v || null,
                secondaryActivityCategoryIds: [],
              })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t(isRTL, 'اختر النشاط الأقرب لمنشأتك', 'Choose the closest primary activity')} />
              </SelectTrigger>
              <SelectContent>
                {(primariesQ.data ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{name(c, isRTL)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary activities */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {t(isRTL, 'التخصصات والخدمات', 'Specialties & services')}
              {value.secondaryActivityCategoryIds.length > 0 && (
                <Badge variant="outline" className="ms-1 text-[10px]">
                  {value.secondaryActivityCategoryIds.length}
                </Badge>
              )}
              <span className="text-muted-foreground font-normal">
                ({t(isRTL, 'اختياري', 'optional')})
              </span>
            </Label>
            {!value.primaryActivityCategoryId ? (
              <p className="text-[11px] text-muted-foreground py-1">
                {t(isRTL,
                  'اختر النشاط الرئيسي أولًا لعرض التخصصات.',
                  'Pick a primary activity first to see specialties.',
                )}
              </p>
            ) : childrenQ.isLoading ? (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t(isRTL, 'جارٍ التحميل…', 'Loading…')}
              </div>
            ) : (childrenQ.data?.length ?? 0) === 0 ? (
              <p className="text-[11px] text-muted-foreground py-1">
                {t(isRTL,
                  'لا توجد تخصصات مضافة لهذا النشاط حاليًا. يمكنك المتابعة وتعديلها لاحقًا.',
                  'No specialties available for this activity yet. You can continue and edit later.',
                )}
              </p>
            ) : (
              <>
                {(childrenQ.data?.length ?? 0) >= 8 && (
                  <div className="relative">
                    <Search className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t(isRTL, 'ابحث في التخصصات…', 'Search specialties…')}
                      className={isRTL ? 'pr-9 h-9' : 'pl-9 h-9'}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {filteredChildren.map(c => {
                    const active = value.secondaryActivityCategoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleSecondary(c.id)}
                        className={
                          'text-xs rounded-full border px-3 py-1.5 transition-colors hover-lift ' +
                          (active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted')
                        }
                      >
                        {name(c, isRTL)}
                      </button>
                    );
                  })}
                  {filteredChildren.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {t(isRTL, 'لا نتائج', 'No matches')}
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  {t(isRTL,
                    'يمكنك اختيار أكثر من تخصص أو خدمة، وتعديلها لاحقًا من لوحة التحكم.',
                    'You can pick multiple specialties or services and edit them later from the dashboard.',
                  )}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingTaxonomyStep;