/**
 * BUSINESS-OPERATIONS-1A — Audit tests for the canonical lifecycle module.
 *
 * Verifies:
 * 1. Every domain has a transition table.
 * 2. Transition tables only reference declared states.
 * 3. Terminal states have empty outgoing transitions.
 * 4. canTransition() rejects self-transitions and unknown states.
 * 5. Centralized constants stay aligned with existing per-domain registries
 *    (contract statuses, lead/quote statuses).
 * 6. The architecture doc is present.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  LIFECYCLE_STATES,
  LIFECYCLE_TRANSITIONS,
  canTransition,
  isTerminalState,
} from '@/modules/shared/lifecycle/transitions';
import { TERMINAL_STATES, type LifecycleDomain } from '@/modules/shared/lifecycle';
import { CONTRACT_STATUS_KEYS } from '@/lib/contract-statuses';
import { QUOTE_STATUSES, LEAD_STATUSES } from '@/modules/leads/constants/quoteStatuses';

const DOMAINS: LifecycleDomain[] = [
  'business',
  'staff',
  'lead',
  'contract',
  'subscription',
  'payment_intent',
  'moderation',
];

describe('BUSINESS-OPERATIONS-1A lifecycle module', () => {
  it('declares a transition table for every domain', () => {
    for (const d of DOMAINS) {
      expect(LIFECYCLE_TRANSITIONS[d], `missing table for ${d}`).toBeDefined();
      expect(LIFECYCLE_STATES[d].length).toBeGreaterThan(0);
    }
  });

  it('transition targets are all declared states', () => {
    for (const d of DOMAINS) {
      const states = new Set(LIFECYCLE_STATES[d]);
      const table = LIFECYCLE_TRANSITIONS[d];
      for (const from of Object.keys(table)) {
        expect(states.has(from), `${d}.${from} not declared`).toBe(true);
        for (const to of table[from]) {
          expect(states.has(to), `${d}.${from}->${to} unknown target`).toBe(true);
        }
      }
    }
  });

  it('terminal states have no outgoing transitions', () => {
    for (const d of DOMAINS) {
      for (const t of TERMINAL_STATES[d]) {
        const out = LIFECYCLE_TRANSITIONS[d][t] ?? [];
        expect(out.length, `${d}.${t} should be terminal`).toBe(0);
        expect(isTerminalState(d, t)).toBe(true);
      }
    }
  });

  it('canTransition rejects self and unknown', () => {
    expect(canTransition('contract', 'draft', 'draft')).toBe(false);
    expect(canTransition('contract', 'draft', 'nonexistent')).toBe(false);
    expect(canTransition('contract', 'nonexistent', 'draft')).toBe(false);
    expect(canTransition('contract', 'draft', 'pending_approval')).toBe(true);
    expect(canTransition('staff', 'invited', 'active')).toBe(false);
    expect(canTransition('staff', 'pending_acceptance', 'active')).toBe(true);
  });

  it('contract canonical states are a superset of current DB enum', () => {
    for (const s of CONTRACT_STATUS_KEYS) {
      expect(
        LIFECYCLE_STATES.contract.includes(s),
        `contract state ${s} missing from canonical list`,
      ).toBe(true);
    }
  });

  it('lead canonical states cover existing quote and lead status sets', () => {
    const canon = new Set(LIFECYCLE_STATES.lead);
    // Map known aliases to canonical names so divergence is intentional.
    const aliases: Record<string, string> = {
      new: 'submitted',
      under_review: 'submitted',
      not_interested: 'lost',
      interested: 'negotiation',
      completed: 'won',
      cancelled: 'archived',
      expired: 'archived',
    };
    for (const s of [...QUOTE_STATUSES, ...LEAD_STATUSES]) {
      const target = aliases[s] ?? s;
      expect(canon.has(target), `lead alias ${s}->${target} unmapped`).toBe(true);
    }
  });

  it('architecture doc exists', () => {
    const p = resolve(process.cwd(), 'docs/business-operations-lifecycle.md');
    const txt = readFileSync(p, 'utf8');
    expect(txt).toMatch(/BUSINESS-OPERATIONS-1A/);
    expect(txt).toMatch(/Lifecycle matrix/);
  });
});