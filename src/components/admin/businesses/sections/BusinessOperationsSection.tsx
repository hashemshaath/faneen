import { BusinessOperationsPanel } from '@/components/business/BusinessOperationsPanel';

interface Props {
  businessId: string;
}

/**
 * Phase 5E — thin presentational shell that renders the operations panel
 * (internal notes + activity timeline) inside the admin edit-business
 * drawer's "Ops" tab. No state, no mutations, no Supabase imports.
 */
export function BusinessOperationsSection({ businessId }: Props) {
  return <BusinessOperationsPanel businessId={businessId} />;
}

export default BusinessOperationsSection;