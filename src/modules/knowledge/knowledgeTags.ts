/**
 * Canonical tag vocabulary. Keep additions intentional — tags are how the
 * AI assistant retrieves relevant context.
 */
export const KNOWLEDGE_TAGS = [
  'platform',
  'rfq',
  'quote',
  'provider',
  'customer',
  'contractor',
  'membership',
  'pricing',
  'payment',
  'contract',
  'support',
  'onboarding',
  'privacy',
  'terms',
  'security',
  'help',
  'faq',
  'getting-started',
  'account',
  'verification',
] as const;

export type KnowledgeTag = (typeof KNOWLEDGE_TAGS)[number];

export function isKnownTag(tag: string): tag is KnowledgeTag {
  return (KNOWLEDGE_TAGS as readonly string[]).includes(tag);
}