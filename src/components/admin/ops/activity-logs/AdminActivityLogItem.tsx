import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminActivityLogRow } from '@/pages/admin/adminActivityLog.types';
import { actionConfig, entityLabels, pick } from './adminActivityLogDict';
import { buildSummary, buildDetailItems } from './adminActivityLogFormatters';

export interface AdminActivityLogItemProps {
  log: AdminActivityLogRow;
  getProfileName: (userId: string) => string;
  isRTL: boolean;
}

export function AdminActivityLogItem({ log, getProfileName, isRTL }: AdminActivityLogItemProps) {
  const actionEntry = actionConfig[log.action];
  const ActionIcon = actionEntry?.icon;
  const summary = buildSummary(log, getProfileName, isRTL);
  const details = buildDetailItems(log.details, log.action, isRTL);
  return (
    <Card className="p-3 flex items-start gap-3">
      {ActionIcon ? (
        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ActionIcon className="size-4" />
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{summary}</span>
          {log.entity_type ? (
            <Badge variant="secondary" className="text-[10px]">
              {pick(entityLabels[log.entity_type], isRTL, log.entity_type)}
            </Badge>
          ) : null}
          <span className="text-[11px] text-muted-foreground ms-auto tech-content">
            {format(new Date(log.created_at), 'HH:mm')}
          </span>
        </div>
        {details.length > 0 ? (
          <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
            {details.slice(0, 4).map((d, i) => (
              <li key={i}>
                <span className="font-medium">{d.label}:</span>{' '}
                {d.oldVal !== undefined ? `${d.oldVal} → ${d.newVal}` : d.value}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}

export default AdminActivityLogItem;