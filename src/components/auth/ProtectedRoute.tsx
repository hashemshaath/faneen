import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
    await supabase.from('access_violation_log' as any).insert({
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
      logUnauthorizedAccess(user?.id, location.pathname, role);
    }
  }, [shouldDeny, user?.id, location.pathname, requireSuperAdmin, requireAdmin]);

  // Show loading spinner while auth state is being resolved
  if (!fullyLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse">
          <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Redirect to onboarding if profile is not complete
  if (user && profile && !profile.is_onboarded && !skipOnboarding && location.pathname !== '/onboarding') {
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

  return <>{children}</>;
};

export default ProtectedRoute;
