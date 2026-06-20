/**
 * OPPORTUNITIES SYSTEM — PHASE 2
 *
 * Central bilingual label registry for the «Opportunities» surface.
 * UI-only: the underlying DB tables, edge functions, RPCs and matching
 * logic continue to use the original `quote_requests` / `provider_leads`
 * naming. This file is the single source of truth for what the user,
 * provider and admin see on screen.
 *
 * Domain mapping (UI → internal):
 *   opportunity            → quote_requests row
 *   assignedOpportunity    → quote_request_leads row (matched provider)
 *   submittedBid           → rfq_quotes row (reserved for Phase 5)
 *   award / convertToContract → contracts.opportunity_id (reserved for Phase 7)
 *
 * NEVER use these labels inside DB / edge / migration code.
 */
export type BiLabel = { ar: string; en: string };

export const OPPORTUNITY_LABELS = {
  opportunity:           { ar: 'فرصة',                en: 'Opportunity' },
  opportunities:         { ar: 'الفرص',               en: 'Opportunities' },
  myOpportunities:       { ar: 'فرصي',                en: 'My Opportunities' },
  newOpportunity:        { ar: 'فرصة جديدة',          en: 'New Opportunity' },
  opportunityDetails:    { ar: 'تفاصيل الفرصة',       en: 'Opportunity Details' },
  assignedOpportunities: { ar: 'الفرص المسندة',       en: 'Assigned Opportunities' },
  opportunitiesInbox:    { ar: 'صندوق الفرص',         en: 'Opportunities Inbox' },
  matchedProviders:      { ar: 'المزودون المطابقون',  en: 'Matched Providers' },
  submitBid:             { ar: 'تقديم عرض',           en: 'Submit Bid' },
  submittedBids:         { ar: 'العروض المقدمة',      en: 'Submitted Bids' },
  awardBid:              { ar: 'ترسية العرض',         en: 'Award Bid' },
  convertToContract:     { ar: 'تحويل إلى عقد',       en: 'Convert to Contract' },
  manageOpportunities:   { ar: 'إدارة الفرص',         en: 'Manage Opportunities' },
  winningBid:            { ar: 'العرض الفائز',        en: 'Winning Bid' },
  draftContract:         { ar: 'العقد المبدئي',       en: 'Draft Contract' },
  operationsCenter:      { ar: 'مركز عمليات الفرص',   en: 'Opportunities Operations Center' },
} as const satisfies Record<string, BiLabel>;

export type OpportunityLabelKey = keyof typeof OPPORTUNITY_LABELS;

/** UI route aliases introduced in Phase 2. Old routes remain registered. */
export const OPPORTUNITY_ROUTES = {
  list:       '/dashboard/opportunities',
  details:    '/dashboard/opportunities/:id',
  assigned:   '/dashboard/opportunities/assigned',
  adminList:  '/admin/opportunities',
} as const;