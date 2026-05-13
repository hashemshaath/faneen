import React, { Suspense, lazy } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardViewSkeleton } from '@/components/dashboard/overview/shared';

/**
 * Role-routed Dashboard entry. Each role view is split into its own chunk
 * so users only download the code they need (admin chunk ~ recharts +
 * activity log views; provider chunk ~ provider widgets + revenue chart;
 * user chunk ~ minimal).
 */
const AdminDashboardView    = lazy(() => import('./overview/AdminDashboardView'));
const ProviderDashboardView = lazy(() => import('./overview/ProviderDashboardView'));
const UserDashboardView     = lazy(() => import('./overview/UserDashboardView'));

const DashboardOverview = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user, profile, isAdmin, isProvider } = useAuth();

  return (
    <DashboardLayout>
      <Suspense fallback={<DashboardViewSkeleton />}>
        {isAdmin ? (
          <AdminDashboardView isRTL={isRTL} />
        ) : isProvider && user ? (
          <ProviderDashboardView isRTL={isRTL} user={user} profile={profile} />
        ) : user ? (
          <UserDashboardView isRTL={isRTL} user={user} profile={profile} />
        ) : (
          <DashboardViewSkeleton />
        )}
      </Suspense>
    </DashboardLayout>
  );
};

export default DashboardOverview;