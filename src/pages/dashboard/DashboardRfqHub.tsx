import { FileText, Inbox } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 3 — Provider RFQ hub. */
const DashboardRfqHub = () => (
  <TabbedShell
    icon={FileText}
    title={{ ar: 'عروض الأسعار RFQ', en: 'Request for Quotation' }}
    description={{
      ar: 'طلباتك الصادرة من العملاء والوارد المخصص لمنشأتك.',
      en: 'Outgoing customer requests and your dedicated inbox.',
    }}
    tabs={[
      { key: 'requests', label: { ar: 'الطلبات', en: 'Requests' }, icon: FileText, loader: () => import('./DashboardRfq') },
      { key: 'inbox', label: { ar: 'الوارد', en: 'Inbox' }, icon: Inbox, loader: () => import('./DashboardRfqInbox') },
    ]}
  />
);

export default DashboardRfqHub;