import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  knowledgeRegistry,
  KNOWLEDGE_CATEGORIES,
  isInternalCategory,
  filterKnowledge,
} from '@/modules/knowledge';

const MODULE_DIR = path.resolve(__dirname, '..', 'modules', 'knowledge');
const read = (p: string) => fs.readFileSync(path.join(MODULE_DIR, p), 'utf8');

const REQUIRED_CATEGORIES = [
  'general', 'customers', 'businesses', 'providers',
  'quote-requests', 'projects-sites', 'offers-pricing', 'contracts',
  'payments', 'memberships', 'security-privacy', 'account',
  'support', 'disputes', 'internal-ops',
];

describe('KNOWLEDGE CONTENT SEED — Phase 2 invariants', () => {
  it('every required category has at least one item', () => {
    for (const cat of REQUIRED_CATEGORIES) {
      const items = knowledgeRegistry.filter((it) => it.categoryId === cat);
      expect(items.length, `category ${cat} missing content`).toBeGreaterThan(0);
    }
  });

  it('has at least 5 general FAQ items', () => {
    const general = knowledgeRegistry.filter((it) => it.categoryId === 'general');
    expect(general.length).toBeGreaterThanOrEqual(5);
  });

  it('has customer-targeted content', () => {
    const items = knowledgeRegistry.filter((it) => it.categoryId === 'customers');
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.some((it) => it.audience.includes('customer'))).toBe(true);
  });

  it('has business-owner-targeted content', () => {
    const items = knowledgeRegistry.filter((it) => it.categoryId === 'businesses');
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.some((it) => it.audience.includes('business_owner'))).toBe(true);
  });

  it('has provider-targeted content', () => {
    const items = knowledgeRegistry.filter((it) => it.categoryId === 'providers');
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.some((it) => it.audience.includes('provider'))).toBe(true);
  });

  it('has payments & invoices content', () => {
    expect(knowledgeRegistry.filter((it) => it.categoryId === 'payments').length).toBeGreaterThanOrEqual(4);
  });

  it('has security & privacy content', () => {
    expect(knowledgeRegistry.filter((it) => it.categoryId === 'security-privacy').length).toBeGreaterThanOrEqual(4);
  });

  it('has technical support content', () => {
    expect(knowledgeRegistry.filter((it) => it.categoryId === 'support').length).toBeGreaterThanOrEqual(4);
  });

  it('no item is missing a categoryId', () => {
    for (const it of knowledgeRegistry) {
      expect(it.categoryId, `item ${it.id} missing categoryId`).toBeTruthy();
    }
  });

  it('every published item has an Arabic body', () => {
    for (const it of knowledgeRegistry) {
      if (it.status === 'published') expect(it.body.ar.trim().length).toBeGreaterThan(0);
    }
  });

  it('no internal-category item leaks to a visitor audience', () => {
    const visitorPool = filterKnowledge({ audience: 'visitor', status: 'published' });
    for (const it of visitorPool) {
      expect(isInternalCategory(it.categoryId)).toBe(false);
    }
    // No internal item has visitor in audience.
    for (const it of knowledgeRegistry) {
      if (isInternalCategory(it.categoryId)) {
        expect(it.audience.includes('visitor')).toBe(false);
        expect(it.audience.includes('customer')).toBe(false);
        expect(it.audience.includes('provider')).toBe(false);
        expect(it.audience.includes('business_owner')).toBe(false);
      }
    }
  });

  it('no duplicate Arabic titles within the same primary audience', () => {
    const audiences = ['customer','provider','business_owner','visitor'] as const;
    for (const aud of audiences) {
      const seen = new Set<string>();
      knowledgeRegistry
        .filter((it) => it.audience.includes(aud))
        .forEach((it) => {
          const key = it.title.ar.trim();
          expect(seen.has(key), `duplicate title for ${aud}: ${key}`).toBe(false);
          seen.add(key);
        });
    }
  });

  it('contains no obvious fake/lorem content', () => {
    const forbidden = /lorem|ipsum|todo:|fixme|placeholder|xxxxxx|بيانات\s+وهمية/i;
    for (const it of knowledgeRegistry) {
      expect(forbidden.test(it.title.ar)).toBe(false);
      expect(forbidden.test(it.body.ar)).toBe(false);
    }
  });

  it('module files contain no `any` / @ts-ignore / eslint-disable', () => {
    for (const f of [
      'knowledge.types.ts',
      'knowledge.schema.ts',
      'knowledgeRegistry.ts',
      'knowledgeSearch.ts',
      'knowledgeHelpers.ts',
      'knowledgeAudience.ts',
      'knowledgeTags.ts',
      'knowledgeCategories.ts',
      'index.ts',
    ]) {
      const txt = read(f);
      expect(txt, `${f}: any`).not.toMatch(/:\s*any\b/);
      expect(txt, `${f}: as any`).not.toMatch(/\bas\s+any\b/);
      expect(txt, `${f}: @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(txt, `${f}: eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('all category ids referenced by items exist in KNOWLEDGE_CATEGORIES', () => {
    const valid = new Set(KNOWLEDGE_CATEGORIES.map((c) => c.id));
    for (const it of knowledgeRegistry) {
      expect(valid.has(it.categoryId ?? '')).toBe(true);
    }
  });
});