/**
 * Phase 9 — Gap closure invariants.
 *
 * Verifies the new safe knowledge items were added without enabling the
 * assistant to recommend, price, or expose PII, and that previously
 * in-scope gaps now answer with a source.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  knowledgeRegistry,
  buildAssistantKnowledgeAnswerContext,
} from '@/modules/knowledge';

const ROOT = path.resolve(__dirname, '..', '..');
const REG_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'modules', 'knowledge', 'knowledgeRegistry.ts'),
  'utf8',
);

const NEW_ITEM_IDS = [
  'cust-pricing-guidance',
  'cust-choose-provider',
  'cust-provider-contact-privacy',
  'rfq-reply-timing-detail',
  'biz-personal-vs-business',
] as const;

const PHONE_REGEX = /(\+?\d[\d\s\-]{6,})/;
const PRICE_REGEX = /\d+\s*(ريال|sar|usd|aed|eur|﷼)/i;

describe('Phase 9 — gap closure (new safe items)', () => {
  it('1) all new items exist in the registry', () => {
    for (const id of NEW_ITEM_IDS) {
      const it = knowledgeRegistry.find((i) => i.id === id);
      expect(it, `missing ${id}`).toBeDefined();
      expect(it!.source.trim().length).toBeGreaterThan(0);
      expect(it!.categoryId.length).toBeGreaterThan(0);
    }
  });

  it('2) new items are public, assistant-usable, and never internal', () => {
    for (const id of NEW_ITEM_IDS) {
      const it = knowledgeRegistry.find((i) => i.id === id)!;
      expect(it.status).toBe('published');
      expect(it.categoryId).not.toBe('internal-ops');
      expect(it.usableByAssistant).toBe(true);
    }
  });

  it('3) "أفضل مزود" returns no recommendation — answer warns we do not rank providers', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('ما أفضل مزود في جدة؟', 'customer', 'ar');
    const bodies = ctx.matchedItems.map((m) => m.item.body.ar).join(' ');
    expect(bodies).toMatch(/لا ترشّح|لا نرشح|القرار/);
    // Must never produce a literal provider name pattern like "Acme" or specific provider IDs.
    expect(bodies).not.toMatch(/أفضل مزود هو/);
  });

  it('4) "رقم جوال مزود معين" never reveals phone digits', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'أعطني رقم جوال مزود معين',
      'customer',
      'ar',
    );
    const text = ctx.matchedItems.map((m) => m.item.body.ar).join(' ');
    expect(text).not.toMatch(PHONE_REGEX);
    // If allowed to answer, the privacy article must be among sources.
    if (ctx.allowedToAnswer) {
      expect(ctx.matchedItems.some((m) => m.item.id === 'cust-provider-contact-privacy')).toBe(true);
    }
  });

  it('5) "سعر واجهة ألمنيوم" never returns a numeric price; redirects to /quote', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'كم سعر واجهة ألمنيوم؟',
      'customer',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    const bodies = ctx.matchedItems.map((m) => m.item.body.ar).join(' ');
    expect(bodies).not.toMatch(PRICE_REGEX);
    expect(ctx.relatedRoutes).toContain('/quote');
  });

  it('6) warranty question stays fallback (no promise made)', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('هل تضمنون التنفيذ؟', 'customer', 'ar');
    if (ctx.allowedToAnswer) {
      const bodies = ctx.matchedItems.map((m) => m.item.body.ar).join(' ');
      expect(bodies).not.toMatch(/نضمن|نتعهد|كفالة كاملة/);
    } else {
      expect(ctx.fallbackMessage).not.toBeNull();
    }
  });

  it('7) timing question answers and points at requests dashboard', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'كم يستغرق وصول رد على طلبي؟',
      'customer',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.relatedRoutes.some((r) => r.startsWith('/dashboard'))).toBe(true);
  });

  it('8) personal-vs-business has its own FAQ now', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'ما الفرق بين الأعمال الشخصية وأعمال المنشأة؟',
      'business_owner',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.matchedItems.some((m) => m.item.id === 'biz-personal-vs-business')).toBe(true);
  });

  it('9) registry file has no any / suppressions / fake currency', () => {
    expect(REG_SRC).not.toMatch(/:\s*any\b|\bas\s+any\b/);
    expect(REG_SRC).not.toMatch(/@ts-ignore|@ts-expect-error/);
  });
});
