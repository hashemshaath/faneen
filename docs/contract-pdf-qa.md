# Contract PDF Export — QA Guide (PDF-QA1)

This doc covers the automated test suite that protects the contract PDF
export against layout regressions and **privacy leaks**.

## How to run

```bash
# All tests
npm test

# Just the PDF QA suite
npx vitest run src/lib/__tests__/contract-pdf-export.test.ts

# Type check
npx tsc --noEmit
```

## What the suite covers

The suite uses **`buildContractPDF`** — a pure builder that returns the
`jsPDF` document without triggering a browser download. The user-facing
`exportContractPDF` wrapper still calls `doc.save(...)` exactly as before,
so there is **no user-visible behavior change**.

### Fixtures (`src/test/fixtures/contract-pdf-fixtures.ts`)

- `legacyContractFixture` — pre-CT6 contract normalized by CT8.
- `templatedContractFixture` — full template + frozen snapshot + line items.
- `kitchenBoqFixture` — mixed pricing methods (linear / square / lump sum).
- `longArabicContractFixture` — long RTL clauses (wrapping + font fallback).
- `contractWithAmendmentsFixture` — amendments appendix.
- `contractWithQrFixture` — QR + `document_hash` verification block.

All fixture data is safe dummy data — no real PII, no real IDs, no real
storage paths.

### Required content assertions

- Contract number is rendered.
- Template name + version metadata is rendered.
- Pricing method labels render as readable strings, not raw enums.
- Signature labels render.
- Amendments appendix renders **only** when amendments exist.
- Verification block renders **only** when `documentHash` is provided.
- `formula_inputs` raw JSON keys (`length_mm`, `width_mm`, `formula_inputs`)
  never appear; they must be summarized as readable dimensions.

### Privacy guards

The suite fails if **any** of the following tokens appear anywhere in the
generated PDF text payload, for any fixture:

- `file_url`
- `storage_path`
- `getSignedUrl`
- `sign=`
- `internal_note`
- `actor_id`, `approver_id`, `token_hash`
- `formula_inputs`
- `draft_template`, `audit_metadata`, `audit_log`
- `/storage/v1/object/sign` (Supabase signed URL path)
- `X-Amz-Signature` (S3 signed URL marker)
- Any raw UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### QR / public verification URL

- URL uses the public `/v/c/<number>?h=<hash>` route only.
- The first 16 chars of the document hash are rendered next to the QR.
- The URL line never contains the client name, provider name, total amount,
  signed-URL signature, or auth token.

## Known limitations

- The Arabic font loader is mocked in tests (CDN fetch + jsPDF font wiring
  is unreliable in jsdom). RTL fixtures still build, but Arabic glyph
  rendering itself is not validated programmatically.
- jsPDF's default `output()` returns the raw PDF as a string. With the
  current (uncompressed) settings, drawn text appears literally inside
  content streams, which is enough for substring assertions. If we ever
  enable PDF compression, switch to extracting text via a parser
  (e.g. `pdf-parse`) before asserting.
- Visual regressions (overlap, clipping, RTL bidi correctness, page breaks)
  are **not** covered automatically. Use the manual QA checklist below.

## Manual QA checklist (visual)

Run after any change to `src/lib/contract-pdf-export.ts` or to the brand
document tokens:

1. Export a normalized legacy contract.
2. Export a templated BOQ contract with mixed pricing.
3. Export a contract with at least one applied amendment.
4. Export a contract with `document_hash` set (QR present).
5. Export an Arabic-primary contract with long clauses.

For each PDF check:

- Header, parties, BOQ groups, totals, clauses, document precedence,
  attachments index, amendments appendix, QR block, signatures all render.
- BOQ group subtotals and the grand total are correct.
- Pricing method labels are human-readable.
- Formula inputs render as `1500×1000 mm`, never as raw JSON.
- QR scans and resolves to the public verification page.
- Signatures do not overlap the QR or any table.
- Arabic text reads right-to-left and wraps cleanly.
- No file URLs, storage paths, signed URLs, raw IDs, internal notes,
  draft template content, or audit metadata appear anywhere.