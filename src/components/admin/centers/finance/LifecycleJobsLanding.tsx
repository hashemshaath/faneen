import { MembershipLifecycleJobsPanel } from '@/components/admin/MembershipLifecycleJobsPanel';

/**
 * ADMIN UX RECONSOLIDATION PHASE 9 — Lifecycle Jobs landing.
 *
 * Embeds the existing `MembershipLifecycleJobsPanel` as-is, without
 * touching its queries, mutations, or cron job behavior.
 */
const LifecycleJobsLanding = () => (
  <div className="space-y-3">
    <MembershipLifecycleJobsPanel />
  </div>
);

export default LifecycleJobsLanding;