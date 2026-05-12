# Contract PDF Rendering Performance (PDF-PERF1)

## How to run
```bash
npm run test:pdf-perf
```
Runs the benchmark suite headlessly under jsdom; no auth or browser required.

## Fixtures
Located in `src/test/fixtures/contract-pdf-perf-fixtures.ts` — safe dummy data only.

| Name             | Shape                                                                |
| ---------------- | -------------------------------------------------------------------- |
| `small`          | 5 line items, no template, no QR, no amendments                      |
| `mediumBoq`      | 50 items / 5 BOQ groups, template + clauses, QR                      |
| `largeBoq`       | 150 items / 8 groups, mixed pricing, long Arabic names, RTL, QR      |
| `legalHeavy`     | 6 sections × 8 long Arabic clauses, signatures, document precedence  |
| `amendmentHeavy` | 10 amendments + appendix, QR                                         |

## Performance budgets (soft)

| Fixture          | Budget   | Tolerance | Latest sample |
| ---------------- | -------- | --------- | ------------- |
| `small`          | 1,000 ms | 2× (CI)   | ~23 ms        |
| `mediumBoq`      | 3,000 ms | 2×        | ~90 ms        |
| `largeBoq`       | 8,000 ms | 2×        | ~190 ms       |
| `legalHeavy`     | 15,000 ms| 2×        | ~95 ms        |
| `amendmentHeavy` | 8,000 ms | 2×        | ~47 ms        |

All fixtures are **well under 5 % of budget** on the dev sandbox. Loading-state UX (PDF-UX1) is sufficient.

## Bottlenecks observed
None worth refactoring at current sizes. Largest cost on `largeBoq` is autotable column-width calculation for 150 rows — still ~190 ms.

## Future optimization candidates (deferred — measure-first)
- Cache loaded Arabic font across exports in the same session (currently re-attached per `setupArabicDoc`).
- Reuse a single in-memory QR data URL between Preview and Download when the underlying `documentHash` is unchanged.
- Reuse computed column widths between BOQ-group sub-tables sharing the same column shape.
- Lazy-import `qrcode` only when `documentHash` is present (already conditional via `await import('qrcode')`).

## Privacy
Benchmark fixtures contain no PII, no real IDs, no real storage paths. PDF-QA1 forbidden-token suite still passes against all fixtures.
