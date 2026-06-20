import type { KnowledgeAudience } from './knowledge.types';

/**
 * Canonical knowledge categories. Each category is bilingual and declares
 * which audiences typically consume it. `internal=true` means the category
 * is operator-only and must never surface in public Help/FAQ pages.
 */
export interface KnowledgeCategory {
  id: string;
  title: { ar: string; en: string };
  description?: { ar: string; en: string };
  audience: KnowledgeAudience[];
  internal?: boolean;
  order: number;
}

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = Object.freeze([
  { id: 'general',         title: { ar: 'أسئلة عامة', en: 'General' },                    audience: ['visitor','customer','provider','business_owner'], order: 1 },
  { id: 'customers',       title: { ar: 'للأفراد والعملاء', en: 'For customers' },         audience: ['customer','visitor'],                            order: 2 },
  { id: 'businesses',      title: { ar: 'للشركات وأصحاب الأعمال', en: 'For businesses' }, audience: ['business_owner'],                                order: 3 },
  { id: 'providers',       title: { ar: 'لمزودي الخدمات', en: 'For providers' },           audience: ['provider','business_owner'],                     order: 4 },
  { id: 'quote-requests',  title: { ar: 'طلبات عروض الأسعار', en: 'Quote requests' },     audience: ['customer','provider','business_owner'],          order: 5 },
  { id: 'projects-sites',  title: { ar: 'المشاريع والمواقع', en: 'Projects & sites' },     audience: ['customer','business_owner'],                     order: 6 },
  { id: 'offers-pricing',  title: { ar: 'العروض والتسعيرات', en: 'Offers & pricing' },     audience: ['customer','provider','business_owner'],          order: 7 },
  { id: 'contracts',       title: { ar: 'التعميد والعقود', en: 'Contracts & awards' },    audience: ['customer','provider','business_owner'],          order: 8 },
  { id: 'payments',        title: { ar: 'المدفوعات والفواتير', en: 'Payments & invoices' }, audience: ['customer','provider','business_owner'],         order: 9 },
  { id: 'memberships',     title: { ar: 'العضويات والاشتراكات', en: 'Memberships' },       audience: ['provider','business_owner'],                     order: 10 },
  { id: 'security-privacy',title: { ar: 'الأمان والخصوصية', en: 'Security & privacy' },   audience: ['visitor','customer','provider','business_owner'],order: 11 },
  { id: 'account',         title: { ar: 'الحساب وتسجيل الدخول', en: 'Account & sign-in' }, audience: ['visitor','customer','provider','business_owner'],order: 12 },
  { id: 'support',         title: { ar: 'الدعم الفني', en: 'Technical support' },         audience: ['customer','provider','business_owner'],          order: 13 },
  { id: 'disputes',        title: { ar: 'الشكاوى والنزاعات', en: 'Complaints & disputes' },audience: ['customer','provider','business_owner'],          order: 14 },
  { id: 'internal-ops',    title: { ar: 'إرشادات التشغيل الداخلي', en: 'Internal operations' }, audience: ['admin','operations'], internal: true,        order: 99 },
]);

export function getCategory(id: string): KnowledgeCategory | undefined {
  return KNOWLEDGE_CATEGORIES.find((c) => c.id === id);
}

export function publicCategories(): KnowledgeCategory[] {
  return KNOWLEDGE_CATEGORIES.filter((c) => !c.internal);
}

export function isInternalCategory(id: string | undefined): boolean {
  if (!id) return false;
  return !!KNOWLEDGE_CATEGORIES.find((c) => c.id === id)?.internal;
}