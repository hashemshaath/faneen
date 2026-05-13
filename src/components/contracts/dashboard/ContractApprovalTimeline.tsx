import React from 'react';
import {
  CheckCircle2, Circle, Clock, FileText, Send, ShieldCheck,
  UserCheck, XCircle, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getContractApprovalTimeline,
  getContractStatusGuidanceLine,
  type ApprovalStep,
  type ApprovalTimelineInput,
} from '@/lib/contract-approval-timeline';

interface Props {
  contract: ApprovalTimelineInput;
  isRTL: boolean;
  className?: string;
}

const stepIcon: Record<string, React.ElementType> = {
  draft: FileText,
  sent: Send,
  provider_approved: UserCheck,
  client_approved: UserCheck,
  active: ShieldCheck,
  completed: CheckCircle2,
  cancelled: XCircle,
  disputed: AlertTriangle,
};

const statusStyles: Record<ApprovalStep['status'], { ring: string; text: string; bg: string; label: { ar: string; en: string } }> = {
  done: { ring: 'border-success/60', text: 'text-success', bg: 'bg-success/10', label: { ar: 'مكتمل', en: 'Done' } },
  current: { ring: 'border-accent/60', text: 'text-accent', bg: 'bg-accent/10', label: { ar: 'الحالي', en: 'Current' } },
  pending: { ring: 'border-border/60', text: 'text-muted-foreground', bg: 'bg-muted/40', label: { ar: 'لاحقاً', en: 'Pending' } },
  blocked: { ring: 'border-destructive/60', text: 'text-destructive', bg: 'bg-destructive/10', label: { ar: 'موقوف', en: 'Blocked' } },
};

function formatTs(ts?: string | null, isRTL?: boolean): string | null {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return null;
  }
}

/**
 * Read-only approval lifecycle timeline for a contract.
 * Pure presentational — derived from existing fields, no mutations.
 */
export const ContractApprovalTimeline: React.FC<Props> = ({ contract, isRTL, className }) => {
  const steps = getContractApprovalTimeline(contract);
  const guidance = getContractStatusGuidanceLine(contract.status, isRTL);

  return (
    <section
      aria-label={isRTL ? 'مسار اعتماد العقد' : 'Contract approval timeline'}
      className={cn('rounded-xl border border-border/60 bg-card/50 p-3 sm:p-4', className)}
    >
      <header className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
          {isRTL ? 'مسار الاعتماد' : 'Approval Timeline'}
        </h4>
        <p className="text-[11px] text-muted-foreground">{guidance}</p>
      </header>

      <ol className="relative flex flex-col gap-3 sm:flex-row sm:gap-2 sm:items-stretch">
        {steps.map((step, i) => {
          const Icon = stepIcon[step.key] ?? Circle;
          const s = statusStyles[step.status];
          const ts = formatTs(step.timestamp, isRTL);
          const accessibleStatus = isRTL ? s.label.ar : s.label.en;
          return (
            <li
              key={step.key}
              className="flex sm:flex-col gap-2 sm:gap-1.5 sm:flex-1 sm:min-w-0 items-start sm:items-stretch"
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              <div className="flex sm:flex-col items-center sm:items-start gap-2 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-full border',
                    s.ring, s.bg, s.text,
                  )}
                  aria-hidden="true"
                >
                  {step.status === 'current' ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </span>
                {i < steps.length - 1 && (
                  <span
                    className="hidden sm:block h-px flex-1 bg-border/60 mt-3"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[11px] sm:text-xs font-semibold leading-tight', s.text)}>
                  <span className="sr-only">{accessibleStatus}: </span>
                  {isRTL ? step.labelAr : step.labelEn}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {isRTL ? step.descriptionAr : step.descriptionEn}
                </p>
                {ts && (
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 tech-content">{ts}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default ContractApprovalTimeline;