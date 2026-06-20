/**
 * Phase 7 — Assistant Preview wiring inside /admin/knowledge.
 *
 * Static + behavioural locks: the panel must be mounted in the admin page,
 * must use the unified `buildAssistantKnowledgeAnswerContext`, must show
 * sources / related routes when allowed, and must show the fallback when
 * the registry has no grounded answer. No DB / RPC / edge / fetch / send /
 * persistence allowed.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildAssistantKnowledgeAnswerContext,
} from '@/modules/knowledge/assistant/assistantKnowledgeContext';

const ROOT = path.resolve(__dirname, '..', '..');
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'components', 'admin', 'knowledge', 'AssistantPreviewPanel.tsx'),
  'utf8',
);
const ADMIN_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'pages', 'admin', 'AdminKnowledgeCenter.tsx'),
  'utf8',
);

describe('Phase 7 — Assistant preview wiring', () => {
  it('panel is mounted inside /admin/knowledge', () => {
    expect(ADMIN_SRC).toMatch(/import\s+AssistantPreviewPanel/);
    expect(ADMIN_SRC).toMatch(/<AssistantPreviewPanel\s*\/?>/);
    expect(ADMIN_SRC).toMatch(/knowledge-admin-section-assistant-preview/);
  });

  it('panel renders the question input and audience/locale selectors', () => {
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-question"/);
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-audience"/);
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-locale"/);
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-submit"/);
  });

  it('panel surfaces sources, routes and fallback markers', () => {
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-sources"/);
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-routes"/);
    expect(PANEL_SRC).toMatch(/data-testid="assistant-preview-fallback"/);
    expect(PANEL_SRC).toMatch(
      /لا توجد معلومة موثقة كافية في مركز المعرفة للإجابة على هذا السؤال/,
    );
    expect(PANEL_SRC).toMatch(
      /يمكن تصعيد السؤال لفريق الدعم أو إضافة مقال معرفة جديد/,
    );
  });

  it('panel uses only the unified assistant context builder', () => {
    expect(PANEL_SRC).toMatch(/buildAssistantKnowledgeAnswerContext/);
  });

  it('panel has no transport, no persistence, no external API', () => {
    expect(PANEL_SRC).not.toMatch(/supabase/i);
    expect(PANEL_SRC).not.toMatch(/\bfetch\s*\(/);
    expect(PANEL_SRC).not.toMatch(/axios|openai|anthropic|gemini|embedding|vector/i);
    expect(PANEL_SRC).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(PANEL_SRC).not.toMatch(/\bany\b/);
    expect(PANEL_SRC).not.toMatch(/@ts-ignore|@ts-nocheck|@ts-expect-error/);
  });

  it('panel includes all required audiences', () => {
    for (const a of ['visitor', 'customer', 'provider', 'business_owner', 'admin', 'operations']) {
      expect(PANEL_SRC).toContain(a);
    }
  });
});

describe('Phase 7 — assistant context behaviour through the panel pipeline', () => {
  it('Arabic RFQ question returns allowedToAnswer=true with sources', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'كيف أطلب عرض سعر؟',
      'customer',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  it('Unknown gibberish returns allowedToAnswer=false with fallback message', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'zxqv blarp foobar nonsense',
      'visitor',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(false);
    expect(ctx.fallbackMessage).not.toBeNull();
    expect(ctx.sources).toEqual([]);
  });

  it('visitor never receives internal-ops items as sources', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'تصعيد تشغيل داخلي',
      'visitor',
      'ar',
    );
    const leakedInternal = ctx.matchedItems.filter(
      (m) => m.item.status === 'internal' || m.item.categoryId === 'internal-ops',
    );
    expect(leakedInternal).toEqual([]);
  });

  it('admin can reach internal items when querying internal topics', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'تصعيد الدعم تشغيل داخلي',
      'admin',
      'ar',
    );
    const internalHits = ctx.matchedItems.filter(
      (m) => m.item.status === 'internal' || m.item.categoryId === 'internal-ops',
    );
    expect(internalHits.length).toBeGreaterThan(0);
  });

  it('this test file is free of skip/only and ts suppressions', () => {
    const self = fs.readFileSync(__filename, 'utf8');
    expect(self).not.toMatch(/\b(it|describe|test)\.(skip|only)\b/);
    expect(self).not.toMatch(/@ts-ignore|@ts-nocheck|@ts-expect-error/);
  });
});
