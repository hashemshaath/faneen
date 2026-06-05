# Trust Signals Audit — MARKETPLACE-CONVERSION-OPTIMIZATION-1

Audit only. No code changes proposed in this phase beyond surfacing read-only
widgets in `/admin/conversion-optimization`.

## Signals checked

| Signal | Provider profile | Sector page | Search card | Notes |
|---|---|---|---|---|
| Verification status | ✅ `<VerifiedBadge>` | ✅ chip | ✅ chip | Unified standard |
| Completeness | ✅ score bar | ➖ | ➖ | Dashboard only |
| City | ✅ | ✅ | ✅ | OK |
| Service coverage | ✅ tab | ➖ | ➖ | Could surface on card |
| Products | ✅ tab | ➖ | ➖ | OK |
| Services | ✅ tab | ✅ | ✅ | OK |
| Brands | ✅ tab | ✅ chips | ➖ | Could surface on card |
| Company age | ➖ | ➖ | ➖ | Not surfaced |
| Commercial registration | ✅ when verified | ➖ | ➖ | OK |

## Recommendations (advisory)

1. Surface brand chips on search cards.
2. Surface "established N years" when `created_at` is older than 1 year.
3. Keep verification badge prominent across all surfaces (already standard).

No new tables, columns, or RLS changes.