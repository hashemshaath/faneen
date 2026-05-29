export * from './types';
export { getCustomerProjectSnapshot } from './services/getCustomerProjectSnapshot';
export {
  createCustomerTrackingLink,
  revokeCustomerTrackingLink,
} from './services/createCustomerTrackingLink';

export const CUSTOMER_MILESTONE_ORDER = [
  'quotation_sent',
  'quotation_approved',
  'contract_ready',
  'production_started',
  'qc',
  'ready_for_installation',
  'installation',
  'completed',
] as const;

/**
 * Builds the customer-facing tracking URL. The caller is responsible for
 * obtaining the raw token from `createCustomerTrackingLink` and persisting
 * it server-side if needed — the token is NEVER stored client-side.
 */
export function buildCustomerPortalUrl(refId: string, token: string): string {
  return `/client/${encodeURIComponent(refId)}?t=${encodeURIComponent(token)}`;
}