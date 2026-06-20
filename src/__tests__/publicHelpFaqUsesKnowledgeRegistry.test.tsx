import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Public Knowledge / FAQ surface — wiring', () => {
  it('KnowledgeCenter imports knowledgeRegistry / filter / search', () => {
    const src = read('src/pages/KnowledgeCenter.tsx');
    expect(src).toMatch(/from\s+['"]@\/modules\/knowledge['"]/);
    expect(src).toMatch(/knowledgeRegistry/);
    expect(src).toMatch(/publicCategories/);
    expect(src).toMatch(/searchKnowledge/);
  });

  it('KnowledgeCenter does NOT embed a hardcoded FAQ array', () => {
    const src = read('src/pages/KnowledgeCenter.tsx');
    // No literal AR question arrays, no inline FAQ_ITEMS.
    expect(src).not.toMatch(/FAQ_ITEMS_BI/);
    expect(src).not.toMatch(/qAr\s*:/);
  });

  it('Internal-ops category is excluded from public listing via publicCategories', () => {
    const src = read('src/modules/knowledge/knowledgeCategories.ts');
    expect(src).toMatch(/internal:\s*true/);
    expect(src).toMatch(/publicCategories/);
  });

  it('/knowledge and /faq routes are mounted in App.tsx', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/knowledge"/);
    expect(app).toMatch(/path="\/faq"/);
    expect(app).toMatch(/KnowledgeCenter/);
  });

  it('related routes referenced from registry are non-empty strings starting with /', () => {
    // Static check: no broken `to=""`-style values.
    const reg = read('src/modules/knowledge/knowledgeRegistry.ts');
    const matches = reg.match(/relatedRoutes:\s*\[[^\]]*\]/g) ?? [];
    for (const m of matches) {
      const routes = m.match(/'([^']+)'/g) ?? [];
      for (const r of routes) {
        expect(r.startsWith("'/")).toBe(true);
      }
    }
  });
});