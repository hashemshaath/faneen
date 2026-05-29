/**
 * ORG-RBAC-STRUCTURE-2 — Phase H (subset)
 *
 * "Acting as" banner for delegated workspace access. The delegated-access
 * table does not exist yet (Phase A / Step 4), so this component renders
 * only when the caller explicitly passes a `delegation` prop. Wiring to a
 * live `delegated_workspace_access` context is intentionally deferred.
 *
 * Renders no raw UUIDs — the banner shows display name + expiry only.
 */
import React from 'react';
import { UserCog } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';

export interface ActingAsDelegation {
  /** Display label for the delegating user (never raw UUID). */
  delegated_by_label: string;
  /** ISO-8601 expiry timestamp. */
  expires_at: string;
}

export interface ActingAsBannerProps {
  delegation?: ActingAsDelegation | null;
  className?: string;
}

function formatExpiry(iso: string, locale: 'ar' | 'en'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export const ActingAsBanner: React.FC<ActingAsBannerProps> = ({ delegation, className }) => {
  const bi = useBi();
  if (!delegation) return null;
  const ar = `أنت تعمل بالنيابة عن ${delegation.delegated_by_label} حتى ${formatExpiry(delegation.expires_at, 'ar')}`;
  const en = `You are acting on behalf of ${delegation.delegated_by_label} until ${formatExpiry(delegation.expires_at, 'en')}`;
  return (
    <div
      role="status"
      data-testid="workspace-acting-as-banner"
      className={
        'flex items-center gap-2 rounded-xl border border-violet-500/30 ' +
        'bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-900 dark:text-violet-200 ' +
        (className ?? '')
      }
    >
      <UserCog className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{bi(ar, en)}</span>
    </div>
  );
};

export default ActingAsBanner;