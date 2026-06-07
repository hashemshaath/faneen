/**
 * Shared PageHeader — same Salla-like Soft & Modern design as the admin
 * header, available to user/provider dashboard pages as well.
 *
 * Re-exports `AdminPageHeader` to guarantee visual parity. Use this
 * import path (`@/components/shared/PageHeader`) from any dashboard
 * page so future visual tweaks propagate everywhere.
 */
export { AdminPageHeader as PageHeader, default } from '@/components/admin/AdminPageHeader';
export type { AdminPageHeaderCrumb as PageHeaderCrumb } from '@/components/admin/AdminPageHeader';