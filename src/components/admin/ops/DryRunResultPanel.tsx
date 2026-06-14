import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { OperationsStatsStrip, type OperationsStatItem } from './OperationsStatsStrip';

export interface DryRunResultPanelProps {
  title: string;
  /** Required banner clarifying this is preview-only, no real dispatch. */
  safetyNote: string;
  generatedAtLabel?: string;
  totals?: OperationsStatItem[];
  /** Caller-rendered body (e.g. masked rows). Never accepts service calls. */
  body?: React.ReactNode;
  emptyLabel?: string;
  isEmpty?: boolean;
  rightSlot?: React.ReactNode;
}

/**
 * DryRunResultPanel — display-only panel for preview/dry-run output.
 *
 * SAFETY CONTRACT:
 *   - Never imports `previewSlaSweepForAdmin` or any service.
 *   - Never renders a "Run real dispatch" / send / mutation button.
 *   - Never accepts onSend / onDispatch callbacks.
 *   - Caller is responsible for ensuring the data passed in is masked.
 */
export const DryRunResultPanel: React.FC<DryRunResultPanelProps> = ({
  title, safetyNote, generatedAtLabel, totals, body, emptyLabel, isEmpty, rightSlot,
}) => (
  <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
    <CardHeader className="pb-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-info" aria-hidden />
            {title}
          </CardTitle>
          {generatedAtLabel && (
            <p className="mt-1 text-[11px] text-muted-foreground tech-content">{generatedAtLabel}</p>
          )}
        </div>
        {rightSlot}
      </div>
      <div className="mt-3 rounded-2xl border border-info/30 bg-info/5 px-3 py-2 text-xs text-info">
        {safetyNote}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {totals && totals.length > 0 && (
        <OperationsStatsStrip items={totals} columns={4} />
      )}
      {isEmpty
        ? <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</p>
        : body}
    </CardContent>
  </Card>
);

export default DryRunResultPanel;