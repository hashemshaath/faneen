/**
 * Safe Batch 2 — shared multi-primary taxonomy picker.
 *
 * Used by both `OnboardingTaxonomyStep` (before the business exists, pure
 * controlled component) and `BusinessTaxonomySection` (after the business
 * exists, persisted via the v2 RPC).
 *
 * Behaviour:
 *   - Entity type: single Select.
 *   - Primary activities: multi-select chips, from the 13 registration-
 *     visible primary activities (+ legacy `sector` type for back-compat).
 *   - Secondary activities: grouped per selected primary, each in its own
 *     accordion card. Secondaries from primaries that get unselected are
 *     dropped automatically.
 *
 * Hard rules:
 *   - No popups/dialogs. Inline cards only.
 *   - RTL-aware (uses `useLanguage().isRTL`).
 *   - Never writes to legacy `sectors` / `sub_services` / `category_id`.
 *   - The picker is presentation-only; persistence lives in the parent.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Tag, Loader2, ChevronDown, ChevronUp, Info, Check } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';

import {
  getRegistrationEntityTypes,
  getRegistrationPrimaryActivities,
  getChildCategoriesGrouped,
  getTaxonomyCategoriesByIds,
} from '../business-services';
import type { TaxonomyCategory } from '../types';

export interface MultiPrimaryTaxonomyValue {
  entityTypeCategoryId: string | null;
  primaryActivityCategoryIds: string[];
  secondaryActivityCategoryIds: string[];
}

export const EMPTY_MULTI_PRIMARY_TAXONOMY: MultiPrimaryTaxonomyValue = {
  entityTypeCategoryId: null,
  primaryActivityCategoryIds: [],
  secondaryActivityCategoryIds: [],
};

export type MultiPrimaryTaxonomyLoadStatus = 'loading' | 'ok' | 'error';

interface Props {
  value: MultiPrimaryTaxonomyValue;
  onChange: (next: MultiPrimaryTaxonomyValue) => void;
  onLoadStatusChange?: (status: MultiPrimaryTaxonomyLoadStatus) => void;
  /** Hide entity type picker (e.g. when not needed in some flows). */
  hideEntityType?: boolean;
  /** Compact mode shrinks spacing for tight onboarding card. */
  compact?: boolean;
  /** Free-text filter applied to primary + secondary chip labels (AR+EN). */
  filter?: string;
}

const t = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);
const labelOf = (cat: TaxonomyCategory, isRTL: boolean): string =>
  isRTL ? (cat.name_ar || cat.name_en || cat.slug)
        : (cat.name_en || cat.name_ar || cat.slug);

export const MultiPrimaryTaxonomyPicker: React.FC<Props> = ({
  value, onChange, onLoadStatusChange, hideEntityType, compact, filter,
}) => {
  const { isRTL } = useLanguage();
  const q = (filter ?? '').trim().toLowerCase();
  const matchesFilter = (c: TaxonomyCategory): boolean => {
    if (!q) return true;
    return (
      (c.name_ar ?? '').toLowerCase().includes(q) ||
      (c.name_en ?? '').toLowerCase().includes(q) ||
      (c.slug ?? '').toLowerCase().includes(q)
    );
  };

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

  const selectedPrimaryIds = value.primaryActivityCategoryIds;
  const childrenQ = useQuery({
    queryKey: ['tx:children-grouped', [...selectedPrimaryIds].sort()],
    queryFn: () => getChildCategoriesGrouped(selectedPrimaryIds),
    enabled: selectedPrimaryIds.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const childrenByPrimary: Record<string, TaxonomyCategory[]> = childrenQ.data ?? {};

  // Drop secondary selections whose parent primary is no longer selected
  // or whose child rows no longer exist.
  useEffect(() => {
    if (selectedPrimaryIds.length === 0) {
      if (value.secondaryActivityCategoryIds.length > 0) {
        onChange({ ...value, secondaryActivityCategoryIds: [] });
      }
      return;
    }
    if (!childrenQ.data) return;
    const allowed = new Set<string>();
    for (const list of Object.values(childrenQ.data)) {
      for (const c of list) allowed.add(c.id);
    }
    const filtered = value.secondaryActivityCategoryIds.filter((id) => allowed.has(id));
    if (filtered.length !== value.secondaryActivityCategoryIds.length) {
      onChange({ ...value, secondaryActivityCategoryIds: filtered });
    }
  }, [selectedPrimaryIds, childrenQ.data, value, onChange]);

  const loadError = entityTypesQ.isError || primariesQ.isError;
  const isLoading = entityTypesQ.isLoading || primariesQ.isLoading;

  useEffect(() => {
    if (!onLoadStatusChange) return;
    if (loadError) onLoadStatusChange('error');
    else if (isLoading) onLoadStatusChange('loading');
    else onLoadStatusChange('ok');
  }, [loadError, isLoading, onLoadStatusChange]);

  const togglePrimary = (id: string) => {
    const exists = selectedPrimaryIds.includes(id);
    const nextPrimaryIds = exists
      ? selectedPrimaryIds.filter((x) => x !== id)
      : [...selectedPrimaryIds, id];
    const removedChildIds = exists
      ? new Set((childrenByPrimary[id] ?? []).map((child) => child.id))
      : null;
    onChange({
      ...value,
      primaryActivityCategoryIds: nextPrimaryIds,
      secondaryActivityCategoryIds: removedChildIds
        ? value.secondaryActivityCategoryIds.filter((childId) => !removedChildIds.has(childId))
        : value.secondaryActivityCategoryIds,
    });
  };

  const toggleSecondary = (id: string) => {
    const exists = value.secondaryActivityCategoryIds.includes(id);
    onChange({
      ...value,
      secondaryActivityCategoryIds: exists
        ? value.secondaryActivityCategoryIds.filter((x) => x !== id)
        : [...value.secondaryActivityCategoryIds, id],
    });
  };

  const secondaryCountByPrimary = useMemo(() => {
    const out: Record<string, number> = {};
    for (const pid of selectedPrimaryIds) {
      const ids = new Set((childrenByPrimary[pid] ?? []).map((c) => c.id));
      out[pid] = value.secondaryActivityCategoryIds.filter((id) => ids.has(id)).length;
    }
    return out;
  }, [childrenByPrimary, selectedPrimaryIds, value.secondaryActivityCategoryIds]);

  const primariesById: Record<string, TaxonomyCategory> = useMemo(() => {
    const m: Record<string, TaxonomyCategory> = {};
    for (const p of primariesQ.data ?? []) m[p.id] = p;
    return m;
  }, [primariesQ.data]);

  // Fallback: if any selected primary id is NOT in the curated registration
  // list (e.g. persisted from an older taxonomy snapshot), fetch its label by
  // id so the UI never leaks a raw UUID like `113133fc-…`.
  const missingPrimaryIds = useMemo(
    () => selectedPrimaryIds.filter((id) => !primariesById[id]),
    [selectedPrimaryIds, primariesById],
  );
  const missingPrimariesQ = useQuery({
    queryKey: ['tx:primary-fallback', [...missingPrimaryIds].sort()],
    queryFn: () => getTaxonomyCategoriesByIds(missingPrimaryIds),
    enabled: missingPrimaryIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const primariesByIdMerged: Record<string, TaxonomyCategory> = useMemo(() => {
    const m = { ...primariesById };
    for (const p of missingPrimariesQ.data ?? []) m[p.id] = p;
    return m;
  }, [primariesById, missingPrimariesQ.data]);

  const primaryOptions = useMemo(() => {
    const base = primariesQ.data ?? [];
    const seen = new Set(base.map((p) => p.id));
    const missingSelected = selectedPrimaryIds
      .map((id) => primariesByIdMerged[id])
      .filter((p): p is TaxonomyCategory => !!p && !seen.has(p.id));
    return [...base, ...missingSelected];
  }, [primariesQ.data, primariesByIdMerged, selectedPrimaryIds]);

  // A primary with no children at all gets a "no specialties" hint instead
  // of the empty-required warning.
  const primaryHasChildren = (pid: string) =>
    (childrenByPrimary[pid]?.length ?? 0) > 0;

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2 items-start">
        <Info className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
        <p className="text-xs text-muted-foreground">
          {t(isRTL,
            'تعذر تحميل التصنيفات المركزية حاليًا. يمكنك إكمال التسجيل وتحديث التصنيف لاحقًا من لوحة التحكم.',
            'Could not load central taxonomy. You can finish later from the dashboard.',
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={(compact ? 'space-y-3' : 'space-y-5') + ''}>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t(isRTL, 'جارٍ تحميل التصنيفات…', 'Loading taxonomy…')}
        </div>
      ) : (
        <>
          {!hideEntityType && (
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
                  {(entityTypesQ.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{labelOf(c, isRTL)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Primary activities — multi-select */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {t(isRTL, 'اختر الأنشطة الرئيسية', 'Choose primary activities')}
              {selectedPrimaryIds.length > 0 && (
                <Badge variant="outline" className="ms-1 text-[10px]">
                  {selectedPrimaryIds.length}
                </Badge>
              )}
              <span className="text-muted-foreground font-normal text-[11px]">
                ({t(isRTL, 'يمكن اختيار أكثر من نشاط', 'multiple allowed')})
              </span>
            </Label>
            <div
              role="group"
              aria-label={t(isRTL, 'الأنشطة الرئيسية', 'Primary activities')}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {primaryOptions
                .filter((p) => selectedPrimaryIds.includes(p.id) || matchesFilter(p))
                .map((p) => {
                  const active = selectedPrimaryIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePrimary(p.id)}
                      aria-pressed={active}
                      className={
                        'group relative text-xs rounded-xl border px-3 py-2.5 transition-all hover-lift flex items-center gap-2 text-start ' +
                        (active
                          ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/30'
                          : 'bg-background hover:bg-muted hover:border-primary/40')
                      }
                    >
                      <span
                        className={
                          'shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md border transition-colors ' +
                          (active
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background border-border')
                        }
                        aria-hidden="true"
                      >
                        {active && <Check className="w-3 h-3" />}
                      </span>
                      <span className="truncate font-medium">{labelOf(p, isRTL)}</span>
                    </button>
                  );
                })}
              {q && primaryOptions.filter((p) => !selectedPrimaryIds.includes(p.id) && matchesFilter(p)).length === 0 && (
                <p className="col-span-full text-[11px] text-muted-foreground py-2">
                  {t(isRTL, 'لا نتائج مطابقة للبحث.', 'No matches for your search.')}
                </p>
              )}
            </div>
            {selectedPrimaryIds.length === 0 && (
              <p className="text-[11px] text-amber-600">
                {t(isRTL,
                  'اختر نشاطًا رئيسيًا واحدًا على الأقل.',
                  'Select at least one primary activity.',
                )}
              </p>
            )}
          </div>

          {/* Secondary activities — grouped per primary */}
          {selectedPrimaryIds.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {t(isRTL,
                  'اختر التخصصات الدقيقة لكل نشاط',
                  'Pick the detailed specialties for each activity',
                )}
                {value.secondaryActivityCategoryIds.length > 0 && (
                  <Badge variant="outline" className="ms-1 text-[10px]">
                    {value.secondaryActivityCategoryIds.length}
                  </Badge>
                )}
              </Label>
              {childrenQ.isLoading ? (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t(isRTL, 'جارٍ التحميل…', 'Loading…')}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPrimaryIds.map((pid) => {
                    const primary = primariesByIdMerged[pid];
                    const children = childrenByPrimary[pid] ?? [];
                    const isOpen = expanded[pid] ?? true;
                    const count = secondaryCountByPrimary[pid] ?? 0;
                    const empty = children.length === 0;
                    return (
                      <div
                        key={pid}
                        className="rounded-xl border border-border/60 bg-background/40"
                      >
                        <button
                          type="button"
                          onClick={() => setExpanded((s) => ({ ...s, [pid]: !isOpen }))}
                          aria-expanded={isOpen}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            {primary
                              ? labelOf(primary, isRTL)
                              : missingPrimariesQ.isLoading
                                ? t(isRTL, 'جارٍ التحميل…', 'Loading…')
                                : t(isRTL, 'نشاط محدد', 'Selected activity')}
                            {!empty && (
                              <Badge variant="secondary" className="text-[10px]">
                                {count} / {children.length}
                              </Badge>
                            )}
                            {empty && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {t(isRTL, 'لا فرعيات', 'no specialties')}
                              </span>
                            )}
                          </span>
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3">
                            {empty ? (
                              <p className="text-[11px] text-muted-foreground">
                                {t(isRTL,
                                  'لا توجد تخصصات مضافة لهذا النشاط حاليًا.',
                                  'No specialties available for this activity yet.',
                                )}
                              </p>
                            ) : (
                              <>
                                {(() => {
                                  const visible = children.filter(
                                    (c) => value.secondaryActivityCategoryIds.includes(c.id) || matchesFilter(c),
                                  );
                                  if (visible.length === 0) {
                                    return (
                                      <p className="text-[11px] text-muted-foreground">
                                        {t(isRTL, 'لا نتائج مطابقة للبحث.', 'No matches for your search.')}
                                      </p>
                                    );
                                  }
                                  return (
                                    <div className="flex flex-wrap gap-1.5">
                                      {visible.map((c) => {
                                        const active = value.secondaryActivityCategoryIds.includes(c.id);
                                        return (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleSecondary(c.id)}
                                            aria-pressed={active}
                                            className={
                                              'text-[11px] rounded-full border px-2.5 py-1 transition-all inline-flex items-center gap-1 ' +
                                              (active
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                : 'bg-background hover:bg-primary/5 hover:border-primary/40')
                                            }
                                          >
                                            {active && <Check className="w-2.5 h-2.5" />}
                                            {labelOf(c, isRTL)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                {primaryHasChildren(pid) && count === 0 && (
                                  <p className="text-[11px] text-amber-600 mt-2">
                                    {t(isRTL,
                                      'يفضّل اختيار تخصص واحد على الأقل لهذا النشاط.',
                                      'Pick at least one specialty for this activity.',
                                    )}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedPrimaryIds.length > 1 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => {
                          const allOpen = selectedPrimaryIds.every((id) => expanded[id] ?? true);
                          const next: Record<string, boolean> = {};
                          for (const id of selectedPrimaryIds) next[id] = !allOpen;
                          setExpanded(next);
                        }}
                      >
                        {t(isRTL, 'توسيع/طي الكل', 'Expand / collapse all')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MultiPrimaryTaxonomyPicker;