/**
 * Centralized GTM dataLayer event helpers for Qitaat.
 *
 * Privacy contract:
 *  - NEVER pushes PII (no phone, email, name, national ID, or raw form text).
 *  - Only allow-listed parameters from `AllowedParam` are accepted.
 *  - All values are sanitized to short strings/numbers/booleans.
 *
 * Consent: events are pushed to `window.dataLayer` regardless of consent;
 * Consent Mode v2 (configured in `src/lib/gtm.ts`) gates GA4 / Ads tags
 * inside GTM. We never call gtag/GA4 directly from this module.
 */

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

export type QitaatEvent =
  | "search_performed"
  | "filter_applied"
  | "category_view"
  | "business_profile_view"
  | "profile_system_view"
  | "offer_view"
  | "project_view"
  | "lead_contact_click"
  | "quote_request_start"
  /** @deprecated alias of `contact_form_submitted` — keep for backward compat; do NOT fire in new code. Planned removal: after GA4 dashboards migrate. */
  | "quote_request_submit"
  | "provider_signup_start"
  | "provider_signup_submit"
  | "compare_start"
  | "compare_profile_added"
  | "membership_plan_click"
  | "membership_plan_view"
  | "outbound_click"
  // Communication & onboarding (no PII)
  | "signup_started"
  | "signup_otp_sent"
  /** @deprecated alias of `register_completed`. Planned removal: after GA4 dashboards migrate. */
  | "signup_completed"
  /** Canonical signup conversion event. */
  | "register_completed"
  | "otp_sent"
  | "otp_verified"
  | "contact_form_submitted"
  | "onboarding_step_viewed"
  | "onboarding_completed"
  /** @deprecated alias of `supplier_lead_submitted`. Planned removal: after GA4 dashboards migrate. */
  | "lead_request_submitted"
  | "message_sent"
  /** @deprecated alias of `notification_opened` — never fired (kept for type compat). */
  | "notification_clicked"
  | "login_success"
  | "notification_opened"
  // Supplier lead capture (BusinessProfile)
  | "contact_button_clicked"
  | "supplier_lead_submitted"
  | "supplier_phone_revealed"
  | "supplier_email_revealed"
  // Failure events (Phase 6) — PII-free; only `reason_category` is allowed.
  | "register_failed"
  | "otp_failed"
  | "login_failed"
  | "lead_failed"
  // Provider lifecycle (Phase 6) — fired from admin review actions.
  | "provider_approved"
  | "provider_rejected"
  | "provider_needs_changes"
  // Service Requests (Phase SR-1) — provider inbox lifecycle.
  | "service_request_viewed"
  | "service_request_accepted"
  | "service_request_rejected"
  | "service_request_needs_info"
  | "service_request_closed"
  | "service_request_cancelled"
  | "service_request_customer_viewed"
  // Service Requests (Phase SR-3A) — conversation linkage.
  | "service_request_conversation_created"
  | "service_request_conversation_opened"
  // Service Requests (Phase SR-3B) — quote flow.
  | "service_request_quoted";

/** Additional Qitaat events appended for profile systems analytics. */
export type QitaatExtraEvent =
  | "profile_systems_visit"
  | "profile_systems_export"
  | "profile_systems_suggestion_click";

/** Allow-listed parameters. Anything not in this set is dropped. */
export type AllowedParam =
  | "page_location"
  | "page_title"
  | "language"
  | "sector"
  | "category_slug"
  | "category_name"
  | "city"
  | "business_slug"
  | "profile_system_slug"
  | "project_slug"
  | "offer_slug"
  | "membership_tier"
  | "contact_type"
  | "filters_count"
  | "results_count"
  | "outbound_domain"
  // Communication & onboarding allow-list
  | "account_type"
  | "onboarding_step"
  | "notification_type"
  | "contact_preference"
  | "conversation_type"
  | "method"
  // Supplier lead capture
  | "source_page"
  | "inquiry_type"
  | "is_authenticated"
  // Phase 6 additions — PII-free dimensions.
  | "reason_category"
  | "outcome"
  | "has_notes"
  | "flow"
  | "item_type"
  | "action"
  // Service Requests — booleans/buckets only, never PII.
  | "has_budget"
  | "response_time_bucket"
  // SR-3B quote flow — booleans/buckets only, never amounts/notes.
  | "has_quote_amount"
  | "quote_validity_bucket"
  // Attribution (UTM + first/last touch) — added by analytics-attribution helper.
  // Only attached to conversion events (lead/register/contact) — never blanket.
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "referrer_domain"
  | "landing_path"
  | "first_touch"
  | "last_touch";

/** Extra allow-listed parameters for profile-systems analytics. PII-free. */
export type ExtraAllowedParam =
  | "export_format"
  | "suggestion_kind"
  | "query_length"
  | "suggestion_rank";

export type EventPayload = Partial<Record<AllowedParam, string | number | boolean>>;

/** Combined payload accepted by trackEvent (extra params are sanitized identically). */
export type ExtendedEventPayload = Partial<Record<AllowedParam | ExtraAllowedParam, string | number | boolean>>;

const ALLOWED: ReadonlySet<AllowedParam> = new Set<AllowedParam>([
  "page_location",
  "page_title",
  "language",
  "sector",
  "category_slug",
  "category_name",
  "city",
  "business_slug",
  "profile_system_slug",
  "project_slug",
  "offer_slug",
  "membership_tier",
  "contact_type",
  "filters_count",
  "results_count",
  "outbound_domain",
  "account_type",
  "onboarding_step",
  "notification_type",
  "contact_preference",
  "conversation_type",
  "method",
  "source_page",
  "inquiry_type",
  "is_authenticated",
  "reason_category",
  "outcome",
  "has_notes",
  "flow",
  "item_type",
  "action",
  "has_budget",
  "response_time_bucket",
  "has_quote_amount",
  "quote_validity_bucket",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer_domain",
  "landing_path",
  "first_touch",
  "last_touch",
]);

const EXTRA_ALLOWED: ReadonlySet<ExtraAllowedParam> = new Set<ExtraAllowedParam>([
  "export_format",
  "suggestion_kind",
  "query_length",
  "suggestion_rank",
]);

/** Looks like an email or phone number — used as a defensive PII guard. */
const PII_RE =
  /(\b[\w.+-]+@[\w-]+\.[\w.-]+\b)|(\+?\d[\d\s\-()]{6,}\d)/;

function sanitizeValue(v: unknown): string | number | boolean | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (PII_RE.test(trimmed)) return undefined; // strip anything that smells like PII
  // Cap to a reasonable length for analytics keys.
  return trimmed.slice(0, 120);
}

function sanitize(payload: EventPayload): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const key of Object.keys(payload) as (AllowedParam | ExtraAllowedParam)[]) {
    if (!ALLOWED.has(key as AllowedParam) && !EXTRA_ALLOWED.has(key as ExtraAllowedParam)) continue;
    const v = sanitizeValue((payload as Record<string, unknown>)[key]);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

function getDataLayer(): Array<Record<string, unknown>> | null {
  if (typeof window === "undefined") return null;
  const w = window as DataLayerWindow;
  if (!w.dataLayer) return null;
  return w.dataLayer;
}

function autoContext(): Record<string, string | number | boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return {};
  return {
    page_location: window.location.href,
    page_title: document.title,
    language: document.documentElement.lang || "ar",
  };
}

/** Internal: dedupe identical events fired within a short window (per mount). */
const recent = new Map<string, number>();
const DEDUPE_MS = 1500;
function shouldDedupe(key: string): boolean {
  const now = Date.now();
  // Periodically prune
  if (recent.size > 200) {
    for (const [k, t] of recent) if (now - t > 10_000) recent.delete(k);
  }
  const last = recent.get(key);
  if (last && now - last < DEDUPE_MS) return true;
  recent.set(key, now);
  return false;
}

/**
 * Push a Qitaat analytics event onto the GTM dataLayer.
 * Auto-injects `page_location`, `page_title`, `language`.
 * No-op when GTM/dataLayer is not initialized.
 */
export function trackEvent(event: QitaatEvent | QitaatExtraEvent, payload: ExtendedEventPayload = {}): void {
  const dl = getDataLayer();
  if (!dl) return; // GTM disabled — silently skip.

  const clean = { ...autoContext(), ...sanitize(payload as EventPayload) };
  const dedupeKey = `${event}|${JSON.stringify(clean)}`;
  if (shouldDedupe(dedupeKey)) return;
  dl.push({ event, ...clean });
}

/** Convenience wrappers — keep call sites concise and self-documenting. */
export const track = {
  search: (p: EventPayload) => trackEvent("search_performed", p),
  filter: (p: EventPayload) => trackEvent("filter_applied", p),
  categoryView: (p: EventPayload) => trackEvent("category_view", p),
  businessProfileView: (p: EventPayload) => trackEvent("business_profile_view", p),
  profileSystemView: (p: EventPayload) => trackEvent("profile_system_view", p),
  offerView: (p: EventPayload) => trackEvent("offer_view", p),
  projectView: (p: EventPayload) => trackEvent("project_view", p),
  leadContactClick: (p: EventPayload) => trackEvent("lead_contact_click", p),
  quoteRequestStart: (p: EventPayload) => trackEvent("quote_request_start", p),
  quoteRequestSubmit: (p: EventPayload) => trackEvent("quote_request_submit", p),
  providerSignupStart: (p: EventPayload) => trackEvent("provider_signup_start", p),
  providerSignupSubmit: (p: EventPayload) => trackEvent("provider_signup_submit", p),
  compareStart: (p: EventPayload) => trackEvent("compare_start", p),
  compareProfileAdded: (p: EventPayload) => trackEvent("compare_profile_added", p),
  membershipPlanClick: (p: EventPayload) => trackEvent("membership_plan_click", p),
  membershipPlanView: (p: EventPayload = {}) => trackEvent("membership_plan_view", p),
  outboundClick: (p: EventPayload) => trackEvent("outbound_click", p),
  // Communication & onboarding
  signupStarted: (p: EventPayload = {}) => trackEvent("signup_started", p),
  signupOtpSent: (p: EventPayload = {}) => trackEvent("signup_otp_sent", p),
  signupCompleted: (p: EventPayload = {}) => trackEvent("signup_completed", p),
  onboardingStepViewed: (p: EventPayload) => trackEvent("onboarding_step_viewed", p),
  onboardingCompleted: (p: EventPayload = {}) => trackEvent("onboarding_completed", p),
  leadRequestSubmitted: (p: EventPayload) => trackEvent("lead_request_submitted", p),
  messageSent: (p: EventPayload = {}) => trackEvent("message_sent", p),
  notificationClicked: (p: EventPayload) => trackEvent("notification_clicked", p),
  registerCompleted: (p: EventPayload = {}) => trackEvent("register_completed", p),
  otpSent: (p: EventPayload = {}) => trackEvent("otp_sent", p),
  otpVerified: (p: EventPayload = {}) => trackEvent("otp_verified", p),
  contactFormSubmitted: (p: EventPayload = {}) => trackEvent("contact_form_submitted", p),
  contactButtonClicked: (p: EventPayload = {}) => trackEvent("contact_button_clicked", p),
  supplierLeadSubmitted: (p: EventPayload = {}) => trackEvent("supplier_lead_submitted", p),
  supplierPhoneRevealed: (p: EventPayload = {}) => trackEvent("supplier_phone_revealed", p),
  supplierEmailRevealed: (p: EventPayload = {}) => trackEvent("supplier_email_revealed", p),
  // Profile Systems telemetry
  profileSystemsVisit: (p: ExtendedEventPayload = {}) => trackEvent("profile_systems_visit", p),
  profileSystemsExport: (p: ExtendedEventPayload = {}) => trackEvent("profile_systems_export", p),
  profileSystemsSuggestionClick: (p: ExtendedEventPayload = {}) => trackEvent("profile_systems_suggestion_click", p),
};

// Extra wrappers (Phase 3)
export const trackLoginSuccess = (p: EventPayload = {}) => trackEvent("login_success", p);
export const trackNotificationOpened = (p: EventPayload = {}) => trackEvent("notification_opened", p);
export const trackMessageSent = (p: EventPayload = {}) => trackEvent("message_sent", p);

/**
 * Categorize a raw error/message into a stable `reason_category` value.
 * Never returns the raw message — only one of:
 *   validation | rate_limited | auth_failed | network | server | unknown
 */
export type ReasonCategory =
  | "validation"
  | "rate_limited"
  | "auth_failed"
  | "network"
  | "server"
  | "unknown";

export function categorizeReason(input: unknown): ReasonCategory {
  const raw =
    input instanceof Error ? input.message :
    typeof input === "string" ? input :
    "";
  const s = raw.toLowerCase();
  if (!s) return "unknown";
  if (/(rate.?limit|too.?many|429|throttle|cooldown)/.test(s)) return "rate_limited";
  if (/(invalid.?(login|credential|otp|code)|unauthor|forbid|expired|already.?used|otp_)/.test(s)) return "auth_failed";
  if (/(network|fetch|offline|timeout|connection)/.test(s)) return "network";
  if (/(required|invalid|must|missing|format|validation|short|weak)/.test(s)) return "validation";
  if (/(5\d{2}|server|internal|unavailable)/.test(s)) return "server";
  return "unknown";
}

/** Safe wrappers — analytics MUST never break a flow. Always wrap in try/catch at call-site. */
export const trackRegisterFailed = (p: EventPayload = {}) => trackEvent("register_failed", p);
export const trackOtpFailed = (p: EventPayload = {}) => trackEvent("otp_failed", p);
export const trackLoginFailed = (p: EventPayload = {}) => trackEvent("login_failed", p);
export const trackLeadFailed = (p: EventPayload = {}) => trackEvent("lead_failed", p);
export const trackProviderApproved = (p: EventPayload = {}) => trackEvent("provider_approved", p);
export const trackProviderRejected = (p: EventPayload = {}) => trackEvent("provider_rejected", p);
export const trackProviderNeedsChanges = (p: EventPayload = {}) => trackEvent("provider_needs_changes", p);

/** Extract a hostname safely (used for outbound link tagging, never for PII). */
export function getDomain(url: string): string | undefined {
  try {
    return new URL(url, window.location.origin).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}