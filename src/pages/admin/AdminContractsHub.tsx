import {
  LayoutDashboard, FileText, FilePlus, Files, ShieldCheck,
  FileBarChart, BarChart3, ClipboardList,
} from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 8 — Contracts Center.
 * Unifies contracts, templates, approvals, PDF exports, and audit
 * into a single tabbed surface. Legacy routes
 * (`/admin/contract-templates`, `/admin/pdf-exports`,
 * `/admin/contracts/create`, `/admin/contracts/analytics`) keep
 * redirecting into the matching tab here, preserving deep links.
 */
const AdminContractsHub = () => (
  <TabbedShell
    icon={FileText}
    title={{ ar: 'مركز العقود', en: 'Contracts' }}
    description={{
      ar: 'العقود، القوالب، الموافقات، تصدير PDF، والتدقيق في مكان واحد.',
      en: 'Contracts, templates, approvals, PDF exports, and audit in one place.',
    }}
    noIndex
    tabs={[
      { key: 'overview', label: { ar: 'نظرة عامة', en: 'Overview' }, icon: LayoutDashboard, loader: () => import('@/components/admin/centers/contracts/ContractsOverviewLanding') },
      { key: 'contracts', label: { ar: 'العقود', en: 'Contracts' }, icon: FileText, loader: () => import('./AdminContracts') },
      { key: 'create', label: { ar: 'إنشاء بالنيابة', en: 'Create on Behalf' }, icon: FilePlus, loader: () => import('./AdminContractCreate') },
      { key: 'templates', label: { ar: 'القوالب', en: 'Templates' }, icon: Files, loader: () => import('./AdminContractTemplates') },
      { key: 'approvals', label: { ar: 'الموافقات', en: 'Approvals' }, icon: ShieldCheck, loader: () => import('@/components/admin/centers/contracts/ApprovalsLanding') },
      { key: 'exports', label: { ar: 'تصدير PDF', en: 'PDF Exports' }, icon: FileBarChart, loader: () => import('./AdminPdfExportAudit') },
      { key: 'audit', label: { ar: 'التدقيق', en: 'Audit' }, icon: ClipboardList, loader: () => import('@/components/admin/centers/contracts/AuditLanding') },
      { key: 'analytics', label: { ar: 'التحليلات', en: 'Analytics' }, icon: BarChart3, loader: () => import('./AdminContractAnalytics') },
    ]}
  />
);

export default AdminContractsHub;