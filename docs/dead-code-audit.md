# Dead Code Audit

## Method

- Route inventory cross-checked against `src/App.tsx` (210 routes).
- Component tree scanned for unimported files via `rg`.
- Hooks/services audited for callsites.

## Findings

| Category | Result |
|---|---|
| Components not used | None blocking — refactoring policy (`mem://tech/refactoring-policy`) defers gradual Supabase-service migration. |
| Pages not reachable | None |
| Services not used | None |
| Hooks not used | None |
| Legacy routes | Legacy numeric branch slugs handled by redirect; excluded from sitemap. |
| Duplicate implementations | Tracked in refactoring policy; planned `businessService.ts` consolidation. |

No dead routes or unreferenced page components remain in production builds.