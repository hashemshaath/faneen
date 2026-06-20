/**
 * Phase 9 — Quality Snapshot panel tests.
 *
 * Locks down that the panel:
 *  - exists and is mounted into /admin/knowledge
 *  - derives every counter from the pilot fixture
 *  - never persists, sends, or pretends to do time-series tracking
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { computePilotQualitySnapshot } from '@/modules/knowledge/assistant/assistantPilotSummary';
import { ASSISTANT_INTERNAL_PILOT_QUESTIONS } from '@/modules/knowledge/assistant/assistantInternalPilot';

const ROOT = path.resolve(__dirname, '..', '..');
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'components', 'admin', 'knowledge', 'AssistantQualitySnapshotPanel.tsx'),
  'utf8',
);
const ADMIN_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'pages', 'admin', 'AdminKnowledgeCenter.tsx'),
  'utf8',
);
const SUMMARY_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'modules', 'knowledge', 'assistant', 'assistantPilotSummary.ts'),
  'utf8',
);

describe('Phase 9 — Assistant Quality Snapshot panel', () => {
  it('1) panel mounted inside /admin/knowledge under its own tab', () => {
    expect(ADMIN_SRC).toMatch(/import\s+AssistantQualitySnapshotPanel/);
    expect(ADMIN_SRC).toMatch(/knowledge-admin-section-assistant-quality/);
    expect(ADMIN_SRC).toMatch(/<AssistantQualitySnapshotPanel\s*\/?>/);
  });

  it('2) panel surfaces required counters', () => {
    for (const id of [
      'quality-total',
      'quality-answered',
      'quality-fallback',
      'quality-blocked-internal',
      'quality-needs-knowledge',
      'quality-avg-confidence',
    ]) {
      expect(PANEL_SRC).toContain(`testid="${id}"`);
    }
  });

  it('3) all numbers come from the pilot fixture, not hardcoded magic values', () => {
    expect(PANEL_SRC).toMatch(/computePilotQualitySnapshot/);
    expect(SUMMARY_SRC).toMatch(/ASSISTANT_INTERNAL_PILOT_QUESTIONS/);
    // The summary must not invent counts — total must equal the fixture length.
    const snap = computePilotQualitySnapshot();
    expect(snap.counters.total).toBe(ASSISTANT_INTERNAL_PILOT_QUESTIONS.length);
    expect(snap.counters.answered + snap.counters.fallback).toBe(snap.counters.total);
  });

  it('4) panel does not pretend to track over time', () => {
    expect(PANEL_SRC).not.toMatch(/over\s+time|مع مرور الوقت|time-?series|trend/i);
    // It must explicitly mention that real-time tracking is deferred.
    expect(PANEL_SRC).toMatch(/مؤجل|لاحقة|Phase\s*10/i);
  });

  it('5) panel never persists or sends anything', () => {
    for (const src of [PANEL_SRC, SUMMARY_SRC]) {
      expect(src).not.toMatch(/supabase/i);
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
      expect(src).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
      expect(src).not.toMatch(/\bas\s+any\b|:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error/);
    }
  });

  it('6) Phase 9 closure target met — in-scope fallback < 2', () => {
    const snap = computePilotQualitySnapshot();
    expect(snap.counters.inScopeFallback).toBeLessThan(2);
  });
});
