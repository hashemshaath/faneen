import type { KnowledgeItem } from './knowledge.types';

/**
 * KNOWLEDGE UNIFICATION — single source of truth for static knowledge.
 *
 * DB-backed knowledge (Help Center articles, home FAQ rows, sector FAQ) stays
 * in its existing services. The registry here is the canonical layer for:
 *  - homepage FAQ items (migrated from `faqItems.ts`)
 *  - platform onboarding copy
 *  - policy summaries
 *  - reusable message-template snippets
 *  - internal operator notes
 *
 * No `any`. No suppressions. Add new items here — do not duplicate content
 * inside components.
 */

const ITEMS: KnowledgeItem[] = [
  // ---------- FAQ — migrated from src/components/home/v2/sections/faqItems.ts
  {
    id: 'faq-what-is-qitaat',
    type: 'faq',
    title: { ar: 'ما هي قطاعات؟', en: 'What is Qitaat?' },
    body: {
      ar: 'منصة تساعدك على الوصول إلى مزودي خدمات الصناعات الخفيفة وطلب عروض أسعار بطريقة منظمة.',
      en: 'A platform that helps you reach light-industry service providers and request quotes in an organized way.',
    },
    audience: ['visitor', 'customer', 'provider'],
    tags: ['platform', 'faq'],
    source: 'src/components/home/v2/sections/faqItems.ts',
    status: 'published',
    priority: 100,
    relatedRoutes: ['/', '/about'],
    usableByAssistant: true,
    usableInMessages: true,
  },
  {
    id: 'faq-does-qitaat-execute',
    type: 'faq',
    title: { ar: 'هل قطاعات تنفذ الأعمال؟', en: 'Does Qitaat execute the work?' },
    body: {
      ar: 'لا. قطاعات تساعد على الربط بين العميل ومزودي الخدمة، ولا تنفذ الأعمال مباشرة.',
      en: 'No. Qitaat connects clients with providers and does not execute work directly.',
    },
    audience: ['visitor', 'customer', 'provider'],
    tags: ['platform', 'faq'],
    source: 'src/components/home/v2/sections/faqItems.ts',
    status: 'published',
    priority: 95,
    relatedRoutes: ['/about'],
    usableByAssistant: true,
    usableInMessages: true,
  },
  {
    id: 'faq-how-to-request-quote',
    type: 'faq',
    title: { ar: 'كيف أطلب عرض سعر؟', en: 'How do I request a quote?' },
    body: {
      ar: 'اختر القطاع، أضف تفاصيل مشروعك، ثم أرسل الطلب للمزودين المناسبين.',
      en: 'Pick a sector, add your project details, then send the request to suitable providers.',
    },
    audience: ['visitor', 'customer'],
    tags: ['rfq', 'quote', 'faq', 'getting-started'],
    source: 'src/components/home/v2/sections/faqItems.ts',
    status: 'published',
    priority: 90,
    relatedRoutes: ['/quote'],
    usableByAssistant: true,
    usableInMessages: true,
  },
  {
    id: 'faq-can-providers-register',
    type: 'faq',
    title: { ar: 'هل يمكن للمزودين التسجيل؟', en: 'Can providers register?' },
    body: {
      ar: 'نعم. يمكن للورش والمصانع والمعارض وفرق التنفيذ إنشاء ملف لعرض خدماتهم.',
      en: 'Yes. Workshops, factories, showrooms and install teams can create a profile.',
    },
    audience: ['visitor', 'provider', 'business_owner'],
    tags: ['provider', 'onboarding', 'faq'],
    source: 'src/components/home/v2/sections/faqItems.ts',
    status: 'published',
    priority: 85,
    relatedRoutes: ['/for-providers', '/auth?mode=signup&role=provider'],
    usableByAssistant: true,
    usableInMessages: true,
  },
  {
    id: 'faq-good-for-contractors',
    type: 'faq',
    title: { ar: 'هل المنصة مناسبة للمقاولين؟', en: 'Is the platform good for contractors?' },
    body: {
      ar: 'نعم. تساعد المقاولين على الوصول إلى مزودي تنفيذ حسب القطاع والمدينة.',
      en: 'Yes. It helps contractors find execution partners by sector and city.',
    },
    audience: ['visitor', 'customer'],
    tags: ['contractor', 'faq'],
    source: 'src/components/home/v2/sections/faqItems.ts',
    status: 'published',
    priority: 80,
    relatedRoutes: ['/search'],
    usableByAssistant: true,
    usableInMessages: true,
  },

  // ---------- Policy summaries
  {
    id: 'policy-privacy-summary',
    type: 'policy',
    title: { ar: 'سياسة الخصوصية — ملخص', en: 'Privacy policy — summary' },
    summary: {
      ar: 'كيف نتعامل مع بياناتك ومعلومات حسابك في قطاعات.',
      en: 'How we handle your data and account information on Qitaat.',
    },
    body: {
      ar: 'نلتزم بحماية بياناتك. لا نشارك معلوماتك مع أطراف ثالثة دون موافقتك ما عدا ما يلزم لتنفيذ الخدمة. راجع السياسة الكاملة لمعرفة التفاصيل.',
      en: 'We protect your data. We do not share your information with third parties without consent except as required to deliver the service. See the full policy for details.',
    },
    audience: ['visitor', 'customer', 'provider', 'business_owner'],
    tags: ['privacy', 'policy'],
    source: 'src/pages/Privacy.tsx',
    status: 'published',
    relatedRoutes: ['/privacy'],
    usableByAssistant: true,
    usableInMessages: false,
  },
  {
    id: 'policy-terms-summary',
    type: 'policy',
    title: { ar: 'شروط الاستخدام — ملخص', en: 'Terms of use — summary' },
    body: {
      ar: 'باستخدامك قطاعات فإنك توافق على شروط الاستخدام التي تنظم العلاقة بين المنصة والمستخدم.',
      en: 'By using Qitaat you agree to the terms that govern the relationship between the platform and its users.',
    },
    audience: ['visitor', 'customer', 'provider', 'business_owner'],
    tags: ['terms', 'policy'],
    source: 'src/pages/Terms.tsx',
    status: 'published',
    relatedRoutes: ['/terms'],
    usableByAssistant: true,
    usableInMessages: false,
  },

  // ---------- Onboarding guides
  {
    id: 'guide-getting-started-customer',
    type: 'guide',
    title: { ar: 'البدء كعميل', en: 'Getting started as a customer' },
    summary: {
      ar: 'أنشئ حسابًا، أضف تفاصيل احتياجك، واستلم عروض الأسعار.',
      en: 'Create an account, describe your need, and receive quotes.',
    },
    body: {
      ar: '1) سجّل دخولك أو أنشئ حسابًا. 2) اضغط "اطلب عرض سعر" وأكمل الخطوات. 3) قارن العروض ووقّع العقد إلكترونيًا.',
      en: '1) Sign in or create an account. 2) Click "Request a quote" and complete the steps. 3) Compare offers and sign the contract online.',
    },
    audience: ['visitor', 'customer'],
    tags: ['onboarding', 'getting-started', 'rfq'],
    source: 'docs/customer-journey.md',
    status: 'published',
    priority: 70,
    relatedRoutes: ['/quote', '/auth'],
    usableByAssistant: true,
    usableInMessages: true,
  },
  {
    id: 'guide-getting-started-provider',
    type: 'guide',
    title: { ar: 'البدء كمزوّد خدمة', en: 'Getting started as a provider' },
    body: {
      ar: 'أنشئ ملف منشأتك، أضف خدماتك، فعّل الاشتراك، ثم استقبل طلبات العملاء.',
      en: 'Create your business profile, add services, activate your subscription, then receive leads.',
    },
    audience: ['provider', 'business_owner'],
    tags: ['onboarding', 'provider', 'getting-started'],
    source: 'docs/provider-journey.md',
    status: 'published',
    priority: 70,
    relatedRoutes: ['/for-providers'],
    usableByAssistant: true,
    usableInMessages: true,
  },

  // ---------- Reusable message-template snippets (content only — no sending)
  {
    id: 'msg-quote-received-customer',
    type: 'message_template',
    title: { ar: 'إشعار: استلام عرض سعر جديد', en: 'Notice: new quote received' },
    body: {
      ar: 'لديك عرض سعر جديد على طلبك. يمكنك مراجعته ومقارنته بالعروض الأخرى من لوحة التحكم.',
      en: 'You have a new quote on your request. Review it and compare with other offers from your dashboard.',
    },
    audience: ['customer'],
    tags: ['quote', 'rfq'],
    source: 'src/modules/knowledge/knowledgeRegistry.ts',
    status: 'published',
    relatedRoutes: ['/dashboard/quotes'],
    usableByAssistant: false,
    usableInMessages: true,
  },
  {
    id: 'msg-quote-request-provider',
    type: 'message_template',
    title: { ar: 'إشعار: طلب عرض سعر جديد', en: 'Notice: new quote request' },
    body: {
      ar: 'يوجد طلب عرض سعر مناسب لخدماتك. ادخل لوحة التحكم لمراجعة التفاصيل والرد.',
      en: 'A new quote request matches your services. Open your dashboard to review and respond.',
    },
    audience: ['provider'],
    tags: ['quote', 'rfq', 'provider'],
    source: 'src/modules/knowledge/knowledgeRegistry.ts',
    status: 'published',
    relatedRoutes: ['/dashboard/opportunities'],
    usableByAssistant: false,
    usableInMessages: true,
  },

  // ---------- Internal operator notes (never surfaced to visitors)
  {
    id: 'internal-support-escalation',
    type: 'internal_note',
    title: { ar: 'تصعيد الدعم — تشغيل داخلي', en: 'Support escalation — internal' },
    body: {
      ar: 'الحالات المتعلقة بالدفع تُحوَّل إلى فريق المالية خلال 24 ساعة عبر مركز التشغيل.',
      en: 'Payment-related cases are routed to the finance team within 24 hours via the operations center.',
    },
    audience: ['admin', 'operations'],
    tags: ['support', 'payment'],
    source: 'docs/pilot-launch-operations.md',
    status: 'internal',
    usableByAssistant: false,
    usableInMessages: false,
  },
];

export const knowledgeRegistry: readonly KnowledgeItem[] = Object.freeze(ITEMS);

export function listKnowledgeItems(): readonly KnowledgeItem[] {
  return knowledgeRegistry;
}

export function getKnowledgeItem(id: string): KnowledgeItem | undefined {
  return knowledgeRegistry.find((it) => it.id === id);
}