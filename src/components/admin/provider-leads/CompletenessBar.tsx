/**
 * Compact completeness bar + chip — shows the data-completion percentage
 * of a provider lead. Pure presentational, used in the table, kanban
 * cards, and the detail panel.
 */
import React from 'react';
import { completenessTone } from './providerLeadHelpers';

interface Props {
  pct: number;
  filled?: number;
  total?: number;
  className?: string;
  showChip?: boolean;
}

export const CompletenessBar: React.FC<Props> = ({
  pct,
  filled,
  total,
  className,
  showChip = true,
}) => {
  const tone = completenessTone(pct);
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      {showChip && (
        <span
          className={`tech-content rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${tone.chip}`}
        >
          {pct}%
          {filled !== undefined && total !== undefined && (
            <span className="ms-1 opacity-70">
              {filled}/{total}
            </span>
          )}
        </span>
      )}
    </div>
  );
};