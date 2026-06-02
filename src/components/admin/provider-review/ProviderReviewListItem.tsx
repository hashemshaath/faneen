import React from 'react';
import { Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { STATUSES, TONE, type ApprovalStatus, type ProviderRow } from './types';

interface Props {
  row: ProviderRow;
  active: boolean;
  language: 'ar' | 'en';
  onSelect: (row: ProviderRow) => void;
}

export const ProviderReviewListItem: React.FC<Props> = React.memo(
  ({ row, active, language, onSelect }) => {
    const status = (row.approval_status ?? 'draft') as ApprovalStatus;
    const completion = row.onboarding_completion ?? 0;
    return (
      <button
        type="button"
        onClick={() => onSelect(row)}
        className={`w-full rounded-xl border p-3 text-start transition-colors hover-lift ${
          active ? 'border-accent bg-accent/5' : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={row.logo_url ?? undefined} />
            <AvatarFallback>{(row.name_ar ?? '?').slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate font-heading text-sm font-bold">
                {language === 'ar' ? (row.name_ar ?? row.name_en) : (row.name_en ?? row.name_ar)}
              </div>
              <Badge className={`${TONE[status]} shrink-0 text-[10px]`}>
                {STATUSES.find((s) => s.value === status)?.[language === 'ar' ? 'ar' : 'en']}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground tech-content">
              {row.ref_id && <span className="font-mono">{row.ref_id}</span>}
              {row.username && <span className="truncate">@{row.username}</span>}
              {row.submitted_at && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(row.submitted_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Progress value={completion} className="h-1 flex-1" />
              <span className="text-[10px] tabular-nums tech-content text-muted-foreground">{completion}%</span>
            </div>
          </div>
        </div>
      </button>
    );
  },
);
ProviderReviewListItem.displayName = 'ProviderReviewListItem';

export default ProviderReviewListItem;