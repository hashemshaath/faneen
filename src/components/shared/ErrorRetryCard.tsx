/**
 * PROJECT-COMPONENTS-CLEANUP — Shared error/retry primitive.
 *
 * Visual-only. No data access, no side effects. Used to standardize
 * "something went wrong" cards across admin/dashboard pages so each
 * caller does not roll its own destructive Card layout.
 *
 * Tokens only — no hardcoded hex. RTL-safe via logical spacing.
 */
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ErrorRetryCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function ErrorRetryCard({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  icon,
  className,
  ...rest
}: ErrorRetryCardProps) {
  return (
    <Card
      className={`border-destructive/40 bg-destructive/5 ${className ?? ''}`.trim()}
      data-testid={rest['data-testid'] ?? 'error-retry-card'}
      role="alert"
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="text-destructive" aria-hidden>
          {icon ?? <AlertTriangle className="h-8 w-8" />}
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {message ? (
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        ) : null}
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 gap-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ErrorRetryCard;