import { useQuery } from '@tanstack/react-query';
import { fetchPublicHomeFaq, fetchAllHomeFaq } from '../services/homeFaq';
import type { HomeFaqItem } from '../types';
import { FAQ_ITEMS_BI } from '@/components/home/v2/sections/faqItems';

export const HOME_FAQ_PUBLIC_KEY = ['home', 'faq', 'public'] as const;
export const HOME_FAQ_ADMIN_KEY = ['home', 'faq', 'admin'] as const;

/**
 * Static fallback derived from faqItems.ts so the homepage and JSON-LD have
 * a safe source if the DB is empty or unreachable.
 */
export const HOME_FAQ_FALLBACK: HomeFaqItem[] = FAQ_ITEMS_BI.map((it, i) => ({
  id: `fallback-${i}`,
  sort_order: (i + 1) * 10,
  question_ar: it.qAr,
  answer_ar: it.aAr,
  question_en: it.qEn,
  answer_en: it.aEn,
  is_enabled: true,
}));

/** Public hook — returns DB items, or fallback if empty/error. */
export function useHomeFaq() {
  const q = useQuery<HomeFaqItem[]>({
    queryKey: HOME_FAQ_PUBLIC_KEY,
    queryFn: fetchPublicHomeFaq,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  const usingFallback = !q.data || q.data.length === 0 || !!q.error;
  const items = usingFallback ? HOME_FAQ_FALLBACK : q.data!;
  return { items, isLoading: q.isLoading, usingFallback };
}

/** Admin hook — full list. */
export function useAdminHomeFaq() {
  return useQuery<HomeFaqItem[]>({
    queryKey: HOME_FAQ_ADMIN_KEY,
    queryFn: fetchAllHomeFaq,
    staleTime: 30_000,
  });
}