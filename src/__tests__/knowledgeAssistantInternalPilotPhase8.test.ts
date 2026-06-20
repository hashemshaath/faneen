/**
 * Phase 8 — Knowledge assistant internal pilot.
 *
 * Locks down the pilot fixture and verifies the assistant pipeline
 * behaves correctly per question without sending, persisting, or
 * reaching any external service.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ASSISTANT_INTERNAL_PILOT_QUESTIONS,
  PILOT_QUESTION_COUNT,
} from '@/modules/knowledge/assistant/assistantInternalPilot';
import { buildAssistantKnowledgeAnswerContext } from '@/modules/knowledge/assistant/assistantKnowledgeContext';

const ROOT = path.resolve(__dirname, '..', '..');
const PILOT_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'modules', 'knowledge', 'assistant', 'assistantInternalPilot.ts'),
  'utf8',
);

describe('Phase 8 — pilot fixture shape', () => {
  it('has at least 20 questions', () => {
    expect(PILOT_QUESTION_COUNT).toBeGreaterThanOrEqual(20);
  });

  it('every question declares an audience and expectedBehavior', () => {
    for (const q of ASSISTANT_INTERNAL_PILOT_QUESTIONS) {
      expect(q.audience).toBeTruthy();
      expect(['answered', 'fallback', 'blocked_internal']).toContain(q.expectedBehavior);
      expect(q.query.trim().length).toBeGreaterThan(0);
    }
  });

  it('every question id is unique', () => {
    const ids = ASSISTANT_INTERNAL_PILOT_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Phase 8 — assistant behaviour per pilot question', () => {
  for (const q of ASSISTANT_INTERNAL_PILOT_QUESTIONS) {
    it(`[${q.id}] ${q.expectedBehavior} — ${q.query}`, () => {
      const ctx = buildAssistantKnowledgeAnswerContext(q.query, q.audience, 'ar');
      if (q.expectedBehavior === 'fallback') {
        expect(ctx.allowedToAnswer).toBe(false);
        expect(ctx.fallbackMessage).not.toBeNull();
      } else if (q.expectedBehavior === 'answered') {
        expect(ctx.allowedToAnswer).toBe(true);
        expect(ctx.sources.length).toBeGreaterThan(0);
        for (const m of ctx.matchedItems) {
          // No internal leak to non-internal audiences.
          if (q.audience !== 'admin' && q.audience !== 'operations') {
            expect(m.item.status).not.toBe('internal');
            expect(m.item.categoryId).not.toBe('internal-ops');
          }
        }
      }
    });
  }
});

describe('Phase 8 — RFQ + provider-visibility well-known queries return sources', () => {
  it('RFQ Arabic question returns at least one source', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('كيف أطلب عرض سعر؟', 'customer', 'ar');
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  it('provider visibility question returns at least one source', () => {
    const ctx = buildAssistantKnowledgeAnswerContext('لماذا لا يظهر مزودي للعامة؟', 'provider', 'ar');
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  it('visitor never receives internal-ops items', () => {
    for (const q of ASSISTANT_INTERNAL_PILOT_QUESTIONS) {
      if (q.audience !== 'visitor') continue;
      const ctx = buildAssistantKnowledgeAnswerContext(q.query, 'visitor', 'ar');
      for (const m of ctx.matchedItems) {
        expect(m.item.categoryId).not.toBe('internal-ops');
        expect(m.item.status).not.toBe('internal');
      }
    }
  });
});

describe('Phase 8 — pilot fixture purity (no DB / RPC / edge / transport)', () => {
  it('fixture file contains no forbidden imports or calls', () => {
    expect(PILOT_SRC).not.toMatch(/supabase/i);
    expect(PILOT_SRC).not.toMatch(/\bfetch\s*\(/);
    expect(PILOT_SRC).not.toMatch(/\b(axios|openai|anthropic|gemini)\b/i);
    expect(PILOT_SRC).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(PILOT_SRC).not.toMatch(/\bas\s+any\b|:\s*any\b/);
    expect(PILOT_SRC).not.toMatch(/@ts-ignore|@ts-nocheck|@ts-expect-error/);
    expect(PILOT_SRC).not.toMatch(/\bit\.skip\b|\bdescribe\.skip\b/);
  });
});