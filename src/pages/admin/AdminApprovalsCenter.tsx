import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { UnifiedApprovalsCenterBanner } from '@/components/admin/UnifiedApprovalsCenterBanner';
import { ApprovalsInbox } from '@/pages/admin/approvalsCenter/ApprovalsInbox';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';

/**
 * UNIFIED-ACCOUNTS-APPROVALS — clear admin approval queue.
 * Standalone route stays visible from Operations and Customers sidebar groups,
 * while the same inbox can still be embedded in tabbed hubs.
 */
const AdminApprovalsCenter: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-5">
        <AdminPageHeader
          icon={CheckCircle2}
          tone="warning"
          eyebrow={isRTL ? 'العمليات والموافقات' : 'Operations approvals'}
          title={isRTL ? 'مركز الموافقات' : 'Approvals Center'}
          subtitle={isRTL
            ? 'قائمة واضحة للطلبات والجهات التي تحتاج مراجعة أو موافقة.'
            : 'A clear queue for requests and entities that need review or approval.'}
        />
        <UnifiedApprovalsCenterBanner />
        <ApprovalsInbox />
      </div>
    </DashboardLayout>
  );
};

export default AdminApprovalsCenter;
