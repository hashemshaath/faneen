# Provider Data Enrichment & Real Activation — DRY RUN

**Mode:** DRY RUN only — no DB writes, no code changes, no QR activation, no contract linking.
**Date:** 2026-05-20
**Scope:** All 45 businesses in `public.businesses`.
**Status:** APPROVAL REQUIRED before any apply step.

---

## 1. Provider classification (Part A)

Totals: **45 businesses** — 30 demo (`is_demo=true`), 15 non-demo.

### 1A. Real beta-ready (1)
| business_id | name_ar | username | ref | verified | approval | owner | svcs | proj | staff | leads | contracts | sites | action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `e4f5a6b7-…8091` | إستيفاي للطاقة والاستدامة | istify | BIZ-5000012 | ✅ | published | USR-0001001 | 3 | 0 | 1 | 0 | 0 | 0 | **Pilot Priority 1** — proceed per Istify Owner Checklist |

### 1B. Real but incomplete — seed-catalog backed (9)
These were created as the original sector catalog (Aluminum/Glass/Steel). Verified + published, but logos/covers empty, no region/district, owners are mostly the system seed `00000000-…-001` or a small set of dev accounts. They have demo-like contracts seeded against them and **should not** be treated as live providers without owner reclaim.

| business_id | name_ar | ref | owner | svcs | proj | leads | contracts | sites | recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `a000…0001` | مصنع الرائد للألمنيوم | BIZ-5000001 | 99eb7842 | 3 | 3 | 0 | 2 | 0 | Hide from beta until real owner reclaims |
| `a000…0002` | شركة الأفق للنوافذ | BIZ-5000002 | system | 3 | 2 | 0 | 0 | 0 | Hide from beta |
| `a000…0003` | مؤسسة الواجهة للألمنيوم | BIZ-5000003 | 5cbc9d6c | 3 | 3 | 0 | 2 | 0 | Hide from beta |
| `a000…0004` | مصنع بلور للزجاج | BIZ-5000004 | 99eb7842 | 3 | 2 | 0 | 0 | 0 | Hide from beta |
| `a000…0005` | زجاج الخليج | BIZ-5000005 | system | 3 | 2 | 0 | 1 | 0 | Hide from beta |
| `a000…0006` | مرايا المملكة | BIZ-5000006 | 5cbc9d6c | 3 | 2 | 0 | 0 | 0 | Hide from beta (not verified) |
| `a000…0007` | مصنع الصلب العربي | BIZ-5000007 | 99eb7842 | 3 | 3 | 0 | 1 | 0 | Hide from beta |
| `a000…0008` | حديد الجزيرة | BIZ-5000008 | system | 3 | 2 | 2 | 1 | 0 | Hide from beta |
| `a000…0009` | استيل الشرق | BIZ-5000009 | 5cbc9d6c | 3 | 2 | 0 | 1 | 0 | Hide from beta |

### 1C. Real-but-incomplete — owner-claimed (1)
| business_id | name_ar | ref | owner | website | sites | action |
|---|---|---|---|---|---|---|
| `e570…3ce0` | مصنع النخبة للألمنيوم | BIZ-0005000 | 5cbc9d6c | https://alnokhba.com (in DB) | 1 | **Pilot Priority 2** candidate — needs owner re-verification + profile completion before QR |

### 1D. Personal/test records (4) — exclude from beta
| business_id | name_ar | ref | owner | onboarding | action |
|---|---|---|---|---|---|
| `156c…4718` | اعمالي | BIZ-5000011 | bff1ccef | 100% but empty | Personal test — exclude |
| `d0c1…f255` | salama | BIZ-5000165 | system | 0% draft | Test — exclude/archive |
| `1b35…f3f2` | مصنع اختبار للألمنيوم | BIZ-5000163 | 894e31dd | 0% draft | Test — exclude/archive |
| `4e74…57ce` | هاشم شعث | BIZ-5000164 | 0c0ec8cf | 0% draft | Personal — exclude |

### 1E. Demo/seed providers (30)
All `d3d3d3d3-0000-4000-8000-…` rows, `is_demo=true`. **Excluded from all real activation, QR, contracts, and enrichment.** No internet lookups. Keep for QA only.

---

## 2. Internet verification findings (Parts B + C)

**Important:** No live web verification was performed in this dry run. Per the rules ("do not invent data", "include source URL for each proposed link"), proposals below only list fields **already present in the DB** as candidates for promotion to "verified" after an owner confirms them in the UI. All other external fields are marked **not found — owner must supply**.

### 2A. Istify (`e4f5a6b7-…8091`)
| field | current | proposed | source | confidence | apply |
|---|---|---|---|---|---|
| website | `https://istify.sa` | keep | DB (owner-entered) | medium | review (owner re-confirms in UI) |
| email | `info@istify.sa` | keep | DB | medium | review |
| phone / mobile | empty | — | — | — | **owner must add via UI** |
| region / district | غربية / النعيم | needs city_id link | DB | medium | review (admin maps to canonical city) |
| sectors / sub_services | empty arrays | needs owner selection | — | — | owner UI action |
| Google Maps link | none | — | — | — | not found — owner must supply |
| Instagram / LinkedIn | none | — | — | — | not found |
| logo / cover | present | keep | DB | high | no action |

### 2B. Al-Nokhba (`e570…3ce0`)
| field | current | proposed | source | confidence | apply |
|---|---|---|---|---|---|
| website | `https://alnokhba.com` | keep | DB | medium | review (owner re-confirms) |
| email | `info@alnokhba.com` | keep | DB | medium | review |
| phone | `+966501234567` | flag as **needs review** — pattern looks like a placeholder sequence | DB | low | **review** |
| logo / cover | empty | — | — | — | owner must upload |
| region / city | "حي الصناعية، الرياض" in address only | — | — | — | owner maps city_id |

### 2C. All other non-demo (9 seed-catalog + 4 personal/test)
- No external verification proposed. All `@*-alu.com`, `@*-glass.com` emails are seed placeholders.
- Phones in pattern `+9661123450NN` are sequential seed data — **mark all as needs review, do not promote**.
- **Apply recommendation: NO** for every external field on these 13 businesses.

---

## 3. Model provider profile template (Part D)

Standard target profile per real Qitaat provider:

1. **Identity** — `name_ar`, `name_en`, `username`, `logo_url`, `cover_url`
2. **Trust** — `is_verified=true`, `city_id`, ≥1 service area, portfolio ≥3, optional years_experience
3. **Services** — ≥1 sector, ≥3 sub_services, keywords (search index)
4. **Contact** — `phone` (or `mobile`), `email`, `website`, Instagram, LinkedIn, Google Maps URL
5. **SEO** — public profile title (≤60 ch), meta description (≤160 ch), service keywords
6. **Operations capabilities** — can_receive_leads, can_create_contracts, can_create_client_sites, can_issue_qr (all gated by membership + verified)

**Completeness target for beta-ready:** Identity 100%, Trust ≥80%, Services ≥80%, Contact ≥60% (phone + email mandatory), SEO auto-derived, Operations all `true`.

---

## 4. Activation candidates (Part G)

| Priority | provider | missing fields | needs internet verification | needed UI actions | QR/site pilot ready? | contract pilot ready? |
|---|---|---|---|---|---|---|
| **1** | Istify | phone, sectors, sub_services, city_id, portfolio | Google Maps, Instagram, LinkedIn | owner login → complete profile → create 1 client site → issue QR | **Yes after owner UI session** | Yes (draft only) |
| **2** | Al-Nokhba | logo, cover, phone re-verify, city_id | website + maps owner confirmation | owner login → re-verify contact → upload logo/cover → create site | After completion | After completion |
| **3** | Seed-catalog (9) | owner reclaim, real contact, real address | full re-verification | reassign to real owner OR archive | **No** — exclude until reclaimed | **No** |
| Exclude | 4 personal/test + 30 demo | — | — | — | No | No |

---

## 5. QR / client-site activation plan (Part E)

- QR is issued on `client_sites` rows only — never on `businesses`.
- Pilot path: **Istify owner** creates 1 real client site via `/dashboard/client-sites`, visibility `private` → admin reviews → owner flips to `shared_by_qr` → rotates token → prints sticker.
- Public scan page `/s/:token` must show no address/phone/map/coords/`qr_token_hash`. Verified by `PublicSiteScan.tsx` privacy contract (Phase 4).
- **Do not** auto-create sites for any other provider in this phase. Al-Nokhba may follow after Priority 1 succeeds.

---

## 6. Contract linking plan (Part F)

Current contract states (14 contracts):
- **Locked (active/completed/cancelled/disputed):** 11 → **DO NOT touch** (no `execution_site_id`, no `execution_address_snapshot` retrofitting).
- **draft:** 2 (`d3d3…0001` demo, `c000…0008` seed) → demo/seed only — **do not link**.
- **pending_approval:** 2 (`d3d3…0002` demo, `c000…0005` seed) → demo/seed only — **do not link**.

**Conclusion:** Zero existing contracts are safe to link in this phase. **New** draft contracts created by Istify after their pilot site exists must call `set_contract_execution_site` so `execution_address_snapshot` is captured at activation.

---

## 7. Fields requiring approval before any apply

Approval is required for **each** of the following before Phase I (apply) runs:

1. **Istify** — promote `website`, `email` from DB to "verified" badge; map `city_id` for "غربية/النعيم".
2. **Al-Nokhba** — promote `website`, `email`; phone `+966501234567` flagged for owner re-confirmation (likely placeholder).
3. **Hide-from-beta flag** for the 9 seed-catalog businesses and 4 personal/test rows (admin UI toggle — does not delete data).
4. No bulk overwrites. No field is written without an explicit per-field approval row.

---

## 8. Records NOT to use

- All 30 demo rows (`is_demo=true`).
- 9 seed-catalog rows (`a0000000-…-000N`) — until reclaimed by a real owner.
- 4 personal/test rows: `aamaly`, `salama`, `biz-894e31dd37c1`, `biz-0c0ec8cfe0a4`.
- 11 locked contracts.
- 2 demo + 2 seed draft/pending contracts.

---

## 9. Risks

- **Privacy:** any seed phone/email promoted to "verified" would leak placeholder data publicly. Mitigation: per-field approval, owner UI re-entry only.
- **Ownership ambiguity:** 9 seed-catalog rows share 3 owner UUIDs across many businesses. Pushing them live would imply false business relationships. Mitigation: keep hidden.
- **Locked-contract drift:** retrofitting `execution_address_snapshot` to active/completed contracts would change legal evidence. Mitigation: strictly forbidden in this phase.
- **QR misuse:** issuing QR for non-onboarded sites would create dead public pages. Mitigation: QR only after admin review on a real site.
- **External verification gap:** this dry run did not perform live web lookups. Any future "verified" badge must cite the source URL recorded in an admin audit row.

---

## 10. Approval needed: **YES**

Please confirm explicitly:
- [ ] Proceed with Istify owner UI pilot only (per `docs/istify-pilot-owner-checklist.md`).
- [ ] Promote DB-present `website` / `email` for Istify and Al-Nokhba to verified after owner re-confirms in UI.
- [ ] Hide-from-beta toggle on 9 seed-catalog + 4 personal/test businesses (reversible).
- [ ] No changes to any contract.
- [ ] No automated internet enrichment writes in Phase I.

---

## Dry-run result: **PASS**

- No DB writes performed.
- No code modified (`bunx tsc --noEmit` not required).
- No RLS / auth / privacy regressions.
- Findings consistent with prior Phase 4 audit and Istify pilot readiness.
- Awaiting approval before any Phase I apply.