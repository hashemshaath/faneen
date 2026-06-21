/**
 * PROJECT CLEANUP FINAL CLOSEOUT — meta guard.
 *
 * Locks the aggregated invariants of every closeout track that ran
 * across the admin, dashboard, public, and knowledge-assistant scopes.
 * Pure static checks — no DB, no DOM.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  KNOWLEDGE_ASSISTANT_RELEASE_GATE,
} from '@/modules/knowledge/release/knowledgeAssistantReleaseGate';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

const CLOSEOUT_TESTS = [
  'src/__tests__/adminBusinessesCleanupTrackCloseout.test.tsx',
  'src/__tests__/dashboardPagesCleanupCloseout.test.ts',
  'src/__tests__/dashboardContractsPageExtractionCloseout.test.ts',
  'src/__tests__/dashboardRentalsPageExtractionCloseout.test.ts',
  'src/__tests__/dashboardMessagesPageExtractionCloseout.test.ts',
  'src/__tests__/publicPagesCleanupCloseout.test.ts',
  'src/__tests__/knowledgeAssistantReleaseGatePhase10.test.ts',
] as const;

const REPORT = 'docs/project-cleanup-final-closeout-report.md';

describe('PROJECT CLEANUP FINAL CLOSEOUT', () => {
  it('every closeout test file from the cleanup tracks exists', () => {
    for (const f of CLOSEOUT_TESTS) expect(exists(f), `missing ${f}`).toBe(true);
  });

  it('final closeout report exists', () => {
    expect(exists(REPORT)).toBe(true);
    expect(read(REPORT).length).toBeGreaterThan(200);
  });

  it('no closeout test references DB migration / RLS / edge changes', () => {
    for (const f of CLOSEOUT_TESTS) {
      const src = read(f);
      for (const forbidden of [
        'supabase/migrations',
        'supabase/functions/_shared',
        'pg_policies',
      ]) {
        expect(src.includes(forbidden), `${forbidden} in ${f}`).toBe(false);
      }
    }
  });

  it('core public routes remain registered in App.tsx', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/search"/);
    expect(app).toMatch(/path="\/categories"/);
    expect(app).toMatch(/path="\/q\/:code"/);
    expect(app).toMatch(/path="\/:username"/);
  });

  it('knowledge assistant release level stays internal_preview', () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.releaseLevel).toBe('internal_preview');
  });

  it('public assistant remains disabled', () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canEnablePublicAssistant).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canSendMessages).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canStoreConversations).toBe(false);
  });

  it('AdminBusinesses page stays under 1450 lines', () => {
    const lines = read('src/pages/admin/AdminBusinesses.tsx').split('\n').length;
    expect(lines).toBeLessThan(1450);
  });

  it('cleanup-touched source files contain no `any` / suppressions / hex literals', () => {
    // Closeout test files legitimately contain strings like `as any` as part
    // of regex assertions, so we audit the actual source files that were
    // touched by the cleanup tracks instead.
    const TOUCHED = [
      'src/pages/Categories.tsx',
      'src/hooks/useContractListDerivations.ts',
      'src/hooks/useRentalListDerivations.ts',
      'src/hooks/useMessagesDerivations.ts',
      'src/modules/knowledge/release/knowledgeAssistantReleaseGate.ts',
    ];
    for (const f of TOUCHED) {
      if (!exists(f)) continue;
      const src = read(f);
      expect(/\bas\s+any\b/.test(src), `as any in ${f}`).toBe(false);
      expect(/:\s*any\b/.test(src), `: any in ${f}`).toBe(false);
      expect(src.includes('@ts-ignore'), `ts-ignore in ${f}`).toBe(false);
      expect(src.includes('@ts-expect-error'), `ts-expect-error in ${f}`).toBe(false);
      expect(src.includes('eslint-disable'), `eslint-disable in ${f}`).toBe(false);
      expect(/#[0-9a-fA-F]{6}\b/.test(src), `hex in ${f}`).toBe(false);
    }
  });
});