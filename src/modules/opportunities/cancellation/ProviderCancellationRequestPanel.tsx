/**
 * Phase-E closeout — provider mount wrapper.
 *
 * Queries `rfq_cancellation_requests` for an opportunity and renders the
 * inline `ProviderRespondToCancellation` panel when a pending row exists.
 * RLS already restricts SELECT to the awarded provider, so a naive fetch
 * + render-if-pending is sufficient (no client-side ownership check needed).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCancellationRequestsForRfq } from './services';
import { ProviderRespondToCancellation } from './RfqCancellationActions';

export interface ProviderCancellationRequestPanelProps {
  opportunityId: string;
  isRTL?: boolean;
}

export const ProviderCancellationRequestPanel: React.FC<ProviderCancellationRequestPanelProps> = ({
  opportunityId,
  isRTL = true,
}) => {
  const { data } = useQuery({
    queryKey: ['rfq-cancellation-requests', opportunityId],
    queryFn: () => listCancellationRequestsForRfq(opportunityId),
    enabled: !!opportunityId,
  });

  const pending = (data ?? []).find((r) => r.status === 'pending');
  if (!pending) return null;

  return <ProviderRespondToCancellation request={pending} isRTL={isRTL} />;
};

export default ProviderCancellationRequestPanel;