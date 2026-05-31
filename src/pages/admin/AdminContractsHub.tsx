import { FileText, FilePlus, Files, FileBarChart, BarChart3 } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 11 — Admin Contracts management center. */
const AdminContractsHub = () => (
  <TabbedShell
    icon={FileText}
    title={{ ar: 'إدارة العقود', en: 'Contracts Administration' }}
    description={{
      ar: 'العقود، الإنشاء بالنيابة، القوالب، سجل التصدير والتحليلات.',
      en: 'Contracts, create-on-behalf, templates, export audit, and analytics.',
    }}
    noIndex
    tabs={[
      { key: 'contracts', label: { ar: 'العقود', en: 'Contracts' }, icon: FileText, loader: () => import('./AdminContracts') },
      { key: 'create', label: { ar: 'إنشاء بالنيابة', en: 'Create on Behalf' }, icon: FilePlus, loader: () => import('./AdminContractCreate') },
      { key: 'templates', label: { ar: 'القوالب', en: 'Templates' }, icon: Files, loader: () => import('./AdminContractTemplates') },
      { key: 'exports', label: { ar: 'سجل التصدير', en: 'Export Audit' }, icon: FileBarChart, loader: () => import('./AdminPdfExportAudit') },
      { key: 'analytics', label: { ar: 'التحليلات', en: 'Analytics' }, icon: BarChart3, loader: () => import('./AdminContractAnalytics') },
    ]}
  />
);

export default AdminContractsHub;