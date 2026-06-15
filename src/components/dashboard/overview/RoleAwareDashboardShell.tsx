import React from 'react';
import { cn } from '@/lib/utils';
import {
  UnifiedDashboardHero,
  type UnifiedDashboardHeroProps,
} from './UnifiedDashboardHero';
import {
  DashboardActionCenter,
  type DashboardAction,
  type DashboardActionRole,
} from './DashboardActionCenter';

/**
 * Phase B2 — Role-aware Dashboard Shell.
 *
 * Pure presentational / composition layer for `/dashboard` overviews.
 * Renders, in order:
 *   1) UnifiedDashboardHero
 *   2) DashboardActionCenter (role-aware CTAs)
 *   3) `kpiSlot`   — host page renders the role-specific KPI grid here
 *   4) `children`  — host page renders the rest of the role-specific widgets
 *
 * Strict rules:
 *   - Does NOT fetch data, import Supabase, call services, run queries/mutations.
 *   - Does NOT change role routing, permissions, approval/visibility/readiness logic.
 *   - Does NOT render dialogs/popups.
 */
export interface RoleAwareDashboardShellProps {
  role: DashboardActionRole;
  hero: UnifiedDashboardHeroProps;
  actions?: ReadonlyArray<DashboardAction>;
  actionsTitle?: { ar: string; en: string };
  /** Slot rendered immediately after the action center (KPIs). */
  kpiSlot?: React.ReactNode;
  /** Anything else: state-driven cards, charts, lists. */
  children?: React.ReactNode;
  className?: string;
}

export const RoleAwareDashboardShell: React.FC<RoleAwareDashboardShellProps> = ({
  role,
  hero,
  actions,
  actionsTitle,
  kpiSlot,
  children,
  className,
}) => {
  return (
    <div
      className={cn('space-y-5', className)}
      data-testid="role-aware-dashboard-shell"
      data-role={role}
    >
      <UnifiedDashboardHero {...hero} />

      {actions && actions.length > 0 && (
        <DashboardActionCenter
          isRTL={hero.isRTL}
          role={role}
          actions={actions}
          title={actionsTitle}
        />
      )}

      {kpiSlot}

      {children}
    </div>
  );
};

RoleAwareDashboardShell.displayName = 'RoleAwareDashboardShell';

export type { DashboardAction, DashboardActionRole };