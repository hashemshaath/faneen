
# Admin Client Sites — Test Data Seeding (DRY RUN)

**Status:** DRY RUN only. No DB writes performed. Awaiting explicit approval before applying.

## A. Test Run Identity

- `test_run_id = 'admin-sites-qa-2026-05-20'`
- All rows marked with `is_demo = true` (column exists on `businesses`, `client_sites`, `lead_requests`, `contracts`).
- Name prefix: `QA — …` (Arabic: `اختبار — …`).
- Free-text marker in `notes` / `internal_notes` / `access_notes` / `reason` / `terms_ar`: `admin-sites-qa-2026-05-20`.
- No `metadata jsonb` column on target tables; relying on `is_demo + name prefix + marker text`.

## B. Schema Findings (relevant)

- `client_sites`: `business_id NOT NULL`, has `owner_user_id`, `client_user_id`, `is_demo`, `qr_token_hash`, `qr_enabled`, `visibility`, `site_ref` (auto via trigger `client_sites_set_ref_before_insert`). Triggers also seed visibility and notification prefs.
- `client_site_access_grants`: states via timestamp columns (`requested_at`, `approved_at`, `rejected_at`, `revoked_at`, `ignored_at`) + `status`. **Currently 0 rows.**
- `lead_requests`: has `is_demo`, `source_site_id`, `initiated_by`, `site_access_grant_id`, `source` text.
- `contracts`: has `is_demo`, `execution_site_id`, `execution_address_snapshot jsonb`, `locked_at`, `document_hash`. Existing 14 contracts will not be touched.
- **No `issue_client_site_qr_token` RPC exists** in current DB. QR will be seeded by computing `qr_token_hash = encode(digest(token, 'sha256'), 'hex')` directly via pgcrypto in the apply migration, and the plaintext tokens will be returned **only in the apply report** for QA scanning. This matches the security contract (DB stores hash only).

## C. Existing Data Baseline

| Table | Rows | Demo |
|---|---|---|
| businesses | 45 | 30 |
| profiles | 10 | n/a |
| client_sites | 1 | 1 (Istify) |
| contracts | 14 | 0 |
| lead_requests | 17 | 0 |
| client_site_access_grants | 0 | 0 |

Istify and all existing real providers/contracts will **not** be modified.

## D. Proposed Providers (5)

All `is_demo=true`, `approval_status='approved'`, `is_verified=true`, `membership_tier='free'`, no real phone (use `+966500000xxx` test range), `username` prefixed `qa-`.

| # | name_ar | name_en | username | sectors |
|---|---|---|---|---|
| P1 | اختبار — أعمال الألمنيوم | QA — Aluminum Works | qa-aluminum-works | aluminum |
| P2 | اختبار — الزجاج والواجهات | QA — Glass & Facades | qa-glass-facades | glass |
| P3 | اختبار — الطاقة الذكية | QA — Smart Energy | qa-smart-energy | electrical |
| P4 | اختبار — الخشب والمطابخ | QA — Wood & Kitchens | qa-wood-kitchens | wood |
| P5 | اختبار — الأعمال المعدنية | QA — Metal Works | qa-metal-works | steel |

Each provider:
- 1 `profiles` row (synthetic `user_id = gen_random_uuid()`, no `auth.users` insert, no password).
- 1 `businesses` row (provider).
- 1 `business_staff` row (owner).
- 2 `business_services` rows.
- 1 `business_service_areas` row (Riyadh).

**Note:** Synthetic `user_id` UUIDs are not in `auth.users`. They cannot log in. This is intentional and safe — only admin monitoring views are validated.

## E. Proposed Clients (3)

Each client = profile + small client-side `businesses` row (needed because `client_sites.business_id` is NOT NULL).

| # | Client | Business (owner of sites) |
|---|---|---|
| C1 | اختبار — مالك فيلا | QA — Villa Owner Holding |
| C2 | اختبار — صالة عرض | QA — Retail Showroom Co |
| C3 | اختبار — مدير مكتب | QA — Office Manager LLC |

Each: 1 profile + 1 `businesses` (is_demo=true, approval_status='approved') + 1 `business_staff` (owner).

## F. Proposed Client Sites (8)

`business_id` = the client's business. `owner_user_id` = client profile user_id. `is_demo=true`. `site_ref` auto-generated.

| # | client | site_name | site_type | city | visibility | qr_enabled |
|---|---|---|---|---|---|---|
| S1 | C1 | اختبار — فيلا الرياض | villa | الرياض | shared_by_qr | true |
| S2 | C1 | اختبار — شقة جدة | apartment | جدة | shared_by_qr | true |
| S3 | C2 | اختبار — صالة عرض الخبر | showroom | الخبر | shared_by_qr | true |
| S4 | C2 | اختبار — فرع تجاري الدمام | branch | الدمام | shared_by_qr | true |
| S5 | C3 | اختبار — مكتب جدة | office | جدة | shared_by_qr | true |
| S6 | C3 | اختبار — مستودع الرياض | warehouse | الرياض | private | false |
| S7 | C1 | اختبار — مشروع الرياض | project | الرياض | shared_by_qr | true |
| S8 | C2 | اختبار — صالة عرض الرياض | showroom | الرياض | private | false |

Triggers will seed `client_site_visibility_settings` and `client_site_notification_preferences` automatically.

## G. QR Tokens

For S1–S5, S7 (6 sites with `qr_enabled=true`):
- Generate random token via `encode(gen_random_bytes(24), 'base64url')`.
- Store `qr_token_hash = encode(digest(token, 'sha256'), 'hex')`.
- Set `qr_enabled=true`.
- Plaintext tokens returned in apply report (QA only). Not stored anywhere.
- Public `/s/:token` will resolve and show **limited summary only** (existing route logic enforces this).

S6, S8: `private`, `qr_enabled=false`, no token. Expected `/s/:token` 404.

## H. Access Grants (15)

Distribution across 6 QR-enabled sites × 5 providers:

| state | count | notes |
|---|---|---|
| requested (pending) | 5 | `status='requested'`, only `requested_at` set |
| approved | 5 | `status='approved'`, `approved_at` set |
| rejected | 2 | `status='rejected'`, `rejected_at` set |
| ignored | 2 | `status='ignored'`, `ignored_at` set |
| revoked | 1 | was approved then revoked, both timestamps set |

`access_level` mix: `limited` ×8, `quote` ×4, `service` ×2, `contract` ×1.
`reason`: `"admin-sites-qa-2026-05-20 — QA seed"`.

## I. Provider Interests / Leads (15)

`lead_requests` rows with:
- `is_demo=true`
- `source='site_qr'`
- `initiated_by='provider'`
- `source_site_id` = one of S1–S5,S7
- `business_id` = QA provider's business
- `site_access_grant_id` set when grant exists
- `name` = `QA Provider Name`, `email` = `qa-leadN@qitaat.test`, `phone` = `+966500000xxx`
- `subject` prefixed `QA —`
- `internal_notes` = `admin-sites-qa-2026-05-20`
- `status` mix: `new` ×6, `viewed` ×4, `interested` ×3, `contacted` ×2

## J. Contracts (15)

All `is_demo=true`, `provider_id` from 5 QA providers, `client_id` from 3 QA clients, `business_id` = provider's business. `execution_site_id` from S1–S8. `execution_address_snapshot` = `{site_ref, site_name, site_type, city_name, district}` (no PII).

Distribution:
- **draft ×12** (`status='draft'`)
- **pending_approval ×3** (`status='pending_approval'`)
- **active ×0** (skipped to avoid `document_hash` / lock side effects)

`contract_number` auto via `generate_ref_id('CNT','seq_cnt')`.
`title_ar` prefixed `اختبار —`. `total_amount` SAR 10,