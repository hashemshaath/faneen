import { Inbox, FileText, Wrench, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 2 — Procurement Center shell.
 *
 * Thin presentational wrapper that exposes existing procurement admin
 * pages as tabs. NO queries, mutations, or business logic are moved or
 * altered here; each tab lazy-loads its existing page component which
 * detects the embedded context and renders without its own shell.
 */
const AdminProcurementCenter = () => (
  <TabbedShell
    icon={FileText}
    title={{ ar: 'مركز المشتريات', en: 'Procurement Center' }}
    description={{
      ar: 'طلبات عروض الأسعار، الفرص، طلبات الخدمات، والتفعيلات في مكان واحد.',
      en: 'Quote requests, leads, service requests, and activations — unified.',
    }}
    noIndex
    tabs={[
      { key: 'requests',     label: { ar: 'الطلبات',          en: 'Requests' },        icon: Inbox,        loader: () => import('./AdminQuoteOperations') },
      { key: 'leads',        label: { ar: 'الفرص',            en: 'Leads' },           icon: Inbox,        loader: () => import('./AdminLeadRequests') },
      { key: 'services',     label: { ar: 'طلبات الخدمات',    en: 'Service Requests' },icon: Wrench,       loader: () => import('./AdminServiceRequests') },
      { key: 'activations',  label: { ar: 'تفعيل الخدمات',    en: 'Activations' },     icon: CheckCircle2, loader: () => import('./AdminServiceActivations') },
      { key: 'provider-leads', label: { ar: 'فرص المزودين',   en: 'Provider Leads' },  icon: ShieldCheck,  loader: () => import('./AdminProviderLeads') },
    ]}
  />
);

export default AdminProcurementCenter;
