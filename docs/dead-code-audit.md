# Dead Code Audit

## Method

- Route inventory cross-checked against `src/App.tsx`.
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

## Phase A cleanup (route-audit)

Removed 34 lazy-import statements from `src/App.tsx` that had been fully
superseded by consolidated hubs or by pure redirects. Route paths and
targets are unchanged — only the unused imports were deleted. Page files
are retained (not deleted) pending Phase D component-extraction work.

Removed imports:

- `AdminApiSettings`, `AdminAnalyticsSettings`, `AdminBranding`,
  `AdminContractTemplates`, `AdminPdfExportAudit`, `AdminContractCreate`,
  `AdminContracts`, `AdminContractAnalytics`, `AdminMemberships`,
  `AdminMembershipRejections`, `AdminMembershipEvents`,
  `AdminMembershipPayments`, `AdminProviderSubscriptions`,
  `AdminEmailDeliverability`, `AdminEmailCenter`, `AdminSiteAudit`,
  `AdminSitemapStatus`, `AdminSectorSeo`, `AdminOperations`,
  `AdminOperationsConsole`, `AdminSystemSettings`, `AdminProviderReview`,
  `AdminKpis`, `AdminReports`
- `DashboardRfq`, `DashboardRfqInbox`, `DashboardWorkOrdersOverview`,
  `DashboardContractAnalytics`, `DashboardContracts`, `DashboardLoyalty`,
  `DashboardLoyaltyStore`, `DashboardTeamAccess`, `DashboardStaffCenter`,
  `DashboardLeads`

Also simplified 19 admin redirect routes from
`<ProtectedRoute requireAdmin><Navigate/></ProtectedRoute>` to bare
`<Navigate/>`, matching the existing pattern on the contact-center and
dashboard redirects. Guard behavior is unchanged because the redirect
targets are themselves guarded.

A new static test (`src/__tests__/navigate-targets.test.ts`) asserts
that every `<Navigate to=…>` inside `App.tsx` resolves to a declared
`<Route path=…>` in the same file.