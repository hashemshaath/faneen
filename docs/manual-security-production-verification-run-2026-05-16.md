# Manual Security & Production Verification — Run Log

**Date:** 2026-05-16  
**Operator:** Lovable agent (automated portion)  
**Source of truth:** `docs/manual-security-production-verification.md`  
**Scope:** Execute the automatable portions of Phase 5; document what still
requires a human against staging/production.

---

## 1. Summary

| Section | Mode | Result |
|---|---|---|
| §3 RLS cross-tenant probes (A/B/C/D/E) | **Manual — required** | ⏸ Pending human run against staging with real test accounts |
| §4 RPC grants verification | **Automated (this run)** | ✅ PASS (1 finding fixed) |
| §4.3 search_path hardening | **Automated (this run)** | ✅ PASS — 0 rows |
| §5 Manual PDF Arabic visual QA | **Manual — required** | ⏸ Pending human run with reference contracts |
| §6 Production smoke after deploy | **Manual — required** | ⏸ Run after deploy |

**Net recommendation:** Status remains **CONDITIONAL GO**. The single
automated finding (§4.1) has been fixed. §3, §5, §6 still require human
execution against staging/production with real multi-tenant test accounts
before status can be upgraded to **GO**.

---

## 2. §4 RPC Grants Verification — Automated

Queries from `docs/manual-security-production-verification.md` §4 were
executed read-only against the live backend.

### 2.1 Query 4.1 — definer + acl per RPC

All 11 in-scope RPCs returned:

- `prosecdef = true` ✅
- `proowner = postgres` ✅
- `proconfig = {search_path=public}` ✅
- `acl` grants `EXECUTE` to `authenticated` + `service_role` (+ internal
  `postgres`, `sandbox_exec`) ✅

### 2.2 Query 4.2 — any function still executable by PUBLIC or anon

**Result before fix:**

| function | grantee | privilege |
|---|---|---|
| `list_contract_pdf_exports` | `anon` | `EXECUTE` |

This violated the documented policy in `docs/manual-security-production-verification.md`
§4 ("Anon EXECUTE: ❌ none") and matched a Supabase linter warning
`0028_anon_security_definer_function_executable`.

**Data-leak impact:** None observed. The function body raises
`auth required` (SQLSTATE `28000`) when `auth.uid()` is NULL, so an
unauthenticated PostgREST call would receive an error, not data.
However, the grant alone still represents an undocumented attack surface
and must be removed.

**Fix applied:** Migration revoking `EXECUTE` from `anon` / `PUBLIC` and
re-granting only to `authenticated` + `service_role`.

```sql
REVOKE EXECUTE ON FUNCTION public.list_contract_pdf_exports(
  uuid, text, text, integer, integer, integer, integer
) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.list_contract_pdf_exports(
  uuid, text, text, integer, integer, integer, integer
) TO authenticated, service_role;
```

**Re-verification:**

| function | grantees with EXECUTE |
|---|---|
| `list_contract_pdf_exports` | `authenticated`, `service_role`, `postgres`, `sandbox_exec` |

`anon` and `public` no longer hold `EXECUTE`. ✅

### 2.3 Query 4.3 — search_path hardening

Result: **0 rows** — every SECURITY DEFINER function matching
`%contract%`, `%pdf_export%`, `%legal_review%` has
`SET search_path = public`. ✅

### 2.4 Per-role spot checks

- `anon` (no JWT): function-level grant now denies before the body runs.
- `authenticated` (own data): not exercised in this run — requires a real
  provider-A JWT against staging.
- `authenticated` (cross-tenant): not exercised in this run — requires
  provider-A JWT querying provider-B contracts.
- `service_role`: not exposed to the browser; reserved for cron.

The two `authenticated` spot checks remain a manual step (see §4 below).

---

## 3. §3 RLS Cross-Tenant Probes — Manual Step Required

**Status:** Not executed in this run.

**Why:** The probes require real test users (`provider-A`, `provider-B`,
`client-A`, `client-B`, `admin-1`, `anon`) provisioned against the target
environment and the ability to obtain JWTs for each. The Lovable agent
cannot impersonate live users; this must be executed by a human operator
with throwaway credentials.

**What to do:** Follow §3 tables A–E in
`docs/manual-security-production-verification.md`, capture evidence per
§7, and record the result in the sign-off matrix.

**Static evidence supporting the probes:**

- All in-scope SECURITY DEFINER RPCs re-validate `auth.uid()` and call
  `has_role` / `has_admin_access` internally (verified by reading the
  source of `list_contract_pdf_exports` and the contracts security memo
  in `docs/contracts-security-privacy.md`).
- Function `search_path` is locked.
- Anon `EXECUTE` is now removed where it should not be granted.

These are necessary but **not sufficient**; the live probes still must
run.

---

## 4. §5 Manual PDF Arabic Visual QA — Manual Step Required

**Status:** Not executed in this run.

**Why:** Visual QA requires opening generated PDFs in a real reader and
inspecting Arabic shaping, RTL alignment, BOQ layout, page breaks, and
font embedding. The agent's automated coverage stops at:

- `npm run verify:pdf-arabic` (CI gate) — confirms `pdftotext` output
  contains `العقد`, `الضريبة`, `الضمان`, `الشروط`, `الله`, `أحد` with no
  mojibake `þ` runs. Enforced by `.github/workflows/pdf-arabic-verify.yml`
  and `src/lib/__tests__/contract-pdf-arabic-text.test.ts`.
- `src/lib/__tests__/contract-pdf-export.test.ts` privacy guard — forbids
  `file_url`, `storage_path`, `getSignedUrl`, `sign=`,
  `/storage/v1/object/sign`, `X-Amz-Signature`, `internal_note`,
  `actor_id`, `approver_id`, `token_hash`, `formula_inputs`,
  `draft_template`, `audit_metadata`, `audit_log`, and raw UUIDs.

**What to do:** Run the 7 reference cases in
`docs/manual-security-production-verification.md` §5 and
`docs/contract-pdf-qa.md`. Record per-case results per §7.

---

## 5. §6 Production Smoke After Deploy — Manual Step Required

**Status:** Run immediately after each production deploy. Not part of
this pre-deploy verification run.

---

## 6. Bugs / Blockers Found

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Policy violation (no observed leak) | `list_contract_pdf_exports` had `EXECUTE` granted to `anon`, contradicting §4 of the manual verification doc | **Fixed this run** — migration applied, re-verified |

No cosmetic issues found in scope.

---

## 7. Fixes Applied

1. Migration revoking `EXECUTE` from `anon` / `PUBLIC` on
   `list_contract_pdf_exports` and re-granting to `authenticated` +
   `service_role`. Verified by re-running query §4.2 — no anon grant
   remains.

No application code, RLS, auth flow, or contract logic changed.

---

## 8. Linter Notes

`supabase--linter` reports 268 warnings project-wide after the fix (was
269 before). The remaining warnings are pre-existing and out of scope
for Phase 5:

- `0011_function_search_path_mutable` on legacy functions outside the
  contract scope.
- `0024_permissive_rls_policy` warnings on a handful of tables — review
  separately.
- `0025_public_bucket_allows_listing` on two public storage buckets —
  intentional for branding/static assets; review separately.
- `0028_anon_security_definer_function_executable` on functions outside
  the contract scope (e.g. public-facing search/lookup RPCs). Each must
  be triaged separately; **none are in the §4 in-scope list**.

These do not block beta GO for the contracts surface but should be
triaged before GA.

---

## 9. Final Recommendation

**CONDITIONAL GO — unchanged.**

Automated §4 verification is now **PASS** with one finding fixed and
re-verified. Status upgrades to **GO** once a human operator completes:

1. §3 RLS cross-tenant probes (A/B/C/D/E) against staging with real
   provider-A, provider-B, client-A, client-B, admin-1, and anon
   sessions.
2. §5 manual PDF Arabic visual QA for all 7 reference cases.
3. §6 production smoke immediately after the production deploy.

Record sign-offs in `docs/manual-security-production-verification.md`
§8. A single NO-GO in any row blocks external beta invites.

---

## 10. Sign-off Pointer

After the three manual steps above pass, update
`docs/beta-launch-go-no-go.md` decision line from **CONDITIONAL GO** to
**GO** and record the sign-off matrix.

*Document version: 1.0*
*Generated: 2026-05-16*