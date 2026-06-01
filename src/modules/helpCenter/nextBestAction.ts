/**
 * UX-REDESIGN-7 — Next Best Action registry for help articles.
 *
 * Pure, code-only mapping from help article `slug` → product route + bilingual
 * label. Rendered as a single "Next step" card on `HelpArticlePage` so each
 * article continues the user's workflow into the actual product surface.
 *
 * Constraints:
 * - No DB / RLS / schema change.
 * - No `/admin/*` target for non-admin audiences.
 * - Defaults are safe public routes (`/sectors`).
 * - This file is the single source of truth — also referenced by tests.
 */
import type { HelpAudience } from './types';

export interface NextBestAction {
  /** Route (always app-relative). */
  to: string;
  label_ar: string;
  label_en: string;
  /** Audience this NBA is appropriate for. */
  audience: HelpAudience | 'general';
}

const PROVIDER_BUSINESS: NextBestAction = {
  to: '/dashboard/business',
  label_ar: 'افتح ملف الشركة',
  label_en: 'Open business profile',
  audience: 'provider',
};
const PROVIDER_WO: NextBestAction = {
  to: '/dashboard/work-orders',
  label_ar: 'افتح أوامر التشغيل',
  label_en: 'Open work orders',
  audience: 'provider',
};
const PROVIDER_RFQ: NextBestAction = {
  to: '/dashboard/procurement',
  label_ar: 'افتح طلبات العروض',
  label_en: 'Open RFQs',
  audience: 'provider',
};
const PROVIDER_CONTRACTS: NextBestAction = {
  to: '/dashboard/contracts',
  label_ar: 'افتح العقود',
  label_en: 'Open contracts',
  audience: 'provider',
};
const PROVIDER_QUOTES: NextBestAction = {
  to: '/dashboard/quotes',
  label_ar: 'افتح عروض الأسعار',
  label_en: 'Open quotations',
  audience: 'provider',
};
const PROVIDER_WARRANTY: NextBestAction = {
  to: '/dashboard/warranties',
  label_ar: 'افتح الضمانات',
  label_en: 'Open warranties',
  audience: 'provider',
};
const PROVIDER_BRANDS: NextBestAction = {
  to: '/dashboard/brands',
  label_ar: 'افتح إدارة الماركات',
  label_en: 'Open brand management',
  audience: 'provider',
};
const PROVIDER_MEMBERSHIP: NextBestAction = {
  to: '/dashboard/membership',
  label_ar: 'افتح العضوية',
  label_en: 'Open membership',
  audience: 'provider',
};
const ADMIN_REVIEW: NextBestAction = {
  to: '/admin/provider-review',
  label_ar: 'افتح مراجعة المزوّدين',
  label_en: 'Open provider review',
  audience: 'admin',
};
const ADMIN_OPS: NextBestAction = {
  to: '/admin/operations',
  label_ar: 'افتح مركز العمليات',
  label_en: 'Open operations center',
  audience: 'admin',
};
const CUSTOMER_CONTACT: NextBestAction = {
  to: '/contact',
  label_ar: 'تواصل معنا',
  label_en: 'Contact support',
  audience: 'customer',
};
const PUBLIC_QUOTE: NextBestAction = {
  to: '/quote',
  label_ar: 'اطلب عرض سعر',
  label_en: 'Request a quote',
  audience: 'general',
};
const PUBLIC_SECTORS: NextBestAction = {
  to: '/sectors',
  label_ar: 'استكشف القطاعات',
  label_en: 'Explore sectors',
  audience: 'general',
};

/** slug → NBA. Unknown slugs fall back to PUBLIC_SECTORS. */
export const nextBestActionRegistry: Record<string, NextBestAction> = {
  // Business profile / publishing
  'create-business': PROVIDER_BUSINESS,
  'edit-business': PROVIDER_BUSINESS,
  'completeness': PROVIDER_BUSINESS,
  'how-publishing-works': PROVIDER_BUSINESS,
  'readiness-checklist': PROVIDER_BUSINESS,

  // Work orders
  'what-is-wo': PROVIDER_WO,
  'measurements': PROVIDER_WO,
  'wo-boq': PROVIDER_WO,
  'wo-rfq': PROVIDER_WO,
  'wo-production': PROVIDER_WO,
  'production-board': PROVIDER_WO,
  'stages': PROVIDER_WO,
  'realtime': PROVIDER_WO,
  'reassign': PROVIDER_WO,

  // Procurement / RFQ
  'what-is-rfq': PROVIDER_RFQ,
  'create-rfq': PROVIDER_RFQ,
  'supplier-quotes': PROVIDER_RFQ,
  'award': PROVIDER_RFQ,
  'po-draft': PROVIDER_RFQ,

  // Contracts
  'contract-lifecycle': PROVIDER_CONTRACTS,
  'create-contract': PROVIDER_CONTRACTS,
  'payments': PROVIDER_CONTRACTS,
  'vat': PROVIDER_CONTRACTS,
  'amendments': PROVIDER_CONTRACTS,
  'export-pdf': PROVIDER_CONTRACTS,

  // Quotes
  'create-quote': PROVIDER_QUOTES,
  'quote-to-contract': PROVIDER_QUOTES,
  'quote-pdf': PROVIDER_QUOTES,
  'quote-validity': PROVIDER_QUOTES,

  // Warranty
  'warranty-start': PROVIDER_WARRANTY,
  'coverage': PROVIDER_WARRANTY,
  'file-claim': PROVIDER_WARRANTY,
  'warranty-expiry': PROVIDER_WARRANTY,

  // Membership / lead credits
  'lead-credits': PROVIDER_MEMBERSHIP,

  // Brand management (provider side)
  'provider-link-brands': PROVIDER_BRANDS,
  'request-new-brand': PROVIDER_BRANDS,
  'brand-request-review': PROVIDER_BRANDS,

  // Brand discovery (public side) — convert to quote
  'brands-overview': PUBLIC_QUOTE,
  'brands-rfq-discovery': PUBLIC_QUOTE,

  // Customer self-serve
  'tracking-link': CUSTOMER_CONTACT,
  'what-you-see': CUSTOMER_CONTACT,
  'privacy': CUSTOMER_CONTACT,
  'support': CUSTOMER_CONTACT,
  'confirm': CUSTOMER_CONTACT,

  // Admin
  'identity-overview': ADMIN_REVIEW,
  'approve-providers': ADMIN_REVIEW,
  'diagnostics': ADMIN_REVIEW,
  'admin-brand-requests-guide': ADMIN_REVIEW,
  'admin-brand-detail-guide': ADMIN_REVIEW,
  'overview': ADMIN_OPS,
  'data-integrity': ADMIN_OPS,
  'cycle-times': ADMIN_OPS,
  'revenue': ADMIN_OPS,
};

/**
 * Resolve the next-best-action for a help article slug. Audience is used to
 * downgrade admin / provider actions to a safe public default if the resolved
 * NBA would not match the article's audience (defensive — registry entries are
 * already audience-correct).
 */
export function getNextBestAction(
  slug: string,
  audience?: HelpAudience | null,
): NextBestAction {
  const direct = nextBestActionRegistry[slug];
  if (!direct) return PUBLIC_SECTORS;
  if (audience === 'customer' && direct.audience === 'admin') return CUSTOMER_CONTACT;
  if (audience === 'general' && direct.audience === 'admin') return PUBLIC_SECTORS;
  return direct;
}