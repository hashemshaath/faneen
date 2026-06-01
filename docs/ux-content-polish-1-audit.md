# UX-CONTENT-POLISH-1 — Public Pages Audit

Scope: audit-only deliverable for UX-CONTENT-POLISH-1.
No DB/RLS/business-logic changes. SEO-1..SEO-10A invariants preserved.
Implementation per page is deferred to UX-CONTENT-POLISH-1B onward so
each public surface gets a focused, reviewable change set rather than
one broad redesign (explicitly disallowed by this phase).

## How to read this document

- **Severity**: P0 (must fix), P1 (should fix), P2 (safe polish),
  P3 (defer — out of scope this initiative).
- **Risk**: chance the recommended fix breaks SEO/tests/RTL/data-safety
  if implemented carelessly. Low/Med/High.
- All copy suggestions are Arabic-first, Saudi-market tone, no
  unproven superlatives, no literal translations.

## Findings table

| # | Page / File | Issue | Sev | Recommended fix | Risk |
|---|---|---|---|---|---|
| 1 | `Index.tsx` -> `FinalCTASection` | Trust strip says "تغطية المملكة / Saudi-wide coverage" — reads as a coverage promise we cannot prove (provider density is uneven by city). | P0 | Soften to "تغطية متعددة المدن السعودية / Coverage across multiple Saudi cities". | Low |
| 2 | `Index.tsx` -> `TrustSection` | Trust badges describe what providers did ("بيانات مكتملة", "صور أعمال مضافة") — useful, but the section header still implies platform-level verification. No link to a "how verification works" anchor. | P1 | Add one line under header: "نراجع البيانات قبل النشر، ولا نضمن نتائج التنفيذ." with link to `/about#trust`. | Low |
| 3 | `Index.tsx` -> `WhoIsItForSection` | Final CTA is `/about` labelled "اختر المسار المناسب لك" — vague, weak conversion. | P1 | Split into two CTAs: "اطلب عرض سعر" -> `/search?intent=quote`, "أضف منشأتك" -> `/auth?mode=signup&role=provider`. | Low |
| 4 | `Index.tsx` -> `HowItWorksV2` | One CTA at the bottom (buyer-side only). Provider audience drops off here. | P1 | Add a secondary CTA "هل أنت مزود خدمة؟ سجّل منشأتك" -> `/for-providers`. | Low |
| 5 | `HeroV2` (homepage hero) | Hero block not re-audited line-by-line this turn. | P1 | Verify hero contains one H1, one primary CTA, one secondary CTA above the fold. | Low |
| 6 | `ForProviders.tsx` | 1,225 lines, 8+ sections. Value-prop dilution; competing CTAs in every section. | P1 | Reorder: Hero -> Value pillars (4) -> How it works (4 steps) -> Membership preview -> Trust -> FAQ -> Final CTA. Collapse onboarding checklist into one accordion. Move Comparison/Capabilities/Audience grid below the fold. | Med (split into >=3 PRs). |
| 7 | `ForProviders.tsx` Tier block | Pricing literals "٩٩ / 99" and "٢٩٩ / 299 SAR/mo" hard-coded; membership is business logic. | P0 (audit) | Verify against `Membership.tsx` and `membership_tiers` config. If diverged, replace with "اعرض خططنا" -> `/membership` instead of hard-coding. | Med (pricing copy). |
| 8 | `ForProviders.tsx` Trust pillars | Claims "متوافق مع نظام حماية البيانات (PDPL)", "استضافة في المنطقة". | P0 | Confirm each claim with platform/legal before keeping; remove unsupported claims. SSL/Arabic-English/VAT 15% are fine. | Low (text). |
| 9 | `Compare.tsx` | Empty state (no IDs selected) has no contextual help on why to compare. | P1 | Add subtitle: "اختر حتى 4 مزودين لمقارنة الأسعار والتقييمات والخدمات قبل التواصل." + 1 example chip set. | Low |
| 10 | `Search.tsx` | Bare `/search` default state shows a generic header. No "popular sectors / cities" entry chips. | P1 | Render `SectorChipsBar` (or scoped variant) when `q` empty and no filters. | Low |
| 11 | `Showcase.tsx` | Verified-only filter shipped in SEO-10A; copy does not say "كل المزودين هنا تم التحقق منهم". | P1 | Add one sentence under hero: "كل المنشآت المعروضة هنا تم التحقق من بياناتها." Reinforces SEO-10A invariant for users, not just crawlers. | Low |
| 12 | `Projects.tsx` | Hero copy does not explain why a buyer should browse projects. No CTA "اعثر على مزود لمشروع مشابه" linking to `/search`. | P1 | Add hero subline + one secondary CTA. | Low |
| 13 | `ProjectDetail.tsx` | Leaf links shipped in SEO-7/8. Missing "اطلب مشروع مماثل" CTA. | P2 | Add small action card on desktop with CTA -> `/search?intent=quote&category=<sector>`. | Low |
| 14 | `BusinessProfile.tsx` | Public conversion endpoint. Not exhaustively audited this turn. Known concerns: contact-reveal flow, brand/service link density, mobile sticky CTA. | P1 | Dedicate UX-CONTENT-POLISH-1D to BusinessProfile. | Med |
| 15 | `SectorLanding.tsx` (811 lines) | Intro copy sector-generic — same template across all 5 sectors. | P2 | Use sector-specific framing from `lib/sector-keywords` (already exists). | Low |
| 16 | `SectorsHub.tsx` | Explains what sectors are but not what to do next. | P2 | Verify per-card micro-CTA "تصفح المزودين" added in SEO-6 reads correctly. | Low |
| 17 | `Services.tsx` / `ServiceDetail.tsx` | Generic-intro risk; ensure "خدمة معتمدة" badge only renders when `approval_status='approved'`. | P1 | Audit `business_services.approval_status` gate before any badge copy change. | Med (data condition). |
| 18 | `BrandsCatalog.tsx` / `BrandDetail.tsx` | SEO-6 added hub links. Add "العلامات المعروضة هي علامات معتمدة من إدارة المنصة." | P2 | One-line subtitle. | Low |
| 19 | `Contact.tsx` | No expectation-setting ("نرد خلال X ساعة"). | P2 | Only add SLA if one exists; otherwise "نرد في أقرب وقت ممكن خلال أيام العمل." | Low |
| 20 | `About.tsx` (618 lines) | Likely contains generic mission/vision blocks. | P2 | Tighten to: ما هي قطاعات، لمن، كيف تعمل، حدود المسؤولية. Target <=4 sections. | Low |
| 21 | Global RTL claims | Memory rule forbids physical RTL classes. No public-page audit script exists. | P2 | Extend `pagePolishRepairs1.test.ts` to cover the 16 public pages. | Low |
| 22 | Global private-link bleed | SEO phases guard sitemap and ItemList; no test guards visible anchors against `/dashboard|/admin|/auth(?!\?mode=signup|login)` on public pages. | P1 | Add invariant test. | Low |
| 23 | Global empty/loading states | No equivalent of dashboard `pagePolishRepairs1` for public pages. | P2 | Mirror invariant. | Low |
| 24 | Global copy redundancy | Same "اطلب عرض سعر" / "أضف منشأتك" pair on 4+ homepage sections. | P2 | Keep one final-CTA section + one mid-page audience split. Demote others to text links. | Low |

## Priority rollup

- **P0**: 3 (#1 misleading coverage claim, #7 pricing source-of-truth, #8 compliance claims).
- **P1**: 9.
- **P2**: 10.
- **P3 (out of scope)**: full redesign, new illustrations, onboarding rework, pricing model changes.

## Recommended phase split

Implementing all of the above in one PR would violate the
"no broad redesign" constraint and risk SEO-1..SEO-10A regressions.

- **UX-CONTENT-POLISH-1B — Homepage** : #1..#5, #24. Lowest risk, all in `src/components/home/v2/sections/*`. Add invariant test: hero has exactly one H1; page contains both buyer and provider CTAs above the fourth section.
- **UX-CONTENT-POLISH-1C — ForProviders consolidation** : #6..#8. Needs tier-price verification vs `Membership.tsx` and a legal pass on PDPL/SSL/hosting claims. Likely split further into 1C-copy and 1C-structure.
- **UX-CONTENT-POLISH-1D — BusinessProfile** : #14. Dedicated phase — this is the conversion endpoint and deserves its own audit + tests (mobile sticky CTA, contact-reveal placement, services hierarchy).
- **UX-CONTENT-POLISH-1E — Listing pages** : #10..#13, #15..#18. Showcase/Projects/Search/Sectors/Services/Brands copy + small CTA additions; no data-shape changes.
- **UX-CONTENT-POLISH-1F — Global invariants** : #21..#23. Test additions only.

## Tests recommended (not added this turn)

1. `src/tests/uxPublicPagesCtaSafety1.test.ts` — every public page contains zero anchors to `/dashboard` or `/admin`, and any `/auth?...` link sets `mode=signup` or `mode=login`.
2. `src/tests/uxPublicPagesEmptyStates1.test.ts` — mirror of `pagePolishRepairs1.test.ts` for the 16 public files.
3. `src/tests/uxHomepageHero1.test.ts` — homepage has exactly one `<h1>` in the eager Hero chunk; both buyer (`?intent=quote`) and provider (`?role=provider`) CTAs render above the fourth section.
4. `src/tests/uxShowcaseVerifiedCopy1.test.ts` — `Showcase.tsx` contains the literal Arabic phrase "تم التحقق" and keeps the `is_verified=true` filter from SEO-10A (copy + data gate cross-assert).

## What this audit does NOT change

- No file under `src/pages/`, `src/components/home/`, `src/components/layout/` was edited this turn.
- No tests modified, added, or removed.
- No DB/RLS/edge functions touched.
- No SEO metadata, JSON-LD, sitemap, robots, canonical changed.
- All SEO-1..SEO-10A invariants remain green by construction.

## Decision

**PARTIAL PASS (audit-only).** Implementation deferred to
UX-CONTENT-POLISH-1B..1F to stay within the "no broad redesign"
guardrail and keep each change set reviewable and test-locked.

## Recommended next phase

**UX-CONTENT-POLISH-1B — Homepage copy + CTA polish.** Smallest
blast radius; contains the only P0 text item (#1) and the
homepage-scoped P1 items (#2..#5) plus the cross-section CTA
redundancy rollup (#24). P0 items #7 (pricing) and #8 (compliance)
should wait for pricing/legal confirmation before any copy ships.
