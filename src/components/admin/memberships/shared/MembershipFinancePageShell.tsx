/**
 * Shared presentational page shell for admin memberships / finance pages.
 * Pure UI — no API, no Supabase, no queries, no mutations.
 * Composes title, description, actions, stats, filters and content slots.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export interface MembershipFinancePageShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  contentSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** Optional banner/notice rendered between header and stats (e.g. info chip). */
  banner?: React.ReactNode;
}

export const MembershipFinancePageShell: React.FC<MembershipFinancePageShellProps> = ({
  title,
  description,
  icon,
  actionsSlot,
  statsSlot,
  filtersSlot,
  contentSlot,
  children,
  banner,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actionsSlot && (
          <div className="flex flex-wrap items-center gap-2">{actionsSlot}</div>
        )}
      </div>

      {banner && <div>{banner}</div>}
      {statsSlot && <div>{statsSlot}</div>}
      {filtersSlot && <div>{filtersSlot}</div>}
      {contentSlot ?? children}
    </div>
  );
};

export default MembershipFinancePageShell;