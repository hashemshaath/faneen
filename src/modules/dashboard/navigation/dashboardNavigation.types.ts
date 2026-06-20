import type React from 'react';

export type Bi = { ar: string; en: string };

export type DashboardNavBadge = { ar: string; en: string; tone?: 'new' | 'support' | 'neutral' };

export type DashboardNavSectionKey =
  | 'dashboard'
  | 'business'
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