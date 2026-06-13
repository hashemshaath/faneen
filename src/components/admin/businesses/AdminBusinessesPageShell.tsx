import React from 'react';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';

/**
 * AdminBusinessesPageShell — slim layout wrapper for the AdminBusinesses
 * page. Pure structure: wraps the page in the dashboard chrome and
 * applies the shared spacing / max-width tokens. No state, no Supabase,
 * no business logic. Children are rendered in document order so the
 * page composes its own slots (header, kpi, filters, content, drawer).
 */
interface AdminBusinessesPageShellProps {
  children: React.ReactNode;
}

export const AdminBusinessesPageShell: React.FC<AdminBusinessesPageShellProps> = ({ children }) => {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto" data-testid="admin-businesses-shell">
        {children}
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinessesPageShell;