/**
 * POST-LAUNCH-OBSERVABILITY-1 — pure aggregation helpers.
 *
 * Each metric helper accepts already-fetched, plain shapes and returns
 * a small section snapshot. No DB access. No PII. Aggregates only.
 */

import type { SectionSnapshot, HealthStatus } from './types';

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n));
const round2 = (n: number): number => Math.round(n * 100) / 100;

/* ── Email delivery ─────────────────────────────────────────────── */

export interface EmailDeliveryInput {
  /** Latest-status-per-message_id row counts. */
  pending: number;
  sent: number;
  /** dlq + failed + bounced combined. */
  failed: number;
  suppressed?: number;
  /** Most common failure code → count, for quick triage. */
  topFailureCodes?: Array<{ code: string; count: number }>;
}

export interface EmailDeliveryMetrics extends SectionSnapshot {
  metrics: {
    pending: number;
    sent: number;
    failed: number;
    suppressed: number;
    total: number;
    failure_rate_pct: number;
    top_failure_code: string | null;
  };
}

export function computeEmailDeliveryMetrics(input: EmailDeliveryInput): EmailDeliveryMetrics {
  const pending = Math.max(0, input.pending | 0);
  const sent = Math.max(0, input.sent | 0);
  const failed = Math.max(0, input.failed | 0);
  const suppressed = Math.max(0, (input.suppressed ?? 0) | 0);
  const total = pending + sent + failed + suppressed;
  const failure_rate_pct = total > 0 ? round2((failed / total) * 100) : 0;

  let status: HealthStatus = 'healthy';
  let score = 100;
  if (failure_rate_pct > 20) { status = 'critical'; score = 40; }
  else if (failure_rate_pct > 5) { status = 'warning'; score = 75; }

  const top = (input.topFailureCodes ?? [])
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)[0];

  return {
    key: 'email_delivery',
    status,
    score: clamp(score),
    metrics: {
      pending, sent, failed, suppressed, total, failure_rate_pct,
      top_failure_code: top?.code ?? null,
    },
  };
}

/* ── Customer usage (PII-free aggregates) ───────────────────────── */

export interface CustomerUsageInput {
  trackingLinksCreated: number;
  portalViews?: number;
  quotationApprovals: number;
  appointmentConfirmations: number;
  rescheduleRequests: number;
  completionConfirmations: number;
  feedbackSubmissions: number;
  npsResponses: number;
}

export interface CustomerUsageMetrics extends SectionSnapshot {
  metrics: {
    tracking_links_created: number;
    portal_views: number;
    quotation_approvals: number;
    appointment_confirmations: number;
    reschedule_requests: number;
    completion_confirmations: number;
    feedback_submissions: number;
    nps_responses: number;
  };
}

export function computeCustomerUsageMetrics(input: CustomerUsageInput): CustomerUsageMetrics {
  // Status is informational here — customer usage doesn't downgrade the
  // overall snapshot on its own. Activity simply correlates with adoption.
  const score = input.trackingLinksCreated + input.feedbackSubmissions > 0 ? 100 : 80;
  return {
    key: 'customer_experience',
    status: 'healthy',
    score: clamp(score),
    metrics: {
      tracking_links_created: Math.max(0, input.trackingLinksCreated | 0),
      portal_views: Math.max(0, (input.portalViews ?? 0) | 0),
      quotation_approvals: Math.max(0, input.quotationApprovals | 0),
      appointment_confirmations: Math.max(0, input.appointmentConfirmations | 0),
      reschedule_requests: Math.max(0, input.rescheduleRequests | 0),
      completion_confirmations: Math.max(0, input.completionConfirmations | 0),
      feedback_submissions: Math.max(0, input.feedbackSubmissions | 0),
      nps_responses: Math.max(0, input.npsResponses | 0),
    },
  };
}

/* ── Provider growth — wraps provider growth helpers ────────────── */

import type { GrowthBusiness } from '@/modules/growth/providerGrowth';
import {
  computeProviderFunnel,
  computeDirectoryQuality,
  computeProviderProfileScore,
  computeProviderSeoScore,
} from '@/modules/growth/providerGrowth';

export interface ProviderGrowthMetrics extends SectionSnapshot {
  metrics: {
    registered: number;
    draft: number;
    username_pending: number;
    ready_to_publish: number;
    published: number;
    avg_profile_score: number;
    avg_seo_score: number;
    overall_conversion_pct: number;
  };
}

export function computeProviderGrowthMetrics(businesses: GrowthBusiness[]): ProviderGrowthMetrics {
  const funnel = computeProviderFunnel(businesses);
  const directory = computeDirectoryQuality(businesses);
  const stageCount = (stage: typeof funnel.stages[number]['stage']) =>
    funnel.stages.find((s) => s.stage === stage)?.count ?? 0;

  const registered = stageCount('registered');
  const published = stageCount('published');
  const draft = Math.max(0, registered - published);
  const usernamePending = businesses.filter((b) => b.username_status === 'pending').length;
  const readyToPublish = businesses.filter((b) => {
    if (b.approval_status === 'approved' && b.is_active) return false;
    const score = computeProviderProfileScore(b).score;
    return score >= 70;
  }).length;

  const profileScores = businesses.map((b) => computeProviderProfileScore(b).score);
  const seoScores = businesses.map((b) => computeProviderSeoScore(b).score);
  const avgProfile = profileScores.length
    ? Math.round(profileScores.reduce((a, b) => a + b, 0) / profileScores.length)
    : 0;
  const avgSeo = seoScores.length
    ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length)
    : 0;

  let status: HealthStatus = 'healthy';
  let score = 100;
  if (registered > 0 && published === 0) { status = 'critical'; score = 30; }
  else if (draft > published * 3 && draft > 5) { status = 'warning'; score = 70; }
  else if (avgProfile < 50 && registered > 0) { status = 'warning'; score = 75; }

  return {
    key: 'provider_growth',
    status,
    score: clamp(score),
    metrics: {
      registered,
      draft,
      username_pending: usernamePending,
      ready_to_publish: readyToPublish,
      published,
      avg_profile_score: avgProfile,
      avg_seo_score: avgSeo,
      overall_conversion_pct: round2(funnel.overallConversion * 100),
    },
  };
}
// re-export so consumers don't dig into providerGrowth directly
export { computeProviderFunnel, computeDirectoryQuality } from '@/modules/growth/providerGrowth';

/* ── Help Center ────────────────────────────────────────────────── */

export interface HelpCenterInput {
  searches: number;
  zeroResultSearches: number;
  /** Optional: low-confidence assistant logs in window. */
  assistantLowConfidence?: number;
  /** Optional: detected content gaps (count). */
  contentGaps?: number;
  openIssueReports: number;
  openFeatureRequests: number;
  mostHelpfulArticles?: number;
}

export interface HelpCenterMetrics extends SectionSnapshot {
  metrics: {
    searches: number;
    zero_result_searches: number;
    zero_result_rate_pct: number;
    assistant_low_confidence: number;
    content_gaps: number;
    open_issue_reports: number;
    open_feature_requests: number;
    most_helpful_articles: number;
  };
}

export function computeHelpCenterMetrics(input: HelpCenterInput): HelpCenterMetrics {
  const searches = Math.max(0, input.searches | 0);
  const zero = Math.max(0, input.zeroResultSearches | 0);
  const zero_rate = searches > 0 ? round2((zero / searches) * 100) : 0;

  let status: HealthStatus = 'healthy';
  let score = 100;
  if (zero_rate > 50 && searches >= 10) { status = 'warning'; score = 65; }
  else if (zero_rate > 30 && searches >= 10) { status = 'warning'; score = 80; }
  if ((input.openIssueReports | 0) > 10) score -= 5;

  return {
    key: 'help_center',
    status,
    score: clamp(score),
    metrics: {
      searches,
      zero_result_searches: zero,
      zero_result_rate_pct: zero_rate,
      assistant_low_confidence: Math.max(0, (input.assistantLowConfidence ?? 0) | 0),
      content_gaps: Math.max(0, (input.contentGaps ?? 0) | 0),
      open_issue_reports: Math.max(0, input.openIssueReports | 0),
      open_feature_requests: Math.max(0, input.openFeatureRequests | 0),
      most_helpful_articles: Math.max(0, (input.mostHelpfulArticles ?? 0) | 0),
    },
  };
}

/* ── SEO ────────────────────────────────────────────────────────── */

export interface SeoObservabilityInput {
  latestCheckStatus?: HealthStatus | 'unknown';
  gscConnected?: boolean | 'manual';
  sitemapOk?: boolean;
  robotsOk?: boolean;
  jsonLdOk?: boolean;
  publicAssetsOk?: boolean;
}

export interface SeoMetrics extends SectionSnapshot {
  metrics: {
    latest_check: string;
    gsc_connected: string;
    sitemap_ok: number;
    robots_ok: number;
    json_ld_ok: number;
    public_assets_ok: number;
  };
}

export function computeSeoMetrics(input: SeoObservabilityInput): SeoMetrics {
  const sitemap = input.sitemapOk ?? true;
  const robots = input.robotsOk ?? true;
  const jsonld = input.jsonLdOk ?? true;
  const assets = input.publicAssetsOk ?? true;

  const okCount = [sitemap, robots, jsonld, assets].filter(Boolean).length;
  let score = 60 + okCount * 10; // 60..100
  let status: HealthStatus = 'healthy';
  if (okCount <= 2) { status = 'warning'; score = Math.min(score, 70); }
  if (input.latestCheckStatus === 'critical') { status = 'critical'; score = Math.min(score, 50); }

  return {
    key: 'seo',
    status,
    score: clamp(score),
    metrics: {
      latest_check: input.latestCheckStatus ?? 'unknown',
      gsc_connected: input.gscConnected === true ? 'yes' : input.gscConnected === 'manual' ? 'manual' : 'no',
      sitemap_ok: sitemap ? 1 : 0,
      robots_ok: robots ? 1 : 0,
      json_ld_ok: jsonld ? 1 : 0,
      public_assets_ok: assets ? 1 : 0,
    },
  };
}

/* ── Data integrity (bridge to existing helper) ─────────────────── */

export interface DataIntegrityInputSummary {
  totalIssues: number;
  /** "red" / "amber" / "slate" counts from runDataIntegrityChecks summary. */
  redCount: number;
  amberCount: number;
}

export interface DataIntegrityMetrics extends SectionSnapshot {
  metrics: {
    total_issues: number;
    critical_issues: number;
    warning_issues: number;
  };
}

export function computeDataIntegrityMetrics(input: DataIntegrityInputSummary): DataIntegrityMetrics {
  let status: HealthStatus = 'healthy';
  let score = 100;
  if (input.redCount > 0) { status = 'critical'; score = 40; }
  else if (input.amberCount > 5) { status = 'warning'; score = 70; }
  else if (input.amberCount > 0) { status = 'warning'; score = 85; }

  return {
    key: 'data_integrity',
    status,
    score: clamp(score),
    metrics: {
      total_issues: Math.max(0, input.totalIssues | 0),
      critical_issues: Math.max(0, input.redCount | 0),
      warning_issues: Math.max(0, input.amberCount | 0),
    },
  };
}

/* ── Operations (work-orders/RFQs/etc rolled up) ────────────────── */

export interface OperationsObservabilityInput {
  overdueWorkOrders: number;
  pendingCustomerConfirmations: number;
  awardedRfqsWithoutPo: number;
}

export interface OperationsMetrics extends SectionSnapshot {
  metrics: {
    overdue_work_orders: number;
    pending_customer_confirmations: number;
    awarded_rfqs_without_po: number;
  };
}

export function computeOperationsMetrics(input: OperationsObservabilityInput): OperationsMetrics {
  let status: HealthStatus = 'healthy';
  let score = 100;
  if (input.overdueWorkOrders > 0) { status = 'warning'; score = 75; }
  if (input.awardedRfqsWithoutPo > 0) { status = 'warning'; score = Math.min(score, 80); }
  if (input.overdueWorkOrders > 10) { status = 'critical'; score = 45; }

  return {
    key: 'operations',
    status,
    score: clamp(score),
    metrics: {
      overdue_work_orders: Math.max(0, input.overdueWorkOrders | 0),
      pending_customer_confirmations: Math.max(0, input.pendingCustomerConfirmations | 0),
      awarded_rfqs_without_po: Math.max(0, input.awardedRfqsWithoutPo | 0),
    },
  };
}