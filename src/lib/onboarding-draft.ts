/**
 * Onboarding draft utilities — local resume + remote sync.
 * Local first (instant), remote sync best-effort to profiles.onboarding_draft.
 * Per memory: use `qitaat_*` localStorage keys, plain JSON, never `any`.
 */
import type { Json } from '@/integrations/supabase/types';
import { updateProfile, getProfileByUserId } from '@/modules/users';

const LOCAL_KEY = 'qitaat_onboarding_draft_v1';

export interface OnboardingDraft {
  step?: string;
  accountType?: 'individual' | 'business';
  fullName?: string;
  phone?: string;
  countryCode?: string;
  businessName?: string;
  username?: string;
  sectors?: string[];
  subServices?: string[];
  city?: string;
  description?: string;
  /** ISO timestamp set by save(). */
  updatedAt?: string;
}

function safeRead(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as OnboardingDraft) : {};
  } catch {
    return {};
  }
}

export function readDraft(): OnboardingDraft {
  return safeRead();
}

export function saveDraft(patch: Partial<OnboardingDraft>): OnboardingDraft {
  const next: OnboardingDraft = {
    ...safeRead(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — silent
  }
  return next;
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* noop */
  }
}

/** Best-effort remote sync. Failure is non-blocking. */
export async function syncDraftToServer(userId: string): Promise<void> {
  const draft = safeRead();
  if (!Object.keys(draft).length) return;
  try {
    await updateProfile({
      userId,
      values: { onboarding_draft: draft as unknown as Json },
    });
  } catch {
    /* swallow — local copy is the source of truth */
  }
}

/** Pull remote draft on resume; merges with local if both exist. */
export async function pullRemoteDraft(userId: string): Promise<OnboardingDraft> {
  try {
    const { data } = await getProfileByUserId<{ onboarding_draft: OnboardingDraft | null }>({
      userId,
      select: 'onboarding_draft',
    });
    const remote = (data?.onboarding_draft ?? {}) as OnboardingDraft;
    const local = safeRead();
    // Prefer the most recently updated source
    if (
      remote.updatedAt &&
      (!local.updatedAt || new Date(remote.updatedAt) > new Date(local.updatedAt))
    ) {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
      } catch {
        /* noop */
      }
      return remote;
    }
    return local;
  } catch {
    return safeRead();
  }
}