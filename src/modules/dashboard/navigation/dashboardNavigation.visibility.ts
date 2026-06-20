/**
 * Audience + business presence is the only nav-level gating done here.
 * Per-route authorization remains delegated to
 * `canViewWorkspaceRoute()` and RLS (server is authoritative).
 */
import { UNIFIED_GROUP_LABELS } from './dashboardNavigation.labels';
import {
  adminNavGroups,
  providerNavGroups,
  userNavGroups,
} from './dashboardNavigation.config';
import type { DashboardNavContext, DashboardNavGroup } from './dashboardNavigation.types';

/**
 * Returns the base group list for the audience, with the «المنشأة» group
 * dropped for users who have not created a business yet (they get the
 * /register-entity CTA instead).
 */
export function getVisibleDashboardNavGroups(ctx: DashboardNavContext): DashboardNavGroup[] {
  if (ctx.audience === 'admin') return adminNavGroups;
  if (ctx.audience === 'provider') return providerNavGroups;
  if (!ctx.hasBusiness) {
    return userNavGroups.filter(
      (g) => g.groupLabel.en !== UNIFIED_GROUP_LABELS.business.en,
    );
  }
  return userNavGroups;
}