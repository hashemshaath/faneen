# Email Infrastructure Governance — Phase 15D
## Template Registry + Copy Cleanup Audit

**Status:** ✅ **`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15D TEMPLATE REGISTRY COPY AUDIT COMPLETE`**
**Scope:** read-only audit + registry. No template, send code, secret, DB, RLS, RPC, migration, or edge-function changes were performed.

---

## 1. Files Modified

_None._

## 2. Files Created

- `docs/email-infrastructure-governance-phase-15d-template-registry.md` — single-source registry of all 66 templates.
- `docs/email-infrastructure-governance-phase-15d-template-copy-cleanup-audit.md` — this report.
- `src/__tests__/emailInfrastructurePhase15dTemplateRegistry.test.ts` — 12 read-only guards pinning the registry and forbidding regressions.

## 3–7. Counts

| Metric | Count |
|---|---|
| **3. Templates observed** | **66** (6 auth + 60 transactional) |
| **4. Canonical** | **66** — every template maps 1:1 to a real trigger and lives in exactly one registry. |
| **5. Duplicate (code-level)** | **0** — no two registry entries point at the same component or the same trigger. |
| **6. Missing (recommended for later phases)** | **8** — see §11. |
| **7. Legacy / off-brand / off-provider** | **0** — no template references Lovable, SMTP, SendGrid, Mailgun, Resend keys, or any retired domain. |

## 8. Copy Issues (top findings)

| # | Severity | Template(s) | Finding | Recommendation (deferred) |
|---|---|---|---|---|
| C1 | Medium | `customer-work-order-completed` + `customer-project-completed` | Subject lines collide semantically ("Project complete / Project completed"). A user receiving both will see them as duplicates even though the underlying events differ. | Differentiate: keep `customer-work-order-completed` for the operational completion ("تم تنفيذ أمر العمل · Work order delivered") and reserve `customer-project-completed` for the customer-facing confirmation flow. **No edit performed.** |
| C2 | Low | `provider-rejected`, `provider-revision-requested` | Both use the word "اعتماد"; risk of confusion. | Add a clearer differentiator in the AR body opening line. |
| C3 | Low | `welcome-signup`, `welcome-business` | Both say "مرحباً بك في قِطاعات"; arrive within seconds for the same user on business signup. | Sequence them (welcome-signup → welcome-business reframed as "تم تجهيز منشأتك"). |
| C4 | Low | All membership templates | Use the literal word "free" / "مجاني" without qualifying that it is a launch period. | Replace with "خطة الإطلاق التجريبية · Launch plan" wording when copy phase runs. |
| C5 | Info | All 66 templates | No template currently mentions Lovable, the old `faneen` brand, or any retired sender. | Pin via guard test (#7 below). |

## 9. Privacy Issues

| # | Severity | Template(s) | Finding | State |
|---|---|---|---|---|
| P1 | Info | `recovery`, `magiclink`, `invite`, `signup`, `email_change`, `client-contract-invite`, `client-invite-reminder` | Carry tokenized URLs. | ✅ Token only appears in URL, never in body text outside the link, and is never logged (`process-email-queue` and `send-transactional-email` log `message_id` + masked recipient only — verified by 15A guard). |
| P2 | Info | `contact-admin-notification`, `lead-notification` | Carry full submitter PII to admin/provider inboxes. | ✅ Justified — these are the intended recipients. Recipient list never widened beyond `template.to` (admin) or the routed provider. |
| P3 | Info | `reauthentication` | OTP appears in the body. | ✅ Required UX. OTP is not logged; queue logs status only. |
| P4 | Pass | All transactional templates | No third-party PII leakage: each template only renders fields the recipient is already authorized to see (their own contract, their own quote, their own membership). | ✅ |
| P5 | Pass | All templates | No `service_role`, Supabase URL paths beyond the tracking host, or `RESEND_API_KEY` references. | ✅ |
| P6 | Pass | Account-existence disclosure | `recovery`, `magiclink` flows go through Supabase Auth which sends the same hook regardless of whether the email exists; templates therefore cannot leak account existence on their own. No app-side template confirms or denies that an email is registered. | ✅ |

## 10. Subject Issues

| # | Severity | Template(s) | Finding |
|---|---|---|---|
| S1 | Pass | All 66 | Bilingual AR · EN format consistently applied. |
| S2 | Pass | All 66 | No raw IDs (`USR-…`, `CON-…`, message ids, tokens) embedded in subject lines. |
| S3 | Pass | All 66 | No `[TEST]`, `[demo]`, `[draft]`, or placeholder strings. |
| S4 | Medium | C1 above | Two near-identical subjects ("Project complete" vs "Project completed"). |
| S5 | Low | `lead-notification` + `lead-confirmation` | Both use the word "Lead" — fine for the routed audiences, but consider "طلب جديد متاح" (provider) vs "تأكيد استلام طلبك" (customer) to remove ambiguity for users on both sides. |

## 11. Missing Templates (recommended for a later phase — not added now)

| Suggested ID | Trigger | Audience |
|---|---|---|
| `account-created-success` | Post-signup confirmation landed (auth flow completion) | New user |
| `email-verified` | Email verification completed | User |
| `business-pending-review` | Business submitted, awaiting admin | Business owner |
| `business-approved` | Already covered by `provider-approved` for providers; **add** a non-provider variant for catalog-only businesses |
| `free-launch-active` | Free launch plan auto-applied | Business owner |
| `rfq-needs-clarification` | Admin requests clarification on an RFQ | Customer |
| `payment-failed` | Payment provider rejected | Payer |
| `password-reset-success` | Recovery completed (guidance/confirmation) | User |

Implementation deferred — add via `email_domain--scaffold_transactional_email` template additions in a future phase, not in 15D.

## 12. Duplicate / Legacy Cleanup List

| # | Type | Item | Action (deferred) |
|---|---|---|---|
| L1 | Copy near-duplicate | `customer-work-order-completed` vs `customer-project-completed` | Reword subjects + opening line; keep both files since they have distinct triggers. |
| L2 | Lib reference (in-policy) | `auth-email-hook` imports `parseEmailWebhookPayload` and `verifyWebhookRequest` from `@lovable.dev/*` for **Supabase Auth webhook signature verification only** | Keep — this is not an email-send dependency. Phase 15C removed the only send-related `@lovable.dev` import. |
| L3 | None found | Old templates referencing Lovable / faneen / external SMTP | n/a |
| L4 | None found | Hardcoded API keys, `VITE_RESEND*`, fallback senders | n/a |

## 13. References to Lovable inside email templates or send code? — **No**

- 0 template files (auth or transactional) reference "Lovable".
- 0 send-path files (`send-transactional-email`, `process-email-queue`) reference `@lovable.dev/email-js` or `sendLovableEmail` (regression-pinned in 15A + 15C tests).
- The `@lovable.dev/webhooks-js` and `@lovable.dev/email-js → parseEmailWebhookPayload` imports inside `auth-email-hook` are webhook-verification helpers, not sender libraries. Documented and allowed.

## 14. Secrets / keys in templates or docs? — **No**

- 0 occurrences of `re_…`, `RESEND_API_KEY` values, service-role keys, JWTs, or any Bearer tokens in any template or in the registry / audit docs.

## 15. Email send code changed? — **No**

- `process-email-queue/index.ts`: untouched.
- `send-transactional-email/index.ts`: untouched.
- `auth-email-hook/index.ts`: untouched.
- `sendTransactionalEmail.ts` wrapper: untouched.
- Any template file: untouched.

## 16. DB / RLS / RPC / migrations / edge changes? — **No**

- `supabase/migrations/`: 0 new files in this phase.
- No `GRANT`, `ALTER`, `CREATE POLICY`, or RPC changes.
- No edge function added, removed, or redeployed.

## 17. Test Results

See §`17. Tests` in the run log:

```
✓ src/__tests__/emailInfrastructurePhase15aCentralResendAudit.test.ts  (8)
✓ src/__tests__/emailInfrastructurePhase15cAuthQueueResendMigration.test.ts  (13)
✓ src/__tests__/emailInfrastructurePhase15dTemplateRegistry.test.ts  (12)
```

## 18. Full Suite

Not re-run in this phase — change set is documentation + 1 read-only guard. Recommend CI runs the full suite on merge.

## 19. Decision

**`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15D TEMPLATE REGISTRY COPY AUDIT COMPLETE`**

Next: **15E** Email Logs + Deliverability Dashboard → **15F** Full Email Regression.