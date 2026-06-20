import type { KnowledgeAudience, KnowledgeItem } from './knowledge.types';

/** Audience visibility rules for content surfaced to a given audience. */
export const VISITOR_BLOCKED: KnowledgeAudience[] = ['admin', 'operations'];

export function isAudienceVisible(item: KnowledgeItem, audience: KnowledgeAudience): boolean {
  if (item.audience.includes(audience)) return true;
  // Visitor never sees admin/operations content.
  if (audience === 'visitor' && item.audience.some((a) => VISITOR_BLOCKED.includes(a))) {
    return false;
  }
  // Public-facing audiences (visitor/customer/provider/business_owner) can see
  // items marked for any other public audience — knowledge is broadly shared
  // unless explicitly restricted to admin/operations.
  const PUBLIC: KnowledgeAudience[] = ['visitor', 'customer', 'provider', 'business_owner'];
  if (PUBLIC.includes(audience)) {
    return item.audience.some((a) => PUBLIC.includes(a));
  }
  return false;
}

export function isInternalAudience(audience: KnowledgeAudience): boolean {
  return audience === 'admin' || audience === 'operations';
}