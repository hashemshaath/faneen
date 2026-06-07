import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

/**
 * AdminRoute — single wrapper for every `/admin/*` route element.
 *
 * Combines `<ProtectedRoute requireAdmin>` and `<DashboardLayout>` so the
 * admin sidebar always renders and `requireAdmin` is never accidentally
 * dropped. `useNoIndex` is invoked by the page itself (or DashboardLayout)
 * — do not duplicate it here.
 *
 * TODO(taxonomy phase-6): migrate all admin routes in `src/App.tsx` to use
 * <AdminRoute>{children}</AdminRoute> instead of repeating
 * <ProtectedRoute requireAdmin><Page /></ProtectedRoute>. Migrating in one
 * sweep is risky because some admin pages wrap themselves in DashboardLayout
 * internally and would render it twice; migrate page-by-page after removing
 * the inner wrapper from each page.
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireAdmin>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

export default AdminRoute;