import { FileText, BarChart3 } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 4 — Contracts + analytics. */
const DashboardContractsHub = () => (
  <TabbedShell
    icon={FileText}
    title={{ ar: 'العقود', en: 'Contracts' }}
    description={{
      ar: 'إدارة العقود والإطلاع على التحليلات والأداء المالي.',
      en: 'Manage contracts and review analytics and financial performance.',
    }}
    tabs={[
      { key: 'contracts', label: { ar: 'العقود', en: 'Contracts' }, icon: FileText, loader: () => import('./DashboardContracts') },
      { key: 'analytics', label: { ar: 'التحليلات', en: 'Analytics' }, icon: BarChart3, loader: () => import('./DashboardContractAnalytics') },
    ]}
  />
);

export default DashboardContractsHub;