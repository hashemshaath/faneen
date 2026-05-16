# Manual Security & Production Verification Checklist

Companion to `docs/beta-launch-go-no-go.md`. Executing this checklist end-to-end
is what upgrades launch status from **CONDITIONAL GO** to **GO**.

---

## 1. Purpose

Automated gates (CI, vitest, smoke scripts, broken-links, sitemap, meta) are all
green. Three verification areas cannot be fully automated inside Lovable and
must be exercised by a human against the live (or staging) backend:

1. **RLS cross-tenant probes** — confirm one tenant cannot read another.
2. **RPC grants verification** — confirm `pg_proc.proacl` matches policy.
3. **Manual PDF Arabic visual QA** — confirm rendered PDFs are legible, RTL,
   and free of leaked fields.

Successful completion of every section below, with evidence captured (§7) and
sign-off recorded (§8), promotes launch status to **GO**.

---

## 2. Required Test Accounts

Provision these on the target environment before starting. Use throwaway
credentials that can be rotated after beta.

| Label | Role | Purpose |
|-------|------|---------|
| `admin-1` | admin | Admin analytics, PDF audit, legal review checks |
| `provider-A` | provider (business staff) | Owns business A, contracts, leads |
| `provider-B` | provider (business staff) | Owns business B; used for isolation probes vs A |
| `client-A` | client (contract party on A) | Reads only A-scoped contracts |
| `client-B` | client (contract party on B) | Reads only B-scoped contracts |
| `provider-unverified` *(optional)* | provider without verification | Confirms gated features hidden |
| `provider-inactive` *(optional)* | provider with inactive membership | Confirms tier limits enforced |
| `anon` | unauthenticated browser | Public/anon probes |

Record account IDs (USR-NNNNNNN) in the evidence log; never paste passwords.

---

## 3. RLS Cross-Tenant Probes

For every row below: log in as the **Test user**, attempt the **Action**, and
confirm the **Expected** outcome. Capture screenshot or query output.

### A. Provider A cannot read Provider B

| # | Test user | Action / Query | Expected | Actual | Pass/Fail |
|---|-----------|----------------|----------|--------|-----------|
| A1 | provider-A | `select * from contracts where business_id = <B>` | 0 rows | | |
| A2 | provider-A | Open `/dashboard/contracts/<B-contract-id>` | 404 or Forbidden | | |
| A3 | provider-A | `select * from leads where business_id = <B>` | 0 rows | | |
| A4 | provider-A | Open `/dashboard/leads/<B-lead-id>` | Forbidden | | |
| A5 | provider-A | `select * from contract_execution_sites where contract_id = <B-contract>` | 0 rows | | |
| A6 | provider-A | `rpc list_contract_pdf_exports({contract_id: <B-contract>})` | Error / empty | | |
| A7 | provider-A | `select * from businesses where id = <B>` (private fields) | Only public projection | | |
| A8 | provider-A | `rpc get_contract_analytics_dashboard({business_id: <B>})` | Error / denied | | |

### B. Client A cannot read Client B

| # | Test user | Action / Query | Expected | Actual | Pass/Fail |
|---|-----------|----------------|----------|--------|-----------|
| B1 | client-A | Open `/contracts/<B-contract-id>` | Forbidden | | |
| B2 | client-A | `select * from contract_execution_sites where contract_id = <B-contract>` | 0 rows | | |
| B3 | client-A | `rpc list_contract_pdf_exports({contract_id: <B-contract>})` | Error / empty | | |

### C. Provider cannot access admin analytics

| # | Test user | Action / Query | Expected | Actual | Pass/Fail |
|---|-----------|----------------|----------|--------|-----------|
| C1 | provider-A | `rpc get_admin_contract_analytics_dashboard()` | Denied | | |
| C2 | provider-A | Open `/admin/analytics` | Redirect / Forbidden | | |
| C3 | provider-A | Open `/admin/pdf-export-audit` | Redirect / Forbidden | | |

### D. Non-admin cannot access admin-only surfaces

| # | Test user | Action / Query | Expected | Actual | Pass/Fail |
|---|-----------|----------------|----------|--------|-----------|
| D1 | provider-A | `rpc admin_list_contract_pdf_exports()` | Denied | | |
| D2 | provider-A | `select * from contract_pdf_exports` direct | RLS denies | | |
| D3 | provider-A | `select * from contract_legal_review_events` | RLS denies | | |
| D4 | provider-A | `select internal_notes from contract_template_versions` | Denied / null | | |
| D5 | client-A | Same as D1–D4 | All denied | | |

### E. Public / anon cannot access protected surfaces

| # | Test user | Action / Query | Expected | Actual | Pass/Fail |
|---|-----------|----------------|----------|--------|-----------|
| E1 | anon | Open `/dashboard` | Redirect to `/auth` | | |
| E2 | anon | Open `/admin` | Redirect to `/auth` | | |
| E3 | anon | `rpc update_contract_draft_autosave(...)` | 401 / denied | | |
| E4 | anon | `rpc record_contract_pdf_export(...)` | 401 / denied | | |
| E5 | anon | GET signed-only storage object | 401 / 403 | | |
| E6 | anon | `select * from contract_template_versions where published = false` | 0 rows | | |

Any **Fail** row is a NO-GO trigger per `docs/beta-launch-go-no-go.md` §4.

---

## 4. RPC Grants Verification

Confirm each RPC is `SECURITY DEFINER`, has `EXECUTE` revoked from `PUBLIC` and
`anon`, and is granted only where intended.

### RPCs in scope

| RPC | Anon EXECUTE | Authenticated EXECUTE | Internal role check | Notes |
|-----|--------------|-----------------------|---------------------|-------|
| `update_contract_draft_autosave` | ❌ none | ✅ yes | Owning business staff | Whitelist enforced |
| `clone_contract_as_draft` | ❌ none | ✅ yes | Owning business staff | Strips PII |
| `set_contract_execution_site` | ❌ none | ✅ yes | Owning business staff | |
| `prepare_contract_prefill_from_lead` | ❌ none | ✅ yes | Owning business staff | |
| `link_lead_to_contract` | ❌ none | ✅ yes | Owning business staff | Audit row |
| `get_contract_analytics_dashboard` | ❌ none | ✅ yes | Owning business staff | Aggregates only |
| `get_admin_contract_analytics_dashboard` | ❌ none | ✅ yes | `has_admin_access` | |
| `record_contract_pdf_export` | ❌ none | ✅ yes | Owning business staff | |
| `list_contract_pdf_exports` | ❌ none | ✅ yes | Owning business staff | Privacy projection |
| `admin_list_contract_pdf_exports` | ❌ none | ✅ yes | `has_admin_access` | |
| `archive_expired_contract_pdf_exports` | ❌ none | ✅ yes (cron only) | `has_admin_access` or service_role | Idempotent |
| Legal review RPCs (`*_legal_review_*`) | ❌ none | ✅ yes | `has_admin_access` | |

### Verification queries (read-only)

Run as a DB admin against the target environment. None of these mutate data.

```sql
-- 4.1 List grants for in-scope RPCs.
select  n.nspname as schema,
        p.proname as function,
        p.prosecdef as security_definer,
        pg_get_userbyid(p.proowner) as owner,
        p.proacl as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'update_contract_draft_autosave',
    'clone_contract_as_draft',
    'set_contract_execution_site',
    'prepare_contract_prefill_from_lead',
    'link_lead_to_contract',
    'get_contract_analytics_dashboard',
    'get_admin_contract_analytics_dashboard',
    'record_contract_pdf_export',
    'list_contract_pdf_exports',
    'admin_list_contract_pdf_exports',
    'archive_expired_contract_pdf_exports'
  )
order by p.proname;

-- 4.2 Detect any function still executable by PUBLIC or anon.
select  p.proname,
        r.rolname,
        a.privilege_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and a.privilege_type = 'EXECUTE'
  and r.rolname in ('public', 'anon');
-- Expected: 0 rows for any RPC listed in §4.

-- 4.3 Confirm search_path hardening.
select proname, proconfig
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname like any (array[
    '%_contract_%', '%_pdf_export%', '%_legal_review%'
  ])
  and (proconfig is null or not ('search_path=public' = any(proconfig)));
-- Expected: 0 rows.
```

### Per-role spot checks

- As `anon` (no JWT): call each RPC via PostgREST → expect `401` or `permission denied`.
- As `authenticated` (provider-A JWT): call each RPC → expect success on own data, `permission denied` or empty result on cross-tenant data.
- As `authenticated` (provider-A JWT): call admin-only RPCs → expect internal role check to reject (not just RLS).
- As `service_role`: only `archive_expired_contract_pdf_exports` should be invoked from cron; never expose service_role to the browser.

Any unexpected grant or role bypass is a NO-GO trigger.

---

## 5. Manual PDF Visual QA

Use the reference cases in `docs/contract-pdf-qa.md`. Each case must be
exercised in **preview** and **download** modes, in **Arabic** and **English**.

### Test cases

1. Arabic contract with long clauses (>3 paragraphs per clause).
2. Contract with a populated **execution site** block (city only — no PII).
3. Contract with a multi-row **BOQ table** including quantities & VAT-inclusive totals.
4. Contract with **VAT section** at 15% inclusive.
5. Contract with **QR verification line** (URL + 16-char hash prefix only).
6. Contract with at least one **approved amendment** — appendix renders.
7. Bilingual contract — confirm both languages render coherently.

### Per-case checklist

Visual:
- [ ] Arabic shaping is correct (no isolated letterforms).
- [ ] RTL alignment for all Arabic blocks.
- [ ] LTR alignment for technical fields (phones, currencies, IDs).
- [ ] BOQ table is readable, columns not clipped.
- [ ] Header / footer present on every page.
- [ ] Page breaks do not split rows or section headers awkwardly.
- [ ] Fonts embedded (Amiri / IBM Plex Sans Arabic) — no fallback boxes.

Content / text layer:
- [ ] `pdftotext` output contains `العقد`, `الضريبة`, `الضمان` (no mojibake `þ` runs).
- [ ] Copy/paste of an Arabic clause into a text editor preserves characters.
- [ ] Search inside the PDF reader finds Arabic words.

Privacy (visually confirm absent):
- [ ] No signed URLs (`/storage/v1/object/sign`, `X-Amz-Signature`, `sign=`).
- [ ] No `internal_notes`.
- [ ] No raw UUIDs (only `PREFIX-NNNNNNN` IDs allowed).
- [ ] No full `document_hash` (only first 16 chars).
- [ ] No `client_email`, `client_phone`, `actor_id`, `approver_id`, `token_hash`.
- [ ] No `formula_inputs` JSON, no `audit_log`, no `audit_metadata`.

If any privacy item appears, **stop** — this is a NO-GO per §4.2 of the
Go/No-Go doc.

---

## 6. Production Smoke After Deploy

Run immediately after each production deploy. All steps must pass before
inviting external users.

- [ ] `https://qitaat.com/` loads, no console errors.
- [ ] Login (OTP and Google OAuth) succeed for `provider-A` and `admin-1`.
- [ ] `/dashboard` loads for `provider-A` within 3s.
- [ ] Create a lead from the public site → appears in `/dashboard/leads`.
- [ ] Create a contract **from the lead** (prefill works).
- [ ] Add an execution site (city only) and save.
- [ ] Save draft → autosave indicator confirms persistence.
- [ ] Export contract PDF → opens and contains Arabic text layer.
- [ ] `/dashboard/analytics` loads, period chips switch without 500.
- [ ] `/admin/analytics` loads for `admin-1`, no PII visible.
- [ ] Supabase edge function logs reviewed — no ERROR/FATAL in last 15 min.
- [ ] Browser console clean on every visited page.

---

## 7. Evidence Capture

For every verification (§3, §4, §5, §6) record:

| Field | Required content |
|-------|------------------|
| Test ID | e.g. `A1`, `RPC-4.1`, `PDF-Case-3` |
| Tester | Name + role |
| User account | Label from §2 (e.g. `provider-A`) — never paste passwords |
| Timestamp | ISO 8601 UTC |
| Command / action | Query, route, or UI action |
| Expected | Copy from this checklist |
| Actual | What happened |
| Evidence | Screenshot path or trimmed command output (no secrets) |
| Result | PASS / FAIL |

Store evidence in a private team folder. **Do not commit screenshots
containing real PII to the repo.**

---

## 8. Final GO Sign-Off

All owners must sign off before status moves to **GO**.

| Area | Owner | Date | Decision | Notes |
|------|-------|------|----------|-------|
| Security / RLS | Security owner | | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO | §3 + §4 complete |
| Product | Product owner | | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO | Scope confirmed |
| QA | QA owner | | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO | §5 + §6 complete |
| Engineering | Technical owner | | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO | Deploy & rollback ready |
| Support | Support owner | | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO | Playbook ready |
| **Final decision** | Decision owner | | ☐ **GO**  ☐ **CONDITIONAL GO**  ☐ **NO-GO** | Records overall outcome |

A single NO-GO sign-off in any row blocks external beta invites.

---

## 9. Known External Item — Visual Regression Baseline Reseed

| Field | Value |
|-------|-------|
| Status | **External / BLOCKED** — must run outside Lovable on Linux x64 |
| Reference | `e2e/VISUAL_REGRESSION.md` (Playwright Docker reseed procedure) |
| Mitigation during beta | Manual smoke (§6) after every deploy |
| Owner | Technical owner |
| Due date | Before GA (post-beta) |
| Sign-off | ☐ Reseed completed and committed |

This item does not block **beta** GO once §3–§6 are clean, but it must close
before general availability.

---

## Reference Files

- `docs/beta-launch-go-no-go.md` — Decision framework
- `docs/beta-launch-operations.md` — Operations runbook
- `docs/beta-launch-checklist.md` — Daily checklist
- `docs/beta-launch-communications.md` — Communication templates
- `docs/contracts-security-privacy.md` — RLS + RPC + PDF privacy reference
- `docs/contracts-launch-checklist.md` — Contract-specific technical gates
- `docs/contract-pdf-qa.md` — PDF reference cases
- `e2e/VISUAL_REGRESSION.md` — Baseline reseed guide

---

*Document version: 1.0*  
*Last updated: 2026-05-16*