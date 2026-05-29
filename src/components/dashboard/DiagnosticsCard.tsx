/**
 * BUSINESS-FINISHING-2A — Lightweight diagnostics card.
 *
 * Renders a small list of detected operational gaps. Counts are computed
 * by pure helpers in @/modules/analytics/diagnostics — this component
 * never fetches data itself.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface DiagnosticEntry {
  key: string;
  label: string;
  count: number;
}

export interface DiagnosticsCardProps {
  title: string;
  entries: ReadonlyArray<DiagnosticEntry>;
  className?: string;
  testId?: string;
}

export const DiagnosticsCard: React.FC<DiagnosticsCardProps> = ({
  title, entries, className, testId,
}) => {
  const { isRTL } = useLanguage();
  const total = entries.reduce((a, b) => a + b.count, 0);
  const allClear = total === 0;
  return (
    <Card
      data-testid={testId ?? 'diagnostics-card'}
      className={cn(className)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {allClear ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allClear ? (
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لا توجد ملاحظات.' : 'No issues detected.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li
                key={e.key}
                className="flex items-center justify-between gap-2 text-xs"
                data-testid={`diag-${e.key}`}
              >
                <span className="text-foreground/80">{e.label}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'tech-content',
                    e.count > 0
                      ? 'border-warning/40 text-warning'
                      : 'border-border/40 text-muted-foreground',
                  )}
                >
                  {e.count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default DiagnosticsCard;