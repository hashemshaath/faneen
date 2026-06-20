import { describe, it, expect } from 'vitest';
import {
  getAssistantKnowledgeContext,
  knowledgeRegistry,
} from '@/modules/knowledge';

describe('KNOWLEDGE CONTENT SEED — assistant context (Phase 2)', () => {
  it('returns Phase-2 seed items for an RFQ Arabic query', () => {
    const res = getAssistantKnowledgeContext('ما هو طلب عرض السعر؟', 'visitor', 'ar', 5);
    expect(res.length).toBeGreaterThan(0);
    const ids = res.map((r) => r.item.id);
    expect(ids).toContain('rfq-what-is-request');
  });

  it('never returns internal-only content for a visitor', () => {
    const res = getAssistantKnowledgeContext('تشغيل داخلي مزود', 'visitor', 'ar', 10);
    for (const r of res) {
      expect(r.item.status).not.toBe('internal');
      expect(r.item.categoryId).not.toBe('internal-ops');
    }
  });

  it('handles a provider Arabic query', () => {
    const res = getAssistantKnowledgeContext('كيف أستقبل طلبات العملاء؟', 'provider', 'ar', 5);
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((r) => r.item.id === 'prov-receive-leads')).toBe(true);
  });

  it('returns source for every result', () => {
    const res = getAssistantKnowledgeContext('فواتير', 'customer', 'ar', 5);
    for (const r of res) expect(r.source.trim().length).toBeGreaterThan(0);
  });

  it('returns relatedRoutes for actionable items', () => {
    const res = getAssistantKnowledgeContext('كيف أطلب عرض سعر', 'customer', 'ar', 3);
    expect(res[0]).toBeTruthy();
    expect(Array.isArray(res[0].relatedRoutes)).toBe(true);
  });

  it('never invents items — every result is grounded in the registry', () => {
    const ids = new Set(knowledgeRegistry.map((it) => it.id));
    const res = getAssistantKnowledgeContext('عضوية', 'provider', 'ar', 5);
    for (const r of res) expect(ids.has(r.item.id)).toBe(true);
  });

  it('respects assistant-only flag (excludes message-only items)', () => {
    const res = getAssistantKnowledgeContext('عرض سعر', 'customer', 'ar', 20);
    for (const r of res) expect(r.item.usableByAssistant).toBe(true);
  });
});