# Naming & Consistency Audit

## Canonical terms

| EN | AR | Notes |
|---|---|---|
| Qitaat | قِطاعات | Brand. Logo letter "ق". |
| Sector | قطاع | Industrial sector (Aluminum, Glass, Wood, Steel...). |
| Private sector | قطاع خاص | Customer-managed private taxonomy. |
| Provider | مزود | Service/product provider business. |
| Business | منشأة | Generic business entity. |
| Brand | علامة تجارية | Manufactured/distributed brand. |
| RFQ | طلب عرض سعر | Request for quotation. |
| Quotation | عرض سعر | Provider response to an RFQ. |
| Contract | عقد | Signed agreement. |
| Work order | أمر عمل | Execution unit derived from a contract. |
| Procurement | مشتريات | Buyer-side purchasing flow. |

## Findings

| Check | Result |
|---|---|
| Faneen / فنيين remnants in user-facing copy | NONE — only inside regression tests asserting absence. |
| Mixed Arabic/English labels on the same surface | NONE — `LanguageContext` resolves per-key with `dir="auto"` fallback. |
| Mismatched page titles vs sidebar labels | PASS — `useBreadcrumbs` derives titles from the same i18n keys as the sidebar. |
| Old route slugs (`/dashboard/business`, `/admin/help-center`) | NONE in active routing — verified in `siteIntegrityDeepAudit1.test.ts`. |
| Branch URL legacy `loc{n}` slugs | Redirected; excluded from sitemap. |
| "Faneen" `localStorage` keys | Cleaned by `qitaat_legacy_cleanup_v1_done` in `main.tsx`. |

## Verdict

**PASS** — naming is consistent across UI, sidebar, breadcrumbs, sitemap,
and SEO surfaces.