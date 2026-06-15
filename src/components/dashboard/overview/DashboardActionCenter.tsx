import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Phase B2 — Role-aware Action Center.
 *
 * Presentational only. Receives the role + a flat list of actions and renders
 * a unified card with a header + a small grid of CTA tiles. The host page is
 * responsible for choosing which actions to pass in (based on account type,
 * role, permissions, readiness, etc.). This component does NOT:
 *   - fetch data
 *   - import Supabase / services
 *   - run queries or mutations
 *   - mutate role routing or permissions
 */

export type DashboardActionRole = 'user' | 'provider' | 'admin';

export interface DashboardAction {
  id: string;
  label: { ar: string; en: string };
  description?: { ar: string; en: string };
  to: string;
  icon: LucideIcon;
  /** Highlights the primary action (only one expected). */
  primary?: boolean;
  /** Open in a new tab (e.g., public page links). */
  external?: boolean;
}

export interface DashboardActionCenterProps {
  isRTL: boolean;
  role: DashboardActionRole;
  actions: ReadonlyArray<DashboardAction>;
  /** Optional override for the section title. */
  title?: { ar: string; en: string };
  className?: string;
}

const ROLE_TITLE: Record<DashboardActionRole, { ar: string; en: string }> = {
  user: { ar: 'ابدأ من هنا', en: 'Start here' },
  provider: { ar: 'أهم خطواتك الآن', en: 'Your next steps' },
  admin: { ar: 'مهام اليوم', en: 'Today\'s focus' },
};

export const DashboardActionCenter: React.FC<DashboardActionCenterProps> = ({
  isRTL,
  role,
  actions,
  title,
  className,
}) => {
  if (!actions || actions.length === 0) return null;

  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const heading = title ?? ROLE_TITLE[role];

  return (
    <Card
      className={cn('border-border/60 bg-card', className)}
      data-testid={`dashboard-action-center-${role}`}
      data-role={role}
      aria-label={isRTL ? heading.ar : heading.en}
    >
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          {isRTL ? heading.ar : heading.en}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            const label = isRTL ? a.label.ar : a.label.en;
            const desc = a.description
              ? (isRTL ? a.description.ar : a.description.en)
              : null;
            const tileClass = cn(
              'group flex items-center gap-3 rounded-xl border p-3 text-start transition-colors min-h-[56px]',
              a.primary
                ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                : 'border-border/50 bg-muted/30 hover:bg-muted/50',
            );
            const inner = (
              <>
                <span
                  className={cn(
                    'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                    a.primary
                      ? 'bg-primary/15 text-primary'
                      : 'bg-background text-foreground/80 border border-border/50',
                  )}
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground truncate">
                    {label}
                  </span>
                  {desc && (
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {desc}
                    </span>
                  )}
                </span>
                <Arrow
                  className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors"
                  aria-hidden="true"
                />
              </>
            );
            if (a.external) {
              return (
                <a
                  key={a.id}
                  href={a.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={tileClass}
                  data-action-id={a.id}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={a.id} to={a.to} className={tileClass} data-action-id={a.id}>
                {inner}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

DashboardActionCenter.displayName = 'DashboardActionCenter';