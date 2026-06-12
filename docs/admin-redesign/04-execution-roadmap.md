# Execution Roadmap — Admin & Dashboard Redesign

> Generated: June 2026 | 6 execution phases after Phase 1 (Audit)

---

## Phase 2 — Design System & Identity Center Core

**Goal:** Complete the token system and make it editable live from the admin panel.

**Scope:**
- [ ] Add missing CSS variables to `src/index.css` (button states, form states, table density, alert variants, card surfaces, layout dimensions)
- [ ] Expand `tailwind.config.ts` to expose all new tokens as utilities
- [ ] Update `admin_identity_tokens` DB schema:
  - Add `token_category` enum
  - Add `updated_by` uuid reference
  - Add RLS + GRANTs
- [ ] Build `useIdentityTokens()` hook
- [ ] Expand `ThemeApplier.tsx` to inject full token set (not just colors)
- [ ] Expand `IdentityTokensApplier.tsx` coverage
- [ ] Rebuild `AdminIdentityCenter.tsx`:
  - 10 editor sections (Colors, Typography, Buttons, Forms, Tables, Alerts, Cards, Layout, Motion, Shadows)
  - Live preview iframe
  - Draft / Preview / Publish workflow
  - JSON import/export
  - Reset to defaults
- [ ] Soft-deprecate `AdminBranding.tsx` → redirect to `/admin/system/identity`
- [ ] Add `brandTheme.ts` export for new tokens (button state colors, form state colors)
- [ ] **Deliverable:** Working Identity Center with full preview, all tokens editable
- [ ] **Safety check:** `tsc --noEmit` clean, no runtime errors, preview verified

**Estimated Duration:** 2 sessions
**User Approval Required:** Yes, before Phase 3

---

## Phase 3 — Admin Shell (Sidebar + Header + Navigation)

**Goal:** Rebuild the admin navigation shell for discoverability and efficiency.

**Scope:**
- [ ] Rebuild `DashboardSidebar.tsx` admin section:
  - Collapsible groups with animation
  - Group-level search/filter
  - Recent pages (last 5 visited)
  - Pinned favorites (per-user, persisted in DB)
  - Counters/badges on menu items (static only, no live queries)
- [ ] Build unified `AdminHeader.tsx`:
  - Page title + breadcrumb (auto-generated from registry)
  - Quick actions (contextual per page)
  - Global search (Cmd+K command palette integration)
  - Notifications bell
  - Theme toggle
  - Language toggle
  - Workspace switcher (provider/admin)
- [ ] Build `Breadcrumb.tsx` component:
  - Reads from `ADMIN_NAV_GROUPS`
  - Supports deep links (`/admin/users/USR-1234567`)
  - Home > Group > Page > Detail pattern
- [ ] Enhance command palette (`Cmd+K`):
  - Search across all admin nav items
  - Search keywords support
  - Recent commands
  - Action commands ("Create business", "Export users")
- [ ] Collapse/expand sidebar with state persisted per-user in DB
- [ ] Mobile: mini-drawer instead of full overlay
- [ ] **Deliverable:** New admin shell with sidebar, header, breadcrumbs, command palette
- [ ] **Safety check:** `tsc --noEmit` clean, navigation works on mobile/desktop

**Estimated Duration:** 2 sessions
**User Approval Required:** Yes, before Phase 4

---

## Phase 4 — Dashboard & Widgets (Drag/Drop + Personalization)

**Goal:** Modular dashboard with customizable widget layouts.

**Scope:**
- [ ] Build widget system:
  - `WidgetContainer` — dnd-kit powered grid
  - `WidgetCard` — consistent chrome (title, actions, drag handle, resize)
  - Widget registry: each widget is a self-contained component
- [ ] Build 5 preset layouts:
  - **Executive:** KPIs, revenue chart, pending approvals, recent activity
  - **Operations:** Work orders queue, contract status, equipment calendar, team tasks
  - **Finance:** Membership stats, payment pipeline, installment tracker, provider subscriptions
  - **Content:** Pending content, catalog governance queue, SEO health, recent uploads
  - **Provider Mgmt:** New providers, review queue, lead opportunities, growth metrics
- [ ] Widget library (20+ widgets):
  - `KpiWidget` — single number + sparkline + trend
  - `ChartWidget` — Recharts with configurable type
  - `ListWidget` — scrollable list with avatars + statuses
  - `TableWidget` — compact table (5 rows)
  - `CalendarWidget` — mini month view with dots
  - `ActivityWidget` — recent events timeline
  - `ProgressWidget` — completion bar
  - `AlertWidget` — critical notifications
  - `MapWidget` — locations overview
  - `ComparisonWidget` — side-by-side metrics
- [ ] Layout persistence:
  - DB table: `admin_dashboard_layouts` (user_id, layout_json, preset_name)
  - RLS: users can only read/write their own layouts
  - GRANTs per public-schema-grants rule
- [ ] Layout operations:
  - Hide/show widgets
  - Reorder (drag/drop)
  - Resize (small/medium/large)
  - Density mode (compact/comfortable)
  - Reset to preset
- [ ] **Deliverable:** Customizable dashboard with 5 presets, 20+ widgets, drag/drop
- [ ] **Safety check:** `tsc --noEmit` clean, dnd-kit works on touch devices

**Estimated Duration:** 3 sessions
**User Approval Required:** Yes, before Phase 5

---

## Phase 5 — Module Refactor (Core Pages)

**Goal:** Rebuild the most important admin pages on a unified template.

**Template:** `AdminListPageTemplate`
```
┌─────────────────────────────────────────┐
│  KPI Row (3–4 cards)                    │
├─────────────────────────────────────────┤
│  Filters Bar + Search + Tabs              │
├─────────────────────────────────────────┤
│  Table / List View                      │
├─────────────────────────────────────────┤
│  Bulk Action Bar (sticky)               │
├─────────────────────────────────────────┤
│  Pagination / Infinite Scroll           │
├─────────────────────────────────────────┤
│  Details Drawer (right side)            │
└─────────────────────────────────────────┘
```

**Priority Order:**

### 5.1 Businesses (`AdminBusinesses.tsx` — 3,069 lines)
- [ ] Extract: `BusinessFilters`, `BusinessTable`, `BusinessCreateDrawer`, `BusinessBulkBar`, `BusinessExportPanel`, `BusinessMapView`
- [ ] Apply `AdminListPageTemplate`
- [ ] Inline editing for status/visibility
- [ ] Detail drawer instead of separate page

### 5.2 Approvals Center (`AdminIdentity.tsx` — 841 lines)
- [ ] Already well-structured; refine with template
- [ ] Add KPI cards (pending approvals, rejected today, avg response time)
- [ ] Tabbed view: Users | Businesses | Access Requests

### 5.3 Users & Roles (`AdminUsers.tsx` — 2,790 lines)
- [ ] Extract: `UserFilters`, `UserTable`, `UserRoleDrawer`, `UserBanDialog`, `UserExportPanel`
- [ ] Apply `AdminListPageTemplate`
- [ ] Detail drawer with activity trail

### 5.4 Memberships (`AdminMemberships.tsx` — 1,466 lines)
- [ ] Merge: `AdminMembershipPayments`, `AdminMembershipEvents`, `AdminMembershipPlanModules`, `AdminMembershipRejections`
- [ ] Tabbed view: Active | Payments | Plans | Events | Rejections
- [ ] Apply template

### 5.5 Provider Reviews (`AdminProviderReview.tsx` — 512 lines)
- [ ] Apply template with KPIs + filter + table + detail drawer

### 5.6 Activity Log (`AdminActivityLog.tsx` — 815 lines)
- [ ] Apply template
- [ ] Timeline view option
- [ ] Export to CSV

### 5.7 Contact Messages (`AdminContactMessages.tsx` — 1,609 lines)
- [ ] Merge all contact sub-pages into tabs
- [ ] Apply template

### 5.8 Taxonomy / Content (`AdminCatalogGovernance.tsx` — 113 lines)
- [ ] Merge queue into governance page
- [ ] Apply template

### 5.9 System & Identity
- [ ] Covered in Phase 2 (Identity Center)
- [ ] `AdminSystemSettings` refined with template

**Deliverable:** 9 core pages rebuilt on template, -15 merged pages
**Safety check:** `tsc --noEmit` clean, all routes resolve, no 404s

**Estimated Duration:** 4 sessions
**User Approval Required:** Yes, before Phase 6

---

## Phase 6 — Form Simplification

**Goal:** Break complex forms into manageable, reusable pieces.

**Scope:**
- [ ] Build `FormSection` component:
  - Collapsible accordion
  - Completion indicator (circle progress)
  - Validation state per section
- [ ] Build `StepperForm` component:
  - Horizontal step indicator
  - Step validation before advance
  - Summary review page
- [ ] Build `InlineEditField` component:
  - Click to edit → inline form → save/cancel
  - Used for quick edits in tables and cards
- [ ] Build `DrawerForm` component:
  - Right-side drawer for related entities
  - Used for: add contact to business, add item to contract
- [ ] Apply to dashboard forms:
  - `DashboardBusinessEdit` → stepper (Basic → Services → Locations → Media → Team)
  - `DashboardContracts` → accordion sections
  - `DashboardProjects` → stepper
- [ ] Apply to admin forms:
  - `AdminBusinesses` create flow → drawer form
  - `AdminUsers` invite flow → drawer form
  - `AdminMemberships` plan creation → stepper
- [ ] Validation unification:
  - All forms use `react-hook-form` + `zod`
  - Shared `zod` schemas in `src/lib/validations/`
  - No inline `yup` or manual validation
- [ ] **Deliverable:** All forms use unified components, no form >500 lines
**Safety check:** `tsc --noEmit` clean, all forms submit correctly

**Estimated Duration:** 3 sessions
**User Approval Required:** Yes, before Phase 7

---

## Phase 7 — Final Cleanup & Governance

**Goal:** Remove dead code, enforce standards, document everything.

**Scope:**
- [ ] Delete dead UI components (second-pass after Phase C3 model)
  - Run `find src/components -type f | xargs grep -l 'export const'` and check usage
  - Delete components with zero imports
- [ ] Unify duplicate components:
  - `AdminKpiCard` vs `DashboardKpiCard` → single `KpiCard`
  - `AdminFiltersBar` vs `DashboardFiltersBar` → single `FiltersBar`
  - Multiple `StatusBadge` implementations → single `StatusBadge`
- [ ] Add ESLint rules:
  - `no-literal-colors`
  - `no-arbitrary-font-sizes`
  - `no-arbitrary-spacing`
  - `prefer-icon-token`
  - `prefer-z-token`
  - Start as warnings, promote to errors after 2 weeks
- [ ] Add CI checks:
  - `grep -rE '#[0-9a-fA-F]{6}' src/ --include='*.tsx' | grep -v brandTheme | grep -v __tests__ | grep -v svg` → must be empty
  - `grep -rE 'text-\[[0-9]+px\]' src/ --include='*.tsx'` → must be empty
- [ ] Generate final report:
  - Pages merged: list + redirect map
  - Pages deleted: list + reason
  - Components unified: before/after
  - Token coverage: % of app using tokens vs hardcoded
  - Lines of code delta: before vs after
- [ ] Update `README.md` with new architecture overview
- [ ] Update `docs/admin-redesign/` with as-built documentation
- [ ] **Deliverable:** Clean codebase, enforced standards, comprehensive documentation
**Safety check:** `tsc --noEmit` clean, build passes, all tests pass

**Estimated Duration:** 2 sessions
**User Approval Required:** Yes — final sign-off

---

## Timeline Summary

| Phase | Duration | Cumulative | Deliverable |
|-------|----------|------------|-------------|
| 1 — Audit | 1 session | 1 | 4 docs (this set) |
| 2 — Design System | 2 sessions | 3 | Identity Center v2 |
| 3 — Admin Shell | 2 sessions | 5 | New sidebar + header + Cmd+K |
| 4 — Dashboard Widgets | 3 sessions | 8 | dnd-kit dashboard |
| 5 — Module Refactor | 4 sessions | 12 | 9 pages on template |
| 6 — Form Simplification | 3 sessions | 15 | Unified form components |
| 7 — Final Cleanup | 2 sessions | 17 | Standards + docs |

**Total estimated: 17 sessions** (~4–6 weeks at 3 sessions/week)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large page splits introduce bugs | Split one page per PR; maintain original file until new one is tested |
| Token changes break existing UI | Preview iframe in Identity Center; gradual rollout per page |
| dnd-kit performance on mobile | Use `@dnd-kit/core` with `measuring` config; test on low-end devices |
| RLS misconfiguration on new tables | Every migration includes GRANTs; test with anon + authenticated roles |
| Accessibility regressions | Run axe-core after each phase; maintain keyboard-only test path |
| RTL layout breaks | Test every phase with `dir="rtl"`; use logical CSS properties |

---

## Acceptance Criteria (All Phases)

- [ ] `tsc --noEmit` passes with zero errors
- [ ] Build passes (`npm run build`)
- [ ] No console errors in preview
- [ ] Mobile layout verified (360px–768px)
- [ ] RTL layout verified
- [ ] Keyboard navigation verified (Tab, Enter, Escape, Arrow keys)
- [ ] No new hardcoded colors outside `brandTheme.ts`
- [ ] No new `any` types (strict TypeScript)

---

*End of Execution Roadmap. Prepared for Phase 2 (Design System & Identity Center Core).*
