/**
 * Admin Home (`/admin`) — canonical landing for administrators.
 *
 * Previously `/admin` redirected straight to the Operations Center,
 * which made the sidebar "Home" entry duplicate "Operations Center" and
 * hid the platform-wide overview. This page mounts the full
 * `AdminDashboardView` (welcome hero, KPI bento, requests inbox,
 * activity feed, charts) inside the standard DashboardLayout shell.
 */
import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { lazyRetry } from '@/lib/lazyRetry';

const AdminDashboardView = lazyRetry(
  () => import('@/pages/dashboard/overview/AdminDashboardView'),
);

export default function AdminHome() {
  const { isRTL } = useLanguage();
  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <AdminDashboardView isRTL={isRTL} />
      </Suspense>
    </DashboardLayout>
  );
}