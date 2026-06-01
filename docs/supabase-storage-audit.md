# Storage Bucket Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

## Buckets (11 total)

| Bucket | Public | Used by | Policy class |
|--------|--------|---------|--------------|
| `business-assets` | public | business logos / cover imagery (`src/modules/files/constants/buckets.ts`) | public read; owner write |
| `portfolio-images` | public | portfolio items | public read; owner write |
| `project-images` | public | project gallery | public read; owner write |
| `blog-images` | public | blog | public read; admin write |
| `showcase` | public | showcase items | public read; owner write |
| `brand-assets` | public | admin brand logos | public read; admin write |
| `business-documents` | private | CR uploads | signed URL only (10-min TTL) |
| `work-order-attachments` | private | work-order files | signed URL only |
| `quote-request-files` | private | lead attachments | signed URL only |
| `contract-attachments` | private | contracts | signed URL only |
| `project-evidence` | private | closure evidence | signed URL only |

## Code references vs schema
- All bucket IDs in `src/modules/files/constants/buckets.ts` exist in live storage.
- No code path persists a signed URL to long-term storage.

## Legacy bucket names
- `rg -i 'faneen|faniyeen' supabase/` → no bucket references.
- No renames required.

## Linter flags
`0025_public_bucket_allows_listing` × 2 (`business-assets`, `portfolio-images`) — accepted: directory imagery is public by design.

## Conclusion

Storage layout is consistent, documented, and policy-safe. No repairs required.