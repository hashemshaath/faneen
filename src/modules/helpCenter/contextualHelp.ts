/**
 * Map of page keys to relevant help article slugs.
 * Used by <HelpLauncher pageKey="..." /> in page headers.
 */
export const contextualHelpRegistry: Record<string, string[]> = {
  'dashboard.work-orders': ['what-is-wo', 'measurements', 'wo-boq', 'wo-rfq', 'wo-production'],
  'dashboard.work-order-detail': ['what-is-wo', 'measurements', 'wo-production'],
  'dashboard.production-board': ['production-board', 'stages', 'realtime', 'reassign'],
  'dashboard.procurement': ['what-is-rfq', 'create-rfq', 'supplier-quotes', 'award', 'po-draft'],
  'dashboard.procurement-detail': ['supplier-quotes', 'award', 'po-draft'],
  'dashboard.contracts': ['contract-lifecycle', 'create-contract', 'payments', 'vat', 'amendments'],
  'dashboard.contract-detail': ['contract-lifecycle', 'payments', 'amendments', 'export-pdf'],
  'dashboard.quotes': ['create-quote', 'quote-to-contract', 'quote-pdf', 'quote-validity'],
  'dashboard.warranties': ['warranty-start', 'coverage', 'file-claim', 'warranty-expiry'],
  'dashboard.production': ['production-board', 'stages', 'realtime', 'reassign'],
  'dashboard.services': ['services', 'create-business', 'edit-business'],
  'dashboard.portfolio': ['portfolio'],
  'dashboard.overview': ['create-business', 'how-publishing-works', 'completeness'],
  'dashboard.business-profile': ['create-business', 'edit-business', 'completeness', 'how-publishing-works'],
  'dashboard.staff': ['create-business', 'edit-business'],
  'customer.portal': ['tracking-link', 'what-you-see', 'privacy', 'support', 'confirm'],
  'admin.identity': ['identity-overview', 'approve-providers', 'diagnostics'],
  'admin.provider-review': ['how-publishing-works', 'readiness-checklist', 'approve-providers'],
  'admin.diagnostics': ['diagnostics', 'identity-overview'],
  'admin.operations-center': ['overview', 'data-integrity', 'cycle-times', 'revenue'],
  'dashboard.operations-center': ['overview', 'data-integrity', 'cycle-times', 'revenue'],
  'admin.help': ['overview', 'identity-overview'],
  // BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase J safe repairs
  'dashboard.leads': ['lead-credits', 'create-quote', 'how-publishing-works'],
  'dashboard.installations': ['what-is-wo', 'wo-production', 'tracking-link'],
  'dashboard.closures': ['contract-lifecycle', 'warranty-start', 'tracking-link'],
  'dashboard.feedback': ['tracking-link', 'support'],
  'dashboard.bookings': ['create-business', 'edit-business'],
  'dashboard.messages': ['support', 'identity-overview'],
  'dashboard.notifications': ['support', 'overview'],
  'dashboard.provider-growth': ['how-publishing-works', 'completeness', 'lead-credits'],
  'dashboard.membership': ['how-publishing-works', 'lead-credits'],
  'dashboard.customer-experience': ['tracking-link', 'what-you-see'],
  'customer.feedback': ['tracking-link', 'support'],
  'customer.warranty-claim': ['warranty-start', 'file-claim', 'coverage'],
  // BRANDS-HELP-CONTENT-1 — brand registry contextual help (published article slugs).
  'public.brands': ['brands-overview', 'brands-rfq-discovery'],
  'public.brand-detail': ['brands-overview', 'brands-rfq-discovery'],
  'dashboard.brands': ['provider-link-brands', 'request-new-brand', 'brand-request-review'],
  'admin.brand-requests': ['admin-brand-requests-guide', 'brand-request-review'],
  'admin.brand-detail': ['admin-brand-detail-guide', 'admin-brand-requests-guide'],
  // UX-REDESIGN-7 — public surfaces gain contextual help so the launcher and
  // blog ↔ help cross-links can resolve safe slug arrays. All slugs below are
  // already referenced elsewhere in this registry (and surfaced when
  // published in the DB pool).
  'public.home': ['brands-overview', 'create-business', 'what-is-rfq'],
  'public.search': ['brands-overview', 'brands-rfq-discovery'],
  'public.sector-detail': ['brands-overview', 'brands-rfq-discovery', 'create-quote'],
  'public.provider-detail': ['brands-overview', 'how-publishing-works', 'create-quote'],
  'public.quote': ['what-is-rfq', 'create-rfq', 'measurements', 'brands-rfq-discovery'],
  'public.blog': ['brands-overview', 'create-quote', 'what-is-rfq'],
  'public.blog-post': ['brands-overview', 'create-quote', 'what-is-rfq'],
};

export function getContextualArticles(pageKey: string): string[] {
  return contextualHelpRegistry[pageKey] ?? [];
}