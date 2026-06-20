/**
 * OPPORTUNITIES PHASE 11 — visual-only lifecycle timeline.
 *
 * Presentational. Derives stage completion from data the caller already
 * holds (status string, awarded bid id, contract presence). Adds no new
 * queries, mutations, RPCs, or statuses.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Circle, Clock } from 'lucide-react';
import { mapOpportunityStatus } from '../status';

export interface OpportunityTimelineProps {
  createdAt?: string | null;
  status?: string | null;
  hasAssignments?: boolean;
  hasBids?: boolean;
  awardedBidId?: string | null;
  hasContract?: boolean;
}

type StageState = 'done' | 'current' | 'pending';

interface Stage {
  key: string;
  labelAr: string;
  state: StageState;
}

function computeStages(p: OpportunityTimelineProps): Stage[] {
  const mapped = mapOpportunityStatus(p.status);
  const cancelled = mapped === 'cancelled';
  const completed = mapped === 'completed';

  const created = !!p.createdAt || mapped !== 'unknown';
  const reviewed =
    mapped === 'under_review' ||
    mapped === 'matched' ||
    mapped === 'receiving_bids' ||
    completed ||
    !!p.hasAssignments ||
    !!p.hasBids ||
    !!p.awardedBidId ||
    !!p.hasContract;
  const assigned =
    mapped === 'matched' ||
    mapped === 'receiving_bids' ||
    completed ||
    !!p.hasAssignments ||
    !!p.hasBids ||
    !!p.awardedBidId ||
    !!p.hasContract;
  const bidsReceived =
    mapped === 'receiving_bids' ||
    completed ||
    !!p.hasBids ||
    !!p.awardedBidId ||
    !!p.hasContract;
  const awarded = !!p.awardedBidId || !!p.hasContract || completed;
  const contractCreated = !!p.hasContract;

  const raw: Array<{ key: string; labelAr: string; done: boolean }> = [
    { key: 'created', labelAr: 'تم إنشاء الفرصة', done: created },
    { key: 'reviewed', labelAr: 'تمت المراجعة', done: reviewed },
    { key: 'assigned', labelAr: 'تم إسناد مزودين', done: assigned },
    { key: 'bids', labelAr: 'تم استلام عروض', done: bidsReceived },
    { key: 'awarded', labelAr: 'تم تعميد عرض', done: awarded },
    { key: 'contract', labelAr: 'تم إنشاء عقد مبدئي', done: contractCreated },
  ];

  const firstPendingIdx = raw.findIndex((s) => !s.done);
  return raw.map((s, i) => {
    let state: StageState = s.done ? 'done' : 'pending';
    if (!cancelled && !s.done && i === firstPendingIdx) state = 'current';
    return { key: s.key, labelAr: s.labelAr, state };
  });
}

export const OpportunityTimeline: React.FC<OpportunityTimelineProps> = (props) => {
  const stages = computeStages(props);
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="font-heading font-semibold text-base">مسار الفرصة</h2>
        <ol
          className="relative space-y-3"
          aria-label="مسار الفرصة"
          data-testid="opportunity-timeline"
        >
          {stages.map((s) => {
            const Icon = s.state === 'done' ? Check : s.state === 'current' ? Clock : Circle;
            const tone =
              s.state === 'done'
                ? 'text-success'
                : s.state === 'current'
                  ? 'text-primary'
                  : 'text-muted-foreground';
            return (
              <li
                key={s.key}
                data-stage={s.key}
                data-state={s.state}
                className="flex items-start gap-3 text-sm"
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${tone}`}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span
                  className={
                    s.state === 'pending'
                      ? 'text-muted-foreground'
                      : 'text-foreground/90 font-medium'
                  }
                >
                  {s.labelAr}
                </span>
                <span className="sr-only">
                  {s.state === 'done'
                    ? 'مكتملة'
                    : s.state === 'current'
                      ? 'الخطوة الحالية'
                      : 'لم تبدأ بعد'}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
};

export default OpportunityTimeline;