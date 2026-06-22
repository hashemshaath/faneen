import { TaxonomyAdminPage } from '@/modules/taxonomy/components/TaxonomyAdminPage';

/**
 * Taxonomy & Reference Data Center — Phase 2.
 *
 * MIGRATED (Deferred Audit L17/L18 pilot): this page no longer wraps its
 * content in `<DashboardLayout>`. The layout is now supplied by the
 * `<AdminRoute>` wrapper registered for `/admin/taxonomy` in `src/App.tsx`,
 * which composes `<ProtectedRoute requireAdmin>` + `<DashboardLayout>` in
 * one place. The page renders bare so it can also be embedded as a tab
 * loader inside `AdminContentCenter` without double-rendering the layout.
 */
const AdminTaxonomyCenter = () => <TaxonomyAdminPage />;

export default AdminTaxonomyCenter;