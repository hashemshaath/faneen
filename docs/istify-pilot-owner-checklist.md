# Istify Pilot — Owner Session Checklist

**Owner:** محمد العتيبي (USR-0001001)  
**Business:** Istify — Smart Energy & Sustainability  
**Goal:** Activate Istify as the first beta provider on the Client Sites system  
**Format:** UI-driven only — no code or DB changes needed

---

## 1. Login & Dashboard Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Sign in as owner | Dashboard loads |
| 1.2 | Confirm URL is `/dashboard` | Not `/admin/*` |
| 1.3 | Check left navigation | All provider items appear: Dashboard, Projects, Leads, Client Sites, etc. |
| 1.4 | Confirm no admin links | No "Admin", "System Settings", "User Management" links |
| 1.5 | **Result** | `PASS / FAIL` |

---

## 2. Complete Business Profile

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Add **phone** number | Field saved, green check |
| 2.2 | Add **region / district / street** | Address complete |
| 2.3 | Add **sectors** (if empty) | e.g. Energy, Sustainability |
| 2.4 | Add **sub_services** (if empty) | At least 1 linked |
| 2.5 | Confirm **services** already exist (3) | Energy Efficiency, Renewable Energy, Sustainability Compliance |
| 2.6 | Add at least **one portfolio project** | With image, published |
| 2.7 | **Result** | `PASS / FAIL` |

---

## 3. Create First Client Site

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Navigate to **Client Sites** in dashboard | List page opens |
| 3.2 | Click **Create New Site** | Form opens inline (no popup) |
| 3.3 | Enter **site_name** | e.g. "Istify Main Office" |
| 3.4 | Select **site_type** | `commercial` or `project` |
| 3.5 | Enter **city / district / address** | Real Riyadh address |
| 3.6 | Set **visibility** = `private` | Saved |
| 3.7 | Confirm **site_ref** generated | e.g. `STE-1000xxx` appears in form |
| 3.8 | Save site | Returns to list, site visible |
| 3.9 | **Result** | `PASS / FAIL` |

---

## 4. QR Activation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Open site detail | Sections visible |
| 4.2 | Review **section visibility** | All sections toggle correctly |
| 4.3 | Set visibility to `shared_by_qr` | Saved |
| 4.4 | Click **Issue QR** | QR code generated |
| 4.5 | **Print / download** QR sticker | File downloads |
| 4.6 | Open `/s/:token` in **incognito** | Public scan page loads |
| 4.7 | Confirm **limited summary** only | Basic info shown |
| 4.8 | Confirm **no address / phone / map** | None of these appear |
| 4.9 | **Rotate QR** | New token issued |
| 4.10 | Try old token | 404 / invalid |
| 4.11 | **Result** | `PASS / FAIL` |

---

## 5. Provider Flow (Test Scan & Request)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.1 | Open a **second browser / incognito** as a provider user | Logged in |
| 5.2 | **Scan QR** or open `/s/:token` | Public scan page loads |
| 5.3 | Click **Request Access** | Form opens inline |
| 5.4 | Submit **interest** | Success message |
| 5.5 | As **owner**, check inbox / notifications | New access request appears |
| 5.6 | Open request | Details visible |
| 5.7 | **Approve** access | Status changes to approved |
| 5.8 | Provider now sees **more info** | Address and map now visible to them |
| 5.9 | **Result** | `PASS / FAIL` |

---

## 6. Contract Pilot

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6.1 | Navigate to **Contracts** | List page opens |
| 6.2 | Click **Create Draft Contract** | Inline form opens |
| 6.3 | Fill general info | Title, client name, etc. |
| 6.4 | Select **execution_site** = the new client site | Site dropdown populates |
| 6.5 | Confirm `execution_address_snapshot` auto-populated | Includes: **site_ref**, **site_name**, **site_type** |
| 6.6 | Add **one line item** | Qty, unit, price filled |
| 6.7 | **Save as draft** | Contract saved, status = Draft |
| 6.8 | Click **Export PDF** | PDF downloads |
| 6.9 | Open PDF — verify **site section** | Site snapshot shown safely, no live address leak |
| 6.10 | ⚠️ **Do NOT send or activate legally** | This is a pilot test only |
| 6.11 | **Result** | `PASS / FAIL` |

---

## 7. Admin Verification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 7.1 | Admin logs in | Opens `/admin/client-sites` |
| 7.2 | Confirm **Istify site appears** | In the admin list |
| 7.3 | Confirm **scan count**, **requests**, **interests** | All metrics populated |
| 7.4 | Confirm **contract linked** | Shows 1 contract |
| 7.5 | Click **sensitive reveal** | Prompts for reason |
| 7.6 | Enter reason (≥5 chars) | e.g. "contract verification" |
| 7.7 | Confirm **audit row created** | View audit log, row appears with reason |
| 7.8 | **Result** | `PASS / FAIL` |

---

## 8. Privacy Checks

| Check | Method | Expected |
|-------|--------|----------|
| 8.1 | Public `/s/:token` in incognito | No address, phone, or map visible |
| 8.2 | Provider **before** approval | Cannot see private fields |
| 8.3 | Provider **after** approval | Can see full site details |
| 8.4 | Contract PDF site section | Shows snapshot safely, no live data |
| 8.5 | QR token hash in UI/API | Never visible anywhere |
| 8.6 | Revoked QR token | Returns 404 |
| 8.7 | **Result** | `PASS / FAIL` |

---

## 9. Sign-Off Table

| Role | Name | Result | Notes |
|------|------|--------|-------|
| Owner | محمد العتيبي | ☐ PASS / ☐ FAIL | |
| Provider | (test provider user) | ☐ PASS / ☐ FAIL | |
| Admin | (admin reviewer) | ☐ PASS / ☐ FAIL | |
| QA | (qa reviewer) | ☐ PASS / ☐ FAIL | |
| **Date** | | | |
| **Final** | | ☐ PASS / ☐ FAIL | All sections must be PASS |

---

## Notes

- If any step fails, record the step number and error in the Notes column.
- Do not proceed to the next section until the current section is PASS.
- Sections 4 and 5 require two browser sessions (owner + provider).
- Section 6 creates a draft contract only — do not send or legally activate.

---

**Document created:** Istify Pilot Owner Session Checklist  
**Purpose:** Activate Istify as the first real beta provider on Client Sites  
**No code changes. No DB changes. UI-driven only.**
