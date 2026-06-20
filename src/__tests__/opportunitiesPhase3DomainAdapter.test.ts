import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OPPORTUNITY_SOURCE_TABLES,
  NON_OPPORTUNITY_TABLES,
} from '@/modules/opportunities/types';
import {
  OPPORTUNITY_STATUS_MAP,
  OPPORTUNITY_ASSIGNMENT_STATUS_MAP,
  mapOpportunityStatus,
  getOpportunityStatusLabel,
} from '@/modules/opportunities/status';
import * as repo from '@/modules/opportunities/repository';

const root = resolve(__dirname, '..', '..');
const REPO_SRC = readFileSync(
  resolve(root, 'src/modules/opportunities/repository.ts'),
  'utf8',
);

describe('opportunities phase 3 — domain adapter', () => {
  it('Opportunity is backed by quote_requests, Assignment by quote_request_leads', () => {
    expect(OPPORTUNITY_SOURCE_TABLES.opportunity).toBe('quote_requests');
    expect(OPPORTUNITY_SOURCE_TABLES.assignment).toBe('quote_request_leads');
  });

  it('provider_leads is not exposed as an opportunity assignment', () => {
    expect(NON_OPPORTUNITY_TABLES).toContain('provider_leads');
    // The repository file must not import or query provider_leads.
    expect(REPO_SRC).not.toMatch(/provider_leads/);
    expect(REPO_SRC).not.toMatch(/listProviderInteractions|providerLeadsService/);
  });

  it('repository exposes opportunity-flavored entry points', () => {
    expect(typeof repo.listMyOpportunities).toBe('function');
    expect(typeof repo.listAssignedOpportunities).toBe('function');
    expect(typeof repo.countOpportunityFiles).toBe('function');
  });

  it('repository delegates to the existing leads service (no new DB queries)', () => {
    expect(REPO_SRC).toMatch(/from\s+['"]@\/modules\/leads\/services\/list['"]/);
    expect(REPO_SRC).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(REPO_SRC).not.toMatch(/\.rpc\(/);
  });
});

describe('opportunities phase 3 — status mapping', () => {
  it('covers the core quote_requests statuses', () => {
    expect(OPPORTUNITY_STATUS_MAP.new).toBe('submitted');
    expect(OPPORTUNITY_STATUS_MAP.under_review).toBe('under_review');
    expect(OPPORTUNITY_STATUS_MAP.matched).toBe('matched');
    expect(OPPORTUNITY_STATUS_MAP.contacted).toBe('receiving_bids');
    expect(OPPORTUNITY_STATUS_MAP.completed).toBe('completed');
    expect(OPPORTUNITY_STATUS_MAP.cancelled).toBe('cancelled');
  });

  it('covers the core quote_request_leads statuses', () => {
    expect(OPPORTUNITY_ASSIGNMENT_STATUS_MAP.contacted).toBe('receiving_bids');
    expect(OPPORTUNITY_ASSIGNMENT_STATUS_MAP.accepted).toBe('matched');
    expect(OPPORTUNITY_ASSIGNMENT_STATUS_MAP.rejected).toBe('cancelled');
  });

  it('returns bilingual labels for mapped statuses and falls back to Unknown', () => {
    expect(mapOpportunityStatus('new')).toBe('submitted');
    expect(getOpportunityStatusLabel('new').en).toBe('Submitted');
    expect(getOpportunityStatusLabel('definitely-not-a-status').en).toBe('Unknown');
  });
});