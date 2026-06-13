/**
 * MembershipDetailsDrawer — read-only side drawer for inspecting a
 * membership / provider subscription / rejection context.
 *
 * Pure UI:
 *   - no Supabase imports
 *   - no mutations
 *   - no queries
 *   - no edit fields, no submit buttons
 *   - consumes props prepared by the page (or by buildMembershipDetailsDrawerProps)
 */
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { MembershipStatusBadge, type MembershipStatusValue } from './MembershipStatusBadge';
import { PaymentStatusBadge, type PaymentStatusValue } from './PaymentStatusBadge';
import { RejectionReasonBadge } from './RejectionReasonBadge';
import { TierChip, type TierValue } from './TierChip';
import {
  SubscriptionLifecycleCard,
  type LifecycleStage,
} from './SubscriptionLifecycleCard';

export interface MembershipDetailsSubject {
  title: string;
  subtitle?: string;
  refId?: string | null;
  tier?: TierValue | null;
  status?: MembershipStatusValue | null;
  meta?: Array<{ label: string; value: React.ReactNode }>;
}

export interface MembershipDetailsLastPayment {
  status: PaymentStatusValue;
  label?: string;
  amount?: string;
  at?: string | null;
}

export interface MembershipDetailsLastRejection {
  code: string;
  message?: string | null;
  at?: string | null;
}

export interface MembershipDetailsLastEvent {
  label: string;
  at?: string | null;
}

export interface MembershipDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRTL?: boolean;
  subject: MembershipDetailsSubject;
  lifecycle?: LifecycleStage[];
  lastPayment?: MembershipDetailsLastPayment | null;
  lastRejection?: MembershipDetailsLastRejection | null;
  lastEvent?: MembershipDetailsLastEvent | null;
  /** Optional read-only footer slot (e.g. a "View in dashboard" link). No actions/mutations. */
  footerSlot?: React.ReactNode;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </h4>
);

export const MembershipDetailsDrawer: React.FC<MembershipDetailsDrawerProps> = ({
  open,
  onOpenChange,
  isRTL = true,
  subject,
  lifecycle,
  lastPayment,
  lastRejection,
  lastEvent,
  footerSlot,
}) => {
  const t = {
    lastPayment: isRTL ? 'آخر دفع' : 'Last payment',
    lastRejection: isRTL ? 'آخر رفض' : 'Last rejection',
    lastEvent: isRTL ? 'آخر حدث' : 'Last event',
    lifecycle: isRTL ? 'دورة حياة الاشتراك' : 'Subscription lifecycle',
    none: isRTL ? 'لا يوجد' : 'None',
    tier: isRTL ? 'الباقة' : 'Tier',
    status: isRTL ? 'الحالة' : 'Status',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-base">{subject.title}</SheetTitle>
          {subject.subtitle && (
            <SheetDescription className="text-xs">{subject.subtitle}</SheetDescription>
          )}
          {subject.refId && (
            <div className="text-[10px] tech-content text-muted-foreground">{subject.refId}</div>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {subject.tier && (
              <>
                <span className="text-[10px] text-muted-foreground">{t.tier}:</span>
                <TierChip tier={subject.tier} isRTL={isRTL} />
              </>
            )}
            {subject.status && (
              <>
                <span className="text-[10px] text-muted-foreground">{t.status}:</span>
                <MembershipStatusBadge status={subject.status} isRTL={isRTL} />
              </>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="space-y-5">
          {subject.meta && subject.meta.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {subject.meta.map((row, i) => (
                <React.Fragment key={i}>
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-foreground break-words">{row.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}

          {lastPayment !== undefined && (
            <section className="space-y-2">
              <SectionLabel>{t.lastPayment}</SectionLabel>
              {lastPayment ? (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <PaymentStatusBadge status={lastPayment.status} label={lastPayment.label} />
                  {lastPayment.amount && (
                    <span className="tech-content font-medium">{lastPayment.amount}</span>
                  )}
                  {lastPayment.at && (
                    <span className="text-muted-foreground tech-content">
                      {new Date(lastPayment.at).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t.none}</p>
              )}
            </section>
          )}

          {lastRejection !== undefined && (
            <section className="space-y-2">
              <SectionLabel>{t.lastRejection}</SectionLabel>
              {lastRejection ? (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RejectionReasonBadge code={lastRejection.code} isRTL={isRTL} />
                    {lastRejection.at && (
                      <span className="text-muted-foreground tech-content">
                        {new Date(lastRejection.at).toLocaleString('en-US')}
                      </span>
                    )}
                  </div>
                  {lastRejection.message && (
                    <p className="text-muted-foreground line-clamp-3">{lastRejection.message}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t.none}</p>
              )}
            </section>
          )}

          {lastEvent !== undefined && (
            <section className="space-y-2">
              <SectionLabel>{t.lastEvent}</SectionLabel>
              {lastEvent ? (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-medium">{lastEvent.label}</span>
                  {lastEvent.at && (
                    <span className="text-muted-foreground tech-content">
                      {new Date(lastEvent.at).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t.none}</p>
              )}
            </section>
          )}

          {lifecycle && lifecycle.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>{t.lifecycle}</SectionLabel>
              <SubscriptionLifecycleCard stages={lifecycle} />
            </section>
          )}

          {footerSlot && (
            <>
              <Separator />
              <div className="pt-2">{footerSlot}</div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MembershipDetailsDrawer;