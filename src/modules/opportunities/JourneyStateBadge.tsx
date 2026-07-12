/**
 * R5.3 — Small chip for showing an RFQ's computed journey state on
 * client-facing request cards. Uses the shared `StatusBadge` primitive
 * so tone tokens stay consistent with the rest of the admin/dashboard.
 */
import React from 'react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  RFQ_JOURNEY_STATE_LABEL_AR,
  RFQ_JOURNEY_STATE_TONE,
  type RfqJourneyState,
} from './journeyState';

export const JourneyStateBadge: React.FC<{
  state: RfqJourneyState;
  className?: string;
}> = ({ state, className }) => (
  <StatusBadge
    tone={RFQ_JOURNEY_STATE_TONE[state]}
    label={RFQ_JOURNEY_STATE_LABEL_AR[state]}
    className={className}
  />
);

export default JourneyStateBadge;