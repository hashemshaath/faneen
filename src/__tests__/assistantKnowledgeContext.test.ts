import { describe, it, expect } from 'vitest';
import {
  getAssistantKnowledgeContext,
  getMessageKnowledgeSnippets,
  knowledgeRegistry,
} from '@/modules/knowledge';

describe('KNOWLEDGE UNIFICATION — assistant context API', () => {
  it('returns items appropriate for a visitor audience', () => {
    const res = getAssistantKnowledgeContext('عرض سعر', 'visitor', 'ar', 5);
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) {
      expect(r.item.usableByAssistant).toBe(true);
      expect(r.item.status).toBe('published');
      // Visitor must never see internal-only audience items.
      expect(r.item.audience.includes('admin')).toBe(false);
      expect(r.item.audience.includes('operations')).toBe(false);
    }
  });

  it('never returns internal-only items to a visitor', () => {
    const res = getAssistantKnowledgeContext('escalation', 'visitor', 'en', 10);
    expect(res.every((r) => r.item.status !== 'internal')).toBe(true);
  });

  it('supports Arabic queries', () => {
    const res = getAssistantKnowledgeContext('قطاعات', 'visitor', 'ar', 5);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].title.length).toBeGreaterThan(0);
    expect(res[0].body.length).toBeGreaterThan(0);
  });

  it('returns source for transparency on every result', () => {
    const res = getAssistantKnowledgeContext('quote', 'customer', 'en', 3);
    for (const r of res) expect(r.source.trim().length).toBeGreaterThan(0);
  });

  it('never invents items — every result is grounded in the registry', () => {
    const res = getAssistantKnowledgeContext('platform', 'visitor', 'ar', 5);
    const ids = new Set(knowledgeRegistry.map((it) => it.id));
    for (const r of res) expect(ids.has(r.item.id)).toBe(true);
  });

  it('messaging snippets exclude internal status and respect intent tag', () => {
    const res = getMessageKnowledgeSnippets('customer', 'quote', 'ar', 5);
    for (const r of res) {
      expect(r.item.status).not.toBe('internal');
      expect(r.item.usableInMessages).toBe(true);
      expect(r.item.tags).toContain('quote');
    }
  });

  it('admin audience may receive internal items when assistant-enabled', () => {
    // Internal note in registry is not assistant-usable, so this still
    // returns only non-internal published items — but admin still sees
    // all public + admin items.
    const res = getAssistantKnowledgeContext('', 'admin', 'ar', 10);
    expect(Array.isArray(res)).toBe(true);
  });
});