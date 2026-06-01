# Mobile UX Audit — PERFORMANCE-ACCESSIBILITY-FINAL-1

## Method
Reviewed responsive primitives in `tailwind.config.ts` (custom `xs` 360px
breakpoint) and shared layout components. Checked sticky headers, dense
tables, board scroll, RFQ/quote form, brand pickers on mobile/tablet.
Cross-referenced `e2e/accessibility.spec.ts` overflow guard at 360/390 px.

## Findings

| # | Area | Severity | Finding | Status |
|---|------|----------|---------|--------|
| 1 | Horizontal overflow on landing | n/a | Playwright asserts `scrollWidth - clientWidth <= 1` at 360 and 390 px. | PASS |
| 2 | Sticky headers | n/a | `sticky top-0 bg-background/95 backdrop-blur` — no iOS double-scroll trap. | PASS |
| 3 | Tap targets | n/a | Base `h-12`, 44x44 min; shadcn Button defaults meet target. | PASS |
| 4 | Quote form | n/a | Single column under `md`; brand picker chips wrap. | PASS |
| 5 | BOQ brand picker | n/a | Cell `min-w-[180px]`; chips wrap; lock radiogroup wraps. | PASS |
| 6 | Procurement / dense tables | n/a | Wrapped in `overflow-x-auto`; sticky first column where relevant. | PASS |
| 7 | Production board | n/a | Intentional horizontal scroll preserved (per scope constraints). | PASS |
| 8 | RFQ form | n/a | All fields labelled; `<Textarea dir="auto">` for Arabic-first input. | PASS |
| 9 | Brand picker on small screens | n/a | Results capped `max-h-72`; chips wrap above search. | PASS |
| 10 | Action stacking | n/a | Primary CTAs stack full-width on mobile via `w-full md:w-auto`. | PASS |

## Outcome
Mobile UX baseline is launch-ready. No new repairs required.
