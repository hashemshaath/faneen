/**
 * Audience + business presence is the only nav-level gating done here.
 * Per-route authorization remains delegated to
 * `canViewWorkspaceRoute()` and RLS (server is authoritative).
 */
import {
  adminNavGroups,
  providerNavGroups,
  userNavGroups,
} from './dashboardNavigation.config';
import type { DashboardNavContext, DashboardNavGroup } from './dashboardNavigation.types';

/**
 * Returns the base group list for the audience.
 *
 * Personal-workspace model: an individual user without a business still
 * sees the «أعمال» group (sites, projects, contracts, my-requests).
 * The «أعمال المنشأة» group and every item flagged `requiresBusiness`
 * are hidden until the user owns/manages a business entity.
 */
export function getVisibleDashboardNavGroups(ctx: DashboardNavContext): DashboardNavGroup[] {
  if (ctx.audience === 'admin') return adminNavGroups;
  if (ctx.audience === 'provider') return providerNavGroups;
  if (ctx.hasBusiness) return userNavGroups;
  // Individual without a business: strip items that genuinely need an
  // entity context, then drop any group that becomes empty.
  return userNavGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.requiresBusiness) }))
    .filter((g) => g.items.length > 0);
}