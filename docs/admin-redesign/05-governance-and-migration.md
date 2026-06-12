# Admin Redesign — Phase 7: Governance & Migration

_Status_: ✅ Phases 1–6 shipped (audit, IA, identity center, layout shell, list template, form primitives). This document closes the loop.

## 1. Canonical primitives

All new admin surfaces MUST compose from these primitives. Do not roll your own.

| Concern                | Primitive                                              | Location                                      |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Page chrome            | `<DashboardLayout>` + `<AdminRoute>`                   | `src/components/dashboard/...`, `routes/...`  |
| Page header            | `<AdminPageHeader>`                                    | `src/components/admin/AdminPageHeader.tsx`    |
| KPI tile               | `<AdminKpiCard>`                                       | `src/components/admin/AdminKpiCard.tsx`       |
| List page scaffold     | `<AdminListPageTemplate>` (kpi/filters/bulk/page slots) | `src/components/admin/AdminListPageTemplate.tsx` |
| Filter bar             | `<AdminFiltersBar>` + `<SavedViewsMenu>`               | `src/components/admin/...`                    |
| Status pill            | `<AdminStatusBadge>`                                   | `src/components/admin/AdminStatusBadge.tsx`   |
| Verified pill          | `<VerifiedBadge>`                                      | `src/components/shared/VerifiedBadge.tsx`     |
| Collapsible form group | `<FormSection>`                                        | `src/components/forms/FormSection.tsx`        |
| Wizard                 | `<StepperForm>`                                        | `src/components/forms/StepperForm.tsx`        |
| Cell-level edit        | `<InlineEditField>`                                    | `src/components/forms/InlineEditField.tsx`    |
| Bilingual text         | `<Bi>` / `useBi()` / `pickBi()`                        | `src/components/i18n/Bi.tsx`                  |

## 2. Hard rules (enforced by review)

1. **No dialogs / modals / popovers for primary flows.** Use inline panels, drawers within `AdminListPageTemplate`, or fullscreen views. Confirm-destructive AlertDialogs are the only exception.
2. **Every `/admin/*` route renders inside `<DashboardLayout>`.** Wrap with `<AdminRoute>`.
3. **No `text-white` / `bg-black` / raw hex.** Use semantic tokens (`bg-surface`, `text-fg-muted`, `border-border`, etc.).
4. **No inline `isRTL ? ar : en`.** Use `<Bi ar=... en=... />` or `pickBi`.
5. **TypeScript: zero `any`.** Catch as `unknown` + `instanceof Error`.
6. **List pages compose `<AdminListPageTemplate>`.** Do not re-implement header + kpi + filters + sticky bulk bar shells.
7. **Forms with >2 sections use `<FormSection>`.** Multi-step flows use `<StepperForm>`.

## 3. Migration tracker

Nine admin list surfaces are the migration target. Migrate one at a time; each PR replaces the page's shell with `<AdminListPageTemplate>` and its forms with the new primitives.

| #  | Page                              | Route                              | Status      |
| -- | --------------------------------- | ---------------------------------- | ----------- |
| 1  | Businesses                        | `/admin/businesses`                | ⏳ pending  |
| 2  | Users                             | `/admin/users`                     | ⏳ pending  |
| 3  | Memberships                       | `/admin/memberships`               | ✅ partial — tabbed hub via `TabbedShell`; overview KPIs unified to `<AdminKpiCard>`. Template N/A. |
| 4  | Identity Center                   | `/admin/identity`                  | ✅ shipped  |
| 5  | Contracts                         | `/admin/contracts`                 | ✅ shipped (reference impl) |
| 6  | Projects                          | `/admin/projects`                  | ⏳ pending  |
| 7  | Catalog Governance                | `/admin/catalog`                   | ⏳ pending  |
| 8  | Provider Growth                   | `/admin/provider-growth`           | ✅ shipped (also fixed: was wrapped in public `Navbar`/`Footer` instead of `DashboardLayout`) |
| 9  | Email Center                      | `/admin/email-center`              | ⏳ pending  |

## 4. Definition of done (per page)

- [ ] Page renders inside `<DashboardLayout>` via `<AdminRoute>`.
- [ ] Shell is `<AdminListPageTemplate>`; header is `<AdminPageHeader>`.
- [ ] KPIs use `<AdminKpiCard>`; filters use `<AdminFiltersBar>` + `<SavedViewsMenu>`.
- [ ] Bulk actions appear in the sticky `bulkBarSlot`, never a floating dialog.
- [ ] Detail/edit opens inline or fullscreen — no modal dialog.
- [ ] Forms use `<FormSection>` / `<StepperForm>` / `<InlineEditField>`.
- [ ] All copy via `<Bi>`; all colors via semantic tokens.
- [ ] `tsc --noEmit` ✅; no `any`.

## 5. Code review checklist

```text
[ ] uses AdminListPageTemplate (not bespoke flex/grid shell)
[ ] no Dialog/Sheet for primary flows
[ ] no raw color classes
[ ] no inline ar/en ternaries
[ ] no `any` (use unknown + narrow)
[ ] RTL verified at md+ breakpoint
```

## 6. Next action

Start with **Businesses** (highest traffic + most modeled). Subsequent pages reuse the same recipe and should each take <½ the effort of the first.
