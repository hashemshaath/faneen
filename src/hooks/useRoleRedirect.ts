import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the correct landing page based on user role and profile state.
 * Priority: super_admin > admin > onboarding > provider > individual
 */
export const useRoleRedirect = () => {
  const navigate = useNavigate();
  const { profile, isAdmin, isSuperAdmin, isProvider } = useAuth();

  const getTargetRoute = useCallback((): string => {
    // Super admin / admin → admin dashboard
    if (isSuperAdmin) return '/admin/activity-log';
    if (isAdmin) return '/admin/activity-log';

    // Not onboarded → must onboard first (admins bypass this)
    if (profile && !profile.is_onboarded) return '/onboarding';

    // Provider → provider dashboard
    if (isProvider) return '/dashboard';

    // Individual → user dashboard
    return '/dashboard';
  }, [profile, isAdmin, isSuperAdmin, isProvider]);

  const redirectByRole = useCallback(() => {
    navigate(getTargetRoute(), { replace: true });
  }, [navigate, getTargetRoute]);

  return { redirectByRole, getTargetRoute };
};
