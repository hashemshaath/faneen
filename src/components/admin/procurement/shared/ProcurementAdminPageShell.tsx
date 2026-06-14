/**
 * Presentational shell for admin procurement/RFQ pages.
 *
 * Pure UI — no Supabase, no queries, no mutations. Wraps the page in
 * the canonical DashboardLayout and lays out the named slots:
 * header (title + description + actions), stats, filters, content.
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { cn } from '@/lib/utils';

export interface ProcurementAdminPageShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actionsSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ProcurementAdminPageShell: React.FC<ProcurementAdminPageShellProps> = ({
  title,
  description,
  icon: Icon,
  actionsSlot,
  statsSlot,
  filtersSlot,
  children,
  className,
}) => {
  return (
    <DashboardLayout>
      <div
        className={cn('space-y-5', className)}
        data-testid="procurement-admin-page-shell"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              {Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            ) : null}
          </div>
          {actionsSlot ? <div className="flex items-center gap-2">{actionsSlot}</div> : null}
        </header>

        {statsSlot ? <section aria-label="stats">{statsSlot}</section> : null}
        {filtersSlot ? <section aria-label="filters">{filtersSlot}</section> : null}
        <section aria-label="content">{children}</section>
      </div>
    </DashboardLayout>
  );
};

export default ProcurementAdminPageShell;