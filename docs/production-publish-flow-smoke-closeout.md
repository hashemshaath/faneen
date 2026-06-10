# PRODUCTION PUBLISH FLOW SMOKE — DEFERRED / NEEDS FOLLOW-UP

**Date:** 2026-06-10
**Status:** `DEFERRED / NEEDS FOLLOW-UP`

## Reason
No provider currently sits at `approval_status = 'approved'`, so the end-to-end
manual publish path cannot be exercised without violating the "no random data
mutations" rule.

## Current provider state
| Status      | Count |
| ----------- | ----- |
| `published` | 8     |
| `approved`  | 0     |
| `draft`     | 1     |

## Approved / Verified
- `ADMIN PROVIDER PUBLISH ACTION — PASS`
- Automated guards: **44/44 PASS**
  - `ProviderReviewDetailPanel.publish.test.tsx` — 5/5
  - `usernameResolver-freshness.test.ts` — 12/12
  - `SearchResultCardV3.test.tsx` — 6/6
  - `searchV3.noLegacy.test.ts` — 4/4
  - `business-profile-direction.test.ts` — 9/9
  - `form-controls-direction-hygiene.test.ts` — 8/8
- No code bug confirmed.
- No code change required at this time.
- No published provider was downgraded to `approved` in production to simulate the test.

## Final close-out conditions (to be executed when the first new provider reaches `approved`)
1. Open the provider review screen in the admin.
2. Click `نشر للعامة` (Publish Publicly).
3. Confirm the inline action.
4. Verify status becomes `published`.
5. Verify the provider appears in `/search` without a hard refresh.
6. Verify `/{username}` resolves to the public profile.
7. Verify taxonomy renders without `غير مصنّف`.
8. Then mark: `PRODUCTION PUBLISH FLOW SMOKE FINAL PASS`.

## Forbidden during follow-up
- No DB schema changes.
- No RLS changes.
- No changes to `businesses_public`.
- No Search V3 changes.
- No taxonomy changes.
- No routing changes.
- No arbitrary publish / un-publish of providers for testing.
