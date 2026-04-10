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
      },
    });
  } catch {
    // silent fail
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireSuperAdmin = false,
}) => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  const shouldDeny =
    !loading &&
    user &&
    ((requireSuperAdmin && !isSuperAdmin) || (requireAdmin && !isAdmin));

  useEffect(() => {
    if (shouldDeny && !loggedRef.current) {
      loggedRef.current = true;
      const role = requireSuperAdmin ? 'super_admin' : 'admin';
      logUnauthorizedAccess(user?.id, location.pathname, role);
    }
  }, [shouldDeny, user?.id, location.pathname, requireSuperAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse">
          <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Suspense fallback={null}><Forbidden /></Suspense>;
  }

  if (requireAdmin && !isAdmin) {
    return <Suspense fallback={null}><Forbidden /></Suspense>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
