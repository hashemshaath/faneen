import { Users, ShieldCheck } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 8 — Staff directory + access. */
const DashboardStaffHub = () => (
  <TabbedShell
    icon={Users}
    title={{ ar: 'الموظفون', en: 'Staff' }}
    description={{
      ar: 'إدارة الموظفين وصلاحيات الوصول للأنظمة.',
      en: 'Manage staff and their system-level access.',
    }}
    tabs={[
      { key: 'staff', label: { ar: 'الموظفون', en: 'Staff' }, icon: Users, loader: () => import('./DashboardStaffCenter') },
      { key: 'permissions', label: { ar: 'الصلاحيات', en: 'Permissions' }, icon: ShieldCheck, loader: () => import('./DashboardTeamAccess') },
    ]}
  />
);

export default DashboardStaffHub;