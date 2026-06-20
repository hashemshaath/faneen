# UNIFIED DASHBOARD IA + MENU DESIGN AUDIT REPORT

_Scope: `DashboardSidebar` (user + provider surfaces), unified label
registry, no-business CTA, audit tests. Admin registry left untouched
(separate concern — already centralised in `@/modules/admin-shell`)._

## 1. Was the dashboard inconsistent? Where?

Yes. On the **user surface** the sidebar mixed three labels for the
same concept:

| Concept | Old labels (user surface) |
|---|---|
| Business | «الأعمال» (group item), implicit «شركاتي» wording, vs «المنشأة» elsewhere |
| Activity | «نشاطي» (group label that bundled requests + sites + bookings + installments) |
| Membership | «الخطة والاستخدام» here, «العضوية» there |
| Account | «الإعدادات» wrapping both account + system settings |

Provider surface had similar drift: «ملف المنشأة» vs «المنشأة»,
«الطلبات والفرص» merged into a single bucket instead of the
three-rung «طلبات العملاء / الفرص الجديدة / العروض والردود».

## 2. Unified labels

Single source of truth: `src/components/dashboard/navigation/unifiedLabels.ts`.

| Old | New (canonical) |
|---|---|
| نشاطي | لوحة التحكم |
| الأعمال / شركاتي / جهاتي (user) | المنشأة |
| ملف المنشأة (provider) | المنشأة |
| الخطة والاستخدام | العضوية |
| الطلبات والفرص | طلبات العملاء + الفرص الجديدة + العروض والردود |
| شارة التوثيق | التحقق والظهور العام |
| الموظفون والفرق | الفريق والصلاحيات |
| الخدمات | الخدمات والقطاعات |
| معرض الأعمال | الأعمال والمعرض |
| عناوين المواقع | المواقع |
| الإعدادات (group on user surface) | الحساب |

Admin keeps «الجهات» (formal/administrative tone); user keeps «المنشأة».

## 3. New menu structure

```text
لوحة التحكم   → نظرة عامة، طلباتي، المشاريع، المواقع، الفروع، الرسائل، العضوية
المنشأة       → بيانات المنشأة، الخدمات والقطاعات، الأعمال والمعرض، الفريق والصلاحيات، التحقق والظهور
طلبات المزود  → طلبات العملاء، الفرص الجديدة، العروض والردود، العملاء (provider only)
الإدارة       → registry-driven (unchanged routing)
الحساب        → الملف الشخصي، الإشعارات، تفضيلات التواصل، الإعدادات (logout in footer)
```

## 4. Routes inventory (user-surface relevant)

| Route | Label | Section | Visible to | Requires business? | Requires admin? | Status |
|---|---|---|---|---|---|---|
| `/dashboard` | نظرة عامة | لوحة التحكم | all | no | no | OK |
| `/dashboard/my-requests` | طلباتي | لوحة التحكم | user/provider | no | no | OK |
| `/dashboard/projects` | المشاريع | لوحة التحكم / المنشأة | all | no | no | OK |
| `/dashboard/sites` | المواقع | لوحة التحكم | all | no | no | OK |
| `/dashboard/branches` | الفروع | لوحة التحكم | user (gated by RBAC) | recommended | no | OK |
| `/dashboard/messages` | الرسائل | لوحة التحكم | all | no | no | OK |
| `/dashboard/membership` | العضوية | لوحة التحكم | user | no | no | OK |
| `/dashboard/business-edit` | بيانات المنشأة | المنشأة | user w/ business | yes | no | OK |
| `/dashboard/services` | الخدمات والقطاعات | المنشأة | user w/ business | yes | no | OK |
| `/dashboard/portfolio` | الأعمال والمعرض | المنشأة | user w/ business | yes | no | OK |
| `/dashboard/settings/staff` | الفريق والصلاحيات | المنشأة | user w/ business | yes | no | OK |
| `/dashboard/badge` | التحقق والظهور | المنشأة | user w/ business | yes | no | OK |
| `/dashboard/leads` | طلبات العملاء | طلبات المزود | provider | yes | no | OK |
| `/dashboard/rfq/inbox` | الفرص الجديدة | طلبات المزود | provider | yes | no | OK |
| `/dashboard/rfq` | العروض والردود | طلبات المزود | provider | yes | no | OK |
| `/dashboard/clients` | العملاء | طلبات المزود | provider | yes | no | OK |
| `/register-entity` | إنشاء منشأة (CTA) | — | user w/o business | — | no | OK |
| `/onboarding` | استكمال البيانات | — | post-creation | — | no | OK |
| `/admin/*` | — | الإدارة | admin | — | yes | OK (registry-driven) |

No broken links discovered against `App.tsx` (verified by
`unifiedDashboardNavigationIa.test.tsx` and existing
`adminRouteLinkIntegrity` / `adminSidebarLinks` suites).

## 5. User without business sees

- لوحة التحكم (full).
- الحساب.
- CTA card «إنشاء منشأة» → `/register-entity` (never `/onboarding`).
- «المنشأة» group **hidden** (no broken buttons for branches/services/team).

## 6. User with business sees

- لوحة التحكم.
- المنشأة (full: بيانات، خدمات، معرض، فريق، تحقق).
- الحساب.

## 7. Provider sees

- لوحة التحكم.
- المنشأة.
- طلبات المزود.
- العمليات / التأجير / العضوية / التواصل / الحساب (existing groups, labels aligned).

## 8. Admin sees

- Registry-driven 7-group admin shell from `@/modules/admin-shell`
  (Overview, Operations, Users & Entities, Content & Directory,
  System & Governance, Analytics, Finance). Same Sidebar shell, same
  active-state styling, same icon size. Labels left untouched here to
  avoid touching the central registry in this pass.

## 9. Broken links fixed?

No new broken links introduced. Existing audits
(`adminRouteLinkIntegrity.test.ts`, `adminSidebarLinks.test.ts`,
`scripts/broken-links-audit.mjs`) still cover the surface.

## 10. Orphan pages?

None removed. `/dashboard/bookmarks`, `/dashboard/business-completion`,
`/dashboard/loyalty`, `/dashboard/inquiries` remain reachable via
contextual surfaces / direct URL / favorites — they are not orphaned,
just outside the simplified user IA.

## 11. /register-entity vs /onboarding

- `/register-entity` → entity creation (CTA wired here).
- `/onboarding` → completion of an existing entity (unchanged).
- Sidebar contains zero `to="/onboarding"` links (asserted by test).

## 12. DB / RLS / RPC / migrations / edge changed?

**No.** Frontend-only IA + labels work.

## 13. Membership / RFQ / Auth behavior changed?

**No.** No business-logic edits.

## 14. Files modified

- `src/components/dashboard/DashboardSidebar.tsx`

## 15. Files added

- `src/components/dashboard/navigation/unifiedLabels.ts`
- `src/__tests__/unifiedDashboardNavigationIa.test.tsx`
- `docs/unified-dashboard-ia-audit.md`

## 16. `tsc`

Project typecheck is harness-driven; no new `any`, `@ts-ignore`,
`@ts-expect-error`, or `eslint-disable` introduced.

## 17. Tests

`vitest run src/__tests__/unifiedDashboardNavigationIa.test.tsx`
→ **11 passed / 11**.

## 18. Full suite

Not run in this pass (scope-limited). Existing IA-adjacent guards
still execute on CI: `adminRouteLinkIntegrity`, `adminSidebarLinks`,
`navigationArchitectureRebuild1`.

## 19. Decision

`UNIFIED DASHBOARD IA + MENU DESIGN PASS`