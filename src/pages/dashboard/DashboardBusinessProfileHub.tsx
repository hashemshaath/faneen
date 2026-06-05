import { Building2, Eye, Layers, MapPinned } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 1 — Business Profile hub. */
const DashboardBusinessProfileHub = () => (
  <TabbedShell
    icon={Building2}
    title={{ ar: 'بيانات المنشأة', en: 'Business Profile' }}
    description={{
      ar: 'بيانات المنشأة الأساسية وحسابات الكيانات المرتبطة بها.',
      en: 'Core business profile and linked entity accounts.',
    }}
    tabs={[
      { key: 'business', label: { ar: 'بيانات المنشأة', en: 'Business Profile' }, icon: Building2, loader: () => import('./DashboardBusinessEdit') },
      { key: 'branches', label: { ar: 'الفروع', en: 'Branches' }, icon: MapPinned, loader: () => import('./DashboardBranches') },
      { key: 'entities', label: { ar: 'حسابات الكيانات', en: 'Entities' }, icon: Layers, loader: () => import('./DashboardEntities') },
      { key: 'visibility', label: { ar: 'ظهور الأقسام', en: 'Section visibility' }, icon: Eye, loader: () => import('./DashboardBusinessVisibility') },
    ]}
  />
);

export default DashboardBusinessProfileHub;