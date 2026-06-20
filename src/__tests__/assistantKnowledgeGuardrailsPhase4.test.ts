import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildAssistantKnowledgeAnswerContext,
  ASSISTANT_DEFAULT_LIMIT,
  ASSISTANT_FALLBACK_AR,
  isItemAllowedForAudience,
  isInternalContent,
  knowledgeRegistry,
} from '@/modules/knowledge';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('ASSISTANT KNOWLEDGE CONTEXT GUARDRAILS — Phase 4', () => {
  it('1) visitor never receives internal content', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'تشغيل داخلي مزود تصعيد',
      'visitor',
      'ar',
    );
    for (const r of ctx.matchedItems) {
      expect(isInternalContent(r.item)).toBe(false);
      expect(r.item.status).not.toBe('internal');
      expect(r.item.categoryId).not.toBe('internal-ops');
    }
  });

  it('2) customer never receives operations content', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('عمليات داخلية', 'customer', 'ar');
    for (const r of ctx.matchedItems) {
      expect(r.item.audience.includes('operations')).toBe(false);
      expect(r.item.categoryId).not.toBe('internal-ops');
    }
  });

  it('3) provider sees provider knowledge', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'كيف أستقبل طلبات العملاء؟',
      'provider',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.matchedItems.some((r) => r.item.id === 'prov-receive-leads')).toBe(true);
  });

  it('4) business owner sees business knowledge', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'كيف أنشئ منشأة؟',
      'business_owner',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    expect(
      ctx.matchedItems.some((r) => r.item.audience.includes('business_owner')),
    ).toBe(true);
  });

  it('5) admin is permitted to read internal items via the guardrail', () => {
    const internal = knowledgeRegistry.filter((it) => isInternalContent(it));
    expect(internal.length).toBeGreaterThan(0);
    for (const it of internal) {
      expect(isItemAllowedForAudience(it, 'admin')).toBe(true);
      expect(isItemAllowedForAudience(it, 'operations')).toBe(true);
      expect(isItemAllowedForAudience(it, 'visitor')).toBe(false);
      expect(isItemAllowedForAudience(it, 'customer')).toBe(false);
      expect(isItemAllowedForAudience(it, 'provider')).toBe(false);
    }
  });

  it('6) Arabic RFQ question returns RFQ items', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'ما هو طلب عرض السعر؟',
      'customer',
      'ar',
    );
    expect(ctx.matchedItems.some((r) => r.item.id === 'rfq-what-is-request')).toBe(true);
  });

  it('7) payments question returns payments / invoices items', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('أين أجد الفواتير؟', 'customer', 'ar');
    expect(
      ctx.matchedItems.some((r) => r.item.categoryId === 'payments'),
    ).toBe(true);
  });

  it('8) provider visibility question returns visibility / readiness items', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'لماذا لا يظهر ملفي في البحث؟',
      'provider',
      'ar',
    );
    const ids = ctx.matchedItems.map((r) => r.item.id);
    expect(ids.some((id) => id === 'prov-why-not-visible' || id === 'prov-readiness')).toBe(
      true,
    );
  });

  it('9) unknown / off-topic query returns allowedToAnswer=false with Arabic fallback', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'وصفة كعكة الشوكولاتة بالحليب المكثف',
      'visitor',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(false);
    expect(ctx.fallbackMessage).toBe(ASSISTANT_FALLBACK_AR);
  });

  it('10) every returned result carries a source path', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('عرض سعر', 'customer', 'ar');
    expect(ctx.matchedItems.length).toBeGreaterThan(0);
    for (const r of ctx.matchedItems) expect(r.source.trim().length).toBeGreaterThan(0);
    expect(ctx.sources.length).toBe(ctx.matchedItems.length);
  });

  it('11) every returned result exposes a relatedRoutes array', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('فواتير', 'customer', 'ar');
    for (const r of ctx.matchedItems) expect(Array.isArray(r.relatedRoutes)).toBe(true);
    expect(Array.isArray(ctx.relatedRoutes)).toBe(true);
  });

  it('12) default result size never exceeds 5', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('قطاعات', 'visitor', 'ar');
    expect(ctx.matchedItems.length).toBeLessThanOrEqual(ASSISTANT_DEFAULT_LIMIT);
    expect(ASSISTANT_DEFAULT_LIMIT).toBe(5);
  });

  it('13) no invented items — every result is grounded in the registry', () => {
    const ids = new Set(knowledgeRegistry.map((it) => it.id));
    const ctx = buildAssistantKnowledgeAnswerContext('عضوية', 'provider', 'ar');
    for (const r of ctx.matchedItems) expect(ids.has(r.item.id)).toBe(true);
  });

  it('module files contain no any / suppressions / skipped tests', () => {
    for (const f of [
      'modules/knowledge/assistant/assistantKnowledgeContext.ts',
      'modules/knowledge/assistant/assistantKnowledgeGuardrails.ts',
      'modules/knowledge/assistant/assistantKnowledgeRanking.ts',
      'modules/knowledge/assistant/assistantKnowledgeSynonyms.ts',
      'modules/knowledge/messaging/messageKnowledgeSnippets.ts',
    ]) {
      const src = read(f);
      expect(src, `${f} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${f} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${f} @ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });
});