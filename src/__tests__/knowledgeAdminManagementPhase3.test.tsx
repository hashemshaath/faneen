import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  knowledgeRegistry,
  KNOWLEDGE_ADMIN_TABS,
  getKnowledgeAdminTab,
  computeKnowledgeAdminMetrics,
  applyKnowledgeAdminFilters,
  DEFAULT_KNOWLEDGE_ADMIN_FILTERS,
  KNOWLEDGE_CATEGORIES,
} from '@/modules/knowledge';

const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('KNOWLEDGE ADMIN MANAGEMENT — Phase 3', () => {
  const APP = read('src/App.tsx');
  const PAGE = read('src/pages/admin/AdminKnowledgeCenter.tsx');
  const NAV  = read('src/modules/admin-shell/navigation/adminNavigation.ts');

  it('1) /admin/knowledge route is mounted under requireAdmin guard', () => {
    expect(APP).toMatch(/path="\/admin\/knowledge"/);
    expect(APP).toMatch(/AdminKnowledgeCenter/);
    expect(APP).toMatch(/requireAdmin[^>]*>\s*<AdminKnowledgeCenter/);
  });

  it('2) page renders the canonical Arabic title', () => {
    expect(PAGE).toContain('إدارة مكتبة المعرفة');
    expect(PAGE).toContain('مركز موحد لمراجعة محتوى المساعدة');
  });

  it('3) KPIs are computed from knowledgeRegistry (no fake numbers)', () => {
    const m = computeKnowledgeAdminMetrics(knowledgeRegistry);
    expect(m.total).toBe(knowledgeRegistry.length);
    expect(m.total).toBeGreaterThan(0);
    expect(m.published + m.draft + m.internal).toBe(m.total);
    expect(m.assistantReady).toBe(knowledgeRegistry.filter((i) => i.usableByAssistant).length);
    expect(m.messagesReady).toBe(knowledgeRegistry.filter((i) => i.usableInMessages).length);
    // page calls the helper, not a literal number
    expect(PAGE).toMatch(/computeKnowledgeAdminMetrics\s*\(\s*knowledgeRegistry\s*\)/);
  });

  it('4) all six required tabs exist', () => {
    const ids = KNOWLEDGE_ADMIN_TABS.map((t) => t.id);
    expect(ids).toEqual(['all','faq','help','assistant','messages','internal']);
  });

  it('5) FAQ tab shows only type=faq items', () => {
    const items = getKnowledgeAdminTab('faq').select(knowledgeRegistry);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.type === 'faq')).toBe(true);
  });

  it('6) Assistant tab shows only usableByAssistant=true items', () => {
    const items = getKnowledgeAdminTab('assistant').select(knowledgeRegistry);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.usableByAssistant)).toBe(true);
  });

  it('7) Messages tab shows only usableInMessages=true items', () => {
    const items = getKnowledgeAdminTab('messages').select(knowledgeRegistry);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.usableInMessages)).toBe(true);
  });

  it('8) Internal items never appear in the public "all" tab', () => {
    const all = getKnowledgeAdminTab('all').select(knowledgeRegistry);
    expect(all.every((i) => i.status !== 'internal')).toBe(true);
    const internalTab = getKnowledgeAdminTab('internal').select(knowledgeRegistry);
    for (const i of internalTab) {
      if (i.status === 'internal') {
        expect(all.find((x) => x.id === i.id)).toBeUndefined();
      }
    }
  });

  it('9) filters use real categories/audiences/types/statuses', () => {
    const cat = KNOWLEDGE_CATEGORIES[0].id;
    const r = applyKnowledgeAdminFilters(knowledgeRegistry, {
      ...DEFAULT_KNOWLEDGE_ADMIN_FILTERS,
      categoryId: cat,
    });
    expect(r.every((i) => i.categoryId === cat)).toBe(true);

    const onlyFaq = applyKnowledgeAdminFilters(knowledgeRegistry, {
      ...DEFAULT_KNOWLEDGE_ADMIN_FILTERS, type: 'faq',
    });
    expect(onlyFaq.every((i) => i.type === 'faq')).toBe(true);

    const onlyPublished = applyKnowledgeAdminFilters(knowledgeRegistry, {
      ...DEFAULT_KNOWLEDGE_ADMIN_FILTERS, status: 'published',
    });
    expect(onlyPublished.every((i) => i.status === 'published')).toBe(true);

    const customer = applyKnowledgeAdminFilters(knowledgeRegistry, {
      ...DEFAULT_KNOWLEDGE_ADMIN_FILTERS, audience: 'customer',
    });
    expect(customer.every((i) => i.audience.includes('customer'))).toBe(true);
  });

  it('10) preview renders source and relatedRoutes', () => {
    expect(PAGE).toMatch(/knowledge-admin-preview-source/);
    expect(PAGE).toMatch(/knowledge-admin-preview-routes/);
    expect(PAGE).toMatch(/item\.source/);
    expect(PAGE).toMatch(/relatedRoutes/);
  });

  it('11) page reads from knowledgeRegistry — no fake data', () => {
    expect(PAGE).toMatch(/from\s+['"]@\/modules\/knowledge['"]/);
    expect(PAGE).toMatch(/knowledgeRegistry/);
    expect(PAGE).not.toMatch(/MOCK|FAKE|dummy|lorem/i);
  });

  it('12) no DB / RLS / RPC / migrations / edge in the new code', () => {
    const files = [
      'src/pages/admin/AdminKnowledgeCenter.tsx',
      'src/modules/knowledge/admin/knowledgeAdminMetrics.ts',
      'src/modules/knowledge/admin/knowledgeAdminFilters.ts',
      'src/modules/knowledge/admin/knowledgeAdminTabs.ts',
      'src/modules/knowledge/admin/knowledgeAdminViewModels.ts',
    ].map(read);
    for (const src of files) {
      expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
      expect(src).not.toMatch(/supabase\.from\(/);
      expect(src).not.toMatch(/\.rpc\(/);
      expect(src).not.toMatch(/functions\.invoke\(/);
    }
  });

  it('13) no message-send call sites in the new code', () => {
    const src = read('src/pages/admin/AdminKnowledgeCenter.tsx');
    expect(src).not.toMatch(/sendEmail|sendWhatsapp|notify\(/);
  });

  it('14) no `any` / `as any` in the new module + page', () => {
    const files = [
      'src/pages/admin/AdminKnowledgeCenter.tsx',
      'src/modules/knowledge/admin/knowledgeAdminMetrics.ts',
      'src/modules/knowledge/admin/knowledgeAdminFilters.ts',
      'src/modules/knowledge/admin/knowledgeAdminTabs.ts',
      'src/modules/knowledge/admin/knowledgeAdminViewModels.ts',
    ].map(read);
    for (const src of files) {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/as\s+any\b/);
    }
  });

  it('15) no ts/eslint suppressions in the new code', () => {
    const files = [
      'src/pages/admin/AdminKnowledgeCenter.tsx',
      'src/modules/knowledge/admin/knowledgeAdminMetrics.ts',
      'src/modules/knowledge/admin/knowledgeAdminFilters.ts',
      'src/modules/knowledge/admin/knowledgeAdminTabs.ts',
      'src/modules/knowledge/admin/knowledgeAdminViewModels.ts',
    ].map(read);
    for (const src of files) {
      expect(src).not.toMatch(/@ts-(ignore|nocheck|expect-error)/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });

  it('16) admin navigation links /admin/knowledge', () => {
    expect(NAV).toMatch(/\/admin\/knowledge/);
    expect(NAV).toMatch(/مكتبة المعرفة/);
  });

  it('17) edit/add buttons are present but disabled (no CRUD in Phase 3)', () => {
    expect(PAGE).toMatch(/disabled[^>]*>\s*إضافة مقال/);
    expect(PAGE).toMatch(/disabled[^>]*>\s*تعديل/);
    expect(PAGE).toContain('إدارة التحرير ستضاف في مرحلة لاحقة.');
  });
});