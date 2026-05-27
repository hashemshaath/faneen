import { BusinessInternalNotesCard } from "./BusinessInternalNotesCard";
import { BusinessActivityTimelineCard } from "./BusinessActivityTimelineCard";

interface Props {
  businessId: string;
}

/**
 * Composite panel surfacing Internal Notes + Activity Timeline for a single
 * business. Render only when the operator has opened the relevant detail
 * surface — never inside list rows.
 */
export function BusinessOperationsPanel({ businessId }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BusinessInternalNotesCard businessId={businessId} />
      <BusinessActivityTimelineCard businessId={businessId} />
    </div>
  );
}

export default BusinessOperationsPanel;