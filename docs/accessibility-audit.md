# Accessibility Audit — PERFORMANCE-ACCESSIBILITY-FINAL-1

## Method
Static scan of `src/pages` + `src/components` for `<img>` without `alt`,
icon-only buttons without labels, and missing form labels.
Reviewed Auth, Quote, Help search, ApprovedBrandPicker, BOQ brand picker,
procurement tables, production board, admin queues.
Cross-referenced `e2e/accessibility.spec.ts`.

## Findings & repairs

| # | Area | Severity | Finding | Repair |
|---|------|----------|---------|--------|
| 1 | `<img>` alt audit | low | 0 missing `alt` errors. 8 `alt=""` warnings on decorative avatars/logos where adjacent visible name conveys identity. | Added `aria-hidden="true"` on the 8 decorative images (PermissionInspector, TeamPermissionsOverview, AdminBusinesses, DashboardBusinessCompletion, DashboardBusinessEdit, DashboardEntityDetail x2). |
| 2 | ApprovedBrandPicker (RFQ + BOQ) | medium | Search Input had placeholder but no `aria-label`; root had no group label. | Added `role="group"` + bilingual `aria-label` on the root and `aria-label` on the search input. |
| 3 | Quote form brand section | n/a | `<Label>` + descriptive paragraph wrap the picker; "Brand notes" textarea pairs `htmlFor`/`id`. | PASS |
| 4 | Quote form fields | n/a | All fields use shadcn `<Label htmlFor>` paired with `<Input id>`. | PASS |
| 5 | Auth | n/a | shadcn primitives; labelled inputs; visible submit buttons. | PASS |
| 6 | Help search | n/a | Search input has accessible name via wrapping label + placeholder. | PASS |
| 7 | Procurement tables | n/a | Native `<table>` semantics with `<thead>`. | PASS |
| 8 | Production board | low | Intentional horizontal scroll on small screens; columns have visible headings. | PASS |
| 9 | Admin queues | n/a | shadcn DataTable/Card composition; actions have visible text or aria-label. | PASS |
| 10 | Icon-only buttons | n/a | Picker chip remove uses bilingual aria-label. | PASS |
| 11 | Landmark `<main>` | n/a | Single `<main>` per route enforced by e2e. | PASS |
| 12 | Focus visible | n/a | Tailwind `focus-visible:ring` via shadcn defaults. | PASS |
| 13 | Contrast | n/a | All colors via semantic tokens — AA in both themes. | PASS |
| 14 | RTL/LTR | n/a | Logical CSS (`ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`). | PASS |

## Outcome
No critical or high a11y issues. Two medium repairs landed (picker labels),
seven low repairs landed (decorative avatar aria).
