import { Crown, CreditCard, ShieldAlert, Layers } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 13 — Memberships & Payments center. */
const AdminMembershipsHub = () => (
  <TabbedShell
    icon={Crown}
    title={{ ar: 'العضويات والمدفوعات', en: 'Memberships & Payments' }}
    description={{
      ar: 'خطط العضوية، اشتراكات المزودين، المدفوعات والسجلات.',
      en: 'Membership plans, provider subscriptions, payments, and event logs.',
    }}
    noIndex
    tabs={[
      { key: 'plans', label: { ar: 'العضويات', en: 'Memberships' }, icon: Crown, loader: () => import('./AdminMemberships') },
      { key: 'modules', label: { ar: 'مصفوفة الخدمات', en: 'Plan Modules Matrix' }, icon: Layers, loader: () => import('./AdminMembershipPlanModules') },
      { key: 'providers', label: { ar: 'عضويات المزودين', en: 'Provider Memberships' }, icon: Crown, loader: () => import('./AdminProviderSubscriptions') },
      { key: 'payments', label: { ar: 'المدفوعات', en: 'Payments' }, icon: CreditCard, loader: () => import('./AdminMembershipPayments') },
      { key: 'events', label: { ar: 'سجل الأحداث', en: 'Events' }, icon: ShieldAlert, loader: () => import('./AdminMembershipEvents') },
      { key: 'rejections', label: { ar: 'تدقيق الرفض', en: 'Rejection Audit' }, icon: ShieldAlert, loader: () => import('./AdminMembershipRejections') },
    ]}
  />
);

export default AdminMembershipsHub;