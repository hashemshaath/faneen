# Admin Users Refactor — PR-1: Inventory & Safe Extraction Plan

_Status_: 📋 Planning. No code shipped in PR-1.
_Target file_: `src/pages/admin/AdminUsers.tsx` (**2,790 LOC** today)
_Goal_: bring AdminUsers under the governance contract (§ `docs/admin-redesign/05-governance-and-migration.md`) **without a single risky rewrite**. Six small PRs, each independently revertable.

---

## 1. Why a multi-PR refactor

`AdminUsers.tsx` is the largest admin surface and the highest-traffic one (impersonation, role grants, suspensions, password resets, business linking). It also has the densest state graph in the admin codebase:

- 25+ `useState` declarations
- 5 `useQuery` + 12 `useMutation`
- 8 `useEffect`
- 2 dual-ref closure patterns (`openCreatePanelRef`, `openEditRef`) used to escape stale-closure bugs inside URL-param effects
- Mutation error handlers that directly mutate field-level error state used by inline forms

A monolithic rewrite would land hundreds of changed lines, defeat code-review, and risk breaking flows we do not have integration tests for. The plan below carves the page into 6 PRs ordered **lowest risk first**, so the team can pause at any boundary and still ship.

---

## 2. Current state — quick inventory

### Exported symbols

| Symbol | Lines |
| --- | --- |
| `parseProfileSaveError` (function) | 81–108 |
| `ParsedProfileSaveError` (type) | 71–79 |
| `ProfileSaveErrorField` (type) | 70 |
| `EmailLiveHint` (component) | 2772–2790 |
| `AdminUsers` (default export) | 720–2763 |

### Locally defined components

| Component | Lines | Role |
| --- | --- | --- |
| `KpiCard` | 225–248 | Reinvents `<AdminKpiCard>` |
| `UserDetailPanel` | 251–463 | Expanded row body; owns its own query |
| `UserRow` | 490–715 | Card row, 14-prop interface |
| `AdminUsers` (main) | 720–2763 | Everything else |

### Page-level tabs

| Key | AR / EN | JSX Range |
| --- | --- | --- |
| `overview` | نظرة عامة / Overview | 1615–1673 |
| `users` | المستخدمون / Users | 1676–2716 |
| `analytics` | تحليلات / Analytics | 2720–2757 |

### Edit-panel inner tabs

| Key | AR / EN | JSX Range |
| --- | --- | --- |
| `profile` | البيانات / Profile | 2037–2157 |
| `permissions` | الصلاحيات / Permissions | 2160–2235 |
| `businesses` | الجهات / Businesses | 2238–2400 |
| `suspension` | الإيقاف / Suspension | 2402–2578 |

### Side effects

8 `useEffect`s, two of which power the URL-param consumption flow (`?create=…&type=…&role=…&tab=…&focus=…`). Dual refs (`openCreatePanelRef`, `openEditRef`) exist to keep those effects out of dependency hell. Any extraction that moves form-opening logic must keep this contract intact.

### Dialog / Sheet / Popover usage

**None.** All panels (create, edit, password, delete) are inline DOM sections — already compliant with the project no-popup rule, with one exception: the **delete confirm panel** (`2620–2639`) is a plain inline button without an `<AlertDialog>` — destructive confirms are the single allowed exception and should adopt one in PR-6.

---

## 3. The hard hazards (must be addressed by the plan)

1. **God-state**. 25 `useState` + 12 mutations in one component. Any extraction without a state plan multiplies prop counts.
2. **Mutation handlers write state**. `updateProfileMutation.onError` (1134–1173) writes three field-error states used by the inline form. Cannot move into a child without lifting the state or moving the mutation.
3. **`openCreatePanel` / `openEdit` preset form state**. Both seed `createForm` / `editForm` / `suspendForm` / `linkForm` before render. Form state cannot move into the child without an init-prop or ref pattern.
4. **Dual-ref closures**. `openCreatePanelRef` and `openEditRef` are mandatory; refactors must preserve this.
5. **`UserDetailPanel` re-renders despite `React.memo`** because callback props are not `useCallback`-wrapped at the call site.
6. **Inline IIFEs in JSX** at 1947–2582 and 2410–2576 — fix as part of each PR they touch.
7. **Type-force-casts** at 951, 1082, 2411 — to be surfaced (not silenced) by extractions.
8. **Recharts at top level** for 40 lines of analytics — must move with the AnalyticsTab.
9. **3 direct `supabase.from(...)` calls** inside `UserDetailPanel.queryFn` (272, 273, 275) — out of scope here, deferred to a separate service-migration PR (project policy: defer massive Supabase rewrites).
10. **`pickBi` is used; `useBi` / `<Bi>` are not.** Acceptable for now — bilingual primitives policy is satisfied either way.

---

## 4. PR sequence (6 PRs, lowest risk first)

Each PR is independently mergeable and revertable. **No PR rewrites business logic**; they only relocate JSX + props.

### PR-2 — `OverviewTab` ✅ shipped

- **Extracted**: overview `TabsContent` block → `src/pages/admin/users/OverviewTab.tsx` (88 LOC).
- **Also extracted**: `KpiCard`, `formatDate`, `formatRelative` + shared types → `src/pages/admin/users/_shared.tsx` (83 LOC). Kept centralised so PR-3 (Analytics) can reuse `KpiCard` without re-importing from a sibling page module.
- **Props**: `isRTL`, `stats`, `signupSeries`, `recentAdminActivity` — pure display, no mutations, no query/mutation gating moved.
- **Parent net change**: `AdminUsers.tsx` 2,790 → 2,697 LOC (−93). One orphan icon import (`TrendingDown`) removed.
- **Behavioural delta**: none. Tab content, gradients, RTL chart orientation, relative-time labels all identical.

### PR-3 — `AnalyticsTab` ✅ shipped

- **Extracted**: analytics `TabsContent` block → `src/pages/admin/users/AnalyticsTab.tsx` (67 LOC).
- **Props**: `isRTL`, `stats`, `accountTypePie`, `tierBar`. Pure display, no mutations.
- **Bundle win**: the entire `recharts` import block is gone from `AdminUsers.tsx`. Pie/Bar/Cell/Legend live only in `AnalyticsTab`; Area/AreaChart/XAxis/YAxis/CartesianGrid/ResponsiveContainer/Tooltip live only in `OverviewTab`. Recharts is now lazy-loadable per tab in any future code-split.
- **Parent net change**: `AdminUsers.tsx` 2,697 → 2,664 LOC (−33). Shared types `AccountTypePiePoint` and `TierBarPoint` added to `_shared.tsx`.
- **Behavioural delta**: none.

### PR-4 — `UserFiltersBar` ✅ shipped

- **Extracted**: chips row + filters card (search + 4 selects + density toggle + sort buttons + select-all) → `src/pages/admin/users/UserFiltersBar.tsx` (212 LOC).
- **Props**: 14 controlled values + 12 callbacks. State stays in `AdminUsers`; the component is a pure controlled view wrapped in `React.memo`. `Checkbox` `onCheckedChange` is bridged to the parent's no-arg `toggleSelectPage`.
- **Shared types**: `SortKey`, `SortDir`, `Density`, `FilterScope`, `FilterBusinessLink` moved into `_shared.tsx` (re-used by parent).
- **Density `localStorage` effect** still lives in the parent — unchanged.
- **Parent net change**: `AdminUsers.tsx` 2,664 → 2,549 LOC (−115). Dropped 6 newly orphaned lucide icons (`Filter`, `Zap`, `LayoutList`, `Rows3`, `Command`, `ArrowUpDown`).
- **Behavioural delta**: none.

### PR-5 — `CreateUserPanel` ✅ shipped

- **Extracted**: inline "Create new user" panel → `src/pages/admin/users/CreateUserPanel.tsx` (111 LOC).
- **Pattern**: **controlled** (parent retains state). `createForm` + `setCreateForm` are passed down so the `?create=…` URL preset, the CR-scan `onParsed` merge logic, and the `createUserMutation.onSuccess` reset path all keep working unchanged.
- **Mutation**: stays in parent (`createUserMutation`), invoked via `onSubmit`.
- **Shared type**: new `CreateUserForm` in `_shared.tsx` — `useState<CreateUserForm>` in parent + child prop type.
- **Parent net change**: `AdminUsers.tsx` 2,549 → 2,484 LOC (−65). Dropped now-orphaned `CrQuickScanInline` import (`BilingualNameField`, `PhoneField`, `Label`, `Separator`, `UserPlus` still used elsewhere in the file).
- **Behavioural delta**: none.

### PR-6a — `UserEditPanel` shell + all four inner tabs ✅ shipped

- **Extracted**: full inline edit panel (header + 4-tab body: Profile, Permissions, Linked Businesses, Suspension) → `src/pages/admin/users/UserEditPanel.tsx` (735 LOC). Shipped as a single component rather than splitting into per-tab children — the prop surface is already large and the inner tabs are tightly coupled to the same `editingProfile` derivations, so further splitting would only move noise around without a bundle or readability win.
- **State decision applied**: kept the **recommended** path. `editForm`, `editFieldErrors`, `editFieldRawCodes`, `usernameServerError`, `suspendForm`, `linkForm`, `linkSearch` and the `updateProfileMutation` (+ all related mutations) **stay in the parent** and are passed down as controlled props. The `?focus=` URL effect and the `updateProfileMutation.onError` → inline-error path keep working unchanged.
- **Shared types**: `StaffRole`, `BusinessInfo`, `BusinessLink`, `EditUserForm`, `EditFieldErrors`, `EditFieldRawCodes`, `UsernameServerError`, `SuspendForm`, `LinkForm` moved into `_shared.tsx` (pure types, no runtime cost). `EmailLiveHint` also moved into `_shared.tsx` (was defined inline in `AdminUsers.tsx` and re-exported there for backwards compatibility) so the child can import it without creating an `AdminUsers ↔ UserEditPanel` cycle. The `useDebouncedValue` import is gone from the parent.
- **Mutation prop typing**: each mutation prop is typed as `{ isPending: boolean; mutate: (vars: T) => void }` — zero `any`, no `UseMutationResult` wide types leaking into the child.
- **Force-casts owned by this PR**: the two `(editingProfile as Profile & { banned_until? | ban_reason? })` casts moved with the suspension tab — still the only escape hatches in the file.
- **Parent net change**: `AdminUsers.tsx` 2,484 → 1,861 LOC (−623). Local `BusinessInfo`, `BusinessLink`, `StaffRole`, and the four config maps stay in the parent (still consumed by `UserRow` / `UserDetailPanel`); the child accepts structurally-compatible shared types, so no duplication at runtime.
- **Behavioural delta**: none.

### PR-6b — `<AlertDialog>` for inline delete confirm ✅ shipped

- The inline delete-confirm panel (`activePanel?.type === 'delete'`) is now wrapped in shadcn's `<AlertDialog>` with `open` driven by `activePanel.type` and `onOpenChange` routing back through `closePanel` (guarded against close while `deleteUserMutation.isPending`).
- `<AlertDialogCancel>` and `<AlertDialogAction>` replace the plain `Button`s; the action calls `e.preventDefault()` before firing the mutation so the dialog only closes on the mutation's own `closePanel()` in `onSuccess`. Destructive styling (`bg-destructive text-destructive-foreground`) is preserved.
- This is the **single allowed dialog exception** in the governance contract — every other interaction in `AdminUsers` stays inline. Memory rule "STRICTLY NO POPUPS/DIALOGS" is upheld for non-destructive flows.

### PR-7 — Governance compliance pass ✅ shipped

- Local `KpiCard` removed from `_shared.tsx`. All four call sites (hero 6-tile strip, `OverviewTab` 4-tile strip, `AnalyticsTab` 4-tile strip) now use `<AdminKpiCard>` with semantic `tone` (`primary` / `accent` / `success` / `info` / `warning` / `destructive` / `secondary`) instead of freeform `gradient` + `iconBg` strings. `TrendingDown` import dropped from `_shared.tsx` along with it.
- Custom glassmorphism hero header (60+ LOC of inline gradients, blurred orbs, and a hand-rolled KPI grid) replaced by `<AdminListPageTemplate>` with `<AdminPageHeader>` inside. `MaybeDashboardLayout` still wraps the template.
- `<Tabs>` now wraps `<AdminListPageTemplate>` so the existing 3-tab nav (`overview` / `users` / `analytics`) sits in `filtersSlot` and the three `<TabsContent>` blocks become the template's `children`. Radix tabs context flows through unchanged.
- Hero actions (`Refresh`, `Export CSV`, `New User`) move to the template's `actions` slot. The 6-tile KPI strip becomes the `kpiSlot`.
- **Parent net change**: `AdminUsers.tsx` 1,861 → 1,858 LOC (−3 surface, but ≈70 LOC of bespoke layout markup deleted and replaced with semantic slot usage; remaining LOC is the props-heavy `<UserEditPanel/>` mounting block).
- **Behavioural delta**: none — same actions, same KPIs, same tabs. Visual delta: KPI tiles are now the canonical `rounded-3xl` height and the hero uses the standard card surface instead of the bespoke `from-accent/5 via-card to-primary/5` gradient + blur orbs.

---

## 5. Sequencing rules

- **Do not interleave PRs.** Each PR must land and bake for ≥24h before the next is opened — the page has no integration tests and we rely on staging exposure.
- **Each PR keeps the page byte-for-byte equivalent at runtime.** No behavior changes, no visual changes outside the extracted boundary.
- **TypeScript must stay at zero `any`.** The three force-casts called out in §3 are owned by PR-6; do not silence others.
- **Bundle check**: after PR-3, expect a measurable main-chunk size drop (Recharts ≈ 90KB gz). Capture before/after in the PR description.

---

## 6. Deliverables for PR-1

This document (`docs/admin-redesign/06-admin-users-refactor.md`) is the entire PR-1 artifact. No code changes ship in PR-1.

## 7. Definition of done — full refactor

- [ ] `AdminUsers.tsx` ≤ 600 LOC.
- [ ] No locally redefined primitives (`KpiCard`, hero header).
- [ ] All destructive confirms wrapped in `<AlertDialog>`.
- [ ] `tsc --noEmit` clean; zero new `any`.
- [ ] Recharts not bundled with the main admin chunk.
- [ ] Migration tracker row #2 updated to ✅ shipped.
