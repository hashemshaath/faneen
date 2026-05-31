import { Activity, ShieldCheck } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 9 — Operations + Console. */
const AdminOperationsHub = () => (
  <TabbedShell
    icon={Activity}
    title={{ ar: 'مركز العمليات', en: 'Operations Center' }}
    description={{
      ar: 'لوحة العمليات اليومية ووحدة التحكم التشغيلية في مكان واحد.',
      en: 'Daily operations dashboard and the operations console — unified.',
    }}
    noIndex
    tabs={[
      { key: 'operations', label: { ar: 'العمليات', en: 'Operations' }, icon: Activity, loader: () => import('./AdminOperations') },
      { key: 'console', label: { ar: 'وحدة التحكم', en: 'Console' }, icon: ShieldCheck, loader: () => import('./AdminOperationsConsole') },
    ]}
  />
);

export default AdminOperationsHub;