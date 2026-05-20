# Istify Activation Prep — Phase I (Approved)

**Mode:** Prep only. No DB writes. No QR issued. No contracts touched.
**Business:** `e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8091` — إستيفاي للطاقة والاستدامة (Istify – Smart Energy & Sustainability), `istify` / `BIZ-5000012`.
**Owner:** `USR-0001001` — محمد العتيبي (`user@faneen.com`), `business_staff.role = owner`. Has `user_roles.role = user`.

---

## 1. Istify approved fields (already in DB, safe to keep)

| Field | Value | Status |
|---|---|---|
| `name_ar` | إستيفاي للطاقة والاستدامة | ✅ approved |
| `name_en` | Istify – Smart Energy & Sustainability | ✅ approved |
| `username` | `istify` | ✅ approved |
| `ref_id` | `BIZ-5000012` | ✅ approved |
| `email` | `info@istify.sa` | ✅ approved (domain matches website) |
| `website` | `https://istify.sa` | ✅ approved |
| `city_id` | Jeddah (`c10b6c84-…6697`) | ✅ approved |
| `region` (text) | الغربية | ✅ approved |
| `district` (text) | النعيم | ✅ approved |
| `logo_url` | present | ✅ approved |
| `cover_url` | present | ✅ approved |
| `is_verified` | true | ✅ approved |
| `approval_status` | `published` | ✅ approved |
| `onboarding_completion` | 100 | ✅ approved |
| Services (3) | كفاءة الطاقة · الطاقة المتجددة · الامتثال للاستدامة | ✅ approved |
| Service areas (1) | Jeddah / النعيم | ✅ approved |
| Staff | 1 owner (USR-0001001) | ✅ approved |

**No DB updates required for the approved set** — all values are already correct and consistent.

---

## 2. Fields requiring owner completion (UI only)

| Field | Current | Why needed | Where (UI) |
|---|---|---|---|
| `phone` / `mobile` | empty | Required for lead contact, contract PDFs, QR sticker | `/dashboard/settings` → Contact |
| `address` / `street_name` / `building_number` | empty | Required for client-site & contract address snapshots | `/dashboard/settings` → Address |
| `sectors` (array) | `{}` | Needed for sector filters & SEO routes | `/dashboard/settings` → Sectors |
| `sub_services` (array) | `{}` | Needed for autocomplete & matching | `/dashboard/settings` → Sub-services |
| Portfolio projects | 0 | ≥1 real project required for "trust" target | `/dashboard/showcase` |
| Website re-confirm | `https://istify.sa` | Owner confirms link works | `/dashboard/settings` checkbox |
| Email re-confirm | `info@istify.sa` | Owner confirms reachable | `/dashboard/settings` checkbox |
| Service descriptions | seeded titles only | Each of 3 services should have owner-written description | `/dashboard/services` |
| Working hours *(optional)* | none | Improves profile completeness | `/dashboard/settings` |
| Google Maps link *(optional)* | none | Used by client-site form when creating sites | Captured per site, not on business |
| Instagram / LinkedIn *(optional)* | none | Trust signals | `/dashboard/settings` → Social |

---

## 3. Fields NOT applied (missing verification)

- No external URLs were fetched. No social media or maps link will be inserted by automation.
- Phone number remains empty — **must** be entered by owner; will never be inferred from web.
- Address remains empty — **must** be entered by owner per site (client-site address) or per business (HQ).
- No bulk overwrite to `sectors` / `sub_services` — owner picks from the canonical catalog.

---

## 4. Owner UI checklist (محمد العتيبي)

Run in one sitting from `/dashboard`:

1. **Sign in** with `user@faneen.com` → confirm redirect lands on `/dashboard` (provider view), not `/admin/*`.
2. **Contact** — add `mobile` (Saudi format `+9665XXXXXXXX`), keep `email` and `website`.
3. **Address** — set street, building number, additional number; confirm city Jeddah / district النعيم.
4. **Sectors & sub-services** — pick from the canonical list (Energy is not in the 4 industrial sectors — use the catalog as-is; do not invent).
5. **Services** — for each of the 3 existing services, add a 2–4 sentence description.
6. **Portfolio** — add ≥1 real project with cover image and short description in `/dashboard/showcase`.
7. **Re-confirm** website + email checkboxes.
8. **Save** — onboarding_completion stays 100; profile completeness bar should now show ≥80% on Trust.

---

## 5. QR / client-site activation steps (no QR on business)

1. Owner opens `/dashboard/client-sites` → **Create site**.
2. Required fields: `site_name`, `site_type`, `city` (Jeddah), `district`, `address_line1`, optional `map_url`, optional `contact_name` / `contact_phone`, `visibility = private`.
3. Owner submits → site appears in list with `site_ref` auto-issued.
4. Admin reviews on `/admin/client-sites` (no sensitive reveal unless reason ≥5 chars supplied → audit row written).
5. Owner edits site → **Visibility → `shared_by_qr`** → presses **Issue QR**. Token is hashed server-side; raw token shown once.
6. Owner downloads / prints the QR sticker from `ClientSiteQrCard`.
7. **Verification — incognito tab:** open `/s/:token`:
   - shows site name + city + summary only
   - **no** address / phone / map / coordinates
   - **no** `qr_token_hash`
   - rotating the QR → old token returns 404

---

## 6. Contract linking policy

- All 14 existing contracts remain **untouched** (11 locked + 3 demo/seed drafts).
- `execution_address_snapshot` on any existing contract: **do not modify**.
- After the Istify site exists, any **new draft** contract may set `execution_site_id` via `set_contract_execution_site`, which captures `execution_address_snapshot` (site_ref, site_name, site_type, address) at activation time.
- PDF must show the safe execution-site snapshot block.

---

## 7. Admin monitoring (post owner session)

After owner creates the site, verify on `/admin/client-sites`:
- Istify site row visible with correct `site_ref`, city, visibility.
- KPIs reflect scans, access requests, interests, linked contracts.
- Sensitive reveal requires reason ≥5 chars and writes an audit row.

---

## Result: **PASS**

- No DB writes performed.
- No code modified.
- No QR issued on business.
- No contracts touched.
- Approved-field set ready; owner UI checklist ready; admin monitoring path verified.

Approval to proceed with the owner UI session: **YES** (per the existing `docs/istify-pilot-owner-checklist.md`).