import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAdminEmbedded } from '@/contexts/AdminTabsContext';

/**
 * Wraps children with <DashboardLayout> unless the page is rendered
 * inside another admin page (AdminEmbeddedContext === true), in which
 * case it returns a plain fragment so we don't double-wrap the sidebar.
 */
export const MaybeDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const embedded = useAdminEmbedded();
  if (embedded) return <>{children}</>;
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default MaybeDashboardLayout;