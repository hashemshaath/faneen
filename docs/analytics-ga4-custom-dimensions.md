# GA4 Custom Dimensions — Qitaat Analytics v1

This document lists the **event-scoped** custom dimensions that should be
registered in the GA4 admin UI (Admin → Custom definitions → Custom dimensions)
so the parameters Qitaat already pushes via GTM become available in GA4
Explorations and Looker Studio.

> All values are PII-free by contract (`PII_RE` guard in
> `src/lib/analytics-events.ts`). The allow-list is the single source of truth
> for what reaches `dataLayer`.

## How to register

1. GA4 → Admin → **Custom definitions** → **Create custom dimension**.
2. Set **Scope = Event**.
3. Set **Event parameter** = exact name from the table below.
4. Use the same name as **Dimension name** for clarity.
5. Wait 24–48h for data to populate in standard reports.

## Recommended dimensions

| Event parameter      | Scope | Why we need it                                         | Where it shows up                                      |
|----------------------|-------|--------------------------------------------------------|--------------------------------------------------------|
| `business_slug`      | Event | Identify which provider page drove a conversion.       | Conversions by business; supplier funnel.              |
| `sector`             | Event | Industrial vertical (aluminum/glass/wood/steel).       | Sector-level performance and ad targeting.             |
| `category_slug`      | Event | Sub-category within a sector.                          | Category drill-down for content + SEO reports.         |
| `source_page`        | Event | Which page/widget triggered the event.                 | Attribute conversions to lead-gen surfaces.            |
| `inquiry_type`       | Event | `whatsapp` / `phone` / `email` / `form` etc.           | Compare contact-method preferences.                    |
| `account_type`       | Event | `client` vs `business` on signup/login.                | Split funnels and KPIs per persona.                    |
| `notification_type`  | Event | `system`, `lead`, `contract`, etc.                     | Notification engagement breakdown.                     |
| `reason_category`    | Event | `validation` / `auth_failed` / `rate_limited` / ...    | Failure analytics (`*_failed` events) without leaking. |
| `outcome`            | Event | `approved` / `rejected` / `needs_changes`.             | Admin lifecycle reporting on `provider_*` events.      |
| `has_notes`          | Event | Whether admin added review notes (true/false).         | Quality signal for moderation actions.                 |
| `flow`               | Event | Sub-flow tag (`send`/`verify` for OTP, etc.).          | Pinpoint failure stage inside a flow.                  |
| `utm_source`         | Event | Standard UTM. Already on conversion events.            | Acquisition / Source-medium reports.                   |
| `utm_medium`         | Event | Standard UTM.                                          | Acquisition / Source-medium reports.                   |
| `utm_campaign`       | Event | Standard UTM.                                          | Campaign performance.                                  |
| `landing_path`       | Event | First page in the visitor's session.                   | Landing-page attribution beyond GA4 default.           |
| `referrer_domain`    | Event | Stripped referrer (host only).                         | Referral analysis without full URLs.                   |

## Notes

- **Scope is always Event.** User-scoped dimensions would require pushing
  identifiers to `user_properties`, which we deliberately do **not** do.
- The allow-list in `src/lib/analytics-events.ts` is enforced *before* GTM, so
  any parameter not in the table above will be silently dropped — registering
  it in GA4 will simply show empty values.
- Failure events (`register_failed`, `otp_failed`, `login_failed`,
  `lead_failed`) only carry `reason_category`, never the raw error string.
- Provider lifecycle events (`provider_approved`, `provider_rejected`,
  `provider_needs_changes`) only carry `outcome` + `has_notes`, never the
  business name, owner email, or notes content.

## Deprecated event aliases (Phase 6)

These continue to be emitted **only as historical aliases** — no new code
should fire them. Plan to remove after GA4 dashboards migrate:

| Deprecated alias        | Canonical replacement     |
|-------------------------|---------------------------|
| `signup_completed`      | `register_completed`      |
| `quote_request_submit`  | `contact_form_submitted`  |
| `lead_request_submitted`| `supplier_lead_submitted` |
| `notification_clicked`  | `notification_opened`     |