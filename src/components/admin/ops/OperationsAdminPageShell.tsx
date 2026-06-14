import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface OperationsAdminPageShellProps {
  header: React.ReactNode;
  description?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  contentSlot?: React.ReactNode;
  /** Render children after contentSlot. Equivalent to contentSlot for ergonomics. */
  children?: React.ReactNode;
}

/**
 * OperationsAdminPageShell — presentational layout shell for ops/notifications
 * admin pages. Slots only; never renders queries or actions of its own.
 */
export const OperationsAdminPageShell: React.FC<OperationsAdminPageShellProps> = ({
  header, description, actionsSlot, statsSlot, filtersSlot, contentSlot, children,
}) => (
  <div className="space-y-6">
    {(header || actionsSlot) && (
      <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {header}
              {description && (
                <div className="text-sm text-muted-foreground">{description}</div>
              )}
            </div>
            {actionsSlot && <div className="flex flex-wrap items-center gap-2">{actionsSlot}</div>}
          </div>
        </CardContent>
      </Card>
    )}
    {statsSlot}
    {filtersSlot}
    {contentSlot}
    {children}
  </div>
);

export default OperationsAdminPageShell;