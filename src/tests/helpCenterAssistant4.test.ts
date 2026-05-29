import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generateHelpAnswer,
  type HelpArticle,
} from '@/modules/helpCenter';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

const mkArticle = (over: Partial<HelpArticle> = {}): HelpArticle => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  ref_id: over.ref_id ?? 'HELP-X',
  category_id: over.category_id ?? 'cat-1',
  slug: over.slug ?? 'slug',
  audience: over.audience ?? 'general',
  status: over.status ?? 'published',
  title_ar: over.title_ar ?? 'عنوان',
  title_en: over.title_en ?? 'Title',
  summary_ar: over.summary_ar ?? null,
  summary_en: over.summary_en ?? null,
  content_ar: over.content_ar ?? null,
  content_en: over.content_en ?? null,
  keywords: over.keywords ?? [],
  views_count: over.views_count ?? 0,
  helpful_count: over.helpful_count ?? 0,
  not_helpful_count: over.not_helpful_count ?? 0,
  updated_at: over.updated_at ?? new Date().toISOString(),
});

describe('HELP-CENTER-ASSISTANT-4', () => {
  describe('grounded assistant — generateHelpAnswer', () => {
    it('returns sources when an answer is found', () => {
      const articles = [
        mkArticle({
          slug: 'create-contract',
          title_en: 'How to create a contract',
          content_en: 'To create a contract, open the contracts dashboard. Then click new contract and fill in the details.',
          keywords: ['contract', 'create'],
        }),
      ];
      const ans = generateHelpAnswer({ question: 'how do I create a contract', articles, language: 'en' });
      expect(ans.status).toBe('answered');
      expect(ans.sources.length).toBeGreaterThan(0);
      expect(ans.sources[0]).toHaveProperty('slug');
    });

    it('returns low_confidence fallback when no article matches', () => {
      const ans = generateHelpAnswer({
        question: 'how do I configure quantum tunneling for procurement',
        articles: [mkArticle({ title_en: 'Reset password', content_en: 'Click forgot password.' })],
        language: 'en',
      });
      expect(ans.status).toBe('low_confidence');
      expect(ans.sources).toEqual([]);
      expect(ans.confidence).toBeLessThan(0.3);
    });

    it('never returns content for empty question', () => {
      const ans = generateHelpAnswer({ question: '', articles: [], language: 'ar' });
      expect(ans.status).toBe('low_confidence');
    });

    it('confident answers always include sources (no source-less answers)', () => {
      const articles = [
        mkArticle({ slug: 'a', content_en: 'BOQ items can be edited from the BOQ tab. Edit BOQ items here.' }),
      ];
      const ans = generateHelpAnswer({ question: 'edit BOQ items', articles, language: 'en' });
      if (ans.status === 'answered') {
        expect(ans.sources.length).toBeGreaterThan(0);
      }
    });
  });

  describe('SmartHelpPanel safety', () => {
    const panel = read('src/components/help/SmartHelpPanel.tsx');

    it('renders a question input with localized placeholders', () => {
      expect(panel).toMatch(/data-testid="help-assistant-input"/);
      expect(panel).toContain('اسأل عن استخدام قطاعات');
      expect(panel).toContain('Ask about using Qitaat');
    });

    it('calls generateHelpAnswer (no external AI)', () => {
      expect(panel).toMatch(/generateHelpAnswer\(/);
    });

    it('renders sources for confident answers', () => {
      expect(panel).toMatch(/data-testid="help-assistant-source"/);
    });

    it('exposes a low-confidence fallback + content gap action', () => {
      expect(panel).toMatch(/data-testid="help-assistant-fallback"/);
      expect(panel).toMatch(/data-testid="help-assistant-report-gap"/);
      expect(panel).toContain('لم نجد مقالًا منشورًا يغطي هذا السؤال بدقة');
      expect(panel).toContain('We could not find a published article that covers this question accurately');
    });

    it('does not import private/out-of-scope domain modules', () => {
      const banned = [
        '@/modules/contracts',
        '@/modules/businesses',
        '@/modules/workOrders',
        '@/modules/procurement',
        '@/modules/customerTracking',
        '@/modules/quotations',
        '@/modules/rfq',
        '@/modules/users',
      ];
      for (const b of banned) expect(panel).not.toContain(b);
    });

    it('does not perform raw fetch or call external AI providers', () => {
      expect(panel).not.toMatch(/\bfetch\(/);
      expect(panel.toLowerCase()).not.toMatch(/openai|anthropic|lovable-ai|ai-gateway|gemini\b/);
    });

    it('does not bypass wrappers with direct supabase.from calls', () => {
      expect(panel).not.toMatch(/supabase\.from\(/);
    });

    it('has no chat history, no WhatsApp, no SMS, no ticket chat', () => {
      const code = panel.toLowerCase();
      expect(code).not.toContain('chat_history');
      expect(code).not.toContain('whatsapp');
      expect(code).not.toMatch(/\bsms\b/);
      expect(code).not.toContain('support ticket');
    });
  });

  describe('content gap wrapper safety', () => {
    const gaps = read('src/modules/helpCenter/intelligence/contentGaps.ts');
    const logs = read('src/modules/helpCenter/intelligence/assistantLogs.ts');

    it('content gap module never touches private tables', () => {
      const banned = ['contracts', 'work_orders', 'businesses', 'rfqs', 'profiles', 'customers', 'staff', 'inventory', 'accounting', 'quotations'];
      for (const b of banned) {
        expect(gaps).not.toMatch(new RegExp(`from\\(['"\`]${b}['"\`]\\)`));
      }
    });

    it('content gap module submits via RPC for dedupe', () => {
      expect(gaps).toMatch(/submit_help_content_gap/);
    });

    it('draft creation never auto-publishes', () => {
      expect(gaps).toMatch(/status:\s*'draft'/);
      expect(gaps).not.toMatch(/status:\s*'published'/);
    });

    it('assistant logs do not transmit answer text or PII', () => {
      expect(logs).not.toMatch(/answer:/);
      // Only normalized query, page key, audience, confidence, sources_count are sent
      expect(logs).toMatch(/query_normalized/);
      expect(logs).toMatch(/sources_count/);
      expect(logs).not.toMatch(/user_id|email|phone|business_id/);
    });

    it('assistant log failures are swallowed (analytics-only)', () => {
      expect(logs).toMatch(/catch \{/);
    });
  });

  describe('admin content gap authoring workflow', () => {
    const admin = read('src/pages/admin/AdminHelpCenter.tsx');

    it('exposes a Content Gaps tab', () => {
      expect(admin).toMatch(/value="gaps"/);
      expect(admin).toMatch(/adminListContentGaps/);
    });

    it('supports status transitions across the full lifecycle', () => {
      for (const s of ['new', 'reviewing', 'article_planned', 'article_created', 'ignored']) {
        expect(admin).toContain(`'${s}'`);
      }
    });

    it('provides Create draft article action', () => {
      expect(admin).toMatch(/createDraftArticleFromGap/);
      expect(admin).toMatch(/data-testid="admin-create-draft-from-gap"/);
    });
  });

  describe('module exports', () => {
    it('exposes assistant + content gap surfaces from helpCenter index', async () => {
      const mod = await import('@/modules/helpCenter');
      expect(typeof mod.generateHelpAnswer).toBe('function');
      expect(typeof mod.submitHelpContentGap).toBe('function');
      expect(typeof mod.adminListContentGaps).toBe('function');
      expect(typeof mod.createDraftArticleFromGap).toBe('function');
      expect(typeof mod.updateContentGapStatus).toBe('function');
      expect(typeof mod.logAssistantEvent).toBe('function');
    });
  });
});
