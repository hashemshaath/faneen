import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSupportReplyDraft,
  classifySupportIntent,
  containsForbiddenInternalContent,
} from '@/modules/knowledge';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('KNOWLEDGE-POWERED SUPPORT REPLIES — Phase 5', () => {
  it('1) RFQ question classifies as rfq_status or quote_request', () => {
    const a = classifySupportIntent('أين حالة طلبي للحصول على عرض سعر؟');
    expect(['rfq_status', 'quote_request']).toContain(a);
    const b = classifySupportIntent('كيف أنشئ طلب عرض سعر؟');
    expect(['rfq_status', 'quote_request']).toContain(b);
  });

  it('2) password question classifies as password_reset', () => {
    expect(classifySupportIntent('نسيت كلمة المرور')).toBe('password_reset');
  });

  it('3) provider visibility question classifies as provider_visibility', () => {
    expect(classifySupportIntent('لماذا لا يظهر ملفي في الرابط العام؟')).toBe(
      'provider_visibility',
    );
  });

  it('4) invoices question classifies as payments_invoices', () => {
    expect(classifySupportIntent('أين أجد الفواتير؟')).toBe('payments_invoices');
  });

  it('5) unknown question yields canAnswer=false', () => {
    const draft = buildSupportReplyDraft({
      message: 'وصفة كعكة الشوكولاتة بالحليب المكثف',
      audience: 'visitor',
      channel: 'email',
      locale: 'ar',
    });
    expect(draft.canAnswer).toBe(false);
    expect(draft.escalationRecommended).toBe(true);
    expect(draft.reply.length).toBeGreaterThan(0);
    expect(draft.sources).toEqual([]);
  });

  it('6) reply never contains forbidden internal content for a customer', () => {
    const draft = buildSupportReplyDraft({
      message: 'كيف أراجع طلب عرض السعر الخاص بي؟',
      audience: 'customer',
      channel: 'email',
      locale: 'ar',
    });
    expect(containsForbiddenInternalContent(draft.reply)).toBe(false);
  });

  it('7) WhatsApp reply is short (single paragraph, no email greeting)', () => {
    const draft = buildSupportReplyDraft({
      message: 'وش حالة طلب عرض السعر؟',
      audience: 'customer',
      channel: 'whatsapp',
      locale: 'ar',
    });
    expect(draft.reply.length).toBeLessThanOrEqual(320);
    expect(draft.reply).not.toMatch(/تحية طيبة|مرحبًا,/);
    // No double-newline paragraphs on whatsapp.
    expect(draft.reply.includes('\n\n')).toBe(false);
  });

  it('8) Email reply is more formal (has greeting and closing)', () => {
    const draft = buildSupportReplyDraft({
      message: 'كيف أنشئ طلب عرض سعر؟',
      audience: 'customer',
      channel: 'email',
      locale: 'ar',
      tone: 'formal',
    });
    expect(draft.canAnswer).toBe(true);
    expect(draft.reply).toMatch(/تحية طيبة،|مرحبًا،/);
    expect(draft.reply).toMatch(/نبقى في خدمتك|تم رفع هذا الطلب/);
  });

  it('9) draft exposes sources when it can answer', () => {
    const draft = buildSupportReplyDraft({
      message: 'أين أجد الفواتير؟',
      audience: 'customer',
      channel: 'email',
      locale: 'ar',
    });
    expect(draft.canAnswer).toBe(true);
    expect(draft.sources.length).toBeGreaterThan(0);
  });

  it('10) draft exposes relatedRoutes when available', () => {
    const draft = buildSupportReplyDraft({
      message: 'أين أجد الفواتير؟',
      audience: 'customer',
      channel: 'email',
      locale: 'ar',
    });
    expect(Array.isArray(draft.relatedRoutes)).toBe(true);
    expect(draft.relatedRoutes.length).toBeGreaterThan(0);
  });

  it('11) RFQ status without a request id asks for it in missingInformation', () => {
    const draft = buildSupportReplyDraft({
      message: 'لم يصلني رد على طلبي بعد، ما حالة الطلب؟',
      audience: 'customer',
      channel: 'ticket',
      locale: 'ar',
    });
    expect(draft.missingInformation.some((m) => m.includes('رقم'))).toBe(true);
  });

  it('12) builder does not import any transport / sender / DB client', () => {
    const files = [
      'modules/knowledge/support/supportReply.types.ts',
      'modules/knowledge/support/supportReplyIntents.ts',
      'modules/knowledge/support/supportReplyGuardrails.ts',
      'modules/knowledge/support/supportReplyTemplates.ts',
      'modules/knowledge/support/supportReplyBuilder.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} supabase`).not.toMatch(/supabase/i);
      expect(src, `${f} fetch(`).not.toMatch(/fetch\(/);
      expect(src, `${f} sendEmail/WhatsApp/Sms`).not.toMatch(/sendEmail|sendWhatsApp|sendSms/i);
      expect(src, `${f} notify(`).not.toMatch(/\bnotify\(/);
    }
  });

  it('13) no DB / RLS / RPC / migrations / edge imports in support module', () => {
    const files = [
      'modules/knowledge/support/supportReplyBuilder.ts',
      'modules/knowledge/support/supportReplyIntents.ts',
      'modules/knowledge/support/supportReplyGuardrails.ts',
      'modules/knowledge/support/supportReplyTemplates.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/integrations/);
      expect(src).not.toMatch(/supabase\.functions/);
      expect(src).not.toMatch(/\.rpc\(/);
    }
  });

  it('14-15) no any / suppressions in support module', () => {
    const files = [
      'modules/knowledge/support/supportReply.types.ts',
      'modules/knowledge/support/supportReplyIntents.ts',
      'modules/knowledge/support/supportReplyGuardrails.ts',
      'modules/knowledge/support/supportReplyTemplates.ts',
      'modules/knowledge/support/supportReplyBuilder.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${f} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${f} @ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });
});