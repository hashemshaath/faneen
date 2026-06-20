/**
 * Phase 9 — pure derivation of pilot quality counters from the static
 * pilot fixture. No DB, no time-series, no persistence, no logging. The
 * Quality Snapshot panel in `/admin/knowledge` reads from this helper.
 */
import {
  ASSISTANT_INTERNAL_PILOT_QUESTIONS,
  type PilotQuestion,
} from './assistantInternalPilot';
import { buildAssistantKnowledgeAnswerContext } from './assistantKnowledgeContext';

export interface PilotQualityCounters {
  readonly total: number;
  readonly answered: number;
  readonly fallback: number;
  readonly blockedInternal: number;
  readonly inScopeFallback: number;
  readonly outOfScopeFallback: number;
  readonly averageConfidence: number;
}

export interface PilotGap {
  readonly id: string;
  readonly query: string;
  readonly audience: PilotQuestion['audience'];
  readonly reason: 'in_scope_fallback' | 'expected_fallback';
}

export interface PilotQualitySnapshot {
  readonly counters: PilotQualityCounters;
  readonly gaps: readonly PilotGap[];
  readonly generatedFrom: 'pilot-fixture-phase-8';
}

export function computePilotQualitySnapshot(): PilotQualitySnapshot {
  let answered = 0;
  let fallback = 0;
  let blockedInternal = 0;
  let inScopeFallback = 0;
  let outOfScopeFallback = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  const gaps: PilotGap[] = [];

  for (const q of ASSISTANT_INTERNAL_PILOT_QUESTIONS) {
    const ctx = buildAssistantKnowledgeAnswerContext(q.query, q.audience, 'ar');
    if (q.expectedBehavior === 'blocked_internal') {
      blockedInternal += 1;
    }
    if (ctx.allowedToAnswer) {
      answered += 1;
      confidenceSum += ctx.confidence;
      confidenceCount += 1;
    } else {
      fallback += 1;
      if (q.expectedBehavior === 'fallback') {
        outOfScopeFallback += 1;
        gaps.push({ id: q.id, query: q.query, audience: q.audience, reason: 'expected_fallback' });
      } else {
        inScopeFallback += 1;
        gaps.push({ id: q.id, query: q.query, audience: q.audience, reason: 'in_scope_fallback' });
      }
    }
  }

  return {
    counters: {
      total: ASSISTANT_INTERNAL_PILOT_QUESTIONS.length,
      answered,
      fallback,
      blockedInternal,
      inScopeFallback,
      outOfScopeFallback,
      averageConfidence: confidenceCount === 0 ? 0 : confidenceSum / confidenceCount,
    },
    gaps,
    generatedFrom: 'pilot-fixture-phase-8',
  };
}