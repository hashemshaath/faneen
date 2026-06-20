/**
 * Phase 8 — Internal pilot question set for the knowledge-grounded
 * assistant. Pure declarative fixture. No transport, no persistence,
 * no external API. Consumed by:
 *   - src/__tests__/knowledgeAssistantInternalPilotPhase8.test.ts
 *   - docs/knowledge-assistant-internal-pilot-phase-8-report.md
 */
import type { KnowledgeAudience } from '../knowledge.types';

export type PilotExpectedBehavior =
  | 'answered'
  | 'fallback'
  | 'blocked_internal';

export type PilotCategory =
  | 'general'
  | 'customer'
  | 'business'
  | 'provider'
  | 'payments'
  | 'security'
  | 'support'
  | 'should_fail';

export interface PilotQuestion {
  readonly id: string;
  readonly category: PilotCategory;
  readonly audience: KnowledgeAudience;
  readonly query: string;
  readonly expectedBehavior: PilotExpectedBehavior;
  readonly notes?: string;
}

export const ASSISTANT_INTERNAL_PILOT_QUESTIONS: readonly PilotQuestion[] = [
  // 1. General
  { id: 'p1', category: 'general', audience: 'visitor', query: 'ما هي قطاعات؟', expectedBehavior: 'answered' },
  { id: 'p2', category: 'general', audience: 'visitor', query: 'كيف تعمل المنصة؟', expectedBehavior: 'answered' },
  { id: 'p3', category: 'general', audience: 'visitor', query: 'من يمكنه استخدام قطاعات؟', expectedBehavior: 'answered' },
  { id: 'p4', category: 'general', audience: 'customer', query: 'هل يمكنني استخدام قطاعات بدون منشأة؟', expectedBehavior: 'answered' },

  // 2. Customers
  { id: 'p5', category: 'customer', audience: 'customer', query: 'كيف أطلب عرض سعر؟', expectedBehavior: 'answered' },
  { id: 'p6', category: 'customer', audience: 'customer', query: 'كيف أتابع طلباتي؟', expectedBehavior: 'answered' },
  { id: 'p7', category: 'customer', audience: 'customer', query: 'كيف أضيف موقع؟', expectedBehavior: 'answered' },
  { id: 'p8', category: 'customer', audience: 'customer', query: 'كيف أضيف مشروع؟', expectedBehavior: 'answered' },
  { id: 'p9', category: 'customer', audience: 'customer', query: 'لماذا لم يصلني رد على طلبي؟', expectedBehavior: 'answered' },

  // 3. Businesses
  { id: 'p10', category: 'business', audience: 'business_owner', query: 'كيف أضيف منشأة؟', expectedBehavior: 'answered' },
  { id: 'p11', category: 'business', audience: 'business_owner', query: 'كيف أستكمل بيانات العمل؟', expectedBehavior: 'answered' },
  { id: 'p12', category: 'business', audience: 'business_owner', query: 'كيف أضيف فريق العمل والصلاحيات؟', expectedBehavior: 'answered' },
  { id: 'p13', category: 'business', audience: 'business_owner', query: 'ما الفرق بين الأعمال الشخصية وأعمال المنشأة؟', expectedBehavior: 'answered' },

  // 4. Providers
  { id: 'p14', category: 'provider', audience: 'provider', query: 'كيف أسجل كمزود خدمة؟', expectedBehavior: 'answered' },
  { id: 'p15', category: 'provider', audience: 'provider', query: 'لماذا لا يظهر مزودي للعامة؟', expectedBehavior: 'answered' },
  { id: 'p16', category: 'provider', audience: 'provider', query: 'ما شروط جاهزية المزود للتشغيل؟', expectedBehavior: 'answered' },
  { id: 'p17', category: 'provider', audience: 'provider', query: 'كيف أستقبل طلبات العملاء؟', expectedBehavior: 'answered' },

  // 5. Payments & memberships
  { id: 'p18', category: 'payments', audience: 'customer', query: 'أين أجد الفواتير؟', expectedBehavior: 'answered' },
  { id: 'p19', category: 'payments', audience: 'customer', query: 'هل الدفع متاح داخل المنصة؟', expectedBehavior: 'answered' },

  // 6. Security & account
  { id: 'p20', category: 'security', audience: 'customer', query: 'كيف أستعيد كلمة المرور؟', expectedBehavior: 'answered' },

  // 7. Support
  { id: 'p21', category: 'support', audience: 'customer', query: 'كيف أتواصل مع الدعم؟', expectedBehavior: 'answered' },

  // 8. Should fail — out-of-domain or asking for data not in knowledge
  { id: 'p22', category: 'should_fail', audience: 'visitor', query: 'ما عاصمة فرنسا؟', expectedBehavior: 'fallback' },
  { id: 'p23', category: 'should_fail', audience: 'visitor', query: 'أعطني وصفة كعكة الشوكولاتة', expectedBehavior: 'fallback' },
  { id: 'p24', category: 'should_fail', audience: 'visitor', query: 'zxqv blarp foobar nonsense', expectedBehavior: 'fallback' },
  { id: 'p25', category: 'should_fail', audience: 'visitor', query: 'qwertyuiop asdfghjkl', expectedBehavior: 'fallback' },
  { id: 'p26', category: 'should_fail', audience: 'visitor', query: 'ما درجة الحرارة في الرياض الآن؟', expectedBehavior: 'fallback' },
] as const;

export const PILOT_QUESTION_COUNT = ASSISTANT_INTERNAL_PILOT_QUESTIONS.length;