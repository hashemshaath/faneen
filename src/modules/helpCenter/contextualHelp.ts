/**
 * Map of page keys to relevant help article slugs.
 * Used by <HelpLauncher pageKey="..." /> in page headers.
 */
export const contextualHelpRegistry: Record<string, string[]> = {
  'dashboard.work-orders': ['what-is-wo', 'measurements', 'wo-boq', 'wo-rfq', 'wo-production'],
  'dashboard.work-order-detail': ['what-is-wo', 'measurements', 'wo-production'],
  'dashboard.procurement': ['what-is-rfq', 'create-rfq', 'supplier-quotes', 'award', 'po-draft'],
  'dashboard.contracts': ['contract-lifecycle', 'create-contract', 'payments', 'vat', 'amendments'],
  'dashboard.contract-detail': ['contract-lifecycle', 'payments', 'amendments', 'export-pdf'],
  'dashboard.quotes': ['create-quote', 'quote-to-contract', 'quote-pdf', 'quote-validity'],
  'dashboard.warranties': ['warranty-start', 'coverage', 'file-claim', 'warranty-expiry'],
  'dashboard.production': ['production-board', 'stages', 'realtime', 'reassign'],
  'dashboard.services': ['services', 'create-business', 'edit-business'],
  'dashboard.portfolio': ['portfolio'],
  'dashboard.overview': ['create-business', 'how-publishing-works', 'completeness'],
  'customer.portal': ['tracking-link', 'what-you-see', 'privacy', 'support', 'confirm'],
  'admin.identity': ['identity-overview', 'approve-providers', 'diagnostics'],
  'admin.provider-review': ['how-publishing-works', 'readiness-checklist', 'approve-providers'],
  'admin.diagnostics': ['diagnostics', 'identity-overview'],
  'admin.operations-center': ['overview', 'data-integrity', 'cycle-times', 'revenue'],
  'admin.help': ['overview', 'identity-overview'],
};

export function getContextualArticles(pageKey: string): string[] {
  return contextualHelpRegistry[pageKey] ?? [];
}