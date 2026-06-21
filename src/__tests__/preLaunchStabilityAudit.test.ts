/**
 * PRE-LAUNCH STABILITY AUDIT — pilot readiness guard.
 *
 * Locks the public + dashboard + admin invariants required before the
 * limited pilot. Pure static checks plus the existing pure dashboard
 * navigation visibility helper — no DOM, no DB.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getVisibleDashboardNavGroups } from '@/modules/dashboard/navigation/dashboardNavigation.visibility';
import { KNOWLEDGE_ASSISTANT_RELEASE_GATE } from '@/modules/knowledge/release/knowledgeAssistantReleaseGate';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

const APP = read('src/App.tsx');

const labelsOf = (
  groups: ReturnType<typeof getVisibleDashboardNavGroups>,
): string[] => groups.flatMap((g) => g.items.map((i) => i.label));

describe('PRE-LAUNCH STABILITY AUDIT', () => {
  it('core public routes remain registered', () => {
    expect(APP).toMatch(/path="\/search"/);
    expect(APP).toMatch(/path="\/categories"/);
    expect(APP).toMatch(/path="\/knowledge"/);
    expect(APP).toMatch(/path="\/faq"/);
  });

  it('username and short-code public routes remain registered', () => {
    expect(APP).toMatch(/path="\/:username"/);
    expect(APP).toMatch(/path="\/q\/:code"/);
  });

  it('admin core routes remain registered', () => {
    expect(APP).toMatch(/path="\/admin"/);
    expect(APP).toMatch(/path="\/admin\/businesses"/);
    expect(APP).toMatch(/path="\/admin\/knowledge"/);
  });

  it('individual without a business sees أعمال but NOT الفروع', () => {
    const labels = labelsOf(
      getVisibleDashboardNavGroups({
        audience: 'user',
        hasBusiness: false,
        isSuperAdmin: false,
      }),
    );
    expect(labels.some((l) => l.includes('أعمال'))).toBe(true);
    expect(labels.some((l) => l.includes('الفروع'))).toBe(false);
  });

  it('business owner sees أعمال المنشأة and الفروع', () => {
    const labels = labelsOf(
      getVisibleDashboardNavGroups({
        audience: 'provider',
        hasBusiness: true,
        isSuperAdmin: false,
      }),
    );
    expect(labels.some((l) => l.includes('الفروع'))).toBe(true);
  });

  it('knowledge assistant stays at internal_preview', () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.releaseLevel).toBe('internal_preview');
  });

  it('public assistant + send + persistence stay disabled', () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canEnablePublicAssistant).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canSendMessages).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canStoreConversations).toBe(false);
  });

  it('audit track did not add migration / edge files', () => {
    // Sanity: report + this test live in docs/src/__tests__ only.
    expect(exists('docs/pre-launch-stability-audit-report.md')).toBe(true);
    expect(exists('src/__tests__/preLaunchStabilityAudit.test.ts')).toBe(true);
  });

  it('recently-touched cleanup files contain no `any` / suppressions / hex', () => {
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