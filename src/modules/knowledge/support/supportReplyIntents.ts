/**
 * Phase-5 — deterministic intent classifier. No AI, no API.
 * Maps Arabic/English keywords to a small fixed intent set. First match
 * wins, so order rules below from most specific to most generic.
 */
import type { SupportIntent } from './supportReply.types';

interface IntentRule {
  intent: SupportIntent;
  keywords: string[];
}

const RULES: IntentRule[] = [
  {
    intent: 'password_reset',
    keywords: ['كلمة المرور', 'كلمة السر', 'نسيت', 'استرجاع', 'password', 'reset'],
  },
  {
    intent: 'email_verification',
    keywords: ['تفعيل البريد', 'تحقق البريد', 'تأكيد البريد', 'verify email', 'email verification'],
  },
  {
    intent: 'account_access',
    keywords: ['تسجيل الدخول', 'الحساب', 'لا أستطيع الدخول', 'دخول', 'login', 'account', 'signin'],
  },
  {
    intent: 'contract_award',
    keywords: ['عقد', 'تعميد', 'قبول عرض', 'ترسية', 'contract', 'award'],
  },
  {
    intent: 'quote_request',
    keywords: ['كيف أطلب', 'إنشاء طلب', 'أنشئ طلب', 'create quote', 'submit rfq', 'new request'],
  },
  {
    intent: 'rfq_status',
    keywords: ['حالة الطلب', 'وين طلبي', 'لم يصلني رد', 'rfq', 'تسعيرة', 'عرض سعر', 'عرض السعر', 'quote', 'rfq status'],
  },
  {
    intent: 'file_upload_issue',
    keywords: ['رفع الملف', 'مشكلة في الملف', 'الملف لا يرفع', 'upload', 'attach file', 'attachment'],
  },
  {
    intent: 'provider_visibility',
    keywords: ['الظهور', 'لا يظهر', 'الرابط العام', 'منشور', 'visibility', 'visible'],
  },
  {
    intent: 'provider_profile_completion',
    keywords: ['إكمال الملف', 'جاهزية المزود', 'بياناتي ناقصة', 'profile completion', 'readiness'],
  },
  {
    intent: 'payments_invoices',
    keywords: ['فاتورة', 'فواتير', 'سداد', 'دفع', 'فشل الدفع', 'invoice', 'payment', 'billing'],
  },
  {
    intent: 'membership_limits',
    keywords: ['عضوية', 'باقة', 'حدود الاستخدام', 'ترقية', 'membership', 'plan', 'limit'],
  },
  {
    intent: 'complaint_dispute',
    keywords: ['شكوى', 'اعتراض', 'نزاع', 'خلاف', 'complaint', 'dispute'],
  },
  {
    intent: 'technical_support',
    keywords: ['مشكلة', 'خطأ', 'لا يعمل', 'تعليق', 'bug', 'error', 'not working'],
  },
];

function norm(s: string): string {
  return (s ?? '').toLowerCase();
}

export function classifySupportIntent(message: string): SupportIntent {
  const m = norm(message);
  if (!m.trim()) return 'unknown';
  for (const r of RULES) {
    if (r.keywords.some((k) => m.includes(k.toLowerCase()))) return r.intent;
  }
  return 'unknown';
}

/** Tag list used to query message snippets for a classified intent. */
export function intentToSnippetTags(intent: SupportIntent): string[] {
  switch (intent) {
    case 'rfq_status':
    case 'quote_request':
      return ['rfq', 'quote'];
    case 'password_reset':
    case 'email_verification':
    case 'account_access':
      return ['account'];
    case 'provider_visibility':
    case 'provider_profile_completion':
      return ['provider', 'visibility', 'readiness'];
    case 'payments_invoices':
      return ['payment'];
    case 'membership_limits':
      return ['membership'];
    case 'file_upload_issue':
      return ['files', 'support'];
    case 'complaint_dispute':
      return ['disputes', 'support'];
    case 'contract_award':
      return ['contracts'];
    case 'technical_support':
      return ['support'];
    default:
      return [];
  }
}