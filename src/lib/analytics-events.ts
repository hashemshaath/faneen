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
  | "quote_request_submit"
  | "provider_signup_start"
  | "provider_signup_submit"
  | "compare_start"
  | "compare_profile_added"
  | "membership_plan_click"
  | "outbound_click"
  // Communication & onboarding (no PII)
  | "signup_started"
  | "signup_otp_sent"
  | "signup_completed"
  | "register_completed"
  | "otp_sent"
  | "otp_verified"
  | "contact_form_submitted"
  | "onboarding_step_viewed"
  | "onboarding_completed"
  | "lead_request_submitted"
  | "message_sent"
  | "notification_clicked";

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
  | "method";

export type EventPayload = Partial<Record<AllowedParam, string | number | boolean>>;

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
  for (const key of Object.keys(payload) as AllowedParam[]) {
    if (!ALLOWED.has(key)) continue;
    const v = sanitizeValue(payload[key]);
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
export function trackEvent(event: QitaatEvent, payload: EventPayload = {}): void {
  const dl = getDataLayer();
  if (!dl) return; // GTM disabled — silently skip.

  const clean = { ...autoContext(), ...sanitize(payload) };
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
};

/** Extract a hostname safely (used for outbound link tagging, never for PII). */
export function getDomain(url: string): string | undefined {
  try {
    return new URL(url, window.location.origin).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}