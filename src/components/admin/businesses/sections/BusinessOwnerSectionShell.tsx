import { BusinessOwnerPanel } from '@/components/admin/BusinessOwnerPanel';

interface Props {
  businessId: string;
  businessRef: string | null;
  ownerUserId: string;
  isRTL: boolean;
  onOwnerReassigned: () => void;
}

/**
 * Phase 5E — presentational shell for the admin edit-business drawer's
 * "Owner" tab. Wraps the existing `BusinessOwnerPanel` (which owns the
 * owner-reassignment mutation) so the parent page can compose tabs
 * without touching JSX wiring. No Supabase imports here; the inner
 * panel keeps its existing data flow unchanged.
 */
export function BusinessOwnerSectionShell({
  businessId,
  businessRef,
  ownerUserId,
  isRTL,
  onOwnerReassigned,
}: Props) {
  return (
    <BusinessOwnerPanel
      businessId={businessId}
      businessRef={businessRef}
      ownerUserId={ownerUserId}
      isRTL={isRTL}
      onOwnerReassigned={onOwnerReassigned}
    />
  );
}

export default BusinessOwnerSectionShell;