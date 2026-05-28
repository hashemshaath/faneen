/**
 * APP-SHELL-REARCHITECTURE-1 — Adaptive quick-action grid.
 *
 * Filters the static QUICK_ACTIONS registry by audience, permission,
 * and current pathname. Renders a responsive 2/3/4 column grid.
 */
import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionMatrix } from '@/hooks/useVisibilityEngine';
import { QUICK_ACTIONS, filterQuickActions, type QuickActionAudience } from '@/modules/workspace/shell/quickActions';

export interface QuickActionGridProps {
  className?: string;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ className }) => {
  const { isRTL } = useLanguage();
  const { isAdmin, isSuperAdmin, isProvider } = useAuth();
  const matrix = usePermissionMatrix();
  const { pathname } = useLocation();

  const audience: QuickActionAudience = (isAdmin || isSuperAdmin) ? 'admin' : isProvider ? 'provider' : 'user';

  const actions = useMemo(
    () => filterQuickActions(QUICK_ACTIONS, {
      audience,
      hasPermission: (p) => matrix.can(p),
      pathname,
    }),
    [audience, matrix, pathname],
  );

  if (actions.length === 0) return null;

  return (
    <div
      data-testid="quick-action-grid"
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${className ?? ''}`}
    >
      {actions.map((a) => {
        const Icon =
          (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[a.icon] ??
          (Icons.Square as unknown as React.ComponentType<{ className?: string }>);
        return (
          <Link
            key={a.id}
            to={a.to}
            data-action-id={a.id}
            className="hover-lift flex items-center gap-2 rounded-xl border border-border/30 bg-card px-3 py-2.5 text-xs font-medium hover:border-border/60 hover:bg-muted/40 transition-colors min-h-[44px]"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{isRTL ? a.label.ar : a.label.en}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default QuickActionGrid;