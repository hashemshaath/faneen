# Fake Data Audit

## Scan Patterns

`dummy`, `mockData`, `fakeData`, `seedData`, `lorem ipsum`, `demo company`, `fake review`.

## Results

| Source                       | Status | Notes |
|------------------------------|--------|-------|
| `src/pages/**`               | CLEAN  | All listings hydrated from Supabase queries. |
| `src/components/**`          | CLEAN  | Empty-state skeletons only; no hard-coded entities. |
| `src/__tests__/**`           | OK     | Mock data isolated to test files — excluded from production bundle. |
| `src/tests/**`               | OK     | Same as above. |
| `public/`                    | CLEAN  | No static demo JSON. |
| `supabase/functions/**`      | CLEAN  | No fixture content. |

## Verdict

No dummy companies, demo products, fake reviews, or seeded ratings reach the production bundle. Statistics on the home page (`features/home-page-stats`) are real-time `count(*)` queries against the public DB.