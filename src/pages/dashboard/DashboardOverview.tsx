import React, { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useProviderActivityPing } from '@/hooks/useProviderActivityPing';
import { DashboardViewSkeleton } from '@/components/dashboard/overview/shared';
import { lazyRetry } from '@/lib/lazyRetry';
import '@/styles/dashboard-emerald.css';

/**
 * Role-routed Dashboard entry. Each role view is split into its own chunk
 * so users only download the code they need (admin chunk ~ recharts +
 * activity log views; provider chunk ~ provider widgets + revenue chart;
 * user chunk ~ minimal).
 */
const AdminDashboardView    = lazyRetry(() => import('./overview/AdminDashboardView'));
const ProviderDashboardView = lazyRetry(() => import('./overview/ProviderDashboardView'));
const UserDashboardView     = lazyRetry(() => import('./overview/UserDashboardView'));

const DashboardOverview = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user, profile, isAdmin, isProvider } = useAuth();
  useProviderActivityPing(!!user && isProvider);

  return (
    <DashboardLayout>
      <div className="dash-emerald">
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
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;