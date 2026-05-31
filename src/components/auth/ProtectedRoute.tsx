import React, { useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { BrandLogo } from '@/components/common/BrandLogo';
import { setForbiddenContext } from '@/lib/forbiddenContext';
import { useVisibleModules } from '@/hooks/useVisibleModules';

const Forbidden = lazy(() => import('@/pages/Forbidden'));

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireProvider?: boolean;
  skipOnboarding?: boolean;
}

const logUnauthorizedAccess = async (
  userId: string | undefined,
  path: string,
  requiredRole: string
) => {
  if (!userId) return;
  try {
    await supabase.from('access_violation_log').insert({
      user_id: userId,
      route: path,
      violation_type: 'unauthorized_route_access',
      details: {
        required_role: requiredRole,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent?.substring(0, 200),
      },
    });
  } catch {
    // silent fail - security logging should never break the app
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireSuperAdmin = false,
  requireProvider = false,
  skipOnboarding = false,
}) => {
  const { user, loading, isAdmin, isSuperAdmin, isProvider, profile, roles } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);
  const { isRouteHidden, isLoading: modulesLoading } = useVisibleModules();

  // Prevent search engines from indexing protected pages
  useNoIndex();

  // Wait for full data load: loading must be false AND if user exists, profile must be loaded
  const fullyLoaded = !loading && (!user || profile !== null);

  const shouldDeny =
    fullyLoaded &&
    user &&
    ((requireSuperAdmin && !isSuperAdmin) ||
     (requireAdmin && !isAdmin) ||
     (requireProvider && !isProvider && !isAdmin));

  useEffect(() => {
    if (shouldDeny && !loggedRef.current) {
      loggedRef.current = true;
      const role = requireSuperAdmin ? 'super_admin' : requireAdmin ? 'admin' : 'provider';
      // eslint-disable-next-line no-console
      console.warn('[ProtectedRoute] ACCESS DENIED → showing Forbidden', {
        path: location.pathname,
        required: role,
        userId: user?.id,
        roles,
        isAdmin, isSuperAdmin, isProvider,
      });
      setForbiddenContext({
        path: location.pathname,
        requiredRole: role,
        userId: user?.id ?? null,
        roles,
        isAdmin, isProvider, isSuperAdmin,
        accountType: profile?.account_type ?? null,
        at: new Date().toISOString(),
      });
      logUnauthorizedAccess(user?.id, location.pathname, role);
    }
  }, [shouldDeny, user?.id, location.pathname, requireSuperAdmin, requireAdmin, roles, isAdmin, isSuperAdmin, isProvider, profile?.account_type]);

  // Show loading spinner while auth state is being resolved
  if (!fullyLoaded || modulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <BrandLogo variant="mark" tone="auto" size="loader" alt="قِطاعات" />
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users
  if (requireAuth && !user) {
    // eslint-disable-next-line no-console
    console.info('[ProtectedRoute] not authenticated → /auth', { from: location.pathname });
    return <NavigateToAuth from={location.pathname} />;
  }

  // Redirect to onboarding if profile is not complete (admins bypass onboarding)
  if (user && profile && !profile.is_onboarded && !skipOnboarding && !isAdmin && !isSuperAdmin && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Access denied
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Suspense fallback={null}><Forbidden /></Suspense>;
  }
  if (requireAdmin && !isAdmin) {
    return <Suspense fallback={null}><Forbidden /></Suspense>;
  }
  if (requireProvider && !isProvider && !isAdmin) {
    return <Suspense fallback={null}><Forbidden /></Suspense>;
  }

  if (isRouteHidden(location.pathname) && location.pathname !== '/dashboard/no-access') {
    return (
      <Navigate
        to="/dashboard/no-access"
        replace
        state={{ from: location.pathname, denied: true, reason: 'module_disabled' }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

/**
 * Stable wrapper around `<Navigate to="/auth">`. Memoizes the `state` object
 * by `from` so react-router's internal effect does not re-fire on every
 * AuthProvider re-render (which would cause a Maximum-update-depth loop
 * during the brief window where `user` is null while session is rehydrating).
 */
const NavigateToAuth: React.FC<{ from: string }> = ({ from }) => {
  const state = useMemo(() => ({ from }), [from]);
  return <Navigate to="/auth" state={state} replace />;
};
