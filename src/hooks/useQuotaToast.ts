import { useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  isQuotaExceededError,
  getQuotaExceededMetric,
  formatQuotaExceededMessage,
  getQuotaUpgradeHint,
} from '@/lib/quotaErrors';

/**
 * M2 — wire a mutation `onError` handler through this hook so every
 * `quota_exceeded:<metric>` server error surfaces as one consistent
 * friendly sonner toast with an upgrade hint instead of a raw
 * `permission denied` line.
 *
 * Returns a function that returns `true` when the error was handled;
 * callers should skip their generic error toast in that case.
 */
export function useQuotaToast() {
  const { isRTL } = useLanguage();
  return useCallback(
    (error: unknown): boolean => {
      if (!isQuotaExceededError(error)) return false;
      const metric = getQuotaExceededMetric(error);
      toast.error(formatQuotaExceededMessage(metric, isRTL), {
        description: getQuotaUpgradeHint(isRTL),
      });
      return true;
    },
    [isRTL],
  );
}