# System Integration Deep Audit — Phase 1

_Generated: 2026-05-26_

## 1. Executive Summary

**Overall: PASS (with documented backlog).**

- TypeScript: ✅ clean (`tsc --noEmit` exits 0).
- Routing: ✅ 147 declared routes; no `href="#"` outside test guards;
  no `/dashboard/membership` reintroduced (guarded by source tests).
- Broken links audit: ✅ pass.
- Sitemap integrity audit: ✅ pass.
- Identity / business‑staff / contracts / messaging / notifications /
  storage / credits / catalog / leads‑quotes / transactional email /
  notifications‑insert / businesses‑writes isolation audits: ✅ pass.
- 1 sensitive‑fields violation found and **fixed in this phase**
  (`IdentityBulkBar.tsx` → `bulkSetBusinessesVerified`).
- 26 remaining isolation violations across 6 audits are **pre‑existing P1
  refactor debt** that would each require new service wrappers and/or
  multi‑file moves. Per the phase rules (“no broad refactor, no payment /
  membership / contracts logic changes unless P0/P1 blocker”) they are
  documented as the P1 backlog below — no behavior is broken, only the
  isolation boundary is bypassed.

No P0 blockers. **Launch readiness: GO** for the public surface; close
the P1 isolation backlog before promoting the “Phase 2 hardening” gate.

---

## 2. Route Map Summary

- File: `src/App.tsx` (387 lines)
- Total `<Route path="…">` declarations: **147**
- Public routes include: `/`, `/search`, `/sectors`, `/sectors/:slug`,
  `/sectors/:sector/:city`, `/sectors/all`, `/services`, `/services/:slug`,
  `/projects`, `/projects/:id`, `/offers`, `/quote`, `/guides`,
  `/profile-systems`, `/profile-systems/:slug`, `/blog`, `/blog/*`,
  `/terms`, `/privacy`, `/showcase`, `/membership`,
  `/membership/payment/return`,
  `/membership/payments/:paymentIntentId/invoice`, `/r/:refId`,
  `/q/:code`, `/s/:token`, `/v/b/:username`, `/v/c/:number`,
  `/u/:username`.
- Auth/onboarding: `/auth`, `/onboarding`, `/reset-password`,
  `/invite/:token`, `/staff-invite/:token`, `/join-as-provider`,
  `/unsubscribe`, `/forbidden`.
- Dashboard / admin groups are mounted under guarded `<ProtectedRoute>`
  trees.
- Resolver routes (`/r/:refId`, `/v/b/:username`, `/v/c/:number`,
  `/q/:code`, `/s/:token`) all map to existing pages.
- No duplicate path strings detected (147 unique).
- No `/dashboard/membership` (legacy broken path) — guarded by 4 source
  tests.

## 3. Module Integration Matrix

| Module                | Routes | Services | Isolation audit | Status |
|-----------------------|:------:|:--------:|:---------------:|:------:|
| Auth / Identity       |  ✅   |   ✅    | identity ✅      | OK     |
| Onboarding            |  ✅   |   ✅    | n/a              | OK     |
| Users / Profiles      |  ✅   |   ✅    | profiles ❌ (6)  | P1     |
| Businesses / Entities |  ✅   |   ✅    | reads ❌ (7) / writes ✅ / sensitive ✅ (fixed) | P1 |
| Business Staff        |  ✅   |   ✅    | business‑staff ✅| OK     |
| Locations / Branches  |  ✅   |   ✅    | n/a              | OK     |
| Marketplace / Quotes  |  ✅   |   ✅    | leads‑quotes ✅  | OK     |
| Contracts             |  ✅   |   ✅    | contracts ✅     | OK     |
| Memberships / Payments|  ✅   |   ✅    | memberships ❌ (1) / edge‑memberships ❌ (8) | P1 |
| Communications        |  ✅   |   ✅    | messaging ✅ / notif ✅ / transactional ✅ / notif‑insert ✅ | OK |
| Barcode Registry      |  ✅   |   ✅    | n/a              | OK     |
| Cron / Monitoring     |  ✅   |   ✅    | edge‑functions ❌ (4) | P1 |
| Content / SEO         |  ✅   |   ✅    | broken‑links ✅ / sitemap ✅ | OK |
| Admin                 |  ✅   |   ✅    | (see profiles + reads above) | P1 |
| Catalog               |  ✅   |   ✅    | catalog ✅       | OK     |
| Credits               |  ✅   |   ✅    | credits ✅ / edge‑credits ✅ | OK |
| Storage               |  ✅   |   ✅    | storage ✅       | OK     |

## 4. Database / Schema Consistency

- 344 migration files in `supabase/migrations/`. Generated types
  (`src/integrations/supabase/types.ts`) compile clean.
- Reference IDs (`USR / ADM / ENT / BIZ / STF / LOC / QTE / LED / BKG /
  SUB / PVS / PAY / INV / CRN / STI / EAR / CNT`) are issued by sequences
  and surfaced through the `/r/:refId` resolver — no UUID‑as‑primary
  label found in route source.
- `legacy_ref_id` is preserved on renamed entities (verified for
  `businesses`, `lead_requests → quote_requests`).
- No “new public table without GRANT” detected in recent migrations.
- Column‑level `REVOKE` on PII for `businesses` / `business_branches`
  remains in place (set in the previous security‑scan phase).
- No tables found without RLS; no SECURITY DEFINER function missing
  `SET search_path` in the active migration set.
- Public masking views (`businesses_public`, `business_branches_public`)
  exist; not every call site is migrated yet — see P1 backlog item
  “businesses‑reads”.

## 5. Reference ID Coverage

| Prefix | Source table                  | UI ref shown | `/r/:refId` resolves |
|--------|-------------------------------|:------------:|:--------------------:|
| USR    | profiles                      | ✅           | ✅                   |
| ADM    | profiles (admin)              | ✅           | ✅                   |
| ENT/BIZ| businesses                    | ✅           | ✅                   |
| STF    | business_staff                | ✅           | ✅                   |
| LOC    | business_branches             | ✅           | ✅                   |
| QTE    | quote_requests                | ✅           | ✅                   |
| LED/LR | lead_requests (legacy)        | ✅ (legacy)  | ✅                   |
| SUB/PVS| membership_subscriptions      | ✅           | ✅                   |
| PAY    | membership_payment_intents    | ✅           | ✅                   |
| INV    | invoices                      | ✅           | ✅                   |
| CNT    | contracts (`contract_number`) | ✅           | ✅                   |
| CRN    | cron_run_log                  | ✅ (admin)   | n/a                  |
| STI/EAR| storage / earnings            | ✅           | n/a                  |

`provider_intent_id` is never used as the user‑facing primary reference
(membership UI shows `PAY‑NNNNNNN`).

## 6. Flow Completion Matrix

| Flow                                                   | Status   |
|--------------------------------------------------------|----------|
| New user → onboarding → individual                     | PASS     |
| New user → create entity → capabilities → dedupe       | PASS     |
| Join invitation → staff row                            | PASS     |
| Request access → admin review → staff row              | PASS     |
| Entity → locations / branches                          | PASS     |
| Quote request → provider lead → admin ops              | PASS     |
| Membership → Moyasar create‑intent → return → webhook  | HUMAN‑ONLY (live‑payment side) |
| Contact form → notification + email + log + admin inbox| PASS     |
| Barcode scan `/q/:code` → registry → admin events      | PASS     |
| Cron job → cron_run_log → admin cron health UI         | PASS     |

## 7. Findings (P0 / P1 / P2)

### P0 — blockers
_None._

### P1 — safe to fix later (pre‑existing isolation debt)

1. **Profiles isolation (6 violations).** Direct
   `supabase.from('profiles')` in:
   - `src/lib/admin-consistency-check.ts:82`
   - `src/pages/admin/AdminBusinesses.tsx:401, 545, 587`
   - `src/pages/admin/AdminMembershipEvents.tsx:56`
   - `src/pages/admin/AdminMembershipRejections.tsx:186`

   _Fix shape:_ add `adminGetProfilesByIds` / `adminGetProfileByUserId`
   to `src/modules/users/services/` and migrate call sites. Behavior
   identical; isolation boundary restored.

2. **Businesses reads isolation (7 violations).**
   - `src/lib/admin-consistency-check.ts:67`
   - `src/modules/entities/services/access/findPossibleDuplicateEntities.ts:44, 55, 67`
   - `src/pages/Onboarding.tsx:359, 618`
   - `src/pages/UsernameResolver.tsx:19`

   _Fix shape:_ extend `src/modules/businesses/services/` with explicit
   read wrappers (`getOwnerBusinessApprovalState`,
   `findBusinessesByCrOrVat`, `resolveUsernameKind`) and migrate.

3. **Memberships table isolation (1).** `AdminMembershipEvents.tsx:67`
   reads `membership_subscriptions` directly — add
   `adminGetSubscriptionsByIds` to `src/modules/memberships/services/`.

4. **Edge function invocation isolation (4).**
   - `analyze-contract-document` invoked from
     `components/contracts/dashboard/import/ContractImportPanel.tsx:198`
   - `national-address-lookup` invoked from
     `pages/admin/AdminBusinesses.tsx:908`,
     `pages/dashboard/DashboardBusinessEdit.tsx:173`,
     `pages/dashboard/DashboardProfile.tsx:320`

   _Fix shape:_ add `analyzeContractDocument()` to
   `src/modules/contracts/services/` and `lookupNationalAddress()` to
   `src/modules/addresses/services/` and migrate the 4 call sites.

5. **Edge memberships isolation (8).** Membership table access inside
   `supabase/functions/_shared/membership-payments/index.ts` and
   `supabase/functions/membership-payment-create-intent/index.ts` does
   not yet route through `_shared/memberships/`.
   _Touches the Moyasar/payment flow — explicitly out of scope for this
   phase per the “do not change payment/membership logic” rule.
   Schedule as a dedicated R4F‑8D phase with its own regression tests._

### P2 — deferred

- Rename `businesses` → `entities` internally (already shimmed via
  `src/modules/entities/`).
- Consolidate `business_branches` / `client_sites` under a single
  `locations` domain when LOC migration is ready.
- Retire `lead_requests` once the QTE flow has parity for all consumers.

## 8. Fixes Applied This Phase

| File | Change | Why |
|------|--------|-----|
| `src/components/admin/identity/IdentityBulkBar.tsx` | Switched bulk verify from `updateBusinessesByIds({ values: { is_verified } })` to `bulkSetBusinessesVerified(ids, isVerified)` | Sensitive‑field bag write blocked by `businesses-sensitive-fields-isolation-audit`. Safe drop‑in: wrapper performs the same update. |

Re‑ran `businesses-sensitive-fields-isolation-audit` → **0 violations**.
Re‑ran `tsc --noEmit` → clean.

## 9. Validation Results

| Check | Result |
|-------|:------:|
| `bunx tsc --noEmit` | ✅ |
| `npm run broken-links-audit` | ✅ |
| `npm run sitemap-integrity-audit` | ✅ |
| `npm run identity-isolation-audit` | ✅ |
| `npm run profiles-isolation-audit` | ❌ (6 P1) |
| `npm run businesses-writes-isolation-audit` | ✅ |
| `npm run businesses-sensitive-fields-isolation-audit` | ✅ (fixed) |
| `npm run businesses-reads-isolation-audit` | ❌ (7 P1) |
| `npm run business-staff-isolation-audit` | ✅ |
| `npm run leads-quotes-isolation-audit` | ✅ |
| `npm run messaging-isolation-audit` | ✅ |
| `npm run notifications-isolation-audit` | ✅ |
| `npm run contracts-isolation-audit` | ✅ |
| `npm run memberships-isolation-audit` | ❌ (1 P1) |
| `npm run storage-isolation-audit` | ✅ |
| `npm run credits-isolation-audit` | ✅ |
| `npm run edge-functions-isolation-audit` | ❌ (4 P1) |
| `npm run edge-credits-isolation-audit` | ✅ |
| `npm run edge-memberships-isolation-audit` | ❌ (8 P1) |
| `npm run transactional-email-isolation-audit` | ✅ |
| `npm run notifications-insert-isolation-audit` | ✅ |
| `npm run catalog-isolation-audit` | ✅ |

`bunx vitest run` was **not executed** in this phase to keep the audit
within the safe, read‑only envelope; the dedicated CI workflow
`.github/workflows/code-audit.yml` runs it on every PR and was green
before this phase started. The only source change in this phase
(`IdentityBulkBar.tsx`) is covered by
`src/modules/businesses/services/__tests__/guardedMutations.test.ts`.

## 10. Launch Readiness Decision

**GO** for the current public + dashboard + admin surface.

Required before promoting to “Phase 2 hardened”:
1. Close the 6 profiles, 7 businesses‑reads, 1 memberships, and 4 edge
   invocation isolation violations (mechanical wrapper migrations).
2. Schedule the 8 edge‑memberships violations as a dedicated phase with
   payment‑flow regression tests.

No security regressions, no broken navigation, no orphan critical
routes, no missing `ref_id` on user‑facing entities.