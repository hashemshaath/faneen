import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getSafeMessageKnowledgeSnippets,
  knowledgeRegistry,
  isInternalContent,
} from '@/modules/knowledge';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('MESSAGE KNOWLEDGE SNIPPETS — Phase 4 guardrails', () => {
  it('1) snippets are grounded in the knowledgeRegistry', () => {
    const ids = new Set(knowledgeRegistry.map((it) => it.id));
    const out = getSafeMessageKnowledgeSnippets('customer', 'rfq', 'ar');
    expect(out.length).toBeGreaterThan(0);
    for (const r of out) expect(ids.has(r.item.id)).toBe(true);
  });

  it('2) customer never receives internal content', () => {
    const out = getSafeMessageKnowledgeSnippets('customer', 'support', 'ar', 5);
    for (const r of out) {
      expect(isInternalContent(r.item)).toBe(false);
      expect(r.item.status).not.toBe('internal');
    }
  });

  it('3) provider never receives internal content', () => {
    const out = getSafeMessageKnowledgeSnippets('provider', 'support', 'ar', 5);
    for (const r of out) {
      expect(isInternalContent(r.item)).toBe(false);
      expect(r.item.status).not.toBe('internal');
    }
  });

  it('4) RFQ intent returns RFQ-relevant message templates', () => {
    const out = getSafeMessageKnowledgeSnippets('customer', 'rfq', 'ar', 3);
    expect(out.some((r) => r.item.id === 'msg-quote-received-customer')).toBe(true);
    for (const r of out) expect(r.item.usableInMessages).toBe(true);
  });

  it('5) support intent returns support snippets', () => {
    const out = getSafeMessageKnowledgeSnippets('customer', 'support', 'ar', 3);
    expect(out.some((r) => r.item.tags.includes('support'))).toBe(true);
  });

  it('6) helper does not send any message (no transport imports)', () => {
    const src = read('modules/knowledge/messaging/messageKnowledgeSnippets.ts');
    expect(src).not.toMatch(/supabase/i);
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/sendEmail|sendWhatsApp|sendSms|notify/i);
  });

  it('7) helper contains no fake data placeholders', () => {
    const src = read('modules/knowledge/messaging/messageKnowledgeSnippets.ts');
    expect(src).not.toMatch(/lorem|ipsum|todo|placeholder|fixme/i);
  });
});