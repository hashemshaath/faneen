/**
 * Auto-create a draft business for business/company accounts — exactly once
 * per session per user. Uses two layers of deduplication:
 *
 *  1. Module-level in-flight Promise map (cancels concurrent callers in the
 *     same tab — covers React StrictMode double-invoke and parallel queries).
 *  2. `sessionStorage` flag (skips the round-trip entirely on subsequent
 *     navigations within the same browser tab).
 *
 * The DB trigger `handle_new_user` already creates the business at signup,
 * so this client-side path is a safety-net only and should rarely fire.
 */
import { supabase } from '@/integrations/supabase/client';

export interface EnsuredBusiness {
  id: string;
  ref_id: string | null;
  membership_tier: string;
  name_ar: string | null;
  name_en: string | null;
  approval_status: string | null;
  onboarding_completion: number | null;
}

const inFlight = new Map<string, Promise<EnsuredBusiness | null>>();

function flagKey(userId: string) {
  return `qitaat_ensure_biz_${userId}_v1`;
}

export function resetEnsureBusinessCache(userId?: string) {
  if (userId) {
    inFlight.delete(userId);
    try { sessionStorage.removeItem(flagKey(userId)); } catch { /* noop */ }
  } else {
    inFlight.clear();
  }
}

export function ensureDraftBusiness(
  userId: string,
  fullName: string | null | undefined,
  isRTL: boolean,
): Promise<EnsuredBusiness | null> {
  // Layer 2 — already attempted in this tab session: skip the work.
  try {
    if (sessionStorage.getItem(flagKey(userId)) === '1') return Promise.resolve(null);
  } catch { /* sessionStorage may be unavailable */ }

  // Layer 1 — same call already in progress: reuse the Promise.
  const existing = inFlight.get(userId);
  if (existing) return existing;

  const promise = (async (): Promise<EnsuredBusiness | null> => {
    const placeholderUsername = 'biz-' + userId.replace(/-/g, '').slice(0, 12);
    const placeholderName =
      (fullName && fullName.trim()) || (isRTL ? 'منشأة' : 'Business');
    const { data } = await supabase
      .from('businesses')
      .insert({
        user_id: userId,
        name_ar: placeholderName,
        username: placeholderUsername,
        approval_status: 'draft',
        username_status: 'pending',
      })
      .select('id, ref_id, membership_tier, name_ar, name_en, approval_status, onboarding_completion')
      .maybeSingle();
    return (data as EnsuredBusiness | null) ?? null;
  })()
    .catch(() => null)
    .finally(() => {
      inFlight.delete(userId);
      try { sessionStorage.setItem(flagKey(userId), '1'); } catch { /* noop */ }
    });

  inFlight.set(userId, promise);
  return promise;
}