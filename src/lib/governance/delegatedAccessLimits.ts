/**
 * ORG-RBAC-STRUCTURE-5 — UI-side validation helpers for delegated workspace
 * access. Mirrors (without enforcing) the DB-side constraint that delegated
 * access has a maximum 30-day duration. RLS + DB triggers remain
 * authoritative.
 */
export const DELEGATED_ACCESS_MAX_DAYS = 30;
export const DELEGATED_ACCESS_REASON_MIN = 5;
export const DELEGATED_ACCESS_REASON_MAX = 500;

export interface DelegatedAccessDraft {
  starts_at: string; // ISO
  expires_at: string; // ISO
  reason: string;
}

export interface DelegatedAccessValidationResult {
  ok: boolean;
  errors: {
    reason?: 'too_short' | 'too_long';
    expires_at?: 'before_start' | 'exceeds_max_duration';
  };
}

export function validateDelegatedAccessDraft(
  draft: DelegatedAccessDraft,
): DelegatedAccessValidationResult {
  const errors: DelegatedAccessValidationResult['errors'] = {};
  const reason = (draft.reason ?? '').trim();
  if (reason.length < DELEGATED_ACCESS_REASON_MIN) errors.reason = 'too_short';
  else if (reason.length > DELEGATED_ACCESS_REASON_MAX) errors.reason = 'too_long';

  const start = Date.parse(draft.starts_at);
  const end = Date.parse(draft.expires_at);
  if (Number.isFinite(start) && Number.isFinite(end)) {
    if (end <= start) {
      errors.expires_at = 'before_start';
    } else {
      const days = (end - start) / (1000 * 60 * 60 * 24);
      if (days > DELEGATED_ACCESS_MAX_DAYS) errors.expires_at = 'exceeds_max_duration';
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}