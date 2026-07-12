# Pre-Launch Audit — Findings & Fix Plan

Read-only audit of this session's changes (R2–R5.3 migrations, prerender, query persistence, MCP fix). Evidence gathered via ripgrep / migration reads. Where a check requires runtime SQL or a production build run, it is listed as **verify-in-Pass-S** rather than asserted.

---

## Findings (grouped by severity)

### 🔴 BLOCKER — must fix before launch

**B1. localStorage cross-account data leak via over-broad persist prefixes** (`src/lib/queryPersist.ts`)
- Allowlist adds bare prefixes `business`, `branches`, `services`, `reviews`, `certifications`, `awards`, `portfolio`.
- `shouldPersistQuery` matches with `startsWith`, then only rejects if the stringified key contains one of: `auth, user, me, admin, dashboard, membership, contract, workspace, staff, invitation, notification, credit, billing, quote-request, rfq, lead`.
- Dashboard query keys that MATCH an allowlisted prefix and are NOT caught by any deny substring (`user` is not in a UUID string, `edit/completion/draft/recent/sync/availability/light` are not in the denylist):
  - `['business-edit', <uuid>, <uuid>]` — full editable business form incl. draft fields
  - `['business-completion', <uuid>]`
  - `['business-draft-form', <uuid>]`
  - `['business-recent-activity', <businessId>]`
  - `['business-services-sync', <businessId>]`, `['business-services-light', <businessId>]`
  - `['business-promotions-light', <businessId>]`
  - `['business-availability', <uuid>, <uuid>]`
  - `['business-awards']`, `['business-certifications']` (unscoped keys → persist across all users)
  - `['branches', <businessId>]` (dashboard) — same key as public but includes any private fields the dashboard variant selects
- Impact: any private business owner data these queries fetch is written to `localStorage` under `qitaat_rq_cache_v1` and read by the next visitor on the same browser (shared device / kiosk / handover). This is a real PII/business-data leak.
- Evidence: `rg` sweep of `src/pages/dashboard` query keys vs current allowlist/denylist.

**B2. `rfq_clarifications.author_user_id` has no FK to `auth.users`** (migration `20260712074141`)
- Column is `uuid NOT NULL` with no reference. RLS enforces `author_user_id = auth.uid()` on INSERT, but nothing blocks orphaned rows if a user is later deleted, and there is no cascade behavior. Consistency concern more than direct security, but flagged BLOCKER because `rfq_samples` uses proper `REFERENCES auth.users(id) ON DELETE SET NULL` and the inconsistency is trivial to fix now, painful later.

**B3. Verify-in-Pass-S: RLS coverage on new columns is inherited but not tested end-to-end**
- `quote_requests.award_reason / closed_at / requires_sample` and `opportunity_bids.decline_reason / revision_reason / revision_requested_by / price_breakdown / payment_terms / valid_until` were added via `ALTER TABLE` with no policy changes. They inherit existing table policies. Need to confirm with runtime SQL that:
  - a non-party authenticated user cannot SELECT `decline_reason` / `revision_reason` on someone else's bid,
  - a provider cannot SELECT another provider's `award_reason` on a shared RFQ (only the winner should see it, or it should be scoped to owner + winner),
  - anon returns zero rows on all new columns.
- If any check fails → escalates to a real BLOCKER; fix in Pass-S.

### 🟠 HIGH

**H1. Storage policies for `rfq-sample-photos` rely on `storage.foldername(name)[1]` = sample_id**
- Policies are correctly scoped to owner / provider staff / admin. Signed-URL usage is enforced client-side, not by policy. Verify: (a) bucket is created as PRIVATE (not public), (b) client code never generates public URLs for this bucket. Both need a runtime check.

**H2. Prerender ships anon key hard-coded as fallback in `scripts/prerender.mjs`**
- Anon key is public by design, so this is not a secret leak, but a hard-coded fallback masks CI misconfiguration and won't rotate cleanly. Should read from env only and fail loudly if missing.

**H3. Persist buster tied to `__BUILD_ID__` but not to allowlist version**
- Even after fixing B1, existing user browsers still hold the pre-fix cache until the next build. Bump the storage key (`qitaat_rq_cache_v1` → `_v2`) in the fix so old caches are dropped immediately at first load.

**H4. `securityDeepReview3.test.ts` failing status is not diagnosed in this pass**
- Test does static analysis for unsanitized `dangerouslySetInnerHTML` and edge-function guards. A failure here can be a real XSS finding. Needs to be run in isolation with `bunx vitest run src/tests/securityDeepReview3.test.ts` and the failing assertion inspected before launch.

**H5. Prerender crawlable block strategy**
- Injects a sibling of `#root` and relies on an inline script to remove it before hydration. Needs a runtime spot-check on a real prerendered file to confirm: (a) crawler HTML has the block, (b) real users don't see a flash, (c) removal script runs before React mounts.

### 🟡 NICE-TO-HAVE

- **N1.** `rfq_clarifications` has no `updated_at` and no update trigger — bodies are immutable by design (no UPDATE policy), which is correct, but consider adding an `edited_at` if edits are ever wanted.
- **N2.** `convert_awarded_bid_to_contract` builds `terms_composite` and `desc_composite` from user text with `||` concatenation. Not an SQL injection risk (bound parameters), but the Arabic labels embed literal newlines; verify PDF renderers handle them.
- **N3.** Dead-code sweep post-R1–R5.3 (superseded bid-card paths, orphan pages from Phase A route removal) — deferred deletion list, not a blocker.
- **N4.** File-size offenders and duplication between `journeyState` labels vs older status maps — refactor candidates.
- **N5.** Sitemap ↔ prerender manifest consistency check — the existing edge sitemap should be diff'd against `dist/prerender-manifest.json` groups so future divergence is caught.
- **N6.** Data hygiene: enumerate any test/dummy businesses, blog posts, sectors visible to a first anon visitor on `/`, `/search`, `/sectors`, `/blog`.
- **N7.** CSP / HSTS / COOP headers are still intentionally omitted per `public/_headers` — documented, not a launch blocker but worth revisiting.

---

## Fix Plan

### Pass-S — Security (do first, before any launch)

1. **Fix B1 (persist leak):**
   - Replace the broad prefixes `business, branches, services, reviews, certifications, awards, portfolio` with **exact-tuple matching** for the public business-profile queries only: match when `queryKey[0]` equals the prefix AND `queryKey[1]` looks like a public username (string, not UUID) OR the call originates from a public-profile hook. Simplest concrete rule: keep only the queries whose keys are `[<name>, username]` where `<name>` ∈ {'business'} and `[<name>, businessId]` where the businessId came from a resolved-public-business context — implemented by giving the public-profile hooks distinct key names (`business-public`, `branches-public`, …) and shrinking the allowlist to those exact prefixes.
   - Add to denylist: `edit, completion, draft, sync, light, availability, recent, activity, form`.
   - Bump storage key `qitaat_rq_cache_v1` → `_v2` (fixes H3).
   - Add a `queryPersist.test.ts` that iterates every dashboard/admin `queryKey` prefix (ripgrep-generated fixture) and asserts `shouldPersistQuery` returns false for all of them, and true for a fixed set of allowed public keys.

2. **Fix B2:** add `REFERENCES auth.users(id) ON DELETE SET NULL` to `rfq_clarifications.author_user_id` and `revision_requested_by` on `opportunity_bids` via a small additive migration. No policy change.

3. **Verify B3 with runtime SQL** (as anon, as authenticated-non-party, as awarded-provider, as losing-provider, as admin):
   - `SELECT decline_reason, revision_reason, revision_requested_by FROM opportunity_bids WHERE …` from each role.
   - `SELECT award_reason FROM quote_requests WHERE …` from each role.
   - `SELECT * FROM rfq_clarifications WHERE …` from each role including a losing-provider (must see only their own bid thread + general threads on RFQs they were invited to; must NOT see winning provider's bid thread).
   - `SELECT * FROM rfq_samples WHERE …` from a losing-provider (must be empty).
   If any leak → tighten policy immediately.

4. **Verify H1**: query `storage.buckets` to confirm `rfq-sample-photos` is `public = false`; grep client for `getPublicUrl.*rfq-sample-photos` — must be zero hits (only `createSignedUrl`).

5. **Fix H4**: run `securityDeepReview3.test.ts` in isolation, inspect each failing assertion, decide fix-or-suppress with written justification; if it flags an unsanitized HTML sink introduced this session, treat as BLOCKER.

6. **Sweep dist bundle** for leaked secrets: `grep -rE '(service_role|sk_live|SUPABASE_SERVICE)' dist/` — expect zero. `grep -E '[0-9]{10}' dist/assets/*.js | head` for phone patterns from non-public fields.

7. **SECURITY DEFINER re-audit**: dump the current definition of `award_opportunity_bid`, `convert_awarded_bid_to_contract`, `is_business_staff`, `has_admin_access`, `has_role`; confirm each has `SET search_path = public` (already true for `convert_awarded_bid_to_contract`; verify the others). Confirm no new SECURITY DEFINER was added this session outside these.

### Pass-L — Launch readiness (do second, before flip)

1. **Fix H2**: prerender script — require env vars, fail loudly if missing, drop the hard-coded anon-key fallback.

2. **Fix H5**: build once, open a prerendered sector + provider file from `dist/`, confirm crawler HTML contains `<h1>`, JSON-LD, and canonical; open in a real browser via `bunx vite preview` and confirm no visual flash; view-source vs runtime DOM.

3. **Build health**: run production `bun run build`, capture entry gz size vs the documented chunk budget in `docs/production-readiness.md`; open dev preview and clear-console-load `/`, `/search`, one prerendered provider, `/dashboard` — record any console error/warning.

4. **Error handling**: verify `ErrorBoundary` wraps the router, `/404` renders on unknown routes, and a mocked failing fetch on `HomeV2` shows the skeleton then a soft error (not a blank page).

5. **SEO/ops parity**: diff `public/sitemap.xml` + edge sitemap function output against `dist/prerender-manifest.json` groups; ensure `public/robots.txt` `Disallow` list still excludes `/q/` and admin, and does not forbid any prerendered path. Spot-check `<link rel="canonical">` on 2 prerendered files vs SPA fallback for the same route.

6. **Ops config checklist** (evidence only, no changes here):
   - `.env` VITE_SUPABASE_URL and PUBLISHABLE_KEY are the prod project ✓ (verified).
   - Confirm Resend sender domain state via `fetch_secrets` for RESEND-related keys.
   - Confirm no `MOYASAR_*_TEST` / sandbox literals in edge functions.
   - Confirm `VITE_GTM_ID` set ✓.

7. **N3–N6 sweeps** (dead code, duplication, file-size, dummy data): produce lists only; deletions land in a follow-up phase.

---

## Deliverables at end of each pass

- **Pass-S**: migration file adding the two FKs; `queryPersist.ts` rewrite + new test; runtime-SQL evidence pasted into `docs/pre-launch-audit.md`; storage bucket confirmation; `securityDeepReview3` verdict.
- **Pass-L**: build + prerender verification log; sitemap/robots diff; console-clean screenshots for the 4 key routes; dummy-data list; a launch-ready checkmark in `docs/release-readiness.md`.
