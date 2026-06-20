import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  knowledgeRegistry,
  assertValidRegistry,
  validateKnowledgeItem,
} from '@/modules/knowledge';

const MODULE_DIR = path.resolve(__dirname, '..', 'modules', 'knowledge');
const read = (p: string) => fs.readFileSync(path.join(MODULE_DIR, p), 'utf8');

describe('KNOWLEDGE UNIFICATION — registry invariants', () => {
  it('every item validates against the schema', () => {
    expect(() => assertValidRegistry(knowledgeRegistry)).not.toThrow();
    for (const item of knowledgeRegistry) {
      expect(validateKnowledgeItem(item)).toEqual([]);
    }
  });

  it('all ids are unique', () => {
    const ids = knowledgeRegistry.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every item has a non-empty Arabic title', () => {
    for (const it of knowledgeRegistry) expect(it.title.ar.trim().length).toBeGreaterThan(0);
  });

  it('every item declares a non-empty audience array', () => {
    for (const it of knowledgeRegistry) expect(it.audience.length).toBeGreaterThan(0);
  });

  it('every item declares a valid type', () => {
    const allowed = new Set([
      'faq', 'help_article', 'guide', 'policy', 'message_template', 'internal_note',
    ]);
    for (const it of knowledgeRegistry) expect(allowed.has(it.type)).toBe(true);
  });

  it('every item declares a source path', () => {
    for (const it of knowledgeRegistry) expect(it.source.trim().length).toBeGreaterThan(0);
  });

  it('no published item is missing an Arabic body', () => {
    for (const it of knowledgeRegistry) {
      if (it.status === 'published') expect(it.body.ar.trim().length).toBeGreaterThan(0);
    }
  });

  it('assistant-usable items are never empty body', () => {
    for (const it of knowledgeRegistry) {
      if (it.usableByAssistant) expect(it.body.ar.trim().length).toBeGreaterThan(0);
    }
  });

  it('message-usable items never carry internal-only status', () => {
    for (const it of knowledgeRegistry) {
      if (it.usableInMessages) expect(it.status).not.toBe('internal');
    }
  });

  it('no duplicate Arabic titles within the same type', () => {
    const seen = new Set<string>();
    for (const it of knowledgeRegistry) {
      const key = `${it.type}::${it.title.ar.trim()}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('FAQ items are present (sourced from homepage FAQ data)', () => {
    expect(knowledgeRegistry.some((it) => it.type === 'faq')).toBe(true);
  });

  it('module files contain no `any`, no @ts-ignore, no eslint-disable', () => {
    for (const f of [
      'knowledge.types.ts',
      'knowledge.schema.ts',
      'knowledgeRegistry.ts',
      'knowledgeSearch.ts',
      'knowledgeHelpers.ts',
      'knowledgeAudience.ts',
      'knowledgeTags.ts',
      'index.ts',
    ]) {
      const txt = read(f);
      expect(txt, `${f} contains :any`).not.toMatch(/:\s*any\b/);
      expect(txt, `${f} contains as any`).not.toMatch(/\bas\s+any\b/);
      expect(txt, `${f} contains @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(txt, `${f} contains @ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(txt, `${f} contains eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });
});