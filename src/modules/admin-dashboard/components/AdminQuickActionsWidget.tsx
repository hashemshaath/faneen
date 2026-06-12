import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ADMIN_DASHBOARD_QUICK_ACTIONS } from '../widgets/adminDashboardWidgets';
import { cn } from '@/lib/utils';

/**
 * Quick-actions widget — renders the registry-defined shortcuts in a
 * responsive grid. Every target route is validated against
 * `ADMIN_NAV_ITEMS` by `adminDashboardWidgets.test.ts`.
 */
export const AdminQuickActionsWidget: React.FC<{ isRTL: boolean }> = ({ isRTL }) => (
  <Card className="border-border/40" data-testid="admin-quick-actions">
    <CardHeader className="pb-1 px-4 pt-3">
      <CardTitle className="text-xs">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {ADMIN_DASHBOARD_QUICK_ACTIONS.map((a) => (
          <Link
            key={a.id}
            to={a.route}
            data-testid="admin-quick-action"
            data-route={a.route}
            className={cn(
              'group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/40 p-2.5',
              'hover:border-accent/40 hover:bg-muted/30 transition-colors text-center min-h-[64px]',
            )}
          >
            <span className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
              <a.icon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-medium leading-tight line-clamp-2">
              {isRTL ? a.labelAr : a.labelEn}
            </span>
          </Link>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default AdminQuickActionsWidget;