# Business Profile — Quality Bar

## Strict lint scope
The folder `src/components/business-profile/**` is enforced by an
`eslint.config.js` override at **error** level for:

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unused-vars`
- `react-hooks/exhaustive-deps`

Keep this bar when adding new tabs/widgets.

## Test coverage
- `RfqTab.test.tsx` — 7 scenarios: guest vs. authenticated submission,
  phone/description validation, budget math, and the success screen.
- File uploads are intentionally **not** in scope: the current RFQ form
  does not accept attachments. If/when an attachments field is added,
  extend `RfqTab.test.tsx` with a `File` + `URL.createObjectURL` mock.

## Performance targets (Lighthouse CI)
Tracked in `lighthouserc.json` and gated by `.github/workflows/lighthouse.yml`:

| Metric                       | Target  |
|------------------------------|---------|
| LCP                          | < 2.5 s |
| INP                          | < 200 ms |
| CLS                          | < 0.1   |
| Total Blocking Time          | < 300 ms |
| Performance score (desktop)  | ≥ 0.85  |
| Accessibility / SEO          | ≥ 0.90  |

## Caching strategy
`business-profile.data.ts` sets `staleTime: 5 * 60_000` on every core
profile query (business row, portfolio, services, reviews) so
navigation between tabs and back/forward never re-fetches within the
5-minute window. Heavy tabs (`RfqTab`, `QATab`, `RequestsTab`,
`BookingWidget`, `ContactSupplierSheet`) are `React.lazy`-loaded from
`BusinessProfile.tsx` so the initial bundle stays small.