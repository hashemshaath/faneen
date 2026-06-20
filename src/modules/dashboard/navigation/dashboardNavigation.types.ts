import type React from 'react';

export type Bi = { ar: string; en: string };

export type DashboardNavBadge = { ar: string; en: string; tone?: 'new' | 'support' | 'neutral' };

export type DashboardNavSectionKey =
  | 'dashboard'
  | 'business'
  | 'businessEntity'
  | 'providerOps'
  | 'operations'
  | 'rentals'
  | 'billing'
  | 'communication'
  | 'account'
  | 'admin';

export interface DashboardNavItem {
  label: Bi;
  url: string;
  icon: React.ElementType;
  end?: boolean;
  superAdminOnly?: boolean;
  /**
   * When true, the item is hidden for users who do not yet own/manage
   * a business entity. Use only for items that genuinely require an
   * entity context (branches, business profile, team, visibility, etc.).
   * Personal-work items (sites, projects, contracts, my-requests) must
   * NOT set this flag.
   */
  requiresBusiness?: boolean;
  badge?: DashboardNavBadge;
}

export interface DashboardNavGroup {
  key: DashboardNavSectionKey | string;
  groupLabel: Bi;
  icon: React.ElementType;
  description?: Bi;
  items: DashboardNavItem[];
}

export type DashboardAudience = 'user' | 'provider' | 'admin';

export interface DashboardNavContext {
  audience: DashboardAudience;
  hasBusiness: boolean;
  isSuperAdmin: boolean;
}