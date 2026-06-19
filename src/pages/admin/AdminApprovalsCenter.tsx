import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * UNIFIED-ACCOUNTS-APPROVALS — `/admin/approvals` is now merged into
 * the Account & Approvals dashboard at `/admin/identity/dashboard?tab=workspace`.
 * Preserve query-string for any deep links.
 */
const AdminApprovalsCenter: React.FC = () => {
  const [sp] = useSearchParams();
  const qs = new URLSearchParams(sp);
  qs.set('tab', 'workspace');
  return <Navigate to={`/admin/identity/dashboard?${qs.toString()}`} replace />;
};

export default AdminApprovalsCenter;
