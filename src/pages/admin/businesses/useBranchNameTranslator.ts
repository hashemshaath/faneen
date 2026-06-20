/**
 * Hook that wires the bilingual branch-name translation flow to the
 * existing AI tools edge function. Extracted from `AdminBusinesses.tsx`
 * as a behavior-preserving refactor — same toasts, same source/target
 * resolution, same error path.
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { pickBi } from '@/components/common/Bilingual';
import { invokeBlogAiTools } from '@/modules/ai';

export interface BranchNameLike {
  name_ar: string;
  name_en: string;
}

export type BranchTranslateDirection = 'ar' | 'en';

export interface UseBranchNameTranslator {
  branchTranslating: BranchTranslateDirection | null;
  translateBranchName: (from: BranchTranslateDirection) => Promise<void>;
}

export function useBranchNameTranslator<TForm extends BranchNameLike | null>(
  branchForm: TForm,
  setBranchForm: (
    updater: (f: TForm) => TForm,
  ) => void,
): UseBranchNameTranslator {
  const { isRTL } = useLanguage();
  const [branchTranslating, setBranchTranslating] =
    useState<BranchTranslateDirection | null>(null);

  const translateBranchName = useCallback(
    async (from: BranchTranslateDirection) => {
      const text = ((from === 'ar' ? branchForm?.name_ar : branchForm?.name_en) || '').trim();
      if (!text) {
        toast.info(pickBi(isRTL, 'لا يوجد نص لترجمته', 'Nothing to translate'));
        return;
      }
      setBranchTranslating(from);
      try {
        const { data, error } = await invokeBlogAiTools({
          action: 'translate',
          text,
          sourceLang: from,
          targetLang: from === 'ar' ? 'en' : 'ar',
        });
        if (error) throw error;
        const result = ((data as { result?: string } | null)?.result || '').trim();
        if (!result) throw new Error('Empty translation');
        setBranchForm((f) =>
          f
            ? ({
                ...f,
                ...(from === 'ar' ? { name_en: result } : { name_ar: result }),
              } as TForm)
            : f,
        );
        toast.success(pickBi(isRTL, 'تمت الترجمة', 'Translated'));
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : pickBi(isRTL, 'فشلت الترجمة', 'Translation failed'),
        );
      } finally {
        setBranchTranslating(null);
      }
    },
    [branchForm, isRTL, setBranchForm],
  );

  return { branchTranslating, translateBranchName };
}