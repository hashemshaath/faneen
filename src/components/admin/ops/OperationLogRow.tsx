import React from 'react';
import { Clock, User } from 'lucide-react';

export interface OperationLogRowProps {
  timestampLabel: string;
  actorLabel?: string;
  action: React.ReactNode;
  statusSlot?: React.ReactNode;
  metadataSummary?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
}

/**
 * OperationLogRow — display-only log row (timestamp + actor + action +
 * status + metadata). Never writes audit logs.
 */
export const OperationLogRow: React.FC<OperationLogRowProps> = ({
  timestampLabel, actorLabel, action, statusSlot, metadataSummary, rightSlot, onClick,
}) => {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full rounded-2xl border border-border/60 bg-card/60 p-3 md:p-4',
        'flex flex-wrap items-start gap-3 text-start transition-colors',
        onClick ? 'cursor-pointer hover:bg-card/80' : '',
      ].join(' ')}
    >
      <div className="flex flex-col gap-1 min-w-[10rem]">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground tech-content">
          <Clock className="h-3 w-3" aria-hidden /> {timestampLabel}
        </span>
        {actorLabel && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <User className="h-3 w-3" aria-hidden /> {actorLabel}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-sm font-medium">{action}</div>
        {metadataSummary && (
          <div className="text-xs text-muted-foreground line-clamp-2">{metadataSummary}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {statusSlot}
        {rightSlot}
      </div>
    </Comp>
  );
};

export default OperationLogRow;