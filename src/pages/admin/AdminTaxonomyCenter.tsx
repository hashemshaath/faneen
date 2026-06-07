import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TaxonomyAdminPage } from '@/modules/taxonomy/components/TaxonomyAdminPage';

/**
 * Taxonomy & Reference Data Center — Phase 2.
 *
 * RULE: every /admin/* page MUST be rendered inside <DashboardLayout> so the
 * admin sidebar stays visible. Do not render admin page content bare.
 * TODO: migrate all admin routes to a shared AdminRoute wrapper that applies
 * <ProtectedRoute requireAdmin> + <DashboardLayout> + useNoIndex in one place.
 */
const AdminTaxonomyCenter = () => (
  <DashboardLayout>
    <TaxonomyAdminPage />
  </DashboardLayout>
);

export default AdminTaxonomyCenter;