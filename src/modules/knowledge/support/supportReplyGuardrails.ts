/**
 * Phase-5 — final-line guardrails before a draft reply is returned.
 * Strips any accidental internal/operational phrasing that might leak
 * from the underlying registry items, and detects when the draft must
 * ask the user for additional information.
 */
import type { SupportIntent, SupportReplyChannel } from './supportReply.types';

const INTERNAL_FORBIDDEN_PATTERNS: RegExp[] = [
  /تشغيل\s*داخلي/,
  /لا\s*تشارك\s*مع\s*المستخدم/,
  /قاعدة\s*البيانات/,
  /\bSQL\b/i,
  /\bRLS\b/i,
  /\bservice[_\s]role\b/i,
];

export function containsForbiddenInternalContent(text: string): boolean {
  if (!text) return false;
  return INTERNAL_FORBIDDEN_PATTERNS.some((re) => re.test(text));
}

/**
 * Returns the list of additional information items the support agent
 * should ask the user for, given the intent and the user message.
 */
export function detectMissingInformation(
  intent: SupportIntent,
  message: string,
): string[] {
  const m = (message ?? '').toLowerCase();
  const missing: string[] = [];

  const needsRequestId =
    intent === 'rfq_status' ||
    intent === 'payments_invoices' ||
    intent === 'contract_award' ||
    intent === 'complaint_dispute';
  const hasRequestId = /(REQ|RFQ|INV|CON|TKT)[-_ ]?\d{3,}/i.test(message)
    || /رقم\s*(الطلب|الفاتورة|العقد|البلاغ)/.test(message);
  if (needsRequestId && !hasRequestId) missing.push('رقم الطلب أو الفاتورة أو العقد');

  const needsScreenshot =
    intent === 'file_upload_issue' || intent === 'technical_support';
  const hasScreenshot = /لقطة|سكرين|screenshot|image|صورة/.test(m);
  if (needsScreenshot && !hasScreenshot) missing.push('لقطة شاشة للمشكلة إن أمكن');

  if (intent === 'unknown' && m.trim().length < 10) {
    missing.push('وصف أوضح للمشكلة أو السؤال');
  }

  return missing;
}

export function shouldEscalate(
  intent: SupportIntent,
  canAnswer: boolean,
): boolean {
  if (!canAnswer) return true;
  if (intent === 'complaint_dispute') return true;
  if (intent === 'unknown') return true;
  return false;
}

export function maxReplyLength(channel: SupportReplyChannel): number {
  switch (channel) {
    case 'whatsapp':
      return 320;
    case 'in_app':
      return 240;
    case 'ticket':
      return 900;
    case 'email':
    default:
      return 1200;
  }
}