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

### PR-3 — `AnalyticsTab` (≈100 LOC moved + bundle win)

- **Extract**: `2719–2757` → `src/pages/admin/users/AnalyticsTab.tsx`
- **Props**: `stats`, `accountTypePie`, `tierBar`, `isRTL`
- **Pure display**, no mutations.
- **Bundle win**: relocate the 4 Recharts imports (`AreaChart`, `PieChart`, `BarChart`, related) from the main file to this child.

### PR-4 — `UserFiltersBar` (≈130 LOC moved)

- **Extract**: `1677–1809` → `src/pages/admin/users/UserFiltersBar.tsx`
- **Props**: 9 controlled values + 11 stable callbacks (`onScopeChange`, `onRoleChange`, `onTypeChange`, `onTierChange`, `onBizLinkChange`, `onSearchChange`, `onSort`, `onDensityChange`, `onToggleSelectPage`, `onClearFilters`, plus `isRTL`).
- **Required parent change**: wrap the new setters in `useCallback` so the memoized child does not re-render on every keystroke.
- **Density localStorage effect** stays in the parent (it's already wired).

### PR-5 — `CreateUserPanel` (≈130 LOC moved)

- **Extract**: `1869–1946` → `src/pages/admin/users/CreateUserPanel.tsx`
- **Props**: `initialAccountType` (consumed once on mount), `onSubmit(values)`, `onClose`, `isPending`, `isAdmin`, `isRTL`.
- **Pattern**: form state moves **into** the child; parent passes `initialAccountType` so `openCreatePanel` can still preset the value via the URL effect.
- **Mutation**: stays in the parent (`createUserMutation`), invoked through `onSubmit`.

### PR-6 — `UserEditPanel` shell + inner tabs (≈620 LOC moved across 3 files)

- **PR-6a** — shell: `1958–2582` → `src/pages/admin/users/UserEditPanel.tsx`. Owns tab routing + the four inner tab containers.
- **PR-6b** — `UserEditPermissionsTab` (`2159–2235`) and `UserEditSuspensionTab` (`2402–2578`) as further children.
- **State decision** (must be made in PR-6a):
  - `editForm` / `editFieldErrors` / `editFieldRawCodes` / `usernameServerError` are coupled to `updateProfileMutation.onError`.
  - **Recommended**: keep these four states + the mutation in the parent; pass values + setters down. This preserves the URL-effect path (`?focus=` populates form state before the child mounts) and avoids re-wiring the error handler.
  - Alternative (more invasive): move the mutation into the child and use a callback ref for the URL effect. **Reject** for PR-6.
- **Inline delete confirm** at `2620–2639` adopts `<AlertDialog>` here — the one allowed dialog exception in the governance contract.
- This is the only PR with meaningful complexity. Land PR-2…PR-5 first; PR-6 can ship 1–2 weeks later.

### PR-7 — Governance compliance pass (≈80 LOC delta, no extractions)

- Swap local `KpiCard` (225–248) for `<AdminKpiCard>`.
- Replace the custom hero header (~1546) with `<AdminPageHeader>` inside `<DashboardLayout>` (already in place via `MaybeDashboardLayout`).
- Wrap the page body in `<AdminListPageTemplate>` with the existing tabs nav as the `filtersSlot`.
- Tick row #2 of the migration tracker from ⏭ deferred → ✅ shipped.

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
