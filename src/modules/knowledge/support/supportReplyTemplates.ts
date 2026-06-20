/**
 * Phase-5 — channel/tone-aware Arabic and English wrappers around the
 * knowledge body. No promises, no "issue resolved" wording — only
 * grounded summaries plus a polite ask for missing info when needed.
 */
import type {
  SupportReplyChannel,
  SupportReplyTone,
} from './supportReply.types';
import type { KnowledgeLocale } from '../knowledge.types';

export interface TemplateInput {
  channel: SupportReplyChannel;
  tone: SupportReplyTone;
  locale: KnowledgeLocale;
  bodyLines: string[];
  missingInformation: string[];
  escalationRecommended: boolean;
}

const FALLBACK_AR =
  'لا تتوفر لدينا معلومة موثقة كافية من مركز المعرفة حول هذا الطلب. يمكننا تصعيده لفريق الدعم لمراجعته.';
const FALLBACK_EN =
  'We do not have enough verified information in the knowledge base to answer this request. We can escalate it to the support team for review.';

export function fallbackReply(locale: KnowledgeLocale): string {
  return locale === 'en' ? FALLBACK_EN : FALLBACK_AR;
}

function greeting(channel: SupportReplyChannel, tone: SupportReplyTone, locale: KnowledgeLocale): string {
  if (channel !== 'email') return '';
  if (locale === 'en') {
    return tone === 'formal' ? 'Dear customer,' : 'Hello,';
  }
  return tone === 'formal' ? 'تحية طيبة،' : 'مرحبًا،';
}

function closing(channel: SupportReplyChannel, locale: KnowledgeLocale, escalate: boolean): string {
  if (channel === 'whatsapp' || channel === 'in_app') return '';
  if (locale === 'en') {
    return escalate
      ? 'We have flagged this for the support team to review.'
      : 'We remain at your service for any further questions.';
  }
  return escalate
    ? 'تم رفع هذا الطلب لفريق الدعم للمراجعة.'
    : 'نبقى في خدمتك لأي استفسار آخر.';
}

function missingInfoLine(missing: string[], locale: KnowledgeLocale): string {
  if (missing.length === 0) return '';
  if (locale === 'en') {
    return `To help us further, please share: ${missing.join('، ')}.`;
  }
  return `لمساعدتنا أكثر، يرجى مشاركة: ${missing.join('، ')}.`;
}

export function renderReply(input: TemplateInput): string {
  const { channel, tone, locale, bodyLines, missingInformation, escalationRecommended } = input;
  if (bodyLines.length === 0) return fallbackReply(locale);

  // WhatsApp / in-app: tight, single paragraph, no greeting / no closing.
  if (channel === 'whatsapp' || channel === 'in_app') {
    const parts = [bodyLines[0]];
    const mi = missingInfoLine(missingInformation, locale);
    if (mi) parts.push(mi);
    return parts.join(' ').trim();
  }

  // Email / ticket: greeting + paragraphs + missing info + closing.
  const lines: string[] = [];
  const g = greeting(channel, tone, locale);
  if (g) lines.push(g);
  lines.push(...bodyLines);
  const mi = missingInfoLine(missingInformation, locale);
  if (mi) lines.push(mi);
  const c = closing(channel, locale, escalationRecommended);
  if (c) lines.push(c);
  return lines.join('\n\n').trim();
}