import { Inbox, MessageSquareQuote } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 2 — Service Requests + Quote Opportunities. */
const DashboardRequestsHub = () => (
  <TabbedShell
    icon={Inbox}
    title={{ ar: 'الطلبات والفرص', en: 'Requests & Opportunities' }}
    description={{
      ar: 'طلبات الخدمة الواردة وفرص عروض الأسعار من العملاء.',
      en: 'Incoming service requests and quote opportunities.',
    }}
    tabs={[
      { key: 'service-requests', label: { ar: 'طلبات الخدمة', en: 'Service Requests' }, icon: Inbox, loader: () => import('./DashboardLeads') },
      { key: 'quote-opportunities', label: { ar: 'فرص عروض الأسعار', en: 'Quote Opportunities' }, icon: MessageSquareQuote, loader: () => import('./ProviderLeads') },
    ]}
  />
);

export default DashboardRequestsHub;