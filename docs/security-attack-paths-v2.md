# Security Attack Paths v2 — Top 15 Realistic Scenarios

_Companion to `security-deep-review-3.md`. Each row is scored: Severity (Critical/High/Medium/Low) × Likelihood (1=rare, 5=likely)._

| # | Attack Path | Severity | Likelihood | Impact | Current Protection | Status |
|---|-------------|----------|-----------:|--------|--------------------|--------|
| 1 | Authenticated user enumerates another business's contracts via direct REST query | Critical | 1 | Full contract PII exposed | RLS: `client_id = auth.uid() OR is_business_owner_or_manager(provider_business_id)` + CI audits | **Blocked** |
| 2 | Anon scrapes raw `businesses` table for national_id / CR scans | Critical | 2 | Mass PII leak, regulatory breach | Anon SELECT denied; only `businesses_public` view (masked) exposed | **Blocked** |
| 3 | Owner privilege-escalation by writing `is_active`/`is_verified`/`user_id` on own business row | High | 2 | Approval bypass, identity transfer | `businesses-sensitive-fields-isolation-audit` + guarded `setBusiness*` wrappers | **Blocked** |
| 4 | Lower-trust staff (viewer) reads booking client phone numbers | High | 3 | Customer PII to wrong staff | Policy uses `is_business_owner_or_manager`, NOT `is_business_staff` | **Blocked** |
| 5 | Replay of one-time login OTP after expiry | High | 2 | Account takeover | OTPs are short-lived (5 min), consumed atomically in SECURITY DEFINER RPC, hashed sent over network | **Blocked** |
| 6 | SSRF via `businesses.website` → `check-badge-backlinks` fetches metadata IP | Medium | 1 | Cloud credentials leak (Deno Deploy does not expose metadata) | Edge runtime sandbox; **no hostname allowlist yet** | **Partial — M-2** |
| 7 | File upload to a closed/cancelled work order to muddy audit trail | Medium | 2 | Integrity / dispute confusion | Manager-only path check; **no status guard** | **Partial — M-1** |
| 8 | Stored XSS in a blog post via crafted markdown | Medium | 1 | Session theft of readers | `DOMPurify.sanitize()` on render; admin-authored only | **Blocked (hardening L-1)** |
| 9 | Double-spend of a reveal credit via concurrent requests | Medium | 1 | Free PII reveals | `consume_provider_lead_credit` advisory lock + idempotency key | **Blocked** |
| 10 | Forge a contract amendment after activation | Medium | 1 | Financial fraud | `lock_contract_on_active` trigger blocks `UPDATE` of financial columns; amendments create new rows | **Blocked** |
| 11 | Cross-tenant signed-URL guess for `quote-request-files` | Medium | 1 | RFQ file leak | URLs are HMAC-signed, 10-min TTL, never persisted | **Blocked** |
| 12 | Mass anonymous spam of `submit-quote-request` to flood admins | Medium | 4 | Notification budget exhaustion | No rate limit yet (per project directive) | **Accepted** |
| 13 | Realtime subscriber receives bookings for businesses they don't own | Medium | 1 | Customer PII leak | Postgres Changes inherit per-table RLS | **Blocked** |
| 14 | SVG upload with embedded `<script>` displayed inline | Low | 2 | XSS on directory viewer | SVGs served as static content with `Content-Disposition` headers; not rendered inline by React | **Blocked (hardening L-2)** |
| 15 | Admin action without audit trail (preview email / retry DLQ) | Low | 3 | Forensics gap | Admin gate enforced; **no audit row written** | **Partial — L-3** |

## Notes

- **Blocked** = no known path to exploit today.
- **Partial** = exploitable only under non-default conditions; hardening recommended pre-launch.
- **Accepted** = known gap documented in `security-memory`; remediation tracked separately.

No Critical or High path is currently exploitable.