import { BarChart3, Gauge } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 12 — Reports + KPIs. */
const AdminReportsHub = () => (
  <TabbedShell
    icon={BarChart3}
    title={{ ar: 'مركز التقارير', en: 'Reports Center' }}
    description={{
      ar: 'التقارير التشغيلية ومؤشرات الأداء المتقدمة.',
      en: 'Operational reports and advanced KPIs.',
    }}
    noIndex
    tabs={[
      { key: 'reports', label: { ar: 'التقارير', en: 'Reports' }, icon: BarChart3, loader: () => import('./AdminReports') },
      { key: 'kpis', label: { ar: 'مؤشرات الأداء', en: 'KPIs' }, icon: Gauge, loader: () => import('./AdminKpis') },
    ]}
  />
);

export default AdminReportsHub;