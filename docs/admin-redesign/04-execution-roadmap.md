# Admin Redesign — Phase 1 / Doc 4: Execution Roadmap (Phases 2–7)

Each phase ships as a discrete change set, ends with `tsc --noEmit`
clean and a decision line, and **does not begin without product
approval of the previous phase's deliverable**.

## Phase 2 — Design System & Identity Center Core

**Deliverables**
- Migration: `admin_identity_tokens` table (RLS + GRANTs).
- `src/index.css`: add missing control / form / table / alert / layout tokens.
- `ThemeApplier.tsx`: inject the full token map (not colors only).
- `useIdentityTokens` hook: read from `admin_identity_tokens` w/ realtime, fallback to `platform_settings.theme_overrides`.
- New page: `src/pages/admin/AdminIdentityCenter.tsx` mounted at `/admin/system/identity`.
- `AdminBranding.tsx` deprecated to a redirect.
- Lint: extend `scripts/contrast-tokens-audit.mjs` to flag new anti-patterns (warn-only this phase).

**Acceptance** — editing any token in the center re-paints all currently-open admin tabs without reload.

## Phase 3 — Admin Shell (Sidebar + Header + Navigation)

**Deliverables**
- New `AdminSidebar` (renders the 7-group IA, search box, favorites/pinned, recent pages, counters/badges).
- New `AdminTopBar`: title + breadcrumb + global search + Cmd+K + notifications + theme toggle + language + profile.
- `CommandPalette` (Cmd+K / Ctrl+K) → fuzzy nav to any registered admin route.
- `useAdminPreferences`: persists sidebar collapsed state, pinned routes, density.
- Migration: `admin_user_preferences` (per-user JSON).

**Acceptance** — every admin page renders inside the new shell; collapsed state survives reload; Cmd+K opens within 100 ms.

## Phase 4 — Dashboard & Widgets (Drag/Drop + Personalization)

**Deliverables**
- `dnd-kit` widget grid with 5 preset layouts.
- `AdminWidget` registry with first-party widgets (KPIs, recent activity, approvals queue, revenue, provider activity).
- Per-admin saved layouts in `admin_dashboard_layouts`.
- Density toggle (compact/comfortable) wired to table density tokens.

**Acceptance** — each admin can hide/show/reorder widgets; layout persists; reset returns to default.

## Phase 5 — Module Refactor (priority order)

Each module adopts the `AdminListPageTemplate`:

```
<PageHeader> + <FiltersBar> + <Tabs?> + <DataTable> + <DetailDrawer> + <ActivityTrail>
```

Order:
1. Businesses (biggest win, splits the 181 KB monolith).
2. Users & Roles.
3. Memberships hub.
4. Provider Review hub.
5. Operations Center.
6. Contracts hub.
7. Approvals Center polish.
8. Activity Log.
9. Contact/Messages center.
10. Taxonomy center.

**Acceptance per module** — visual parity check, no data regression, page bundle ≤ original, all RLS/permissions untouched.

## Phase 6 — Form Simplification

- Wizard/Stepper primitive (`<Stepper>`).
- `<DrawerForm>` for inline-related edits (services × categories × brands).
- `dnd-kit` for ordering (images, sections, widgets, list items).
- Standardize all admin forms on `react-hook-form` + `zod`.

## Phase 7 — Final Cleanup & Governance

- Inventory + second-pass delete of the ~22 superseded admin files identified in Doc 1.
- ESLint rules: forbid hex literals, `text-white`/`bg-white`/`text-black`/`bg-black`, `size={n}` on Lucide icons, `<Dialog>` for forms.
- `scripts/contrast-tokens-audit.mjs` → error level.
- Final report: merged / deleted / unified / why.

## Risks & guards

- **DB migrations**: every new table ships with RLS + GRANTs + `service_role` permissions.
- **Roles & permissions**: never touched outside Phase 2 (identity table only).
- **TypeScript**: zero new `any` / `@ts-ignore`. Unknown-cast policy enforced.
- **Routes**: every removed route gets a `Navigate` redirect first; file deletion only in Phase 7 after a clean second pass.
- **Memory rules respected**: NO POPUPS (inline only), bilingual primitives, `<VerifiedBadge>`, `useNoIndex` on admin, AdminRoute wrapper.

## Approval points (gates)

1. ✅ End of Phase 1 (this batch of docs) — you approve the IA + Identity Center plan.
2. ⏸ End of Phase 2 — you approve the new Identity Center UX.
3. ⏸ End of Phase 3 — you approve the new shell.
4. ⏸ End of Phase 4 — you approve dashboard personalization.
5. ⏸ After each module in Phase 5 — quick visual sign-off.
6. ⏸ End of Phase 7 — final report sign-off → cleanup complete.