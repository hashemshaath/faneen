/**
 * Phase 3 — Business Taxonomy section.
 *
 * Rendered inside the Business Edit and Onboarding pages so owners can pick
 * their entity type, primary activity, and secondary activities (specialties)
 * from the central taxonomy without breaking the legacy `sectors` /
 * `sub_services` fields.
 *
 * - All writes go through the RPC `set_business_taxonomy_categories`.
 * - Legacy fields stay untouched; if no new selection exists yet we show a
 *   hint encouraging the owner to migrate.
 * - TODO(phase-5): remove legacy sectors/sub_services fields once Phase 4
 *   (search, matching, showcase) migrates to taxonomy.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Save, Loader2, Search, Tag, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  getBusinessTaxonomyCategories,
  setBusinessTaxonomyCategories,
} from '../business-services';
import type { TaxonomyCategory } from '../types';

interface Props {
  businessId: string;
  /** Optional: legacy sectors array (for fallback display + migration hint). */
  legacySectors?: string[] | null;
  /** Optional: legacy sub_services array (for fallback display). */
  legacySubServices?: string[] | null;
  onSaved?: () => void;
}

const t = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

function name(cat: TaxonomyCategory, isRTL: boolean): string {
  if (isRTL) return cat.name_ar || cat.name_en || cat.slug;
  return cat.name_en || cat.name_ar || cat.slug;
}

export const BusinessTaxonomySection: React.FC<Props> = ({
  businessId, legacySectors, legacySubServices, onSaved,
}) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const entityTypesQ = useQuery({
    queryKey: ['tx:entity-types'],
    queryFn: getRegistrationEntityTypes,
    staleTime: 5 * 60 * 1000,
  });
  const primariesQ = useQuery({
    queryKey: ['tx:primary-activities'],
    queryFn: getRegistrationPrimaryActivities,
    staleTime: 5 * 60 * 1000,
  });
  const linksQ = useQuery({
    queryKey: ['tx:business-links', businessId],
    queryFn: () => getBusinessTaxonomyCategories(businessId),
    enabled: !!businessId,
  });

  const [entityTypeId, setEntityTypeId] = useState<string | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [secondaryIds, setSecondaryIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Hydrate state from existing links once they load.
  useEffect(() => {
    if (!linksQ.data) return;
    const et = linksQ.data.find(l => l.role === 'entity_type');
    const pa = linksQ.data.find(l => l.role === 'primary_activity');
    const sa = linksQ.data.filter(l => l.role === 'secondary_activity').map(l => l.category_id);
    setEntityTypeId(et?.category_id ?? null);
    setPrimaryId(pa?.category_id ?? null);
    setSecondaryIds(sa);
  }, [linksQ.data]);

  const childrenQ = useQuery({
    queryKey: ['tx:children', primaryId],
    queryFn: () => (primaryId ? getChildCategories(primaryId) : Promise.resolve([])),
    enabled: !!primaryId,
  });

  // Drop secondary selections that no longer belong to the new primary.
  useEffect(() => {
    if (!primaryId || !childrenQ.data) return;
    const allowed = new Set(childrenQ.data.map(c => c.id));
    setSecondaryIds(prev => prev.filter(id => allowed.has(id)));
  }, [primaryId, childrenQ.data]);

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

  const mutation = useMutation({
    mutationFn: () => setBusinessTaxonomyCategories(businessId, {
      entityTypeCategoryId: entityTypeId,
      primaryActivityCategoryId: primaryId,
      secondaryActivityCategoryIds: secondaryIds,
    }),
    onSuccess: () => {
      toast.success(t(isRTL, 'تم حفظ التصنيف', 'Taxonomy saved'));
      qc.invalidateQueries({ queryKey: ['tx:business-links', businessId] });
      onSaved?.();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t(isRTL, 'تعذّر حفظ التصنيف', 'Failed to save taxonomy') + `: ${msg}`);
    },
  });

  const isLoading = entityTypesQ.isLoading || primariesQ.isLoading || linksQ.isLoading;
  const hasNewLinks = (linksQ.data?.length ?? 0) > 0;
  const hasLegacy =
    (legacySectors?.length ?? 0) > 0 || (legacySubServices?.length ?? 0) > 0;

  const toggleSecondary = (id: string) => {
    setSecondaryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="w-4 h-4 text-primary" />
          {t(isRTL, 'التصنيف والنشاط (التصنيفات المركزية)', 'Classification & Activity (Central Taxonomy)')}
          <Badge variant="secondary" className="ms-2 text-[10px]">Beta</Badge>
        </CardTitle>
        <CardDescription>
          {t(isRTL,
            'حدّث تصنيف منشأتك حتى تظهر في البحث والطلبات المناسبة بشكل أدق. هذه الحقول لا تستبدل القطاعات القديمة الآن.',
            'Update your business classification to appear in more relevant searches and requests. These fields do not replace the legacy sectors yet.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasNewLinks && hasLegacy && (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs flex gap-2 items-start">
            <Info className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
            <span>
              {t(isRTL,
                'لم يتم اختيار تصنيفات مركزية بعد. القيم القديمة لا تزال مستخدمة في البحث. اختر التصنيف الجديد لتحسين ظهور منشأتك في قطاعات.',
                'No central taxonomy selected yet. Your legacy sectors are still used for search. Pick the new classification to improve discovery on Qitaat.',
              )}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t(isRTL, 'جارٍ تحميل التصنيفات…', 'Loading taxonomy…')}
          </div>
        ) : (
          <>
            {/* Entity type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {t(isRTL, 'نوع الجهة', 'Entity type')}
              </Label>
              <Select
                value={entityTypeId ?? ''}
                onValueChange={(v) => setEntityTypeId(v || null)}
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
              <p className="text-[11px] text-muted-foreground">
                {t(isRTL,
                  'يساعدنا هذا على تخصيص تجربة المنصة حسب طبيعة منشأتك.',
                  'Helps us tailor the platform experience to your business nature.',
                )}
              </p>
            </div>

            {/* Primary activity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {t(isRTL, 'النشاط الرئيسي', 'Primary activity')}
              </Label>
              <Select
                value={primaryId ?? ''}
                onValueChange={(v) => setPrimaryId(v || null)}
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
              <p className="text-[11px] text-muted-foreground">
                {t(isRTL,
                  'اختر النشاط الذي يعبّر عن المجال الأساسي لمنشأتك.',
                  'Pick the activity that best represents your main field.',
                )}
              </p>
            </div>

            {/* Secondary activities */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {t(isRTL, 'التخصصات', 'Specialties')}
                {secondaryIds.length > 0 && (
                  <Badge variant="outline" className="ms-1 text-[10px]">{secondaryIds.length}</Badge>
                )}
              </Label>
              {!primaryId ? (
                <p className="text-xs text-muted-foreground py-2">
                  {t(isRTL,
                    'اختر النشاط الرئيسي أولًا لعرض التخصصات.',
                    'Pick a primary activity first to see specialties.',
                  )}
                </p>
              ) : childrenQ.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t(isRTL, 'جارٍ التحميل…', 'Loading…')}
                </div>
              ) : (childrenQ.data?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {t(isRTL,
                    'لا توجد تخصصات فرعية مضافة لهذا النشاط حاليًا. يمكنك المتابعة وتعديلها لاحقًا.',
                    'No sub-specialties available for this activity yet. You can continue and edit later.',
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
                      const active = secondaryIds.includes(c.id);
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
                      <p className="text-xs text-muted-foreground">
                        {t(isRTL, 'لا نتائج', 'No matches')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isLoading}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t(isRTL, 'حفظ التصنيف', 'Save taxonomy')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessTaxonomySection;