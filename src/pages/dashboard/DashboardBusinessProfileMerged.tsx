import React, { Suspense } from 'react';
import { lazyRetry } from '@/lib/lazyRetry';

/**
 * Merged tab: renders the Entities list (compact) above the Business
 * Profile edit form. Both pages are embedded (DashboardLayout early-returns
 * inside EmbeddedPageContext), so no shell duplication.
 */
const DashboardEntities = lazyRetry(() => import('./DashboardEntities'));
const DashboardBusinessEdit = lazyRetry(() => import('./DashboardBusinessEdit'));

const Fallback: React.FC = () => (
  <div className="h-24 rounded-xl border border-border/40 bg-muted/30 animate-pulse" />
);

const DashboardBusinessProfileMerged: React.FC = () => (
  <div className="space-y-8">
    <Suspense fallback={<Fallback />}>
      <DashboardEntities />
    </Suspense>
    <div className="h-px bg-border/60" />
    <Suspense fallback={<Fallback />}>
      <DashboardBusinessEdit />
    </Suspense>
  </div>
);

export default DashboardBusinessProfileMerged;