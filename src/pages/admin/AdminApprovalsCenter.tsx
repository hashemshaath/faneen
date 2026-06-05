import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * UNIFIED-ACCOUNTS-APPROVALS — `/admin/approvals` is now merged into
 * the Account & Approvals Center at `/admin/identity?tab=approvals`.
 * Preserve query-string for any deep links.
 */
const AdminApprovalsCenter: React.FC = () => {
  const [sp] = useSearchParams();
  const qs = new URLSearchParams(sp);
  if (!qs.get('tab')) qs.set('tab', 'approvals');
  return <Navigate to={`/admin/identity?${qs.toString()}`} replace />;
};

export default AdminApprovalsCenter;
