import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeOpportunitySla,
  aggregateOpportunitySla,
  SLA_THRESHOLDS_HOURS,
} from '@/modules/opportunities/analytics';
import type { OpportunityOpsRow } from '@/modules/opportunities/analytics';

const ROOT = resolve(__dirname, '..', '..');
const SLA_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/sla.ts'),
  'utf8',
);

function row(overrides: Partial<OpportunityOpsRow> = {}): OpportunityOpsRow {
  return {
    id: 'opp-1',
    ref_id: 'OPP-1',
    customer_name: null,
    city: null,
    district: null,
    sector: null,
    status: 'under_review',
    award_status: null,
    awarded_bid_id: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    assigned_count: 0,
    bid_count: 0,
    contract_id: null,
    contract_status: null,
    flag: 'needs_matching',
    first_assigned_at: null,
    first_bid_at: null,
    awarded_at: null,
    contract_created_at: null,
    ...overrides,
  };
}

const NOW = new Date('2026-06-10T00:00:00.000Z');

describe('Opportunities Phase 10 — advanced SLA', () => {
  it('1. computes time_to_first_assignment in hours', () => {
    const sla = computeOpportunitySla(
      row({
        created_at: '2026-06-01T00:00:00Z',
        first_assigned_at: '2026-06-01T06:00:00Z',
      }),
      NOW,
    );
    expect(sla.time_to_first_assignment_h).toBe(6);
  });

  it('2. computes time_to_first_bid', () => {
    const sla = computeOpportunitySla(
      row({
        created_at: '2026-06-01T00:00:00Z',
        first_bid_at: '2026-06-02T00:00:00Z',
      }),
      NOW,
    );
    expect(sla.time_to_first_bid_h).toBe(24);
  });

  it('3. computes time_to_award', () => {
    const sla = computeOpportunitySla(
      row({
        created_at: '2026-06-01T00:00:00Z',
        awarded_at: '2026-06-03T00:00:00Z',
      }),
      NOW,
    );
    expect(sla.time_to_award_h).toBe(48);
  });

  it('4. computes time_to_contract (after award)', () => {
    const sla = computeOpportunitySla(
      row({
        awarded_at: '2026-06-03T00:00:00Z',
        contract_created_at: '2026-06-04T00:00:00Z',
      }),
      NOW,
    );
    expect(sla.time_to_contract_h).toBe(24);
  });

  it('5. computes idle_time_since_last_action', () => {
    const sla = computeOpportunitySla(
      row({
        first_assigned_at: '2026-06-09T00:00:00Z',
        updated_at: '2026-06-09T00:00:00Z',
      }),
      NOW,
    );
    expect(sla.idle_time_since_last_action_h).toBe(24);
  });

  it('6a. on_time when below 80% of threshold', () => {
    const sla = computeOpportunitySla(
      row({
        flag: 'needs_matching',
        created_at: '2026-06-09T18:00:00Z',
        updated_at: '2026-06-09T18:00:00Z',
      }),
      NOW,
    );
    expect(sla.status).toBe('on_time');
  });

  it('6b. at_risk between 80% and 100% of threshold', () => {
    // needs_assignment threshold = 24h. at_risk band: 19.2h–24h
    const sla = computeOpportunitySla(
      row({
        flag: 'needs_matching',
        created_at: '2026-06-09T03:00:00Z',
        updated_at: '2026-06-09T03:00:00Z',
      }),
      NOW,
    );
    expect(sla.status).toBe('at_risk');
  });

  it('6c. breached when over threshold', () => {
    const sla = computeOpportunitySla(
      row({
        flag: 'awaiting_bids',
        created_at: '2026-06-01T00:00:00Z',
        first_assigned_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      }),
      NOW,
    );
    expect(sla.status).toBe('breached');
  });

  it('6d. completed when contract created or cancelled', () => {
    const done = computeOpportunitySla(row({ flag: 'operationally_complete' }), NOW);
    expect(done.status).toBe('completed');
    const cancelled = computeOpportunitySla(row({ flag: 'cancelled' }), NOW);
    expect(cancelled.status).toBe('completed');
  });

  it('7. thresholds come from constants module (no DB settings table)', () => {
    expect(SLA_THRESHOLDS_HOURS.needs_assignment_after_hours).toBe(24);
    expect(SLA_THRESHOLDS_HOURS.awaiting_bids_after_hours).toBe(48);
    expect(SLA_THRESHOLDS_HOURS.awaiting_award_after_hours).toBe(72);
    expect(SLA_THRESHOLDS_HOURS.awaiting_contract_after_hours).toBe(48);
    expect(SLA_SRC).not.toMatch(/from\(['"]settings['"]\)/);
    expect(SLA_SRC).not.toMatch(/system_settings|platform_settings/i);
  });

  it('8. aggregate provides averages and breach counts', () => {
    const agg = aggregateOpportunitySla(
      [
        row({
          created_at: '2026-06-01T00:00:00Z',
          first_bid_at: '2026-06-02T00:00:00Z',
          awarded_at: '2026-06-03T00:00:00Z',
          contract_created_at: '2026-06-04T00:00:00Z',
          flag: 'operationally_complete',
        }),
        row({
          flag: 'awaiting_bids',
          created_at: '2026-06-01T00:00:00Z',
          first_assigned_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
        }),
      ],
      NOW,
    );
    expect(agg.avg_time_to_first_bid_h).toBe(24);
    expect(agg.avg_time_to_award_h).toBe(48);
    expect(agg.avg_time_to_contract_after_award_h).toBe(24);
    expect(agg.breached_count).toBeGreaterThanOrEqual(1);
    expect(agg.no_bids_after_threshold).toBeGreaterThanOrEqual(1);
  });

  it('9. sla module is read-only (no writes / rpc / service_role)', () => {
    expect(SLA_SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(SLA_SRC).not.toMatch(/supabase\.rpc\(/);
    expect(SLA_SRC).not.toMatch(/service_role/i);
    expect(SLA_SRC).not.toMatch(/:\s*any\b/);
    expect(SLA_SRC).not.toMatch(/\bas\s+any\b/);
    expect(SLA_SRC).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });
});