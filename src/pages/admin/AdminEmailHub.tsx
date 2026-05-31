import { Mail, Activity } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 14 — Email Center + Deliverability. */
const AdminEmailHub = () => (
  <TabbedShell
    icon={Mail}
    title={{ ar: 'مركز البريد', en: 'Email Center' }}
    description={{
      ar: 'إدارة البريد الصادر، القوالب، ومراقبة قابلية التسليم.',
      en: 'Outbound email management, templates, and deliverability monitoring.',
    }}
    noIndex
    tabs={[
      { key: 'email', label: { ar: 'البريد', en: 'Email' }, icon: Mail, loader: () => import('./AdminEmailCenter') },
      { key: 'deliverability', label: { ar: 'قابلية التسليم', en: 'Deliverability' }, icon: Activity, loader: () => import('./AdminEmailDeliverability') },
    ]}
  />
);

export default AdminEmailHub;