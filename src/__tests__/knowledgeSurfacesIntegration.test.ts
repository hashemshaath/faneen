import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('KNOWLEDGE UNIFICATION — public surfaces stay on centralised sources', () => {
  it('homepage FAQ section reads from useHomeFaq (central module)', () => {
    const src = read('src/components/home/v2/sections/FAQSection.tsx');
    expect(src).toMatch(/from\s+['"]@\/modules\/home['"]/);
    expect(src).toMatch(/useHomeFaq\(/);
  });

  it('Help Center home reads from the helpCenter module (central source)', () => {
    const src = read('src/pages/help/HelpCenterHome.tsx');
    expect(src).toMatch(/from\s+['"]@\/modules\/helpCenter['"]/);
  });

  it('homepage JSON-LD FAQ derives from useHomeFaq, not duplicated arrays', () => {
    const src = read('src/pages/Index.tsx');
    expect(src).toMatch(/faqItems\.map/);
    expect(src).not.toMatch(/FAQ_ITEMS_BI\.map/);
  });

  it('knowledge module is exported from a single index', () => {
    const idx = read('src/modules/knowledge/index.ts');
    expect(idx).toMatch(/knowledgeRegistry/);
    expect(idx).toMatch(/getAssistantKnowledgeContext/);
    expect(idx).toMatch(/getMessageKnowledgeSnippets/);
  });
});