## Scope

A presentation-only cleanup pass. No business logic, routes, RLS, RPC, edge, permissions, or matching/bids/credits/notifications behavior change. Focused on 2–5 high-impact extractions backed by existing shared primitives, plus a guard test.

## Current state (audit)

Already shared in `src/components/shared/`:
- `PageHeader`, `MetricCard`, `FiltersBar`, `StatusBadge` (v3 Soft & Modern primitives).

Gaps & duplication found:
- **EmptyState** — no shared primitive. Bespoke empty blocks repeated across ~25+ dashboard/admin pages (e.g. `DashboardContracts`, `DashboardSites`, `DashboardCredentials`, `DashboardBrands`, `AdminOperations`, `AdminBusinesses`, `AdminBarcodeRegistry`, `AdminProjectCategories`, `AdminSitemapStatus`, `DashboardPromotions`, etc.). Each renders its own Card + icon + Arabic/English copy.
- **ErrorRetryCard** — ad-hoc error blocks scattered; no shared primitive.
- Many pages already import `PageHeader`/`MetricCard`/`FiltersBar`/`StatusBadge` correctly — leave those alone.

## Changes (2 focused extractions only)

### 1. New `EmptyState` shared primitive
`src/components/shared/EmptyState.tsx`
- Props: `{ icon?: LucideIcon; title: string; description?: string; action?: ReactNode; tone?: 'muted' | 'accent'; dense?: boolean; className?: string }`
- Uses semantic tokens only (`bg-muted/40`, `text-muted-foreground`, `border-border`, `rounded-xl`).
- RTL-safe (logical spacing); no hardcoded hex; no `any`.
- Exported from `src/components/shared/index.ts`.

### 2. New `ErrorRetryCard` shared primitive
`src/components/shared/ErrorRetryCard.tsx`
- Props: `{ title?: string; message?: string; onRetry?: () => void; retryLabel?: string; className?: string }`
- Renders destructive-toned card with retry button (uses existing shadcn `Button`).
- Exported from `src/components/shared/index.ts`.

### 3. Opt-in adoption (3 call sites max, lowest risk)
Migrate three pages with clearly duplicated empty blocks to the new primitive — chosen for being pure presentation, no test snapshots, no matching/bid/contract logic:
- `src/pages/dashboard/DashboardCredentials.tsx`
- `src/pages/dashboard/DashboardBrands.tsx`
- `src/pages/dashboard/DashboardSites.tsx`

Only the empty/error JSX blocks change. Copy preserved verbatim. No data fetching, mutations, queries, or props touched.

### 4. Guard test
`src/__tests__/projectComponentsCleanupReusability.test.tsx`
- Asserts `EmptyState` and `ErrorRetryCard` exist and are exported from `@/components/shared`.
- Asserts the 3 migrated pages import them.
- Static guards on the 4 new/modified files: no `any`, no `as any`, no `@ts-ignore`, no `eslint-disable`, no hardcoded hex (`#[0-9a-fA-F]{3,8}`), no `service_role`.
- Renders `EmptyState` and `ErrorRetryCard` with minimal props to verify title/description/retry callback wiring.

## Verification

- `vitest run` for the new guard test plus targeted suites that touch the modified pages (`DashboardCredentials`, `DashboardBrands`, `DashboardSites`).
- `tsc` clean (no project-wide manual run — harness handles it).
- Final report follows the exact `PROJECT COMPONENTS CLEANUP + REUSABILITY REPORT` template.

## Out of scope (deferred debt)

- Migrating the remaining ~20 pages with bespoke empty states (do in later passes, 3–5 at a time).
- KPI strip extraction (`MetricCard` already covers the common case).
- Admin action bar / filter chips bar (`FiltersBar` already exists; no clear duplication beyond it).
- Any backend, routing, or behavior changes.

## Technical notes

- File tree additions:
  - `src/components/shared/EmptyState.tsx`
  - `src/components/shared/ErrorRetryCard.tsx`
  - `src/__tests__/projectComponentsCleanupReusability.test.tsx`
- File modifications:
  - `src/components/shared/index.ts` (re-export only)
  - `src/pages/dashboard/DashboardCredentials.tsx` (swap empty JSX)
  - `src/pages/dashboard/DashboardBrands.tsx` (swap empty JSX)
  - `src/pages/dashboard/DashboardSites.tsx` (swap empty JSX)
