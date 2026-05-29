/**
 * CUSTOMER-EXPERIENCE-3 — Project Closure module.
 *
 * Public surface: types, service wrappers, and pure metric helpers.
 * No page imports these tables directly — always go through wrappers.
 */
export * from './types';

export {
  createProjectClosure,
  addDeliveryEvidence,
  startWorkOrderWarranty,
  getProjectClosureByWorkOrder,
  listDeliveryEvidenceForClosure,
  listWarrantyByWorkOrder,
} from './services/providerActions';

export {
  customerConfirmCompletion,
  customerReportProjectIssue,
  customerSubmitFeedback,
  customerSubmitNps,
} from './services/customerActions';

import type {
  CustomerFeedbackRow,
  CustomerNpsResponseRow,
  ProjectClosureRow,
  WarrantyStatus,
  WorkOrderWarrantyRow,
} from './types';
import { classifyNps } from './types';

/** Compute the realized warranty status (active / expired / void). */
export function computeWarrantyStatus(
  warranty: Pick<WorkOrderWarrantyRow, 'status' | 'end_date'> | null | undefined,
  now: Date = new Date(),
): WarrantyStatus | 'none' {
  if (!warranty) return 'none';
  if (warranty.status === 'void') return 'void';
  if (!warranty.end_date) return warranty.status;
  const end = new Date(warranty.end_date + 'T23:59:59');
  if (end.getTime() < now.getTime()) return 'expired';
  return warranty.status;
}

/** NPS score over a list of responses: %promoters - %detractors. */
export function computeNpsScore(
  responses: Pick<CustomerNpsResponseRow, 'score'>[],
): { score: number; promoters: number; passives: number; detractors: number; total: number } {
  const total = responses.length;
  if (total === 0) {
    return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const r of responses) {
    const b = classifyNps(r.score);
    if (b === 'promoter') promoters++;
    else if (b === 'passive') passives++;
    else detractors++;
  }
  const score = Math.round(((promoters - detractors) / total) * 100);
  return { score, promoters, passives, detractors, total };
}

export interface ClosureMetrics {
  pendingConfirmation: number;
  issuesReported: number;
  feedbackReceived: number;
  averageRating: number;
  activeWarranties: number;
  expiredWarranties: number;
  /** Closure waiting customer confirmation older than 7 days. */
  alertNotConfirmed7d: number;
  /** Feedback ratings of 1 or 2. */
  alertLowRating: number;
  /** Warranties expiring within 30 days (still active). */
  alertWarrantyExpiringSoon: number;
  /** Detractor NPS responses (score 0–6). */
  alertNpsDetractors: number;
}

export function computeClosureMetrics(input: {
  closures: ProjectClosureRow[];
  feedback: Pick<CustomerFeedbackRow, 'rating'>[];
  nps: Pick<CustomerNpsResponseRow, 'score'>[];
  warranties: Pick<WorkOrderWarrantyRow, 'status' | 'end_date'>[];
  now?: Date;
}): ClosureMetrics {
  const now = input.now ?? new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  let pendingConfirmation = 0;
  let issuesReported = 0;
  let alertNotConfirmed7d = 0;
  for (const c of input.closures) {
    if (c.closure_status === 'pending_customer_confirmation') {
      pendingConfirmation++;
      const created = new Date(c.created_at);
      if (created.getTime() < sevenDaysAgo.getTime()) alertNotConfirmed7d++;
    }
    if (c.closure_status === 'issue_reported') issuesReported++;
  }

  const feedbackReceived = input.feedback.length;
  const averageRating =
    feedbackReceived === 0
      ? 0
      : Math.round(
          (input.feedback.reduce((s, f) => s + f.rating, 0) / feedbackReceived) *
            10,
        ) / 10;
  const alertLowRating = input.feedback.filter((f) => f.rating <= 2).length;

  let activeWarranties = 0;
  let expiredWarranties = 0;
  let alertWarrantyExpiringSoon = 0;
  for (const w of input.warranties) {
    const realized = computeWarrantyStatus(w, now);
    if (realized === 'active') {
      activeWarranties++;
      if (w.end_date) {
        const end = new Date(w.end_date + 'T23:59:59');
        if (
          end.getTime() <= thirtyDaysAhead.getTime() &&
          end.getTime() >= now.getTime()
        ) {
          alertWarrantyExpiringSoon++;
        }
      }
    } else if (realized === 'expired') {
      expiredWarranties++;
    }
  }

  const alertNpsDetractors = input.nps.filter((n) => classifyNps(n.score) === 'detractor').length;

  return {
    pendingConfirmation,
    issuesReported,
    feedbackReceived,
    averageRating,
    activeWarranties,
    expiredWarranties,
    alertNotConfirmed7d,
    alertLowRating,
    alertWarrantyExpiringSoon,
    alertNpsDetractors,
  };
}