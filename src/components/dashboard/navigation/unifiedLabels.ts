/**
 * UNIFIED DASHBOARD IA — single source of truth for dashboard
 * section + item labels (ar/en). Consumed by `DashboardSidebar.tsx`
 * and by `unifiedDashboardNavigationIa.test.tsx` to guarantee
 * one name per concept across every role.
 *
 * Hard rules:
 *  - One label per route. No synonyms.
 *  - User surface uses «المنشأة»; admin surface uses «الجهات».
 *  - «إنشاء منشأة» CTA points to /register-entity, never /onboarding.
 *    /onboarding is only for completing an existing entity.
 */
export type Bi = { ar: string; en: string };

export const UNIFIED_GROUP_LABELS = {
  dashboard:   { ar: 'لوحة التحكم',  en: 'Dashboard' },
  business:    { ar: 'المنشأة',       en: 'Business' },
  providerOps: { ar: 'طلبات المزود',  en: 'Provider Requests' },
  admin:       { ar: 'الإدارة',        en: 'Administration' },
  account:     { ar: 'الحساب',         en: 'Account' },
} as const;

/** Item label glossary — keyed by canonical concept id. */
export const UNIFIED_ITEM_LABELS: Record<string, Bi> = {
  // Dashboard
  overview:     { ar: 'نظرة عامة',       en: 'Overview' },
  myRequests:   { ar: 'طلباتي',           en: 'My Requests' },
  projects:     { ar: 'المشاريع',         en: 'Projects' },
  sites:        { ar: 'المواقع',           en: 'Sites' },
  branches:     { ar: 'الفروع',           en: 'Branches' },
  messages:     { ar: 'الرسائل',          en: 'Messages' },
  membership:   { ar: 'العضوية',          en: 'Membership' },

  // Business
  businessProfile:  { ar: 'بيانات المنشأة',       en: 'Business Profile' },
  services:         { ar: 'الخدمات والقطاعات',   en: 'Services & Sectors' },
  portfolio:        { ar: 'الأعمال والمعرض',      en: 'Work & Portfolio' },
  team:             { ar: 'الفريق والصلاحيات',   en: 'Team & Permissions' },
  visibility:       { ar: 'التحقق والظهور العام', en: 'Verification & Visibility' },

  // Provider
  clientRequests:   { ar: 'طلبات العملاء',  en: 'Client Requests' },
  opportunities:    { ar: 'الفرص الجديدة',  en: 'New Opportunities' },
  offers:           { ar: 'العروض والردود', en: 'Offers & Replies' },
  clients:          { ar: 'العملاء',         en: 'Clients' },

  // Account
  profile:         { ar: 'الملف الشخصي', en: 'Profile' },
  notifications:   { ar: 'الإشعارات',     en: 'Notifications' },
  security:        { ar: 'الأمان',         en: 'Security' },
  logout:          { ar: 'تسجيل الخروج',  en: 'Logout' },
};

/**
 * Routes that the «Create entity» CTA must never resolve to. Enforces
 * the rule «إنشاء منشأة → /register-entity»، «/onboarding for completion only».
 */
export const CREATE_ENTITY_ROUTE = '/register-entity' as const;
export const COMPLETE_ENTITY_ROUTE = '/onboarding' as const;