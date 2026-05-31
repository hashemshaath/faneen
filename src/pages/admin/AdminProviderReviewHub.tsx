import { ShieldCheck, TrendingUp, Gauge } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 10 — Provider Review center. */
const AdminProviderReviewHub = () => (
  <TabbedShell
    icon={ShieldCheck}
    title={{ ar: 'مراجعة المزودين', en: 'Provider Review' }}
    description={{
      ar: 'مراجعة المزودين وتحليلات أدائهم وصفحة هبوطهم.',
      en: 'Provider review, performance analytics, and landing page.',
    }}
    noIndex
    tabs={[
      { key: 'review', label: { ar: 'المراجعة', en: 'Review' }, icon: ShieldCheck, loader: () => import('./AdminProviderReview') },
      { key: 'analytics', label: { ar: 'التحليلات', en: 'Analytics' }, icon: TrendingUp, loader: () => import('./AdminProviderAnalytics') },
      { key: 'landing', label: { ar: 'صفحة الهبوط', en: 'Landing Page' }, icon: Gauge, loader: () => import('./AdminProviderLanding') },
    ]}
  />
);

export default AdminProviderReviewHub;