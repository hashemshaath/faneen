import {
  Inbox, FileText, Wrench, GitBranch, Users,
  Clock, BarChart3, LayoutGrid,
} from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 7 — Procurement Center.
 *
 * Canonical 7-tab consolidation of every procurement admin surface.
 * Each tab either embeds an existing page or renders a presentational
 * landing. NO queries, NO mutations, and NO service calls are moved
 * into the shell.
 */
const AdminProcurementCenter = () => (
  <TabbedShell
    icon={FileText}
    title={{ ar: 'مركز المشتريات', en: 'Procurement Center' }}
    description={{
      ar: 'طلبات عروض الأسعار، المطابقة، الفرص، والعمليات في مكان واحد.',
      en: 'Quote requests, matching, leads, and operations — unified.',
    }}
    noIndex
    tabs={[
      { key: 'overview',   label: { ar: 'نظرة عامة', en: 'Overview' },        icon: LayoutGrid, loader: () => import('@/components/admin/centers/procurement/ProcurementOverviewLanding') },
      { key: 'requests',   label: { ar: 'الطلبات',   en: 'Requests' },        icon: Inbox,      loader: () => import('./AdminQuoteRequests') },
      { key: 'matching',   label: { ar: 'المطابقة',  en: 'Matching' },        icon: GitBranch,  loader: () => import('@/components/admin/centers/procurement/MatchingLanding') },
      { key: 'leads',      label: { ar: 'الفرص',     en: 'Leads' },           icon: Users,      loader: () => import('./AdminProviderLeads') },
      { key: 'operations', label: { ar: 'العمليات',  en: 'Operations' },      icon: Wrench,     loader: () => import('./AdminQuoteOperations') },
      { key: 'follow-up',  label: { ar: 'المتابعة',  en: 'Follow-up / SLA' }, icon: Clock,      loader: () => import('@/components/admin/centers/procurement/FollowUpLanding') },
      { key: 'reports',    label: { ar: 'التقارير',  en: 'Reports' },         icon: BarChart3,  loader: () => import('@/components/admin/centers/procurement/ReportsLanding') },
    ]}
  />
);

export default AdminProcurementCenter;
