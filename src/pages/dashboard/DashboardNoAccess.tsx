/**
 * ORG-RBAC-STRUCTURE-6 — No-access landing.
 *
 * Bilingual page reached when PermissionRouteGuard denies a workspace
 * route. Provides safe navigation back to the dashboard and a hint to
 * contact the workspace owner / admin. RLS remains authoritative — this
 * page exists purely so denied users land somewhere coherent.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

const DashboardNoAccess: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from ?? null;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent/15 p-3">
                <ShieldAlert className="h-6 w-6 text-accent" aria-hidden />
              </div>
              <CardTitle data-testid="no-access-title">
                {bi('لا تملك صلاحية الوصول', 'You do not have access')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {bi(
                'يبدو أن دورك في المنشأة الحالية لا يمنحك صلاحية فتح هذه الصفحة. يمكنك التواصل مع مالك المنشأة أو المسؤول لطلب صلاحية الوصول.',
                'Your current workspace role does not grant access to this page. Contact your workspace owner or an admin to request access.',
              )}
            </p>
            {fromPath ? (
              <p className="text-xs text-muted-foreground tech-content">
                {bi('المسار المطلوب: ', 'Requested path: ')}
                <code className="px-1.5 py-0.5 rounded bg-muted">{fromPath}</code>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="default">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 me-2" />
                  {bi('العودة إلى لوحة التحكم', 'Back to dashboard')}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">
                  <Home className="h-4 w-4 me-2" />
                  {bi('الصفحة الرئيسية', 'Home')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardNoAccess;