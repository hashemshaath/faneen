/**
 * PAGE-POLISH-REPAIRS-1 — Shared dashboard empty-state primitive.
 *
 * Visual-only. No data access, no side effects. Used to standardize
 * empty states across the polished dashboard / admin pages.
 */
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface DashboardEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  helpHref?: string;
  helpLabel?: string;
  className?: string;
  "data-testid"?: string;
}

export function DashboardEmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  helpHref,
  helpLabel,
  className,
  ...rest
}: DashboardEmptyStateProps) {
  return (
    <Card
      className={`border-dashed ${className ?? ""}`.trim()}
      data-testid={rest["data-testid"] ?? "dashboard-empty-state"}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {icon ? (
          <div className="mb-1 text-muted-foreground" aria-hidden>
            {icon}
          </div>
        ) : null}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
        {(primaryAction || secondaryAction) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
        {helpHref && helpLabel ? (
          <a
            href={helpHref}
            className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {helpLabel}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default DashboardEmptyState;