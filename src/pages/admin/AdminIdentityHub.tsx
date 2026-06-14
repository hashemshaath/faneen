import {
  Users,
  Shield,
  KeyRound,
  Activity,
  Lock,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 4 — Identity & Access Center.
 *
 * Thin presentational shell. Each tab lazy-loads an existing admin page
 * that already owns its queries, mutations, and permission gates. NO
 * logic, queries, mutations, or service calls are moved or altered in
 * this shell. Legacy routes (`/admin/users`, `/admin/access-management`,
 * `/admin/entity-access-requests`, `/admin/activity-log`,
 * `/admin/system-access`, `/admin/system/identity`) remain registered
 * and operational.
 */
const AdminIdentityHub = () => (
  <TabbedShell
    icon={ShieldCheck}
    title={{ ar: 'مركز المستخدمين والوصول', en: 'Users & Access Center' }}
    description={{
      ar: 'المستخدمون، الأدوار، الصلاحيات، الدعوات، النشاط، والأمان — في مكان واحد.',
      en: 'Users, roles, permissions, invitations, activity, and security — unified.',
    }}
    noIndex
    tabs={[
      { key: 'overview',    label: { ar: 'نظرة عامة',          en: 'Overview' },             icon: LayoutDashboard, loader: () => import('@/components/admin/centers/identity/IdentityOverviewLanding') },
      { key: 'users',       label: { ar: 'المستخدمون',         en: 'Users' },                icon: Users,           loader: () => import('./AdminUsers') },
      { key: 'roles',       label: { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' }, icon: Shield,          loader: () => import('./AdminAccessManagement') },
      { key: 'invitations', label: { ar: 'الدعوات',            en: 'Invitations' },          icon: KeyRound,        loader: () => import('./AdminEntityAccessRequests') },
      { key: 'activity',    label: { ar: 'النشاط',             en: 'Activity' },             icon: Activity,        loader: () => import('./AdminActivityLog') },
      { key: 'security',    label: { ar: 'الأمان',             en: 'Security' },             icon: Lock,            loader: () => import('./AdminSystemAccess') },
    ]}
  />
);

export default AdminIdentityHub;