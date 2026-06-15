/**
 * ADMIN UX RECONSOLIDATION PHASE 9 — Finance & Membership Center.
 *
 * Unified center for memberships, provider subscriptions, payments,
 * plans, and lifecycle jobs. Legacy tab keys (`modules`, `providers`,
 * `events`, `rejections`) remain valid aliases so all existing deep
 * links such as `/admin/membership-payments`,
 * `/admin/provider-subscriptions`, `/admin/membership-events`, and
 * `/admin/membership-rejections` continue to resolve.
 */
import {
  LayoutDashboard, Crown, Wallet, CreditCard, Layers, Clock,
  ShieldAlert,
} from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

const AdminFinanceCenter = () => (
  <TabbedShell
    icon={Crown}
    title={{ ar: 'مركز المالية والعضويات', en: 'Finance' }}
    description={{
      ar: 'العضويات، الاشتراكات، المدفوعات، الخطط، ومهام دورة الحياة في مكان واحد.',
      en: 'Memberships, subscriptions, payments, plans, and lifecycle jobs in one place.',
    }}
    noIndex
    tabs={[
      { key: 'overview', label: { ar: 'نظرة عامة', en: 'Overview' }, icon: LayoutDashboard, loader: () => import('@/components/admin/centers/finance/FinanceOverviewLanding') },
      { key: 'memberships', label: { ar: 'العضويات', en: 'Memberships' }, icon: Crown, loader: () => import('./AdminMemberships') },
      { key: 'subscriptions', label: { ar: 'اشتراكات المزودين', en: 'Subscriptions' }, icon: Wallet, loader: () => import('./AdminProviderSubscriptions') },
      { key: 'payments', label: { ar: 'المدفوعات', en: 'Payments' }, icon: CreditCard, loader: () => import('./AdminMembershipPayments') },
      { key: 'plans', label: { ar: 'الخطط', en: 'Plans' }, icon: Layers, loader: () => import('./AdminMembershipPlanModules') },
      { key: 'lifecycle', label: { ar: 'مهام دورة الحياة', en: 'Lifecycle Jobs' }, icon: Clock, loader: () => import('@/components/admin/centers/finance/LifecycleJobsLanding') },
      // Legacy deep-link aliases — keep working without changing behavior.
      { key: 'modules', label: { ar: 'مصفوفة الخدمات', en: 'Plan Modules Matrix' }, icon: Layers, loader: () => import('./AdminMembershipPlanModules') },
      { key: 'providers', label: { ar: 'عضويات المزودين', en: 'Provider Memberships' }, icon: Wallet, loader: () => import('./AdminProviderSubscriptions') },
      { key: 'events', label: { ar: 'سجل الأحداث', en: 'Events' }, icon: ShieldAlert, loader: () => import('./AdminMembershipEvents') },
      { key: 'rejections', label: { ar: 'تدقيق الرفض', en: 'Rejection Audit' }, icon: ShieldAlert, loader: () => import('./AdminMembershipRejections') },
    ]}
  />
);

export default AdminFinanceCenter;
