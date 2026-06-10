/**
 * Business Taxonomy section — multi-primary edition (Safe Batch 2).
 *
 * Rendered inside Business Edit so owners can pick their entity type,
 * multiple primary activities, and the detailed secondary activities for
 * each. Reads existing links from `business_taxonomy_categories` and writes
 * through the v2 RPC, which only replaces entity_type/primary_activity/
 * secondary_activity rows (other roles such as service/product_category
 * are preserved).
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Save, Loader2, Info, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

import {
  getBusinessTaxonomyCategories,
  setBusinessTaxonomyCategoriesV2,
} from '../business-services';
import {
  MultiPrimaryTaxonomyPicker,
  type MultiPrimaryTaxonomyValue,
} from './MultiPrimaryTaxonomyPicker';

interface Props {
  businessId: string;
  /** Optional: legacy sectors array (for fallback display + migration hint). */
  legacySectors?: string[] | null;
  /** Optional: legacy sub_services array (for fallback display). */
  legacySubServices?: string[] | null;
  onSaved?: () => void;
}

const t = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

export const BusinessTaxonomySection: React.FC<Props> = ({
  businessId, legacySectors, legacySubServices, onSaved,
}) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const linksQ = useQuery({
    queryKey: ['tx:business-links', businessId],
    queryFn: () => getBusinessTaxonomyCategories(businessId),
    enabled: !!businessId,
  });

  const [value, setValue] = useState<MultiPrimaryTaxonomyValue>({
    entityTypeCategoryId: null,
    primaryActivityCategoryIds: [],
    secondaryActivityCategoryIds: [],
  });

  // Hydrate from existing links — only the three managed roles are touched.
  useEffect(() => {
    if (!linksQ.data) return;
    const et = linksQ.data.find((l) => l.role === 'entity_type');
    const pa = linksQ.data
      .filter((l) => l.role === 'primary_activity')
      .map((l) => l.category_id);
    const sa = linksQ.data
      .filter((l) => l.role === 'secondary_activity')
      .map((l) => l.category_id);
    setValue({
      entityTypeCategoryId: et?.category_id ?? null,
      primaryActivityCategoryIds: pa,
      secondaryActivityCategoryIds: sa,
    });
  }, [linksQ.data]);

  const mutation = useMutation({
    mutationFn: () => setBusinessTaxonomyCategoriesV2(businessId, {
      entityTypeCategoryId: value.entityTypeCategoryId,
      primaryActivityCategoryIds: value.primaryActivityCategoryIds,
      secondaryActivityCategoryIds: value.secondaryActivityCategoryIds,
    }),
    onSuccess: () => {
      toast.success(t(isRTL, 'تم حفظ التصنيف', 'Taxonomy saved'));
      qc.invalidateQueries({ queryKey: ['tx:business-links', businessId] });
      qc.invalidateQueries({ queryKey: ['business-taxonomy-display-batch'] });
      qc.invalidateQueries({ queryKey: ['business-taxonomy-presence-batch'] });
      qc.invalidateQueries({ queryKey: ['search-taxonomy-context'] });
      onSaved?.();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t(isRTL, 'تعذّر حفظ التصنيف', 'Failed to save taxonomy') + `: ${msg}`);
    },
  });

  const isLoading = linksQ.isLoading;
  const hasNewLinks = (linksQ.data?.length ?? 0) > 0;
  const hasLegacy =
    (legacySectors?.length ?? 0) > 0 || (legacySubServices?.length ?? 0) > 0;
  const missingPrimary = value.primaryActivityCategoryIds.length === 0;

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
          <MultiPrimaryTaxonomyPicker value={value} onChange={setValue} />
        )}

        {missingPrimary && !isLoading && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
            <span>
              {t(isRTL,
                'لم يتم اختيار أي نشاط رئيسي. لن تظهر منشأتك في القطاعات حتى يتم اختيار نشاط واحد على الأقل.',
                'No primary activity selected. Your business will not appear in sectors until at least one is chosen.',
              )}
            </span>
          </div>
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