/**
 * Phase 9 — Internal-leak E2E guard.
 *
 * Locks every public surface (knowledge listing, FAQ, search, assistant
 * context, message snippets, Assistant Preview audience switching) so
 * `internal-ops` / `status: internal` items can never reach an audience
 * that isn't `admin` or `operations`. Pure read; no DB / RPC / transport.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  knowledgeRegistry,
  publicCategories,
  filterKnowledge,
  searchKnowledge,
  buildAssistantKnowledgeAnswerContext,
  getSafeMessageKnowledgeSnippets,
  type KnowledgeAudience,
} from '@/modules/knowledge';

const ROOT = path.resolve(__dirname, '..', '..');
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'components', 'admin', 'knowledge', 'AssistantPreviewPanel.tsx'),
  'utf8',
);

const PUBLIC_AUDIENCES: KnowledgeAudience[] = ['visitor', 'customer', 'provider', 'business_owner'];
const INTERNAL_PROBE_QUERIES = [
  'تشغيل داخلي',
  'تصعيد',
  'فحص جاهزية مزود',
  'عمليات داخلية',
  'فريق التشغيل',
  'لا تشارك المعلومات',
];

import type { KnowledgeContextResult } from '@/modules/knowledge';

function assertNoInternal(rows: readonly KnowledgeContextResult[]): void {
  for (const r of rows) {
    expect(r.item.status).not.toBe('internal');
    expect(r.item.categoryId).not.toBe('internal-ops');
  }
}

describe('Phase 9 — public knowledge surfaces never leak internal content', () => {
  it('1) /knowledge listing excludes internal-ops category entirely', () => {
    const ids = publicCategories().map((c) => c.id);
    expect(ids).not.toContain('internal-ops');
  });

  it('2) /faq surface (same filter) excludes status=internal items', () => {
    for (const aud of PUBLIC_AUDIENCES) {
      const items = filterKnowledge({ audience: aud });
      for (const it of items) {
        expect(it.status).not.toBe('internal');
        expect(it.categoryId).not.toBe('internal-ops');
      }
    }
  });

  it('3) public search never returns internal results', () => {
    for (const aud of PUBLIC_AUDIENCES) {
      for (const q of INTERNAL_PROBE_QUERIES) {
        const items = searchKnowledge(q, aud, 'ar');
        for (const it of items) {
          expect(it.status).not.toBe('internal');
          expect(it.categoryId).not.toBe('internal-ops');
        }
      }
    }
  });

  it('4) assistant context for visitor/customer/provider/business_owner never returns internal', () => {
    for (const aud of PUBLIC_AUDIENCES) {
      for (const q of INTERNAL_PROBE_QUERIES) {
        const ctx = buildAssistantKnowledgeAnswerContext(q, aud, 'ar');
        assertNoInternal(ctx.matchedItems);
      }
    }
  });

  it('5) message snippets for customer/provider/business_owner never return internal', () => {
    for (const aud of ['customer', 'provider', 'business_owner'] as KnowledgeAudience[]) {
      for (const intent of ['support', 'rfq', 'quote', 'provider']) {
        const snips = getSafeMessageKnowledgeSnippets(aud, intent, 'ar', 10);
        assertNoInternal(snips);
      }
    }
  });

  it('6) Assistant Preview exposes all required audiences, with visitor/customer/provider available for selection', () => {
    for (const aud of PUBLIC_AUDIENCES) expect(PANEL_SRC).toContain(aud);
  });

  it('7) admin / operations CAN see internal items through filterKnowledge', () => {
    const adminInternal = filterKnowledge({ audience: 'admin' }).filter(
      (i) => i.categoryId === 'internal-ops',
    );
    const opsInternal = filterKnowledge({ audience: 'operations' }).filter(
      (i) => i.categoryId === 'internal-ops',
    );
    expect(adminInternal.length).toBeGreaterThan(0);
    expect(opsInternal.length).toBeGreaterThan(0);
  });

  it('8) registry contains internal items (so guard is non-trivial)', () => {
    const internal = knowledgeRegistry.filter(
      (i) => i.status === 'internal' || i.categoryId === 'internal-ops',
    );
    expect(internal.length).toBeGreaterThan(0);
  });

  it('9) every internal item is flagged usableByAssistant=false and usableInMessages=false', () => {
    const internal = knowledgeRegistry.filter(
      (i) => i.status === 'internal' || i.categoryId === 'internal-ops',
    );
    for (const i of internal) {
      expect(i.usableByAssistant).toBe(false);
      expect(i.usableInMessages).toBe(false);
    }
  });

  it('10) public audience never sees admin-only internal text leaking through tags', () => {
    for (const aud of PUBLIC_AUDIENCES) {
      const ctx = buildAssistantKnowledgeAnswerContext('do-not-share security-internal', aud, 'ar');
      assertNoInternal(ctx.matchedItems);
    }
  });
});
