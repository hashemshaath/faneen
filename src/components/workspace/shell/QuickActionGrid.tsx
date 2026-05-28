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
import {
  buildContextualActions,
  filterContextualActions,
  groupContextualActions,
} from '@/modules/workspace/shell/contextualQuickActions';
import { detectModuleFromPath, detectRefFromUrl } from '@/hooks/useWorkspaceContext';

export interface QuickActionGridProps {
  className?: string;
}

const QuickActionGridImpl: React.FC<QuickActionGridProps> = ({ className }) => {
  const { isRTL } = useLanguage();
  const { isAdmin, isSuperAdmin, isProvider } = useAuth();
  const matrix = usePermissionMatrix();
  const { pathname, search } = useLocation();

  const audience: QuickActionAudience = (isAdmin || isSuperAdmin) ? 'admin' : isProvider ? 'provider' : 'user';

  const actions = useMemo(
    () => filterQuickActions(QUICK_ACTIONS, {
      audience,
      hasPermission: (p) => matrix.can(p),
      pathname,
    }),
    [audience, matrix, pathname],
  );

  // APP-SHELL-2 — contextual actions for current module/ref.
  const contextual = useMemo(() => {
    const module = detectModuleFromPath(pathname);
    const ref = detectRefFromUrl(pathname, search);
    const all = buildContextualActions({ module, ref });
    const filtered = filterContextualActions(all, {
      audience,
      hasPermission: (p) => matrix.can(p),
    });
    return groupContextualActions(filtered);
  }, [pathname, search, audience, matrix]);

  const hasContextual = contextual.primary.length + contextual.related.length + contextual.tools.length > 0;

  if (actions.length === 0 && !hasContextual) return null;

  const Icon = (name: string) =>
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    (Icons.Square as unknown as React.ComponentType<{ className?: string }>);

  return (
    <div data-testid="quick-action-grid" className={`flex flex-col gap-2 ${className ?? ''}`}>
      {hasContextual && (
        <div className="space-y-1.5" data-testid="quick-action-contextual">
          {(['primary', 'related', 'tools'] as const).map((g) => {
            const list = contextual[g];
            if (list.length === 0) return null;
            return (
              <div key={g} className="flex flex-wrap gap-1.5" data-action-group={g}>
                {list.map((a) => {
                  const I = Icon(a.icon);
                  return (
                    <Link
                      key={a.id}
                      to={a.to}
                      data-action-id={a.id}
                      data-action-group={g}
                      className="hover-lift inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/80 px-2.5 py-1.5 text-[11px] font-medium hover:border-border/60 hover:bg-muted/40 transition-colors min-h-[36px]"
                    >
                      <I className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{isRTL ? a.label.ar : a.label.en}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      {actions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {actions.map((a) => {
            const I = Icon(a.icon);
            return (
              <Link
                key={a.id}
                to={a.to}
                data-action-id={a.id}
                className="hover-lift flex items-center gap-2 rounded-xl border border-border/30 bg-card px-3 py-2.5 text-xs font-medium hover:border-border/60 hover:bg-muted/40 transition-colors min-h-[44px]"
              >
                <I className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{isRTL ? a.label.ar : a.label.en}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const QuickActionGrid = React.memo(QuickActionGridImpl);
QuickActionGrid.displayName = 'QuickActionGrid';
export default QuickActionGrid;