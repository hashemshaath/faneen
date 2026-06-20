/**
 * Phase 6 — KNOWLEDGE SYSTEM END-TO-END FINAL QA.
 *
 * Locks down the complete knowledge stack:
 *  - /knowledge, /faq and /admin/knowledge all read from knowledgeRegistry.
 *  - Audience guardrails: internal-ops never leaks to visitor/customer/provider.
 *  - Assistant refuses to answer unknown questions (no hallucination).
 *  - Support replies never send / never persist.
 *  - No duplicate ids, no duplicate titles within the same audience.
 *  - Every published item has a valid categoryId and an Arabic body.
 *  - Messaging snippets never expose internal content to public audiences.
 *  - No DB / RLS / RPC / migrations / edge changes in the knowledge module.
 *  - No `any` / no suppressions / no skipped tests in the knowledge module.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  knowledgeRegistry,
  publicCategories,
  KNOWLEDGE_CATEGORIES,
  isInternalCategory,
  searchKnowledge,
  filterKnowledge,
} from '@/modules/knowledge';
import { buildAssistantKnowledgeAnswerContext } from '@/modules/knowledge/assistant/assistantKnowledgeContext';
import { getSafeMessageKnowledgeSnippets } from '@/modules/knowledge/messaging/messageKnowledgeSnippets';
import { buildSupportReplyDraft } from '@/modules/knowledge/support/supportReplyBuilder';
import type { KnowledgeAudience } from '@/modules/knowledge';

const ROOT = path.resolve(__dirname, '..', '..');
const KNOWLEDGE_DIR = path.join(ROOT, 'src', 'modules', 'knowledge');
const APP_TSX = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');
const KNOWLEDGE_PAGE = fs.readFileSync(
  path.join(ROOT, 'src', 'pages', 'KnowledgeCenter.tsx'),
  'utf8',
);
const ADMIN_PAGE = fs.readFileSync(
  path.join(ROOT, 'src', 'pages', 'admin', 'AdminKnowledgeCenter.tsx'),
  'utf8',
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}
const KNOWLEDGE_FILES = walk(KNOWLEDGE_DIR);

describe('Phase 6 — routes wired to knowledgeRegistry', () => {
  it('/knowledge and /faq both render KnowledgeCenter', () => {
    expect(APP_TSX).toMatch(/path="\/knowledge"\s+element=\{<KnowledgeCenter\s*\/>\}/);
    expect(APP_TSX).toMatch(/path="\/faq"\s+element=\{<KnowledgeCenter\s*\/>\}/);
  });

  it('/admin/knowledge is gated by ProtectedRoute requireAdmin', () => {
    expect(APP_TSX).toMatch(
      /path="\/admin\/knowledge"\s+element=\{<ProtectedRoute requireAdmin><AdminKnowledgeCenter/,
    );
  });

  it('KnowledgeCenter sources content from @/modules/knowledge', () => {
    expect(KNOWLEDGE_PAGE).toMatch(/from ['"]@\/modules\/knowledge['"]/);
    expect(KNOWLEDGE_PAGE).toMatch(/knowledgeRegistry|publicCategories|filterKnowledge|searchKnowledge/);
  });

  it('AdminKnowledgeCenter sources content from @/modules/knowledge', () => {
    expect(ADMIN_PAGE).toMatch(/from ['"]@\/modules\/knowledge['"]/);
  });
});

describe('Phase 6 — registry hygiene', () => {
  it('no duplicate ids', () => {
    const ids = knowledgeRegistry.map((i) => i.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(dupes).toEqual([]);
  });

  it('no duplicate titles within the same audience', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const item of knowledgeRegistry) {
      for (const aud of item.audience) {
        const key = `${aud}::${item.title.ar.trim()}`;
        const prior = seen.get(key);
        if (prior && prior !== item.id) dupes.push(`${key} (${prior} vs ${item.id})`);
        else seen.set(key, item.id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('every item points at a real category', () => {
    const known = new Set(KNOWLEDGE_CATEGORIES.map((c) => c.id));
    const bad = knowledgeRegistry.filter((i) => !i.categoryId || !known.has(i.categoryId));
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('every published item has a non-empty Arabic body', () => {
    const bad = knowledgeRegistry.filter(
      (i) => i.status === 'published' && (!i.body?.ar || i.body.ar.trim().length === 0),
    );
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('items in internal categories are status=internal', () => {
    const bad = knowledgeRegistry.filter(
      (i) => isInternalCategory(i.categoryId) && i.status !== 'internal',
    );
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('usableByAssistant items always declare a source', () => {
    const bad = knowledgeRegistry.filter(
      (i) => i.usableByAssistant && (!i.source || i.source.trim().length === 0),
    );
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('internal items are NEVER usableByAssistant or usableInMessages', () => {
    const bad = knowledgeRegistry.filter(
      (i) => i.status === 'internal' && (i.usableByAssistant || i.usableInMessages),
    );
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('publicCategories excludes the internal-ops category', () => {
    expect(publicCategories().find((c) => c.id === 'internal-ops')).toBeUndefined();
  });
});

describe('Phase 6 — audience visibility guardrails', () => {
  const publicAudiences: KnowledgeAudience[] = [
    'visitor',
    'customer',
    'provider',
    'business_owner',
  ];

  it.each(publicAudiences)('%s never sees internal-ops items', (aud) => {
    const visible = filterKnowledge({ audience: aud });
    const leaked = visible.filter((i) => i.categoryId === 'internal-ops');
    expect(leaked).toEqual([]);
  });

  it.each(publicAudiences)('%s never sees admin/operations-only items', (aud) => {
    const visible = filterKnowledge({ audience: aud });
    const leaked = visible.filter(
      (i) => !i.audience.some((a) => publicAudiences.includes(a)),
    );
    expect(leaked).toEqual([]);
  });

  it('admin audience can see internal items', () => {
    const visible = filterKnowledge({ audience: 'admin' });
    expect(visible.some((i) => i.categoryId === 'internal-ops')).toBe(true);
  });
});

describe('Phase 6 — assistant refuses to invent answers', () => {
  it('answers a known Arabic question with sources', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'كيف أطلب عرض سعر؟',
      'customer',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(true);
    expect(ctx.sources.length).toBeGreaterThan(0);
    expect(ctx.fallbackMessage).toBeNull();
  });

  it('refuses an unrelated question with a fallback message', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'zxqv blarp foobar nonsense',
      'visitor',
      'ar',
    );
    expect(ctx.allowedToAnswer).toBe(false);
    expect(ctx.fallbackMessage).not.toBeNull();
  });

  it('never returns internal items for a visitor query', () => {
    const ctx = buildAssistantKnowledgeAnswerContext(
      'تشغيل داخلي تصعيد',
      'visitor',
      'ar',
    );
    const leaked = ctx.matchedItems.filter(
      (m) => m.item.status === 'internal' || m.item.categoryId === 'internal-ops',
    );
    expect(leaked).toEqual([]);
  });
});

describe('Phase 6 — support replies', () => {
  it('builds a draft for a known intent across every channel without side effects', () => {
    for (const channel of ['email', 'whatsapp', 'ticket', 'in_app'] as const) {
      const draft = buildSupportReplyDraft({
        message: 'نسيت كلمة المرور كيف أستعيدها؟',
        audience: 'customer',
        channel,
        locale: 'ar',
      });
      expect(draft.intent).toBe('password_reset');
      expect(typeof draft.reply).toBe('string');
      expect(draft.reply.length).toBeGreaterThan(0);
      expect(draft.reply).not.toMatch(/internal-ops|RLS|SQL/i);
    }
  });

  it('unknown messages return canAnswer=false and no sources', () => {
    const draft = buildSupportReplyDraft({
      message: 'zxqv blarp foobar nonsense',
      audience: 'visitor',
      channel: 'email',
      locale: 'ar',
    });
    expect(draft.canAnswer).toBe(false);
    expect(draft.sources).toEqual([]);
  });

  it('builder file does not call any send/persist transport', () => {
    const builderSrc = fs.readFileSync(
      path.join(KNOWLEDGE_DIR, 'support', 'supportReplyBuilder.ts'),
      'utf8',
    );
    expect(builderSrc).not.toMatch(/supabase|fetch\(|axios|sendMail|sendgrid|resend|whatsapp\.send/i);
  });
});

describe('Phase 6 — messaging snippets stay public-safe', () => {
  it('public snippets never carry internal-ops content', () => {
    for (const aud of ['visitor', 'customer', 'provider', 'business_owner'] as const) {
      const snippets = getSafeMessageKnowledgeSnippets(aud, 'general', 'ar');
      const leaked = snippets.filter(
        (s) => s.item.status === 'internal' || s.item.categoryId === 'internal-ops',
      );
      expect(leaked).toEqual([]);
    }
  });
});

describe('Phase 6 — Arabic search returns results', () => {
  it('returns results for "عرض سعر"', () => {
    const results = searchKnowledge('عرض سعر', 'customer', 'ar');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Phase 6 — module purity', () => {
  it('no knowledge module file imports supabase / fetches network / opens db', () => {
    const offenders: string[] = [];
    for (const f of KNOWLEDGE_FILES) {
      const src = fs.readFileSync(f, 'utf8');
      if (/from\s+['"]@\/integrations\/supabase/.test(src)) offenders.push(`${f} :: supabase`);
      if (/\bfetch\s*\(/.test(src)) offenders.push(`${f} :: fetch`);
      if (/supabase\.(rpc|from)\(|createClient\(/.test(src)) offenders.push(`${f} :: db call`);
    }
    expect(offenders).toEqual([]);
  });

  it('no `any` casts or ts-ignore suppressions in the knowledge module', () => {
    const offenders: string[] = [];
    for (const f of KNOWLEDGE_FILES) {
      const src = fs.readFileSync(f, 'utf8');
      if (/\bas\s+any\b/.test(src)) offenders.push(`${f} :: as any`);
      if (/:\s*any\b/.test(src)) offenders.push(`${f} :: : any`);
      if (/@ts-ignore|@ts-nocheck|@ts-expect-error/.test(src))
        offenders.push(`${f} :: ts-suppression`);
    }
    expect(offenders).toEqual([]);
  });

  it('no skipped or focused tests in this file', () => {
    const self = fs.readFileSync(__filename, 'utf8');
    expect(self).not.toMatch(/\b(it|describe|test)\.(skip|only)\b/);
  });
});
