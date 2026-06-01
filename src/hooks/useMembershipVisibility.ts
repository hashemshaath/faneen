/**
 * MEMBERSHIP-PAGE-GOVERNANCE-REDESIGN-1
 *
 * Centralized membership-module visibility helper. Wraps the existing
 * `useVisibleModules()` hook (admin-controlled module catalog) and exposes
 * a small ergonomic API for every membership CTA / route guard in the app
 * so the governance rule lives in exactly one place:
 *
 *   - canShowMembershipPage  — true unless admin disabled the
 *                              `memberships` module for this viewer.
 *   - shouldShowUpgradeCTA   — same as above (kept as a semantic alias
 *                              for upgrade banners / service callouts).
 *   - membershipPathOrNull   — the resolved CTA target (`/membership`) or
 *                              `null` when the module is hidden, so
 *                              callers can branch instead of rendering
 *                              a dead link.
 *   - unavailableMessage     — bilingual short label suitable for inline
 *                              fallback ("العضويات غير متاحة حاليًا").
 *   - isAdminBypass          — admins always retain access to manage
 *                              memberships from `/admin/*` regardless of
 *                              the public visibility flag.
 *
 * NOT an authorization boundary — RLS + admin RPCs remain the source of
 * truth for who can change subscriptions. This hook only governs UI
 * surfaces: which CTAs render, which routes show a public unavailable
 * state, and whether to swap an upgrade link for a safe fallback.
 */
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibleModules } from '@/hooks/useVisibleModules';

export interface MembershipVisibility {
  canShowMembershipPage: boolean;
  shouldShowUpgradeCTA: boolean;
  membershipPathOrNull: string | null;
  unavailableMessage: { ar: string; en: string };
  isLoading: boolean;
  isAdminBypass: boolean;
}

export const MEMBERSHIP_ROUTE = '/membership';

export function useMembershipVisibility(): MembershipVisibility {
  const { isAdmin } = useAuth();
  const { isRouteHidden, isLoading } = useVisibleModules();

  return useMemo(() => {
    const hidden = isRouteHidden(MEMBERSHIP_ROUTE);
    // Admins can always reach the public page and manage memberships.
    const visible = !hidden || isAdmin;
    return {
      canShowMembershipPage: visible,
      shouldShowUpgradeCTA: visible,
      membershipPathOrNull: visible ? MEMBERSHIP_ROUTE : null,
      unavailableMessage: {
        ar: 'العضويات غير متاحة حاليًا',
        en: 'Memberships are currently unavailable',
      },
      isLoading,
      isAdminBypass: isAdmin && hidden,
    };
  }, [isRouteHidden, isAdmin, isLoading]);
}

export default useMembershipVisibility;